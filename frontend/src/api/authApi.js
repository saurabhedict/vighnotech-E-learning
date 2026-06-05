import api from './axiosClient'

// Auth endpoints. Each returns { user, token } on success (the backend also
// sets httpOnly cookies). Errors surface the backend's { error: { message } }.
export const authApi = {
  async login(email, password) {
    const { data } = await api.post('/auth/login', { email, password })
    return data
  },
  async signup(email, password, name) {
    const { data } = await api.post('/auth/signup', { email, password, name })
    return data
  },
  async me() {
    const { data } = await api.get('/auth/me')
    return data.user
  },
  async logout() {
    try {
      await api.post('/auth/logout')
    } catch {
      /* ignore — we clear client state regardless */
    }
  },
  async changePassword(currentPassword, newPassword) {
    const { data } = await api.post('/auth/change-password', { currentPassword, newPassword })
    return data
  },
}

// Normalize an Axios error into a human message.
export function apiErrorMessage(err, fallback = 'Something went wrong') {
  return err?.response?.data?.error?.message || err?.message || fallback
}
