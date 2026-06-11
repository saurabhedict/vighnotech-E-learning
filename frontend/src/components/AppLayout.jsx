import { useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import Footer from './Footer'
import AnnouncementBar from './AnnouncementBar'
import { authApi } from '../api/authApi'
import { setUser, logout } from '../store/authSlice'

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  const isLoggedIn = useSelector((s) => s.auth.isLoggedIn)
  const theme = useSelector((s) => s.ui.theme)

  // Show Back only on drilled-in pages (module/content) — not on top-level pages
  const segs = location.pathname.replace(/^\/app\/?/, '').split('/').filter(Boolean)
  const showBack = segs.length >= 2

  // Admin pages get their own internal sidebar — don't show the course sidebar
  const isAdminPage = location.pathname.startsWith('/app/admin')

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/')
      return
    }
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
      <AnnouncementBar />
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        {!isAdminPage && <Sidebar />}
        <main className="flex-1 overflow-y-auto flex flex-col">
          <div className="flex-1 p-6">
            {showBack && !isAdminPage && (
              <button
                onClick={() => navigate(-1)}
                className="mb-5 inline-flex items-center gap-1.5 text-sm text-vigno-muted hover:text-vigno-txt bg-vigno-card/60 hover:bg-vigno-card border border-vigno-line/50 rounded-lg px-3 py-1.5 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
                Back
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
