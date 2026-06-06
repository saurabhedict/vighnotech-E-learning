import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import RequireAdmin from './components/RequireAdmin'

// Route-level code splitting: each page is its own chunk, so the initial bundle
// stays small and admin/3D/etc. only download when visited.
const Login = lazy(() => import('./pages/Login'))
const Signup = lazy(() => import('./pages/Signup'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const Home = lazy(() => import('./pages/Home'))
const ModuleView = lazy(() => import('./pages/ModuleView'))
const ContentViewer = lazy(() => import('./pages/ContentViewer'))
const Library = lazy(() => import('./pages/Library'))
const Favorites = lazy(() => import('./pages/Favorites'))
const Search = lazy(() => import('./pages/Search'))
const Wallet = lazy(() => import('./pages/Wallet'))
const Profile = lazy(() => import('./pages/Profile'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const NotFound = lazy(() => import('./pages/NotFound'))

const Loading = () => <div className="p-8 text-vigno-muted">Loading…</div>

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Navigate to="PPL_Ground" replace />} />
          <Route path="library" element={<Library />} />
          <Route path="favorites" element={<Favorites />} />
          <Route path="search" element={<Search />} />
          <Route path="wallet" element={<Wallet />} />
          <Route path="profile" element={<Profile />} />
          <Route path="admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
          <Route path="content/:contentId" element={<ContentViewer />} />
          <Route path=":className" element={<Home />} />
          <Route path=":className/module/:moduleId" element={<ModuleView />} />
          <Route path=":className/module/:moduleId/content/:contentId" element={<ContentViewer />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}
