import api from './axiosClient'

// The notification bell — broadcasts the admin sends to everyone.
export const notificationApi = {
  async mine() {
    const { data } = await api.get('/notifications')
    return data // { items, unread }
  },
  async markSeen() {
    const { data } = await api.post('/notifications/seen')
    return data
  },
}
