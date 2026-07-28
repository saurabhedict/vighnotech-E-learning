import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { Upload } from '@aws-sdk/lib-storage'
import { env } from '../config/env.js'

/**
 * Thin AWS S3 wrapper used by the storage service when S3 is configured.
 * Objects are encrypted at rest (SSE-S3 by default, or SSE-KMS) and are NEVER
 * public — bytes are only served through the signed-URL-checked stream route,
 * exactly like the local-disk stand-in. So switching to S3 changes WHERE the
 * bytes live, not the security model around them.
 */

let client = null
function s3() {
  if (client) return client
  client = new S3Client({
    region: env.s3.region,
    credentials: {
      accessKeyId: env.s3.accessKeyId,
      secretAccessKey: env.s3.secretAccessKey,
    },
    // Custom endpoint (R2/MinIO/Wasabi) needs path-style addressing.
    ...(env.s3.endpoint ? { endpoint: env.s3.endpoint, forcePathStyle: true } : {}),
  })
  return client
}

export const s3Enabled = () => env.s3.configured

// Object keys are flat names from the storage service; prefix is bucket-level tidiness.
const fullKey = (key) => `${env.s3.prefix || ''}${key}`

// Server-side encryption params, shared by both upload lanes.
function sseParams() {
  if (env.s3.sse === 'aws:kms') {
    return { ServerSideEncryption: 'aws:kms', ...(env.s3.kmsKeyId ? { SSEKMSKeyId: env.s3.kmsKeyId } : {}) }
  }
  return { ServerSideEncryption: 'AES256' }
}

const isNotFound = (e) =>
  e?.$metadata?.httpStatusCode === 404 || e?.name === 'NotFound' || e?.name === 'NoSuchKey'

// Persist a buffer; resolves once the object is durably stored in S3.
export async function putObject(key, body, contentType) {
  await s3().send(
    new PutObjectCommand({
      Bucket: env.s3.bucket,
      Key: fullKey(key),
      Body: body,
      ...(contentType ? { ContentType: contentType } : {}),
      ...sseParams(),
    })
  )
}

// Stream a (possibly huge) Readable to S3 via multipart upload — no need to buffer
// the whole object in memory or know its length up front. Used to write the
// encrypted ciphertext of a large download-lane game.
export async function uploadStream(key, body, contentType) {
  const up = new Upload({
    client: s3(),
    params: {
      Bucket: env.s3.bucket,
      Key: fullKey(key),
      Body: body,
      ...(contentType ? { ContentType: contentType } : {}),
      ...sseParams(),
    },
    queueSize: 4,
    partSize: 8 * 1024 * 1024, // 8 MB parts
  })
  await up.done()
}

// HEAD → { size } (bytes), or null if the object does not exist.
export async function headObject(key) {
  try {
    const r = await s3().send(new HeadObjectCommand({ Bucket: env.s3.bucket, Key: fullKey(key) }))
    return { size: Number(r.ContentLength) || 0 }
  } catch (e) {
    if (isNotFound(e)) return null
    throw e
  }
}

// GET → a Node Readable stream (optionally a byte range), or null if missing.
export async function getObjectStream(key, { start, end } = {}) {
  const Range = start !== undefined && end !== undefined ? `bytes=${start}-${end}` : undefined
  try {
    const r = await s3().send(
      new GetObjectCommand({ Bucket: env.s3.bucket, Key: fullKey(key), ...(Range ? { Range } : {}) })
    )
    return r.Body || null // Readable on the Node runtime
  } catch (e) {
    if (isNotFound(e)) return null
    throw e
  }
}

// GET → the whole object as a Buffer (used for PDF watermarking), or null.
export async function getObjectBuffer(key) {
  const body = await getObjectStream(key)
  if (!body) return null
  const chunks = []
  for await (const chunk of body) chunks.push(chunk)
  return Buffer.concat(chunks)
}

// Presigned PUT URL for direct browser→S3 upload. Kept header-free (no signed
// content-type/SSE) so a plain PUT works; the bucket's default encryption still
// encrypts the object at rest, and we serve bytes back through our own proxy so
// the stored content-type doesn't matter. Requires bucket CORS to allow PUT.
export async function presignPutUrl(key, { expiresIn = 3600 } = {}) {
  return getSignedUrl(s3(), new PutObjectCommand({ Bucket: env.s3.bucket, Key: fullKey(key) }), { expiresIn })
}

// Presigned GET URL for direct browser→S3 playback/download. Lets the <video>
// element stream byte-ranges straight from S3 (no proxy hop, native range
// support) instead of pulling everything through our server. TTL must cover the
// whole viewing session since one URL serves all the player's range requests.
export async function presignGetUrl(key, { expiresIn = 3600, contentType, disposition } = {}) {
  return getSignedUrl(
    s3(),
    new GetObjectCommand({
      Bucket: env.s3.bucket,
      Key: fullKey(key),
      // Force the response content-type so the <video> always gets e.g. video/mp4
      // even if the stored object's type is generic (octet-stream).
      ...(contentType ? { ResponseContentType: contentType } : {}),
      // `attachment; filename="…"` makes the browser download (used for the launcher).
      ...(disposition ? { ResponseContentDisposition: disposition } : {}),
    }),
    { expiresIn }
  )
}

// Best-effort delete (never throws — orphan cleanup must not break a request).
export async function deleteObject(key) {
  try {
    await s3().send(new DeleteObjectCommand({ Bucket: env.s3.bucket, Key: fullKey(key) }))
  } catch {
    /* best-effort */
  }
}
