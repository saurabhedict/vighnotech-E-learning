import { createSlice } from '@reduxjs/toolkit'

// Persist the session so a page refresh keeps the user logged in. We store the
// access token + safe user fields; the refresh token lives in an httpOnly cookie.
const STORAGE_KEY = 'vigno.auth'

function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { isLoggedIn: false, user: null }
    const user = JSON.parse(raw)
    return { isLoggedIn: !!user?.token, user }
  } catch {
    return { isLoggedIn: false, user: null }
  }
}

function persist(user) {
  try {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore quota/private-mode errors */
  }
}

const authSlice = createSlice({
  name: 'auth',
  initialState: loadPersisted(),
  reducers: {
    // payload: { user, token } — merges token onto the user object we keep.
    setCredentials: (state, action) => {
      const { user, token } = action.payload
      const merged = { ...user, token: token ?? user?.token }
      state.isLoggedIn = !!merged.token
      state.user = merged
      persist(merged)
    },
    // Refresh just the profile fields (e.g. after /me) without touching token.
    setUser: (state, action) => {
      state.user = { ...state.user, ...action.payload }
      persist(state.user)
    },
    login: (state, action) => {
      state.isLoggedIn = true
      state.user = action.payload
      persist(action.payload)
    },
    logout: (state) => {
      state.isLoggedIn = false
      state.user = null
      persist(null)
    },
  },
})

export const { setCredentials, setUser, login, logout } = authSlice.actions
export default authSlice.reducer
