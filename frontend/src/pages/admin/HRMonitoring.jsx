import React, { useEffect, useState } from 'react'
import { RiRefreshLine, RiWifiLine, RiWifiOffLine, RiTimeLine, RiPhoneLine, RiContactsLine, RiLayoutGridLine, RiListUnordered } from 'react-icons/ri'
import api from '../../utils/api'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import SearchBar from '../../components/ui/SearchBar'
import StatCard from '../../components/ui/StatCard'
import { RiTeamLine, RiUserFollowLine, RiUserUnfollowLine, RiUserStarLine } from 'react-icons/ri'
import { getInitials, formatTime, timeAgo, formatDuration, formatDurationHMS } from '../../utils/helpers'
import { getSocket } from '../../utils/socket'
import useThemeStore from '../../store/themeStore'
import { card, getTheme, getStatusBadge } from '../../utils/styles'
import Modal from '../../components/ui/Modal'

export default function HRMonitoring() {
  const [hrList, setHrList] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'
  const { isDark } = useThemeStore()
  const t = getTheme(isDark)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalTitle, setModalTitle] = useState('')
  const [modalType, setModalType] = useState('')
  const [modalList, setModalList] = useState([])

  const handleCardClick = (type, title) => {
    setModalType(type)
    setModalTitle(title)
    setModalOpen(true)
    
    if (type === 'total_hr') {
      setModalList(hrList)
    } else if (type === 'online_now') {
      setModalList(hrList.filter(h => h.login_time && !h.logout_time))
    } else if (type === 'present_today') {
      setModalList(hrList.filter(h => h.login_time))
    } else if (type === 'absent_today') {
      setModalList(hrList.filter(h => !h.login_time))
    }
  }

  const renderModalContent = () => {
    if (modalList.length === 0) {
      return <p style={{ textAlign: 'center', color: t.textSecondary, padding: '24px 0' }}>No details available</p>
    }

    if (modalType === 'total_hr' || modalType === 'absent_today') {
      return (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                {['Name', 'Email', 'Department', 'Last Login', 'Status'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px', fontSize: '0.75rem', fontWeight: '700', color: t.textSecondary, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modalList.map(u => (
                <tr key={u.id} style={{ borderBottom: `1px solid ${t.tableBorder}` }}>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: isDark ? 'rgba(59,130,246,0.2)' : '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: '#3b82f6', fontSize: '0.75rem', fontWeight: '800' }}>{getInitials(u.name)}</span>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.875rem', fontWeight: '600', color: t.textPrimary, margin: 0 }}>{u.name}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px', fontSize: '0.875rem', color: t.textPrimary }}>{u.email}</td>
                  <td style={{ padding: '12px', fontSize: '0.875rem', color: t.textPrimary }}>{u.department || '—'}</td>
                  <td style={{ padding: '12px', fontSize: '0.875rem', color: t.textSecondary }}>{u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={getStatusBadge(u.login_time && !u.logout_time ? 'online' : 'offline')}>
                      {u.login_time && !u.logout_time ? 'Online' : 'Offline'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    if (modalType === 'online_now' || modalType === 'present_today') {
      return (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                {['Name', 'Login Time', 'Working Hours', 'Break Time', 'Calls Today', 'Conversions'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px', fontSize: '0.75rem', fontWeight: '700', color: t.textSecondary, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modalList.map(u => {
                const isOnlineNow = u.login_time && !u.logout_time;
                const liveHours = isOnlineNow ? Math.max(0, (new Date() - new Date(u.login_time)) / (1000 * 60 * 60)) : (u.working_hours || 0);
                return (
                  <tr key={u.id} style={{ borderBottom: `1px solid ${t.tableBorder}` }}>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: isDark ? 'rgba(16,185,129,0.2)' : '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: '800' }}>{getInitials(u.name)}</span>
                        </div>
                        <div>
                          <p style={{ fontSize: '0.875rem', fontWeight: '600', color: t.textPrimary, margin: 0 }}>{u.name}</p>
                          <p style={{ fontSize: '0.72rem', color: t.textSecondary, margin: 0 }}>{u.department}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px', fontSize: '0.875rem', color: t.textPrimary }}>{u.login_time ? new Date(u.login_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    <td style={{ padding: '12px', fontSize: '0.875rem', color: t.textPrimary }}>{formatDurationHMS(liveHours)}</td>
                    <td style={{ padding: '12px', fontSize: '0.875rem', color: t.textSecondary }}>{formatDurationHMS(u.idle_time)}</td>
                    <td style={{ padding: '12px', fontSize: '0.875rem', color: t.textPrimary, fontWeight: '600' }}>{u.today_calls}</td>
                    <td style={{ padding: '12px', fontSize: '0.875rem', color: '#10b981', fontWeight: '700' }}>{u.today_conversions}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )
    }

    return null
  }

  useEffect(() => {
    fetchMonitoring()
    const interval = setInterval(fetchMonitoring, 30000)
    const socket = getSocket()
    if (socket) {
      socket.on('user_status_change', fetchMonitoring)
      socket.on('user_online', fetchMonitoring)
      socket.on('user_offline', fetchMonitoring)
    }
    return () => {
      clearInterval(interval)
      const s = getSocket()
      if (s) { s.off('user_status_change'); s.off('user_online'); s.off('user_offline') }
    }
  }, [])

  const fetchMonitoring = async () => {
    try {
      const res = await api.get('/admin/monitoring')
      setHrList(res.data.data)
    } catch (e) {}
    finally { setLoading(false) }
  }

  const filtered = hrList.filter(hr =>
    hr.name?.toLowerCase().includes(search.toLowerCase()) ||
    hr.email?.toLowerCase().includes(search.toLowerCase())
  )
  const online = filtered.filter(h => h.login_time && !h.logout_time)
  const offline = filtered.filter(h => !h.login_time || h.logout_time)

  if (loading) return <PageLoader />

  const renderGrid = (list, isOnline) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
      {list.map(hr => <HRCard key={hr.id} hr={hr} isOnline={isOnline} isDark={isDark} t={t} />)}
    </div>
  )

  const renderList = (list, isOnline) => (
    <div style={{ overflowX: 'auto', ...card(isDark), padding: 0 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead style={{ background: isDark ? '#1e293b' : '#f8fafc', borderBottom: `1px solid ${t.border}` }}>
          <tr>
            <th style={{ padding: '12px 16px', fontSize: '0.75rem', color: t.textSecondary, fontWeight: '600' }}>HR User</th>
            <th style={{ padding: '12px 16px', fontSize: '0.75rem', color: t.textSecondary, fontWeight: '600' }}>Status</th>
            <th style={{ padding: '12px 16px', fontSize: '0.75rem', color: t.textSecondary, fontWeight: '600' }}>Login Time</th>
            <th style={{ padding: '12px 16px', fontSize: '0.75rem', color: t.textSecondary, fontWeight: '600' }}>Working Hours</th>
            <th style={{ padding: '12px 16px', fontSize: '0.75rem', color: t.textSecondary, fontWeight: '600' }}>Conversions</th>
            <th style={{ padding: '12px 16px', fontSize: '0.75rem', color: t.textSecondary, fontWeight: '600' }}>Calls / Follow-ups</th>
            <th style={{ padding: '12px 16px', fontSize: '0.75rem', color: t.textSecondary, fontWeight: '600' }}>Last Seen</th>
          </tr>
        </thead>
        <tbody>
          {list.map(hr => {
            const isOnlineNow = hr.login_time && !hr.logout_time;
            const liveHours = isOnlineNow ? Math.max(0, (new Date() - new Date(hr.login_time)) / (1000 * 60 * 60)) : (hr.working_hours || 0);
            const wh = formatDuration(liveHours);
            return (
              <tr key={hr.id} style={{ borderBottom: `1px solid ${t.tableBorder}` }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ position: 'relative' }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '50%',
                        background: isDark ? 'rgba(59,130,246,0.2)' : '#eff6ff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span style={{ color: '#3b82f6', fontWeight: '800', fontSize: '0.75rem' }}>{getInitials(hr.name)}</span>
                      </div>
                      <span style={{
                        position: 'absolute', bottom: '-2px', right: '-2px', width: '10px', height: '10px', borderRadius: '50%',
                        background: isOnline ? '#22c55e' : '#94a3b8', border: `2px solid ${isDark ? '#1e293b' : '#fff'}`
                      }} />
                    </div>
                    <div>
                      <p style={{ margin: '0 0 2px', fontWeight: '600', color: t.textPrimary, fontSize: '0.875rem' }}>{hr.name}</p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: t.textSecondary }}>{hr.department || 'HR Team'}</p>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: '700',
                    background: isOnline ? '#dcfce7' : (isDark ? '#334155' : '#f1f5f9'),
                    color: isOnline ? '#15803d' : t.textSecondary,
                  }}>
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '0.875rem', color: t.textPrimary }}>
                  {hr.login_time ? formatTime(hr.login_time) : '—'}
                </td>
                <td style={{ padding: '12px 16px', fontSize: '0.875rem', color: t.textPrimary }}>{wh}</td>
                <td style={{ padding: '12px 16px', fontSize: '0.875rem', color: t.textPrimary, fontWeight: '600' }}>
                  {hr.today_conversions || 0}
                </td>
                <td style={{ padding: '12px 16px', fontSize: '0.875rem', color: t.textPrimary }}>
                  {hr.today_calls || 0} / {hr.today_followups || 0}
                </td>
                <td style={{ padding: '12px 16px', fontSize: '0.875rem', color: t.textSecondary }}>
                  {hr.last_login ? timeAgo(hr.last_login) : 'Never'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: t.textPrimary, margin: '0 0 4px' }}>Attendance</h1>
          <p style={{ color: t.textSecondary, fontSize: '0.875rem', margin: 0 }}>Real-time tracking of HR attendance and activity</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', color: t.textSecondary }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            {online.length} Online
          </div>
          
          {/* View Toggle */}
          <div style={{ display: 'flex', background: isDark ? '#1e293b' : '#f1f5f9', borderRadius: '10px', padding: '4px' }}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px',
                border: 'none', borderRadius: '6px', cursor: 'pointer',
                background: viewMode === 'grid' ? (isDark ? '#334155' : '#fff') : 'transparent',
                color: viewMode === 'grid' ? t.textPrimary : t.textSecondary,
                boxShadow: viewMode === 'grid' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              <RiLayoutGridLine fontSize="18px" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px',
                border: 'none', borderRadius: '6px', cursor: 'pointer',
                background: viewMode === 'list' ? (isDark ? '#334155' : '#fff') : 'transparent',
                color: viewMode === 'list' ? t.textPrimary : t.textSecondary,
                boxShadow: viewMode === 'list' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              <RiListUnordered fontSize="18px" />
            </button>
          </div>

          <button onClick={fetchMonitoring} style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
            borderRadius: '10px', border: `1px solid ${t.border}`,
            background: isDark ? '#334155' : '#f1f5f9', color: t.textSecondary,
            cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600',
          }}>
            <RiRefreshLine /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <StatCard 
          icon={RiTeamLine} 
          label="Total HR" 
          value={hrList.length} 
          color="blue" 
          onClick={() => handleCardClick('total_hr', 'Total HR Users')}
        />
        <StatCard 
          icon={RiUserStarLine} 
          label="Online Now" 
          value={hrList.filter(h => h.login_time && !h.logout_time).length} 
          color="green" 
          onClick={() => handleCardClick('online_now', 'Online HR Users')}
        />
        <StatCard 
          icon={RiUserFollowLine} 
          label="Present Today" 
          value={hrList.filter(h => h.login_time).length} 
          color="teal" 
          onClick={() => handleCardClick('present_today', 'Present Today HR Users')}
        />
        <StatCard 
          icon={RiUserUnfollowLine} 
          label="Absent Today" 
          value={hrList.filter(h => !h.login_time).length} 
          color="red" 
          onClick={() => handleCardClick('absent_today', 'Absent Today HR Users')}
        />
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search HR..." style={{ maxWidth: '320px', marginBottom: '24px' }} />

      {/* Online */}
      {online.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <RiWifiLine style={{ color: '#22c55e', fontSize: '16px' }} />
            <span style={{ fontSize: '0.78rem', fontWeight: '700', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Online ({online.length})
            </span>
          </div>
          {viewMode === 'grid' ? renderGrid(online, true) : renderList(online, true)}
        </div>
      )}

      {/* Offline */}
      {offline.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <RiWifiOffLine style={{ color: t.textMuted, fontSize: '16px' }} />
            <span style={{ fontSize: '0.78rem', fontWeight: '700', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Offline / Not Logged In ({offline.length})
            </span>
          </div>
          {viewMode === 'grid' ? renderGrid(offline, false) : renderList(offline, false)}
        </div>
      )}

      {filtered.length === 0 && (
        <div style={{ ...card(isDark), textAlign: 'center', padding: '48px', color: t.textSecondary }}>No HR users found</div>
      )}
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        @media (max-width: 768px) {
          .kpi-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
        }
      `}</style>

      {/* Details Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle} size="lg">
        {renderModalContent()}
      </Modal>
    </div>
  )
}

function HRCard({ hr, isOnline, isDark, t }) {
  const isOnlineNow = hr.login_time && !hr.logout_time;
  const liveHours = isOnlineNow ? Math.max(0, (new Date() - new Date(hr.login_time)) / (1000 * 60 * 60)) : (hr.working_hours || 0);
  const wh = formatDuration(liveHours);

  return (
    <div style={{
      ...card(isDark),
      borderLeft: `4px solid ${isOnline ? '#22c55e' : (isDark ? '#334155' : '#e2e8f0')}`,
      padding: '20px',
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%',
              background: isDark ? 'rgba(59,130,246,0.2)' : '#eff6ff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: '#3b82f6', fontWeight: '800', fontSize: '0.875rem' }}>{getInitials(hr.name)}</span>
            </div>
            <span style={{
              position: 'absolute', bottom: '-1px', right: '-1px',
              width: '12px', height: '12px', borderRadius: '50%',
              background: isOnline ? '#22c55e' : '#94a3b8',
              border: `2px solid ${isDark ? '#1e293b' : '#fff'}`,
            }} />
          </div>
          <div>
            <p style={{ fontWeight: '700', color: t.textPrimary, fontSize: '0.9rem', margin: '0 0 2px' }}>{hr.name}</p>
            <p style={{ fontSize: '0.75rem', color: t.textSecondary, margin: 0 }}>{hr.department || 'HR Team'}</p>
          </div>
        </div>
        <span style={{
          padding: '3px 10px', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: '700',
          background: isOnline ? '#dcfce7' : (isDark ? '#334155' : '#f1f5f9'),
          color: isOnline ? '#15803d' : t.textSecondary,
        }}>
          {isOnline ? '● Online' : '○ Offline'}
        </span>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
        {[
          { label: 'Login Time', value: hr.login_time ? formatTime(hr.login_time) : '—' },
          { label: 'Working Hours', value: wh, warn: false },
          { label: 'Conversions', value: hr.today_conversions || 0, warn: false },
          { label: 'Calls Today', value: hr.today_calls || 0 },
        ].map(item => (
          <div key={item.label} style={{
            background: isDark ? '#0f172a' : '#f8fafc',
            borderRadius: '10px', padding: '10px 12px',
          }}>
            <p style={{ fontSize: '0.7rem', color: t.textSecondary, margin: '0 0 4px' }}>{item.label}</p>
            <p style={{ fontSize: '0.95rem', fontWeight: '700', margin: 0, color: item.warn ? '#f97316' : t.textPrimary }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '12px', borderTop: `1px solid ${t.border}`, fontSize: '0.75rem', color: t.textSecondary }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <RiContactsLine /> Leads: <strong style={{ color: t.textPrimary }}>{hr.today_leads || 0}</strong>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <RiPhoneLine /> Follow-ups: <strong style={{ color: t.textPrimary }}>{hr.today_followups || 0}</strong>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <RiTimeLine /> {hr.last_login ? timeAgo(hr.last_login) : 'Never'}
        </span>
      </div>
    </div>
  )
}
