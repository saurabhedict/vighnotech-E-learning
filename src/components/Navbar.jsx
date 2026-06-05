import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { logout } from '../store/authSlice'
import { toggleTheme } from '../store/uiSlice'

export default function Navbar() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const user = useSelector((s) => s.auth.user)
  const theme = useSelector((s) => s.ui.theme)

  return (
    <header className="flex items-center gap-3 px-5 py-3 bg-black/30 backdrop-blur">
      <div className="font-extrabold text-lg">
        <span className="text-vigno-accent2">✈</span>Aero<span className="text-vigno-accent">Learn</span>
      </div>
      <span className="text-xs bg-white/10 rounded-full px-2 py-0.5 text-vigno-muted">{user?.email}</span>
      <div className="flex-1" />
      <button onClick={() => dispatch(toggleTheme())}
        className="bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 text-sm">
        {theme === 'dark' ? '☀ Light' : '🌙 Dark'}
      </button>
      <button className="bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 text-sm">📚 My Courses</button>
      <button onClick={() => { dispatch(logout()); navigate('/') }}
        className="bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 text-sm">Logout</button>
    </header>
  )
}
