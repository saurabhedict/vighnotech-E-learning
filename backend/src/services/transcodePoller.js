import { Content } from '../models/Content.js'
import { mediaConvertEnabled, getJobStatus } from './mediaconvert.js'

/**
 * Background poller (chosen over EventBridge for zero extra AWS setup): every
 * tick it finds Content stuck in hls.status='processing' and asks MediaConvert
 * whether the job finished, then flips the item to 'ready' or 'failed'. The HLS
 * master only becomes the playback source once status is 'ready'.
 */

const INTERVAL_MS = 15_000
let timer = null

export async function pollPendingTranscodes(log = () => {}) {
  const pending = await Content.find({ 'hls.status': 'processing' }).select('_id hls').limit(25)
  for (const content of pending) {
    if (!content.hls?.jobId) continue
    try {
      const { status, error } = await getJobStatus(content.hls.jobId)
      if (status === 'processing') continue // still running — check again next tick
      content.hls.status = status
      if (error) content.hls.error = error
      await content.save()
      log(`[transcode] ${content._id} → ${status}${error ? ` (${error})` : ''}`)
    } catch {
      // Transient (throttling / endpoint hiccup) — leave 'processing', retry later.
    }
  }
}

export function startTranscodePoller({ log = () => {} } = {}) {
  if (!mediaConvertEnabled() || timer) return
  log('[transcode] HLS poller started (every 15s)')
  timer = setInterval(() => {
    pollPendingTranscodes(log).catch(() => {})
  }, INTERVAL_MS)
  if (timer.unref) timer.unref() // never keep the process alive just to poll
}

export function stopTranscodePoller() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
