import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { hasRequiredRole, hasPermission } from '../utils/accessControl'

const ProtectedRoute = ({ children, allowedRoles, permission }) => {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />
  }

  // Check for trial expiration
  if (user?.is_trial && user?.trial_ends_at && new Date() > new Date(user.trial_ends_at)) {
    return <Navigate to="/trial-expired" state={{ from: location }} replace />
  }

  if (permission && !hasPermission(user, permission)) {
    return <Navigate to="/access-denied" state={{ from: location }} replace />
  }

  if (allowedRoles && !hasRequiredRole(user?.role, allowedRoles)) {
    return <Navigate to="/access-denied" state={{ from: location }} replace />
  }

  return children
}

export default ProtectedRoute
