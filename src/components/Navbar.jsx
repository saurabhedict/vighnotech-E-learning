import { useNavigate, NavLink } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { logout } from '../store/authSlice'
import { toggleTheme } from '../store/uiSlice'
import { authApi } from '../api/authApi'

const linkCls = ({ isActive }) =>
  'rounded-lg px-3 py-1.5 text-sm ' + (isActive ? 'bg-vigno-accent text-[#1a0d0f] font-bold' : 'bg-white/10 hover:bg-white/20')

export default function Navbar() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const user = useSelector((s) => s.auth.user)
  const theme = useSelector((s) => s.ui.theme)

  const doLogout = async () => {
    await authApi.logout()
    dispatch(logout())
    navigate('/')
  }

  return (
    <header className="flex items-center gap-3 px-5 py-3 bg-black/30 backdrop-blur">
      <div className="font-extrabold text-lg">
        <span className="text-vigno-accent2">✈</span>Aero<span className="text-vigno-accent">Learn</span>
      </div>
      <span className="text-xs bg-white/10 rounded-full px-2 py-0.5 text-vigno-muted">{user?.email}</span>
      {user?.role === 'admin' && (
        <span className="text-[10px] bg-vigno-accent/25 text-vigno-accent2 rounded-full px-2 py-0.5 font-bold">ADMIN</span>
      )}
      <div className="flex-1" />

      <NavLink to="/app/library" className={linkCls}>📚 Library</NavLink>
      <NavLink to="/app/profile" className={linkCls}>👤 Profile</NavLink>
      {user?.role === 'admin' && <NavLink to="/app/admin" className={linkCls}>🛠 Admin</NavLink>}

      <button onClick={() => dispatch(toggleTheme())} className="bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 text-sm">
        {theme === 'dark' ? '☀ Light' : '🌙 Dark'}
      </button>
      <button onClick={doLogout} className="bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 text-sm">Logout</button>
    </header>
  )
}
