import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  adminOnly?: boolean
  sellerOrAdminOnly?: boolean
}

export function ProtectedRoute({ children, adminOnly = false, sellerOrAdminOnly = false }: ProtectedRouteProps) {
  const { user, isAdmin, role, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p>Checking authentication...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />
  }

  if (sellerOrAdminOnly && !(isAdmin || role === 'seller')) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
