import axios from 'axios'
import api from './axiosClient'

const onProg = (cb) => (e) => { if (cb && e.total) cb(Math.round((e.loaded / e.total) * 100)) }

// Admin CMS + dashboard. All routes require an admin session (RBAC enforced
// server-side; the UI also hides them from non-admins).
export const adminApi = {
  async stats() {
    const { data } = await api.get('/admin/stats')
    return data
  },
  async audit(limit = 50) {
    const { data } = await api.get('/admin/audit', { params: { limit } })
    return data.logs
  },
  // Reports
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
  // Users
  listUsers(q = '') {
    return api.get('/admin/users', { params: q ? { q } : {} }).then((r) => r.data.users)
  },
  setUserRole(id, role) {
    return api.patch(`/admin/users/${id}/role`, { role }).then((r) => r.data)
  },
  deleteUser(id) {
    return api.delete(`/admin/users/${id}`).then((r) => r.data)
  },
  // Tree / content browse
  listNodes(params = {}) {
    return api.get('/admin/nodes', { params }).then((r) => r.data.nodes)
  },
  listChapterContent(chapterId) {
    return api.get(`/admin/chapters/${chapterId}/content`).then((r) => r.data.items)
  },
  // Content tree
  createNode(payload) {
    return api.post('/admin/nodes', payload).then((r) => r.data)
  },
  updateNode(id, payload) {
    return api.patch(`/admin/nodes/${id}`, payload).then((r) => r.data)
  },
  deleteNode(id) {
    return api.delete(`/admin/nodes/${id}`).then((r) => r.data)
  },
  reorderNodes(ids) {
    return api.post('/admin/nodes/reorder', { ids }).then((r) => r.data)
  },
  // Content files
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
    const lane = content?.lane

    if (lane !== 'download') {
      const { data: presign } = await api.post(`/admin/content/${id}/upload-url`, { filename: file.name })
      if (presign?.supported) {
        // PUT straight to S3 (raw axios — no baseURL, auth header, or cookies).
        await axios.put(presign.url, file, {
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
          timeout: 0,
          onUploadProgress: onProg(onProgress),
        })
        const { data } = await api.post(`/admin/content/${id}/upload-complete`, { storageKey: presign.storageKey })
        return data
      }
    }

    // Fallback: stream through the server (download lane, or S3 not configured).
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post(`/admin/content/${id}/upload`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 0,
      onUploadProgress: onProg(onProgress),
    })
    return data
  },
  // License administration
  issueLicense(payload) {
    return api.post('/admin/licenses/issue', payload).then((r) => r.data)
  },
  revokeLicense(jti, reason) {
    return api.post(`/admin/licenses/${jti}/revoke`, { reason }).then((r) => r.data)
  },
  // Coupons
  listCoupons() {
    return api.get('/admin/coupons').then((r) => r.data.coupons)
  },
  createCoupon(payload) {
    return api.post('/admin/coupons', payload).then((r) => r.data)
  },
  deleteCoupon(id) {
    return api.delete(`/admin/coupons/${id}`).then((r) => r.data)
  },
  // Refund a purchase (revokes license + credits wallet)
  refundPurchase(purchaseId) {
    return api.post(`/admin/purchases/${purchaseId}/refund`).then((r) => r.data)
  },
}
