import api from './axiosClient'

// License Authority client (library + verification).
export const licenseApi = {
  async mine() {
    const { data } = await api.get('/licenses/mine')
    return data.licenses
  },
  async verify(token, deviceId) {
    const { data } = await api.post('/licenses/verify', { token, deviceId })
    return data
  },
  async refresh(jti) {
    const { data } = await api.post(`/licenses/${jti}/refresh`)
    return data
  },
}
