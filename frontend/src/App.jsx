import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import RequireAdmin from './components/RequireAdmin'
import Loader from './components/Loader'

// A failed dynamic import almost always means a redeploy changed the content-
// hashed chunk names while this tab still holds the old index.html. Force ONE
// full reload to pick up the fresh chunk names. The 10s guard means that if the
// import fails AGAIN right after reloading, it's a genuine error — let it bubble
// to the ErrorBoundary instead of looping forever.
function lazyWithReload(factory) {
  return lazy(() =>
    factory().catch((err) => {
      const KEY = 'chunk-reload-at'
      const last = Number(sessionStorage.getItem(KEY) || 0)
      if (Date.now() - last > 10_000) {
        sessionStorage.setItem(KEY, String(Date.now()))
        window.location.reload()
        return new Promise(() => {}) // hang until the reload takes over
      }
      throw err
    })
  )
}

// Route-level code splitting: each page is its own chunk, so the initial bundle
// stays small and admin/3D/etc. only download when visited.
const Login = lazyWithReload(() => import('./pages/Login'))
const Signup = lazyWithReload(() => import('./pages/Signup'))
const ForgotPassword = lazyWithReload(() => import('./pages/ForgotPassword'))
const Home = lazyWithReload(() => import('./pages/Home'))
const ModuleView = lazyWithReload(() => import('./pages/ModuleView'))
const CourseLearn = lazyWithReload(() => import('./pages/CourseWorkspace'))
const ContentViewer = lazyWithReload(() => import('./pages/ContentViewer'))
const Library = lazyWithReload(() => import('./pages/Library'))
const Favorites = lazyWithReload(() => import('./pages/Favorites'))
const Search = lazyWithReload(() => import('./pages/Search'))
const Browse = lazyWithReload(() => import('./pages/Browse'))
const Wallet = lazyWithReload(() => import('./pages/Wallet'))
const Profile = lazyWithReload(() => import('./pages/Profile'))
const AdminDashboard = lazyWithReload(() => import('./pages/admin/AdminDashboard'))
const Dashboard = lazyWithReload(() => import('./pages/Dashboard'))
const NotFound = lazyWithReload(() => import('./pages/NotFound'))
const Cart = lazyWithReload(() => import('./pages/Cart'))

export default function App() {
  return (
    <Suspense fallback={<Loader fullscreen />}>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="library" element={<Library />} />
          <Route path="favorites" element={<Favorites />} />
          <Route path="search" element={<Search />} />
          <Route path="browse" element={<Browse />} />
          <Route path="wallet" element={<Wallet />} />
          <Route path="profile" element={<Profile />} />
          <Route path="cart" element={<Cart />} />
          <Route path="admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
          <Route path="content/:contentId" element={<ContentViewer />} />
          <Route path=":className" element={<Home />} />
          <Route path=":className/learn" element={<CourseLearn />} />
          <Route path=":className/module/:moduleId" element={<ModuleView />} />
          <Route path=":className/module/:moduleId/content/:contentId" element={<ContentViewer />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}
