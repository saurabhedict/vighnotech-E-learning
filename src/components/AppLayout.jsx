import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Navbar from './Navbar'
import Sidebar from './Sidebar'

// Auth-guarded shell. Theme (from Redux) is applied as a class on the wrapper.
export default function AppLayout() {
  const navigate = useNavigate()
  const isLoggedIn = useSelector((s) => s.auth.isLoggedIn)
  const theme = useSelector((s) => s.ui.theme)

  useEffect(() => { if (!isLoggedIn) navigate('/') }, [isLoggedIn, navigate])

  return (
    <div className={(theme === 'light' ? 'theme-light ' : '') + 'min-h-screen flex flex-col'}>
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-7 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
