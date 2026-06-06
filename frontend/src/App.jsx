import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import RequireAdmin from './components/RequireAdmin'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import Home from './pages/Home'
import ModuleView from './pages/ModuleView'
import ContentViewer from './pages/ContentViewer'
import Library from './pages/Library'
import Favorites from './pages/Favorites'
import Search from './pages/Search'
import Profile from './pages/Profile'
import AdminDashboard from './pages/admin/AdminDashboard'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/app" element={<AppLayout />}>
        <Route index element={<Navigate to="PPL_Ground" replace />} />
        <Route path="library" element={<Library />} />
        <Route path="favorites" element={<Favorites />} />
        <Route path="search" element={<Search />} />
        <Route path="profile" element={<Profile />} />
        <Route path="admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
        <Route path="content/:contentId" element={<ContentViewer />} />
        <Route path=":className" element={<Home />} />
        <Route path=":className/module/:moduleId" element={<ModuleView />} />
        <Route path=":className/module/:moduleId/content/:contentId" element={<ContentViewer />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
