import api from './axiosClient'

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
  uploadContentFile(id, file) {
    const form = new FormData()
    form.append('file', file)
    return api
      .post(`/admin/content/${id}/upload`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data)
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
