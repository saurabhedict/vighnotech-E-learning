import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import RequireAdmin from './components/RequireAdmin'
import Loader from './components/Loader'

// Route-level code splitting: each page is its own chunk, so the initial bundle
// stays small and admin/3D/etc. only download when visited.
const Login = lazy(() => import('./pages/Login'))
const Signup = lazy(() => import('./pages/Signup'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const Home = lazy(() => import('./pages/Home'))
const ModuleView = lazy(() => import('./pages/ModuleView'))
const CourseLearn = lazy(() => import('./pages/CourseWorkspace'))
const ContentViewer = lazy(() => import('./pages/ContentViewer'))
const Library = lazy(() => import('./pages/Library'))
const Favorites = lazy(() => import('./pages/Favorites'))
const Search = lazy(() => import('./pages/Search'))
const Browse = lazy(() => import('./pages/Browse'))
const Wallet = lazy(() => import('./pages/Wallet'))
const Profile = lazy(() => import('./pages/Profile'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Cart = lazy(() => import('./pages/Cart'))

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
