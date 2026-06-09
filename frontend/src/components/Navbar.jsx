import { useState } from 'react'
import { useNavigate, NavLink } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { logout } from '../store/authSlice'
import { toggleTheme } from '../store/uiSlice'
import { authApi } from '../api/authApi'
import { useSiteSettings } from '../hooks/useSiteSettings'
import Avatar from './Avatar'

const linkCls = ({ isActive }) =>
  'rounded-lg px-3 py-1.5 text-sm ' + (isActive ? 'bg-vigno-accent text-[#1a0d0f] font-bold' : 'bg-white/10 hover:bg-white/20')

export default function Navbar() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const user = useSelector((s) => s.auth.user)
  const theme = useSelector((s) => s.ui.theme)
  const { data: settings } = useSiteSettings()
  const brandName = settings?.brand?.name || 'AeroLearn'
  const [q, setQ] = useState('')

  const doLogout = async () => {
    await authApi.logout()
    dispatch(logout())
    navigate('/')
  }

  const doSearch = (e) => {
    e.preventDefault()
    navigate(`/app/search${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`)
  }

  return (
    <header className="flex items-center gap-3 px-5 py-3 bg-black/30 backdrop-blur">
      <NavLink to="/app" className="font-extrabold text-lg shrink-0" title="Home">
        <span className="text-vigno-accent2">✈</span> {brandName}
      </NavLink>
      {user?.role === 'admin' && (
        <span className="text-[10px] bg-vigno-accent/25 text-vigno-accent2 rounded-full px-2 py-0.5 font-bold">ADMIN</span>
      )}

      <form onSubmit={doSearch} className="flex-1 max-w-md mx-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Search content…"
          className="w-full px-3 py-1.5 rounded-lg bg-black/30 border border-vigno-line text-sm outline-none focus:border-vigno-accent" />
      </form>

      <NavLink to="/app" end className={linkCls}>🏠 Home</NavLink>
      <NavLink to="/app/favorites" className={linkCls}>★ Saved</NavLink>
      <NavLink to="/app/wallet" className={linkCls}>👛 Wallet</NavLink>
      <NavLink to="/app/library" className={linkCls}>📚 Library</NavLink>
      {user?.role === 'admin' && <NavLink to="/app/admin" className={linkCls}>🛠 Admin</NavLink>}

      <button onClick={() => dispatch(toggleTheme())} className="bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 text-sm">
        {theme === 'dark' ? '☀ Light' : '🌙 Dark'}
      </button>
      <button onClick={doLogout} className="bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 text-sm">Logout</button>

      <NavLink to="/app/profile" title={user?.name || user?.email || 'Profile'} className="ml-1">
        <Avatar user={user} size={34} verified={user?.verified} className="hover:ring-2 hover:ring-vigno-accent2 transition" />
      </NavLink>
    </header>
  )
}
