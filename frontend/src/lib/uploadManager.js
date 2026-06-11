import { adminApi } from '../api/adminApi'
import { queryClient } from './queryClient'

/**
 * Module-level upload registry. Because this lives OUTSIDE React, an upload keeps
 * running when the CMS component unmounts — e.g. when an admin switches dashboard
 * tabs. Components subscribe for progress; the actual transfer happens here.
 *
 * Note: this survives in-app navigation, not a full page reload (a closed/reloaded
 * page can't keep an HTTP upload alive). We add a beforeunload guard for that.
 */

// contentId -> { pct, status: 'uploading'|'processing'|'done'|'error', error, title }
const uploads = new Map()
const listeners = new Set()

const snapshot = () => Object.fromEntries(uploads)
function emit() {
  const s = snapshot()
  listeners.forEach((fn) => fn(s))
}

export function subscribeUploads(fn) {
  listeners.add(fn)
  fn(snapshot()) // push current state immediately (so a remounted tab sees in-flight uploads)
  return () => listeners.delete(fn)
}

export function getActiveUploadCount() {
  let n = 0
  for (const u of uploads.values()) if (u.status === 'uploading' || u.status === 'processing') n++
  return n
}

/**
 * Start (or no-op if already running) an upload for a content item. Resolves when
 * done; progress is broadcast to subscribers throughout. Never throws to the
 * caller's UI — failures surface via the 'error' status on the row.
 */
export async function startUpload(content, file) {
  const id = content._id
  const existing = uploads.get(id)
  if (existing && (existing.status === 'uploading' || existing.status === 'processing')) return

  uploads.set(id, { pct: 0, status: 'uploading', error: '', title: content.title })
  emit()
  try {
    await adminApi.uploadContentFile(content, file, (pct) => {
      const cur = uploads.get(id) || {}
      // 100% = bytes left the browser; the server is still finalizing (→ 'processing').
      uploads.set(id, { ...cur, pct, status: pct >= 100 ? 'processing' : 'uploading' })
      emit()
    })
    uploads.set(id, { ...uploads.get(id), pct: 100, status: 'done' })
    emit()
    // Refresh the CMS lists wherever they're mounted so the row shows "file ✓".
    queryClient.invalidateQueries({ queryKey: ['admin', 'children'] })
    queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
    setTimeout(() => { uploads.delete(id); emit() }, 1500)
  } catch (e) {
    uploads.set(id, { ...uploads.get(id), status: 'error', error: e?.response?.data?.error?.message || e?.message || 'Upload failed' })
    emit()
    setTimeout(() => { uploads.delete(id); emit() }, 6000)
  }
}
