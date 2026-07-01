import axios from 'axios'
import api from './axiosClient'

const onProg = (cb) => (e) => { if (cb && e.total) cb(Math.round((e.loaded / e.total) * 100)) }

// ── Helper: prepare a resource before sending to the API ─────────────────────
// Uploads the file first (using the existing S3 presigned flow), then returns
// a plain metadata object ready to POST.
async function prepareResource(resourceData, onProgress) {
  const { type, title, file, url, quizJson, opts, price } = resourceData
  let fileUrl = url || null

  if (file) {
    // Reuse the existing S3 presigned upload flow via a temporary content shell
    const { data: tempContent } = await api.post('/admin/content/temp', { filename: file.name })
    const result = await adminApi.uploadContentFile(tempContent, file, onProgress)
    fileUrl = result.url
  }

  return {
    type,
    title,
    price,
    url: fileUrl,
    quizJson: quizJson || undefined,
    freePreview:  opts?.freePreview  ?? false,
    downloadable: opts?.downloadable ?? false,
    description:  opts?.description  || '',
    duration:     opts?.duration     || '',
    order:        parseInt(opts?.order ?? 0, 10),
  }
}

// Admin CMS + dashboard. All routes require an admin session (RBAC enforced
// server-side; the UI also hides them from non-admins).
export const adminApi = {

  // ── Stats & Audit ───────────────────────────────────────────────────────────
  async stats() {
    const { data } = await api.get('/admin/stats')
    return data
  },
  async audit(limit = 50) {
    const { data } = await api.get('/admin/audit', { params: { limit } })
    return data.logs
  },
  async clearAudit() {
    const { data } = await api.delete('/admin/audit')
    return data
  },

  // ── Reports ─────────────────────────────────────────────────────────────────
  report(type) {
    return api.get(`/admin/reports/${type}`).then((r) => r.data)
  },
  async exportReport(type, format) {
    const res = await api.get(`/admin/reports/${type}/export`, { params: { format }, responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url
    a.download = `${type}-report.${format}`
    a.click()
    URL.revokeObjectURL(url)
  },

  // ── Users ───────────────────────────────────────────────────────────────────
  listUsers(q = '') {
    return api.get('/admin/users', { params: q ? { q } : {} }).then((r) => r.data.users)
  },
  setUserRole(id, role) {
    return api.patch(`/admin/users/${id}/role`, { role }).then((r) => r.data)
  },
  deleteUser(id) {
    return api.delete(`/admin/users/${id}`).then((r) => r.data)
  },

  // ── Tree / content browse ───────────────────────────────────────────────────
  listNodes(params = {}) {
    return api.get('/admin/nodes', { params }).then((r) => r.data.nodes)
  },
  listChapterContent(chapterId) {
    return api.get(`/admin/chapters/${chapterId}/content`).then((r) => r.data.items)
  },

  // ── Content tree ────────────────────────────────────────────────────────────
  createNode(payload) {
    return api.post('/admin/nodes', payload).then((r) => r.data)
  },
  updateNode(id, payload) {
    return api.patch(`/admin/nodes/${id}`, payload).then((r) => r.data)
  },
  async uploadCourseThumbnail(courseId, file, onProgress) {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post(`/admin/nodes/${courseId}/upload-thumbnail`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 0,
      onUploadProgress: onProg(onProgress),
    })
    return data
  },
  async uploadContentThumbnail(contentId, file, onProgress) {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post(`/admin/content/${contentId}/upload-thumbnail`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 0,
      onUploadProgress: onProg(onProgress),
    })
    return data
  },
  deleteNode(id) {
    return api.delete(`/admin/nodes/${id}`).then((r) => r.data)
  },
  reorderNodes(ids) {
    return api.post('/admin/nodes/reorder', { ids }).then((r) => r.data)
  },

  // ── Content files ────────────────────────────────────────────────────────────
  createContent(payload) {
    return api.post('/admin/content', payload).then((r) => r.data)
  },
  updateContent(id, payload) {
    return api.patch(`/admin/content/${id}`, payload).then((r) => r.data)
  },
  deleteContent(id) {
    return api.delete(`/admin/content/${id}`).then((r) => r.data)
  },

  // Uploads a media file. `content` may be the content object (preferred — its
  // `lane` decides the path) or just an id. `onProgress(percent 0..100)` fires as
  // bytes leave the browser. timeout:0 disables the default 12s cap (videos are big).
  //
  // Stream lane (pdf/video/3d) uploads DIRECTLY to S3 via a presigned URL — bytes
  // never touch our server, so there's no size/RAM limit and the % is true
  // end-to-end. The encrypted download lane (games), or any setup without S3,
  // falls back to streaming through the server.
  async uploadContentFile(content, file, onProgress) {
    const id = content?._id || content?.id || content

    // Direct-to-S3 for BOTH lanes when S3 is configured. Stream lane (pdf/video/3d)
    // keeps the object as-is; download lane (games) uploads a raw temp that the
    // server then stream-encrypts — so multi-GB games never hit the 200 MB server cap.
    const { data: presign } = await api.post(`/admin/content/${id}/upload-url`, { filename: file.name })
    if (presign?.supported) {
      // PUT straight to S3 (raw axios — no baseURL, auth header, or cookies).
      await axios.put(presign.url, file, {
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        timeout: 0,
        onUploadProgress: onProg(onProgress),
      })
      // Finalize: stream lane records it; download lane encrypts (can take a while
      // for a big game) → no timeout. The UI shows "Processing…" during this step.
      const { data } = await api.post(`/admin/content/${id}/upload-complete`, { storageKey: presign.storageKey }, { timeout: 0 })
      return data
    }

    // Fallback: stream through the server (S3 not configured).
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post(`/admin/content/${id}/upload`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 0,
      onUploadProgress: onProg(onProgress),
    })
    return data
  },

  // ── License administration ──────────────────────────────────────────────────
  listLicenses(params = {}) {
    return api.get('/admin/licenses', { params }).then((r) => r.data.items)
  },
  issueLicense(payload) {
    return api.post('/admin/licenses/issue', payload).then((r) => r.data)
  },
  revokeLicense(jti, reason) {
    return api.post(`/admin/licenses/${jti}/revoke`, { reason }).then((r) => r.data)
  },
  unflagLicense(jti) {
    return api.post(`/admin/licenses/${jti}/unflag`).then((r) => r.data)
  },

  // ── Broadcast notifications (admin → everyone) ────────────────────────────────
  listNotifications() {
    return api.get('/admin/notifications').then((r) => r.data.items)
  },
  createNotification(payload) {
    return api.post('/admin/notifications', payload).then((r) => r.data)
  },
  deleteNotification(id) {
    return api.delete(`/admin/notifications/${id}`).then((r) => r.data)
  },

  // ── Coupons ─────────────────────────────────────────────────────────────────
  listCoupons() {
    return api.get('/admin/coupons').then((r) => r.data.coupons)
  },
  createCoupon(payload) {
    return api.post('/admin/coupons', payload).then((r) => r.data)
  },
  deleteCoupon(id) {
    return api.delete(`/admin/coupons/${id}`).then((r) => r.data)
  },

  // ── Commerce ────────────────────────────────────────────────────────────────
  // Refund a purchase (revokes license + credits wallet)
  refundPurchase(purchaseId) {
    return api.post(`/admin/purchases/${purchaseId}/refund`).then((r) => r.data)
  },

  // ── Courses ─────────────────────────────────────────────────────────────────

  /** List all courses — admin view includes drafts */
  listCourses() {
    return api.get('/admin/courses').then((r) => r.data)
  },

  /**
   * Create a new course.
   * Uploads thumbnail + all chapter resources before posting metadata.
   */
  async createCourse({ title, description, category, price, thumbnail, tags, published, chapters }) {
    // 1. Upload thumbnail if provided
    let thumbnailUrl = null
    if (thumbnail) {
      const { data: tempContent } = await api.post('/admin/content/temp', { filename: thumbnail.name })
      const result = await adminApi.uploadContentFile(tempContent, thumbnail)
      thumbnailUrl = result.url
    }

    // 2. Upload all chapter resources
    const resolvedChapters = await Promise.all(
      chapters.map(async (chapter) => ({
        title: chapter.title,
        resources: await Promise.all(
          (chapter.resources || []).map((r) => prepareResource(r))
        ),
      }))
    )

    // 3. POST course metadata
    return api.post('/admin/courses', {
      title,
      description,
      category,
      price,
      thumbnailUrl,
      tags,
      published,
      chapters: resolvedChapters,
    }).then((r) => r.data)
  },

  /** Partial update — title, published, price, etc. */
  updateCourse(id, patch) {
    return api.patch(`/admin/courses/${id}`, patch).then((r) => r.data)
  },

  /** Permanently delete a course and all its resources */
  deleteCourse(id) {
    return api.delete(`/admin/courses/${id}`).then((r) => r.data)
  },

  // ── Standalone resources ────────────────────────────────────────────────────
  // A resource NOT tied to a course chapter — mirrors adding a file to a CMS
  // folder. Supports: video, pdf, animation, image, audio, subtitle, quiz, link.

  /** Upload and create a standalone resource */
  async createStandaloneResource(resourceData, onProgress) {
    const payload = await prepareResource(resourceData, onProgress)
    return api.post('/admin/resources', payload).then((r) => r.data)
  },

  /** List standalone resources, optionally filtered by type */
  listResources(type) {
    return api.get('/admin/resources', { params: type ? { type } : {} }).then((r) => r.data)
  },

  /** Delete a standalone resource */
  deleteResource(id) {
    return api.delete(`/admin/resources/${id}`).then((r) => r.data)
  },
}
