import axios from 'axios'
import { store } from '../store'
import { setCredentials, logout } from '../store/authSlice'

// Configured Axios instance for the backend (Express + License Authority).
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api',
  // 60s (not 12s): the free-tier backend spins down after idle and can take ~50s
  // to cold-start. 12s aborted login / Razorpay order / downloads mid-wake. File
  // upload/download calls override this with timeout:0 (unbounded).
  timeout: 60000,
  withCredentials: true, // send httpOnly auth/refresh cookies
})

// Request — attach the access token from Redux as a Bearer header (the backend
// accepts either the cookie or this header).
api.interceptors.request.use((config) => {
  const token = store.getState().auth.user?.token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response — on a 401, try ONE silent refresh (via the httpOnly refresh cookie)
// then replay the original request. If that fails, log the user out.
let refreshing = null

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    const status = err.response?.status

    // Only skip the silent-refresh for endpoints that must never trigger it
    // (login/signup/refresh/logout). /auth/me MUST be allowed to refresh-and-retry,
    // otherwise returning users get logged out on every reload.
    const noRefresh = /\/auth\/(login|signup|refresh|logout)/.test(original?.url || '')
    if (status === 401 && original && !original._retried && !noRefresh) {
      original._retried = true
      try {
        refreshing =
          refreshing ||
          axios
            .post(`${api.defaults.baseURL}/auth/refresh`, {}, { withCredentials: true })
            .finally(() => {
              refreshing = null
            })
        const { data } = await refreshing
        const current = store.getState().auth.user || {}
        store.dispatch(setCredentials({ user: { ...current, ...data.user }, token: data.token }))
        original.headers.Authorization = `Bearer ${data.token}`
        return api(original)
      } catch {
        // Refresh failed — token revoked / signed in elsewhere (single session).
        try { sessionStorage.setItem('vigno_session_ended', '1') } catch { /* ignore */ }
        store.dispatch(logout())
      }
    }

    if (import.meta.env.DEV) console.warn('[api]', original?.url, err?.response?.status, err?.message)
    return Promise.reject(err)
  }
)

export default api
