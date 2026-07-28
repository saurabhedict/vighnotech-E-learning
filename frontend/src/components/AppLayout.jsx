import { useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import Navbar from './Navbar'
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
  const isDark = theme === 'dark'

  const segs = location.pathname.replace(/^\/app\/?/, '').split('/').filter(Boolean)
  const showBack = segs.length >= 2

  useEffect(() => {
    if (!isLoggedIn) { navigate('/'); return }
    authApi
      .me()
      .then((user) => dispatch(setUser(user)))
      .catch((err) => {
        const s = err?.response?.status
        if (s === 401 || s === 403) dispatch(logout())
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn])

  // Admins are free to browse the whole student-facing site (all content is
  // unlocked for them) as well as the admin panel — no forced redirect.

  if (!isLoggedIn) return null

  return (
    <div className={(isDark ? '' : 'theme-light ') + 'min-h-screen flex flex-col'}>
      {/* Background */}
      <div className={[
        'fixed inset-0 -z-10 transition-colors duration-200',
        isDark
          ? 'bg-gradient-to-br from-[#060c1c] via-[#09122e] to-[#0b1a3e]'
          : 'bg-white',
      ].join(' ')} />

      <AnnouncementBar />
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-auto flex flex-col min-w-0">
          <div className="flex-1 px-8 py-7 max-w-7xl mx-auto w-full">
            {showBack && (
              <button
                onClick={() => navigate(-1)}
                className={[
                  'mb-5 inline-flex items-center gap-1.5 text-xs font-medium rounded-md px-3 py-1.5 border transition-all',
                  isDark
                    ? 'bg-white/5 hover:bg-white/9 border-vigno-line/40 text-vigno-muted hover:text-vigno-txt'
                    : 'bg-white hover:bg-vigno-bg2 border-vigno-line/60 text-vigno-muted hover:text-vigno-txt shadow-sm',
                ].join(' ')}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
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
