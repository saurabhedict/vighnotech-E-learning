import {
  MediaConvertClient,
  CreateJobCommand,
  GetJobCommand,
  DescribeEndpointsCommand,
} from '@aws-sdk/client-mediaconvert'
import { env } from '../config/env.js'

/**
 * AWS Elemental MediaConvert — transcodes an uploaded video (already in S3) into
 * an adaptive HLS ladder (multi-bitrate .m3u8 + segments) written back to S3.
 *
 * Async by nature: submitHlsJob() returns immediately with a jobId; a poller
 * (services/transcodePoller.js) watches the job and flips the Content to 'ready'.
 * Output stays private — it is served only through the signed HLS proxy route.
 *
 * Not configured (no role ARN) → callers skip transcoding and serve the raw MP4.
 */

export const mediaConvertEnabled = () => env.mediaconvert.configured

const creds = () => ({
  accessKeyId: env.s3.accessKeyId,
  secretAccessKey: env.s3.secretAccessKey,
})

let client = null
let endpointPromise = null

// Each AWS account has a unique MediaConvert endpoint; discover + cache it once.
async function resolveEndpoint() {
  if (env.mediaconvert.endpoint) return env.mediaconvert.endpoint
  const probe = new MediaConvertClient({ region: env.mediaconvert.region, credentials: creds() })
  const r = await probe.send(new DescribeEndpointsCommand({}))
  const url = r.Endpoints?.[0]?.Url
  if (!url) throw new Error('MediaConvert: could not discover account endpoint')
  return url
}

async function mc() {
  if (client) return client
  if (!endpointPromise) endpointPromise = resolveEndpoint()
  const endpoint = await endpointPromise
  client = new MediaConvertClient({ region: env.mediaconvert.region, endpoint, credentials: creds() })
  return client
}

// One H.264/AAC rendition in the HLS output group. `mod` becomes the filename
// suffix (e.g. master_720.m3u8), so it must be unique per rendition.
function rendition({ width, height, maxBitrate, mod, audioBitrate = 96000 }) {
  return {
    NameModifier: mod,
    ContainerSettings: { Container: 'M3U8', M3u8Settings: {} },
    VideoDescription: {
      Width: width,
      Height: height,
      ScalingBehavior: 'DEFAULT',
      CodecSettings: {
        Codec: 'H_264',
        H264Settings: {
          RateControlMode: 'QVBR',
          MaxBitrate: maxBitrate,
          QvbrSettings: { QvbrQualityLevel: 7 },
          SceneChangeDetect: 'TRANSITION_DETECTION',
          GopSizeUnits: 'AUTO',
          CodecProfile: 'MAIN',
          CodecLevel: 'AUTO',
        },
      },
    },
    AudioDescriptions: [
      {
        CodecSettings: {
          Codec: 'AAC',
          AacSettings: { Bitrate: audioBitrate, CodingMode: 'CODING_MODE_2_0', SampleRate: 48000 },
        },
      },
    ],
  }
}

// Standard adaptive ladder: 720p / 480p / 360p. Add 1080p if your sources warrant it.
const LADDER = [
  { width: 1280, height: 720, maxBitrate: 3_000_000, mod: '_720' },
  { width: 854, height: 480, maxBitrate: 1_500_000, mod: '_480' },
  { width: 640, height: 360, maxBitrate: 800_000, mod: '_360', audioBitrate: 64000 },
]

/**
 * Submit a transcode. `inputKey`/`contentId` are LOGICAL keys (no S3 prefix);
 * the real S3 prefix from env.s3.prefix is applied here.
 * Returns { jobId, masterKey } where masterKey is the logical key of master.m3u8.
 */
export async function submitHlsJob({ inputKey, contentId }) {
  const prefix = env.s3.prefix || ''
  const inputUri = `s3://${env.s3.bucket}/${prefix}${inputKey}`
  // Destination is a folder + basename; MediaConvert appends NameModifier + ext.
  // basename "master" → master.m3u8 (master manifest) + master_720.m3u8, etc.
  const destUri = `s3://${env.s3.bucket}/${prefix}hls/${contentId}/master`

  const params = {
    Role: env.mediaconvert.roleArn,
    ...(env.mediaconvert.queueArn ? { Queue: env.mediaconvert.queueArn } : {}),
    Settings: {
      TimecodeConfig: { Source: 'ZEROBASED' },
      Inputs: [
        {
          FileInput: inputUri,
          TimecodeSource: 'ZEROBASED',
          VideoSelector: {},
          AudioSelectors: { 'Audio Selector 1': { DefaultSelection: 'DEFAULT' } },
        },
      ],
      OutputGroups: [
        {
          Name: 'HLS',
          OutputGroupSettings: {
            Type: 'HLS_GROUP_SETTINGS',
            HlsGroupSettings: {
              Destination: destUri,
              SegmentLength: 6,
              MinSegmentLength: 0,
              DirectoryStructure: 'SINGLE_DIRECTORY',
              ManifestDurationFormat: 'INTEGER',
              OutputSelection: 'MANIFESTS_AND_SEGMENTS',
              SegmentControl: 'SEGMENTED_FILES',
              CodecSpecification: 'RFC_4281',
            },
          },
          Outputs: LADDER.map(rendition),
        },
      ],
    },
  }

  const r = await (await mc()).send(new CreateJobCommand(params))
  return { jobId: r.Job?.Id, masterKey: `hls/${contentId}/master.m3u8` }
}

// Map a MediaConvert job to our simple lifecycle.
// AWS statuses: SUBMITTED | PROGRESSING | COMPLETE | CANCELED | ERROR
export async function getJobStatus(jobId) {
  const r = await (await mc()).send(new GetJobCommand({ Id: jobId }))
  const s = r.Job?.Status
  if (s === 'COMPLETE') return { status: 'ready' }
  if (s === 'ERROR' || s === 'CANCELED') return { status: 'failed', error: r.Job?.ErrorMessage || s }
  return { status: 'processing' }
}
