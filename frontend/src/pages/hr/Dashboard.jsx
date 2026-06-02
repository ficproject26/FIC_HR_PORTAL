import React, { useEffect, useState } from 'react'
import { RiContactsLine, RiCalendarCheckLine, RiBarChartLine, RiCheckboxCircleLine, RiTimeLine, RiPhoneLine, RiLoginBoxLine, RiLogoutBoxLine, RiCupLine } from 'react-icons/ri'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../../utils/api'
import StatCard from '../../components/ui/StatCard'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import toast from 'react-hot-toast'
import { formatTime, formatDuration, formatDurationHMS, getInitials } from '../../utils/helpers'
import useAuthStore from '../../store/authStore'
import useThemeStore from '../../store/themeStore'
import { card, getTheme, getStatusBadge, getPriorityBadge } from '../../utils/styles'
import Modal from '../../components/ui/Modal'

export default function HRDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [liveHours, setLiveHours] = useState(0)
  const [liveBreak, setLiveBreak] = useState(0)
  const [actionLoading, setActionLoading] = useState(null)
  const { user } = useAuthStore()
  const { isDark } = useThemeStore()
  const t = getTheme(isDark)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalTitle, setModalTitle] = useState('')
  const [modalType, setModalType] = useState('')
  const [modalList, setModalList] = useState([])
  const [modalLoading, setModalLoading] = useState(false)

  const handleCardClick = async (type, title) => {
    setModalType(type)
    setModalTitle(title)
    setModalOpen(true)
    setModalLoading(true)
    setModalList([])
    try {
      const res = await api.get(`/hr/kpi-details?type=${type}`)
      setModalList(res.data.data)
    } catch (e) {
      console.error(e)
    } finally {
      setModalLoading(false)
    }
  }

  const renderModalContent = () => {
    if (modalList.length === 0) {
      return <p style={{ textAlign: 'center', color: t.textSecondary, padding: '24px 0' }}>No details available</p>
    }

    if (modalType === 'assigned_leads' || modalType === 'converted') {
      return (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                {['Lead Name', 'Company', 'Source', 'Priority', 'Status'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px', fontSize: '0.75rem', fontWeight: '700', color: t.textSecondary, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modalList.map(lead => (
                <tr key={lead.id} style={{ borderBottom: `1px solid ${t.tableBorder}` }}>
                  <td style={{ padding: '12px' }}>
                    <div>
                      <p style={{ fontSize: '0.875rem', fontWeight: '600', color: t.textPrimary, margin: 0 }}>{lead.name}</p>
                      <p style={{ fontSize: '0.72rem', color: t.textSecondary, margin: 0 }}>{lead.email || lead.phone || '—'}</p>
                    </div>
                  </td>
                  <td style={{ padding: '12px', fontSize: '0.875rem', color: t.textPrimary }}>{lead.company || '—'}</td>
                  <td style={{ padding: '12px', fontSize: '0.875rem', color: t.textSecondary, textTransform: 'capitalize' }}>{lead.source || '—'}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={getPriorityBadge(lead.priority)}>{lead.priority}</span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={getStatusBadge(lead.status)}>{lead.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    if (modalType === 'pending_followups' || modalType === 'today_followups') {
      return (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                {['Lead Name', 'Scheduled At', 'Type', 'Notes'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px', fontSize: '0.75rem', fontWeight: '700', color: t.textSecondary, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modalList.map(f => (
                <tr key={f.id} style={{ borderBottom: `1px solid ${t.tableBorder}` }}>
                  <td style={{ padding: '12px' }}>
                    <div>
                      <p style={{ fontSize: '0.875rem', fontWeight: '600', color: t.textPrimary, margin: 0 }}>{f.lead_name || 'Unknown Lead'}</p>
                      <p style={{ fontSize: '0.72rem', color: t.textSecondary, margin: 0 }}>{f.lead_phone || f.lead_email || '—'}</p>
                    </div>
                  </td>
                  <td style={{ padding: '12px', fontSize: '0.875rem', color: '#f59e0b', fontWeight: '600' }}>
                    {f.scheduled_at ? new Date(f.scheduled_at).toLocaleString() : '—'}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={getStatusBadge(f.type || 'call')}>{f.type || 'call'}</span>
                  </td>
                  <td style={{ padding: '12px', fontSize: '0.875rem', color: t.textSecondary, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.notes}>
                    {f.notes || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    if (modalType === 'calls_today') {
      return (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                {['Lead Name', 'Company', 'Activity Type', 'Time', 'Lead Status'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px', fontSize: '0.75rem', fontWeight: '700', color: t.textSecondary, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modalList.map(lead => (
                <tr key={lead.id} style={{ borderBottom: `1px solid ${t.tableBorder}` }}>
                  <td style={{ padding: '12px' }}>
                    <div>
                      <p style={{ fontSize: '0.875rem', fontWeight: '600', color: t.textPrimary, margin: 0 }}>{lead.name}</p>
                      <p style={{ fontSize: '0.72rem', color: t.textSecondary, margin: 0 }}>{lead.email || lead.phone || '—'}</p>
                    </div>
                  </td>
                  <td style={{ padding: '12px', fontSize: '0.875rem', color: t.textPrimary }}>{lead.company || '—'}</td>
                  <td style={{ padding: '12px', fontSize: '0.875rem', color: t.textSecondary }}>{lead.type || '—'}</td>
                  <td style={{ padding: '12px', fontSize: '0.875rem', color: t.textSecondary }}>
                    {lead.time ? new Date(lead.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={getStatusBadge(lead.status)}>{lead.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    return null
  }

  useEffect(() => {
    fetchDashboard()
    const interval = setInterval(fetchDashboard, 60000)
    return () => clearInterval(interval)
  }, [])

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/hr/dashboard')
      setData(res.data.data)
    } catch (e) {}
    finally { setLoading(false) }
  }

  const handleClockIn = async () => {
    setActionLoading('login')
    try {
      await api.post('/attendance/clock-in')
      toast.success('Logged in successfully!')
      await fetchDashboard()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to log in')
    } finally {
      setActionLoading(null)
    }
  }

  const handleClockOut = async () => {
    if (!window.confirm('Log out and end your session for today?')) return
    setActionLoading('logout')
    try {
      await api.post('/attendance/clock-out')
      toast.success('Logged out successfully!')
      await fetchDashboard()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to log out')
    } finally {
      setActionLoading(null)
    }
  }

  const handleToggleBreak = async () => {
    setActionLoading('break')
    try {
      await api.post('/attendance/toggle-break')
      toast.success(isOnBreak ? 'Break ended' : 'Break started')
      await fetchDashboard()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update break')
    } finally {
      setActionLoading(null)
    }
  }

  const { stats, conversionStats, weeklyPerformance } = data || {}
  const perf = stats?.todayPerformance
  const att = stats?.attendance
  const isOnBreak = !!att?.break_start_time
  const isLoggedIn = !!att?.login_time && !att?.logout_time
  const isLoggedOut = !!att?.logout_time
  const canLogin = !isLoggedIn && !isLoggedOut
  const canLogout = isLoggedIn
  const canBreak = isLoggedIn

  const sessionBtn = (active, disabled) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '10px 18px',
    borderRadius: '10px',
    border: 'none',
    fontSize: '0.8rem',
    fontWeight: '700',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    transition: 'all 0.15s',
    minWidth: '100px',
    ...(active
      ? { background: '#fff', color: '#2563eb', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }
      : { background: 'rgba(255,255,255,0.18)', color: '#fff' }),
  })

  useEffect(() => {
    if (att?.login_time && !att?.logout_time) {
      const calcHours = () => {
        let currentIdle = att.idle_time || 0
        if (att.break_start_time) {
          const ongoingBreakMs = new Date() - new Date(att.break_start_time)
          currentIdle += ongoingBreakMs / (1000 * 60 * 60)
        }
        
        const ms = new Date() - new Date(att.login_time)
        const grossHrs = ms / (1000 * 60 * 60)
        
        const validIdle = Math.min(currentIdle, grossHrs)
        setLiveHours(Math.max(0, grossHrs - validIdle))
        setLiveBreak(validIdle)
      }
      calcHours()
      const interval = setInterval(calcHours, 1000)
      return () => clearInterval(interval)
    } else {
      setLiveHours(att?.working_hours || 0)
      setLiveBreak(att?.idle_time || 0)
    }
  }, [att])

  if (loading) return <PageLoader />

  const chartColor = isDark ? '#94a3b8' : '#64748b'
  const gridColor = isDark ? '#1e293b' : '#f1f5f9'
  const tooltipStyle = { background: isDark ? '#1e293b' : '#fff', border: 'none', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'

  const generateLast7Days = () => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dayStr = d.toLocaleDateString('en', { weekday: 'short' })
      const dateStr = d.toISOString().split('T')[0]
      
      const perf = weeklyPerformance?.find(p => p.date && new Date(p.date).toISOString().split('T')[0] === dateStr)
      
      days.push({
        date: dayStr,
        calls: perf?.calls_made || 0,
        followups: perf?.follow_ups_completed || 0,
        converted: perf?.leads_converted || 0
      })
    }
    return days
  }

  const chartData = generateLast7Days()

  const total = parseInt(conversionStats?.total || 0)
  const converted = parseInt(conversionStats?.converted || 0)
  const convRate = total > 0 ? ((converted / total) * 100).toFixed(1) : 0

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Greeting */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: t.textPrimary, margin: '0 0 4px' }}>
          {greeting}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p style={{ color: t.textSecondary, fontSize: '0.875rem', margin: 0 }}>Here's your activity overview for today</p>
      </div>

      {/* Attendance Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
        borderRadius: '16px', padding: '20px 24px', marginBottom: '24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px',
      }}>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', margin: '0 0 4px' }}>Today&apos;s Session</p>
          <p style={{ color: 'white', fontSize: '1.5rem', fontWeight: '800', margin: 0 }}>
            {att?.login_time ? `${formatDurationHMS(liveHours)} worked` : 'Not logged in'}
          </p>
          {isOnBreak && (
            <p style={{ color: '#fde68a', fontSize: '0.75rem', fontWeight: '600', margin: '8px 0 0' }}>On break</p>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleClockIn}
              disabled={!canLogin || actionLoading === 'login'}
              style={sessionBtn(isLoggedIn, !canLogin || actionLoading === 'login')}
            >
              <RiLoginBoxLine size={18} />
              {actionLoading === 'login' ? '...' : 'Login'}
            </button>
            <button
              type="button"
              onClick={handleClockOut}
              disabled={!canLogout || actionLoading === 'logout'}
              style={{
                ...sessionBtn(false, !canLogout || actionLoading === 'logout'),
                ...(canLogout && !actionLoading ? { background: 'rgba(239,68,68,0.9)', color: '#fff' } : {}),
              }}
            >
              <RiLogoutBoxLine size={18} />
              {actionLoading === 'logout' ? '...' : 'Logout'}
            </button>
            <button
              type="button"
              onClick={handleToggleBreak}
              disabled={!canBreak || actionLoading === 'break'}
              style={{
                ...sessionBtn(isOnBreak, !canBreak || actionLoading === 'break'),
                ...(isOnBreak ? { background: '#f59e0b', color: '#fff' } : {}),
              }}
            >
              <RiCupLine size={18} />
              {actionLoading === 'break' ? '...' : isOnBreak ? 'End Break' : 'Break'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: '28px' }}>
            {[
              { label: 'Login', value: att?.login_time ? formatTime(att.login_time) : '—' },
              { label: 'Logout', value: att?.logout_time ? formatTime(att.logout_time) : isLoggedIn ? 'Active' : '—' },
              { label: 'Break Taken', value: formatDurationHMS(liveBreak) },
            ].map((item) => (
              <div key={item.label} style={{ textAlign: 'right' }}>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem', margin: '0 0 2px' }}>{item.label}</p>
                <p style={{ color: 'white', fontWeight: '700', fontSize: '0.95rem', margin: 0 }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <StatCard icon={RiContactsLine} label="Assigned Leads" value={stats?.assignedLeads} color="blue" onClick={() => handleCardClick('assigned_leads', 'Assigned Leads')} />
        <StatCard icon={RiCalendarCheckLine} label="Pending Follow-ups" value={stats?.pendingFollowups} color="orange" onClick={() => handleCardClick('pending_followups', 'Pending Follow-ups')} />
        <StatCard icon={RiTimeLine} label="Today's Follow-ups" value={stats?.todayFollowups} color="purple" onClick={() => handleCardClick('today_followups', 'Today\'s Follow-ups')} />
        <StatCard icon={RiPhoneLine} label="Calls Today" value={perf?.calls_made || 0} color="green" onClick={() => handleCardClick('calls_today', 'Calls Today')} />
        <StatCard icon={RiCheckboxCircleLine} label="Converted" value={converted} color="teal" onClick={() => handleCardClick('converted', 'Converted Leads')} />
        <StatCard icon={RiBarChartLine} label="Conversion Rate" value={`${convRate}%`} color="indigo" />
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Weekly Performance */}
        <div style={card(isDark)}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: t.textPrimary, margin: '0 0 20px' }}>Weekly Performance</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="date" tick={{ fill: chartColor, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: chartColor, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="calls" name="Calls" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="followups" name="Follow-ups" fill="#10b981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="converted" name="Converted" fill="#f59e0b" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pipeline + Targets */}
        <div style={card(isDark)}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: t.textPrimary, margin: '0 0 20px' }}>My Lead Pipeline</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { label: 'New', value: parseInt(conversionStats?.new_leads || 0), color: '#3b82f6' },
              { label: 'Contacted', value: parseInt(conversionStats?.contacted || 0), color: '#f59e0b' },
              { label: 'Qualified', value: parseInt(conversionStats?.qualified || 0), color: '#8b5cf6' },
              { label: 'Converted', value: converted, color: '#10b981' },
            ].map(item => (
              <div key={item.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.8rem', color: t.textSecondary }}>{item.label}</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', color: t.textPrimary }}>{item.value}</span>
                </div>
                <div style={{ height: '6px', background: isDark ? '#334155' : '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: item.color, borderRadius: '9999px', width: `${total > 0 ? (item.value / total) * 100 : 0}%`, transition: 'width 0.5s' }} />
                </div>
              </div>
            ))}
          </div>

          {/* Targets */}
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: `1px solid ${t.border}` }}>
            <p style={{ fontSize: '0.72rem', fontWeight: '700', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>Today's Targets</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                { label: 'Calls Target', done: perf?.calls_made || 0, target: perf?.target_calls || 20, color: '#3b82f6' },
                { label: 'Conversions', done: perf?.leads_converted || 0, target: perf?.target_conversions || 5, color: '#10b981' },
              ].map(item => (
                <div key={item.label} style={{ background: isDark ? '#0f172a' : '#f8fafc', borderRadius: '12px', padding: '12px' }}>
                  <p style={{ fontSize: '0.72rem', color: t.textSecondary, margin: '0 0 4px' }}>{item.label}</p>
                  <p style={{ fontSize: '1.2rem', fontWeight: '800', color: t.textPrimary, margin: '0 0 6px' }}>
                    {item.done}<span style={{ fontSize: '0.8rem', color: t.textMuted, fontWeight: '400' }}>/{item.target}</span>
                  </p>
                  <div style={{ height: '4px', background: isDark ? '#334155' : '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: item.color, width: `${Math.min((item.done / item.target) * 100, 100)}%`, borderRadius: '9999px' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle} size="lg">
        {modalLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <span style={{ color: t.textSecondary, fontSize: '0.9rem' }}>Loading details...</span>
          </div>
        ) : (
          renderModalContent()
        )}
      </Modal>
    </div>
  )
}
