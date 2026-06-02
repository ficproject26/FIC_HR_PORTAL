import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import useAuthStore from './store/authStore'
import useThemeStore from './store/themeStore'
import ErrorBoundary from './components/ErrorBoundary'

// Auth
import Login from './pages/Login'
import ProtectedRoute from './components/ProtectedRoute'

// Admin Layout & Pages
import AdminLayout from './layouts/AdminLayout'
import AdminDashboard from './pages/admin/Dashboard'
import AdminHRMonitoring from './pages/admin/HRMonitoring'
import AdminLeads from './pages/admin/Leads'
import AdminHRManagement from './pages/admin/HRManagement'
import AdminPerformance from './pages/admin/Performance'
import AdminReports from './pages/admin/Reports'
import AdminNotifications from './pages/admin/Notifications'
import AdminTasks from './pages/admin/Tasks'

// HR Layout & Pages
import HRLayout from './layouts/HRLayout'
import HRDashboard from './pages/hr/Dashboard'
import HRLeads from './pages/hr/Leads'
import HRFollowUps from './pages/hr/FollowUps'
import HRCalendar from './pages/hr/Calendar'
import HRCandidates from './pages/hr/Candidates'
import HRTasks from './pages/hr/Tasks'
import HRNotifications from './pages/hr/Notifications'
import HRProfile from './pages/hr/Profile'
import HRAttendance from './pages/hr/Attendance'
import HRReports from './pages/hr/Reports'

function App() {
  const { user, initAuth } = useAuthStore()
  const { isDark } = useThemeStore()

  useEffect(() => {
    initAuth()
  }, [])

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDark])

  return (
    <ErrorBoundary>
    <div className={isDark ? 'dark' : ''}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute role="admin">
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<AdminDashboard />} />
            <Route path="monitoring" element={<AdminHRMonitoring />} />
            <Route path="leads" element={<AdminLeads />} />
            <Route path="hr-management" element={<AdminHRManagement />} />
            <Route path="tasks" element={<AdminTasks />} />
            <Route path="performance" element={<AdminPerformance />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="notifications" element={<AdminNotifications />} />
          </Route>

          {/* HR Routes */}
          <Route path="/hr" element={
            <ProtectedRoute role="hr">
              <HRLayout />
            </ProtectedRoute>
          }>
            <Route index element={<HRDashboard />} />
            <Route path="leads" element={<HRLeads />} />
            <Route path="follow-ups" element={<HRFollowUps />} />
            <Route path="calendar" element={<HRCalendar />} />
            <Route path="candidates" element={<HRCandidates />} />
            <Route path="tasks" element={<HRTasks />} />
            <Route path="notifications" element={<HRNotifications />} />
            <Route path="attendance" element={<HRAttendance />} />
            <Route path="reports" element={<HRReports />} />
            <Route path="profile" element={<HRProfile />} />
          </Route>

          {/* Default redirect */}
          <Route path="/" element={
            user ? (
              user.role === 'admin' ? <Navigate to="/admin" replace /> : <Navigate to="/hr" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: isDark ? '#1e293b' : '#fff',
            color: isDark ? '#f1f5f9' : '#1e293b',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            borderRadius: '12px',
            fontSize: '14px',
          },
        }}
      />
    </div>
    </ErrorBoundary>
  )
}

export default App
