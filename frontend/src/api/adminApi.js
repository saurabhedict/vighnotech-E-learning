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
}
