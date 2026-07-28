import { useSelector } from 'react-redux'
import { Navigate } from 'react-router-dom'
import { ROLES } from '@vigno/shared'

// Gate admin-only routes. RBAC is also enforced server-side; this just hides UI.
export default function RequireAdmin({ children }) {
  const user = useSelector((s) => s.auth.user)
  if (user?.role !== ROLES.ADMIN) return <Navigate to="/app" replace />
  return children
}
