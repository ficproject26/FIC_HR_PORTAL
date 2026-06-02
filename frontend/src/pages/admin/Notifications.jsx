import React, { useEffect, useState } from 'react'
import { RiBellLine, RiCheckDoubleLine, RiTimeLine } from 'react-icons/ri'
import api from '../../utils/api'
import useNotificationStore from '../../store/notificationStore'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import Pagination from '../../components/ui/Pagination'
import { timeAgo } from '../../utils/helpers'
import useThemeStore from '../../store/themeStore'
import { card, getTheme, btnSecondary } from '../../utils/styles'
import toast from 'react-hot-toast'

const typeConfig = {
  info:    { bg: '#dbeafe', border: '#bfdbfe', icon: '💬', color: '#1d4ed8' },
  warning: { bg: '#fef9c3', border: '#fde68a', icon: '⚠️', color: '#854d0e' },
  error:   { bg: '#fee2e2', border: '#fecaca', icon: '❌', color: '#b91c1c' },
  success: { bg: '#dcfce7', border: '#bbf7d0', icon: '✅', color: '#15803d' },
  alert:   { bg: '#ffedd5', border: '#fed7aa', icon: '🔔', color: '#9a3412' },
}

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState([])
  const [pagination, setPagination] = useState({})
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const { markAllRead } = useNotificationStore()
  const { isDark } = useThemeStore()
  const t = getTheme(isDark)

  useEffect(() => { fetchNotifications() }, [page])

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/notifications?page=${page}&limit=15`)
      setNotifications(res.data.data)
      setPagination(res.data.pagination)
    } catch (e) {}
    finally { setLoading(false) }
  }

  const handleMarkRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    } catch (e) {}
  }

  const handleMarkAllRead = async () => {
    await markAllRead()
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    toast.success('All notifications marked as read')
  }

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: t.textPrimary, margin: '0 0 4px' }}>Notifications</h1>
          <p style={{ color: t.textSecondary, fontSize: '0.875rem', margin: 0 }}>System alerts and activity notifications</p>
        </div>
        <button onClick={handleMarkAllRead} style={{ ...btnSecondary(isDark), display: 'flex', alignItems: 'center', gap: '6px' }}>
          <RiCheckDoubleLine /> Mark All Read
        </button>
      </div>

      {loading ? <PageLoader /> : (
        <div>
          {notifications.map(notif => {
            const cfg = typeConfig[notif.type] || typeConfig.info
            return (
              <div
                key={notif.id}
                onClick={() => !notif.is_read && handleMarkRead(notif.id)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '14px',
                  padding: '16px 20px', borderRadius: '14px', marginBottom: '10px',
                  background: notif.is_read ? (isDark ? '#1e293b' : '#ffffff') : cfg.bg,
                  border: `1px solid ${notif.is_read ? t.border : cfg.border}`,
                  cursor: notif.is_read ? 'default' : 'pointer',
                  opacity: notif.is_read ? 0.75 : 1,
                  transition: 'all 0.15s',
                  boxShadow: notif.is_read ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
                }}
              >
                <span style={{ fontSize: '20px', flexShrink: 0, marginTop: '2px' }}>{cfg.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: notif.is_read ? '500' : '700', color: notif.is_read ? t.textSecondary : cfg.color, margin: 0 }}>
                      {notif.title}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      {!notif.is_read && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />}
                      <span style={{ fontSize: '0.75rem', color: t.textMuted, display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <RiTimeLine /> {timeAgo(notif.created_at)}
                      </span>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: t.textSecondary, margin: '4px 0 0', lineHeight: 1.5 }}>{notif.message}</p>
                </div>
              </div>
            )
          })}

          {notifications.length === 0 && (
            <div style={{ ...card(isDark), textAlign: 'center', padding: '64px 24px' }}>
              <RiBellLine style={{ fontSize: '48px', color: t.textMuted, marginBottom: '12px' }} />
              <p style={{ color: t.textSecondary, margin: 0 }}>No notifications yet</p>
            </div>
          )}

          <Pagination pagination={pagination} onPageChange={setPage} />
        </div>
      )}
    </div>
  )
}
