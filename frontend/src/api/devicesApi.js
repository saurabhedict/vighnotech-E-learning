import api from './axiosClient'

// Devices (download lane / launcher binding).
export const devicesApi = {
  async register(fingerprint, name) {
    const { data } = await api.post('/devices/register', { fingerprint, name })
    return data
  },
  async mine() {
    const { data } = await api.get('/devices/mine')
    return data.devices
  },
}
