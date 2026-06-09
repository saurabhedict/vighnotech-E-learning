import api from './axiosClient'

// Auth endpoints. Each returns { user, token } on success (the backend also
// sets httpOnly cookies). Errors surface the backend's { error: { message } }.
export const authApi = {
  async login(email, password) {
    const { data } = await api.post('/auth/login', { email, password })
    return data
  },
  async signup(email, password, name, phone) {
    const { data } = await api.post('/auth/signup', { email, password, name, ...(phone ? { phone } : {}) })
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

  // Second step of a 2FA login.
  async verify2fa(challenge, code) {
    const { data } = await api.post('/auth/2fa/verify', { challenge, code })
    return data
  },

  // Account verification (channel: 'email' | 'sms' | 'whatsapp')
  async sendVerification(channel = 'email', phone) {
    const body = { channel }
    if (phone) body.phone = phone
    return (await api.post('/auth/send-verification', body)).data
  },
  async verifyEmail(code) {
    return (await api.post('/auth/verify-email', { code })).data
  },

  // Profile photo (image is a cropped JPEG data URL)
  async uploadAvatar(image) {
    return (await api.post('/profile/avatar', { image })).data
  },
  async removeAvatar() {
    return (await api.delete('/profile/avatar')).data
  },
  // Set/replace the phone number (changing it clears prior verification)
  async setPhone(phone) {
    return (await api.patch('/profile/phone', { phone })).data
  },
  async deleteAccount(password) {
    return (await api.delete('/profile/account', { data: { password } })).data
  },

  // Password reset (no auth)
  async forgotPassword(email) {
    return (await api.post('/auth/forgot-password', { email })).data
  },
  async resetPassword(email, code, newPassword) {
    return (await api.post('/auth/reset-password', { email, code, newPassword })).data
  },

  // Two-factor management
  twoFA: {
    status: () => api.get('/auth/2fa/status').then((r) => r.data),
    setupTotp: () => api.post('/auth/2fa/totp/setup').then((r) => r.data),
    enableTotp: (code) => api.post('/auth/2fa/totp/enable', { code }).then((r) => r.data),
    enableEmail: () => api.post('/auth/2fa/email/enable').then((r) => r.data),
    disable: (password) => api.post('/auth/2fa/disable', { password }).then((r) => r.data),
    regenerateBackupCodes: (password) => api.post('/auth/2fa/backup-codes', { password }).then((r) => r.data),
  },
}

// Normalize an Axios error into a human message.
export function apiErrorMessage(err, fallback = 'Something went wrong') {
  return err?.response?.data?.error?.message || err?.message || fallback
}
