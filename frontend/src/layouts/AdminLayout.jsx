import React, { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  RiDashboardLine, RiTeamLine, RiUserSettingsLine, RiBarChartLine,
  RiFileChartLine, RiNotification3Line, RiMenuLine, RiCloseLine,
  RiSunLine, RiMoonLine, RiLogoutBoxLine, RiContactsLine,
  RiShieldUserLine, RiSearchLine, RiTaskLine
} from 'react-icons/ri'
import useAuthStore from '../store/authStore'
import useThemeStore from '../store/themeStore'
import useNotificationStore from '../store/notificationStore'
import { getSocket } from '../utils/socket'
import { getInitials } from '../utils/helpers'
import toast from 'react-hot-toast'

const navItems = [
  { to: '/admin', icon: RiDashboardLine, label: 'Dashboard', end: true },
  { to: '/admin/monitoring', icon: RiTeamLine, label: 'Attendance' },
  { to: '/admin/leads', icon: RiContactsLine, label: 'Lead' },
  { to: '/admin/hr-management', icon: RiUserSettingsLine, label: 'HR Management' },
  { to: '/admin/tasks', icon: RiTaskLine, label: 'Task' },
  { to: '/admin/performance', icon: RiBarChartLine, label: 'Performance' },
  { to: '/admin/reports', icon: RiFileChartLine, label: 'Reports' },
  { to: '/admin/notifications', icon: RiNotification3Line, label: 'Notifications' },
]

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, logout } = useAuthStore()
  const { isDark, toggleTheme } = useThemeStore()
  const { unreadCount, fetchNotifications, addNotification } = useNotificationStore()
  const navigate = useNavigate()

  const bg = isDark ? '#0f172a' : '#f8fafc'
  const sidebarBg = '#131c2e' // Dark navy sidebar matching HR layout
  const border = isDark ? '#334155' : '#e2e8f0'
  const sidebarBorder = 'rgba(255,255,255,0.07)'
  const textPrimary = isDark ? '#f1f5f9' : '#0f172a'
  const textSecondary = isDark ? '#94a3b8' : '#64748b'
  const headerBg = isDark ? '#1e293b' : '#ffffff'

  useEffect(() => {
    fetchNotifications()
    const socket = getSocket()
    if (socket) {
      socket.on('new_notification', (notif) => {
        addNotification(notif)
        toast(notif.message, { icon: '🔔' })
      })
    }
    return () => {
      const s = getSocket()
      if (s) s.off('new_notification')
    }
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const sidebarWidth = sidebarOpen ? '240px' : '64px'

  return (
    <div style={{ display: 'flex', height: '100vh', background: bg, fontFamily: "'Inter', system-ui, sans-serif", overflow: 'hidden' }}>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 20 }}
        />
      )}

      {/* Sidebar */}
      <aside style={{
        width: sidebarWidth,
        minWidth: sidebarWidth,
        background: sidebarBg,
        borderRight: `1px solid ${sidebarBorder}`,
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s ease',
        overflow: 'hidden',
        zIndex: 30,
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '20px 16px', borderBottom: `1px solid ${sidebarBorder}`,
          minHeight: '72px',
        }}>
          <svg width="40" height="40" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: '50%', background: '#fff', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
            <path d="M 38 28 L 62 28 L 62 32 L 44 32 L 44 48 L 38 48 Z" fill="#2563eb" />
            <polygon points="53,37 62,48 44,48" fill="#facc15" />
            <text x="50" y="65" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="11.5" fill="#2563eb" textAnchor="middle">
              FORGE <tspan fill="#facc15">INDIA</tspan>
            </text>
            <text x="50" y="78" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="8" fill="#2563eb" textAnchor="middle" letterSpacing="1px">
              CONNECT
            </text>
          </svg>
          {sidebarOpen && (
            <div>
              <p style={{ fontWeight: '800', color: '#f1f5f9', fontSize: '0.9rem', margin: 0, letterSpacing: '0.5px' }}>FORGE INDIA</p>
              <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: 0 }}>Admin Panel</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: sidebarOpen ? '10px 12px' : '10px',
                borderRadius: '10px', textDecoration: 'none',
                fontSize: '0.9rem', fontWeight: isActive ? '800' : '600',
                justifyContent: sidebarOpen ? 'flex-start' : 'center',
                background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: isActive ? '#ffffff' : '#cbd5e1',
                transition: 'all 0.15s',
              })}
              title={!sidebarOpen ? label : ''}
            >
              <Icon style={{ fontSize: '18px', flexShrink: 0, color: '#ffb703' }} />
              {sidebarOpen && <span style={{ whiteSpace: 'nowrap' }}>{label}</span>}
              {sidebarOpen && label === 'Notifications' && unreadCount > 0 && (
                <span style={{
                  marginLeft: 'auto', background: '#ef4444', color: 'white',
                  fontSize: '0.65rem', borderRadius: '9999px',
                  width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: '700',
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div style={{ padding: '12px 8px', borderTop: `1px solid ${sidebarBorder}` }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '8px', borderRadius: '10px',
            justifyContent: sidebarOpen ? 'flex-start' : 'center',
          }}>
            <div style={{
              width: '32px', height: '32px', minWidth: '32px',
              background: isDark ? 'rgba(59,130,246,0.2)' : '#eff6ff',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: '#3b82f6', fontSize: '0.7rem', fontWeight: '800' }}>{getInitials(user?.name)}</span>
            </div>
            {sidebarOpen && (
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '0.8rem', fontWeight: '600', color: '#f1f5f9', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</p>
                <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: 0, textTransform: 'capitalize' }}>{user?.role}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {/* Topbar */}
        <header style={{
          background: headerBg, borderBottom: `1px solid ${border}`,
          padding: '0 16px', height: '56px', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0,
        }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', color: textSecondary, fontSize: '20px', display: 'flex' }}
          >
            {sidebarOpen ? <RiCloseLine /> : <RiMenuLine />}
          </button>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 16px' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '350px' }}>
              <RiSearchLine style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: textSecondary }} />
              <input 
                type="text" 
                placeholder="Search HR, reports..." 
                style={{ 
                  width: '100%', padding: '8px 16px 8px 36px', borderRadius: '20px', border: `1px solid ${border}`,
                  background: isDark ? '#0f172a' : '#f1f5f9', color: textPrimary, outline: 'none', fontSize: '0.85rem'
                }} 
              />
            </div>
          </div>

          <button onClick={toggleTheme} style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', color: textSecondary, fontSize: '20px', display: 'flex' }}>
            {isDark ? <RiSunLine /> : <RiMoonLine />}
          </button>

          <NavLink to="/admin/notifications" style={{ position: 'relative', padding: '8px', borderRadius: '8px', color: textSecondary, fontSize: '20px', display: 'flex' }}>
            <RiNotification3Line />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: '4px', right: '4px',
                width: '16px', height: '16px', background: '#ef4444', color: 'white',
                fontSize: '0.6rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700',
              }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </NavLink>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0 4px 12px', borderLeft: `1px solid ${border}`, marginLeft: '4px' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg, #2563eb, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '0.75rem' }}>
              {getInitials(user?.name)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '600', color: textPrimary }}>{user?.name?.split(' ')[0]}</span>
              <span style={{ fontSize: '0.65rem', color: textSecondary, textTransform: 'capitalize' }}>{user?.role}</span>
            </div>
          </div>

          <button onClick={handleLogout} style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444', fontSize: '20px', display: 'flex' }} title="Logout">
            <RiLogoutBoxLine />
          </button>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px', background: bg }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
