import React from 'react'
import { Navigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'

const ProtectedRoute = ({ children, role }) => {
  const { user, token } = useAuthStore()

  if (!token || !user) return <Navigate to="/login" replace />

  if (role === 'admin' && user.role !== 'admin') {
    return <Navigate to="/hr" replace />
  }

  if (role === 'hr' && !['admin', 'hr'].includes(user.role)) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute
