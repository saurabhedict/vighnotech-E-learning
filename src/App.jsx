import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import Login from './pages/Login'
import Home from './pages/Home'
import ModuleView from './pages/ModuleView'
import ContentViewer from './pages/ContentViewer'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/app" element={<AppLayout />}>
        <Route index element={<Navigate to="PPL_Ground" replace />} />
        <Route path=":className" element={<Home />} />
        <Route path=":className/module/:moduleId" element={<ModuleView />} />
        <Route path=":className/module/:moduleId/content/:contentId" element={<ContentViewer />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
