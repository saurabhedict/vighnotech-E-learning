import { useSelector } from 'react-redux'
import { Navigate } from 'react-router-dom'
import { ROLES } from '@vigno/shared'

// Keep clients out of catalog/discovery/buy routes — they may only reach their
// granted courses. Send them to My Learning. (Access is also license-gated server-side.)
export default function RequireNotClient({ children }) {
  const user = useSelector((s) => s.auth.user)
  if (user?.role === ROLES.CLIENT) return <Navigate to="/app/library" replace />
  return children
}
