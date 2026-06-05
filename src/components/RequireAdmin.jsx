import { useSelector } from 'react-redux'
import { Navigate } from 'react-router-dom'

// Gate admin-only routes. RBAC is also enforced server-side; this just hides UI.
export default function RequireAdmin({ children }) {
  const user = useSelector((s) => s.auth.user)
  if (user?.role !== 'admin') return <Navigate to="/app/PPL_Ground" replace />
  return children
}
