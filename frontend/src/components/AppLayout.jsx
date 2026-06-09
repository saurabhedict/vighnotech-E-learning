import { useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import Footer from './Footer'
import { authApi } from '../api/authApi'
import { setUser, logout } from '../store/authSlice'

// Auth-guarded shell. Validates the persisted session against the backend on
// mount (refreshes profile, or logs out if the token is no longer valid).
export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  const isLoggedIn = useSelector((s) => s.auth.isLoggedIn)
  const theme = useSelector((s) => s.ui.theme)

  // Show Back only on drilled-in pages (module/content) — not on top-level
  // pages reached from the nav/sidebar (home, profile, library, …).
  const segs = location.pathname.replace(/^\/app\/?/, '').split('/').filter(Boolean)
  const showBack = segs.length >= 2

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/')
      return
    }
    // Revalidate the session. Only log out on a real auth failure (401/403) —
    // a transient network error must NOT destroy a valid persisted session.
    authApi
      .me()
      .then((user) => dispatch(setUser(user)))
      .catch((err) => {
        const s = err?.response?.status
        if (s === 401 || s === 403) dispatch(logout())
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn])

  if (!isLoggedIn) return null

  return (
    <div className={(theme === 'light' ? 'theme-light ' : '') + 'min-h-screen flex flex-col'}>
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 overflow-auto flex flex-col">
          <div className="flex-1 p-7">
            {showBack && (
              <button
                onClick={() => navigate(-1)}
                className="mb-4 inline-flex items-center gap-1.5 text-sm bg-white/10 hover:bg-white/20 border border-vigno-line rounded-lg px-3 py-1.5"
              >
                ← Back
              </button>
            )}
            <Outlet />
          </div>
          <Footer />
        </main>
      </div>
    </div>
  )
}
