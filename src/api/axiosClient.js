import axios from 'axios'
import { store } from '../store'

// Configured Axios instance for the future backend.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api',
  timeout: 8000,
})

// Request interceptor — attach the auth token from Redux to every call.
api.interceptors.request.use((config) => {
  const user = store.getState().auth.user
  if (user?.token) config.headers.Authorization = `Bearer ${user.token}`
  return config
})

// Response interceptor — central error logging.
api.interceptors.response.use(
  (res) => res,
  (err) => { console.warn('[api] request failed:', err?.message); return Promise.reject(err) }
)

export default api
