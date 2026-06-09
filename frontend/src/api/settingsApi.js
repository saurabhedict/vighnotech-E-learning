import api from './axiosClient'

// Site settings = admin-editable branding + footer. GET is public; PUT is admin.
export const settingsApi = {
  async get() {
    const { data } = await api.get('/settings')
    return data
  },
  async update(payload) {
    const { data } = await api.put('/admin/settings', payload)
    return data
  },
}
