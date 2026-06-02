import React, { useEffect, useState } from 'react'
import { RiTeamLine, RiUserFollowLine, RiContactsLine, RiCheckboxCircleLine, RiTimeLine, RiBarChartLine } from 'react-icons/ri'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import api from '../../utils/api'
import StatCard from '../../components/ui/StatCard'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import { getInitials, formatDurationHMS } from '../../utils/helpers'
import useThemeStore from '../../store/themeStore'
import { card, getTheme, getStatusBadge, getPriorityBadge } from '../../utils/styles'
import Modal from '../../components/ui/Modal'


export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
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
      if (type === 'hr' || type === 'active_hr') {
        const res = await api.get('/admin/monitoring')
        if (type === 'active_hr') {
          setModalList(res.data.data.filter(u => u.login_time !== null))
        } else {
          setModalList(res.data.data)
        }
      } else if (type === 'leads') {
        const res = await api.get('/leads?limit=100')
        setModalList(res.data.data)
      } else if (type === 'converted_leads') {
        const res = await api.get('/leads?status=converted&limit=100')
        setModalList(res.data.data)
      } else if (type === 'followups') {
        const res = await api.get('/admin/pending-followups')
        setModalList(res.data.data)
      }
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

    if (modalType === 'hr') {
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
                    <span style={getStatusBadge(u.login_time ? 'online' : 'offline')}>
                      {u.login_time ? 'Active' : 'Offline'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    if (modalType === 'active_hr') {
      return (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                {['Name', 'Login Time', 'Working Hours', 'Break Time', 'Calls', 'Conversions'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px', fontSize: '0.75rem', fontWeight: '700', color: t.textSecondary, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modalList.map(u => (
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
                  <td style={{ padding: '12px', fontSize: '0.875rem', color: t.textPrimary }}>{formatDurationHMS(u.working_hours)}</td>
                  <td style={{ padding: '12px', fontSize: '0.875rem', color: t.textSecondary }}>{formatDurationHMS(u.idle_time)}</td>
                  <td style={{ padding: '12px', fontSize: '0.875rem', color: t.textPrimary, fontWeight: '600' }}>{u.today_calls}</td>
                  <td style={{ padding: '12px', fontSize: '0.875rem', color: '#10b981', fontWeight: '700' }}>{u.today_conversions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    if (modalType === 'leads' || modalType === 'converted_leads') {
      return (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                {['Lead Name', 'Company', 'Source', 'Assigned To', 'Priority', 'Status'].map(h => (
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
                  <td style={{ padding: '12px', fontSize: '0.875rem', color: t.textPrimary }}>
                    {lead.assigned_to_name ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.875rem' }}>{lead.assigned_to_name}</span>
                      </div>
                    ) : (
                      <span style={{ color: t.textMuted, fontSize: '0.8rem', fontStyle: 'italic' }}>Unassigned</span>
                    )}
                  </td>
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

    if (modalType === 'followups') {
      return (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                {['Lead Name', 'HR User', 'Scheduled At', 'Type', 'Notes'].map(h => (
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
                  <td style={{ padding: '12px', fontSize: '0.875rem', color: t.textPrimary }}>{f.hr_name || '—'}</td>
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

    return null
  }


  useEffect(() => {
    fetchDashboard()
    const interval = setInterval(fetchDashboard, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/admin/dashboard')
      setData(res.data.data)
    } catch (e) {}
    finally { setLoading(false) }
  }

  if (loading) return <PageLoader />

  const { stats, monthlyConversions, leadPipeline, hrRankings } = data || {}

  const chartData = monthlyConversions?.length ? monthlyConversions.map(m => ({
    month: new Date(m.month).toLocaleString('default', { month: 'short' }),
    count: parseInt(m.count)
  })) : []

  const pipelineColorMap = {
    new: { label: 'New', color: '#3b82f6' },
    contacted: { label: 'Contacted', color: '#f59e0b' },
    qualified: { label: 'Qualified', color: '#8b5cf6' },
    proposal: { label: 'Proposal', color: '#06b6d4' },
    negotiation: { label: 'Negotiation', color: '#f97316' },
    converted: { label: 'Converted', color: '#10b981' },
    lost: { label: 'Lost', color: '#ef4444' },
    followup: { label: 'Follow-up', color: '#ec4899' },
    exemption: { label: 'Exemption', color: '#64748b' },
    not_interested: { label: 'Not Interested', color: '#94a3b8' },
  }

  const pipelineData = leadPipeline?.length ? leadPipeline.map(p => ({
    name: pipelineColorMap[p.status]?.label || p.status,
    value: p.count,
    color: pipelineColorMap[p.status]?.color || '#94a3b8',
  })).sort((a, b) => b.value - a.value) : []

  const chartColor = isDark ? '#94a3b8' : '#64748b'
  const gridColor = isDark ? '#1e293b' : '#f1f5f9'
  const tooltipStyle = { background: isDark ? '#1e293b' : '#fff', border: 'none', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: t.textPrimary, margin: '0 0 4px' }}>Admin Dashboard</h1>
        <p style={{ color: t.textSecondary, fontSize: '0.875rem', margin: 0 }}>Overview of HR performance and lead management</p>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <StatCard icon={RiTeamLine} label="Total HR" value={stats?.totalHR} color="blue" onClick={() => handleCardClick('hr', 'Total HR Users')} />
        <StatCard icon={RiUserFollowLine} label="Active Today" value={stats?.activeToday} color="green" onClick={() => handleCardClick('active_hr', 'Active Today HR Detail')} />
        <StatCard icon={RiContactsLine} label="Total Leads" value={stats?.totalLeads} color="purple" onClick={() => handleCardClick('leads', 'All Leads')} />
        <StatCard icon={RiCheckboxCircleLine} label="Converted" value={stats?.convertedLeads} color="teal" onClick={() => handleCardClick('converted_leads', 'Converted Leads')} />
        <StatCard icon={RiTimeLine} label="Pending Follow-ups" value={stats?.pendingFollowups} color="orange" onClick={() => handleCardClick('followups', 'Pending Follow-ups')} />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Monthly Conversions */}
        <div style={card(isDark)}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: t.textPrimary, margin: '0 0 20px' }}>Monthly Lead Conversions</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorConv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="month" tick={{ fill: chartColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: chartColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2.5} fill="url(#colorConv)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.textSecondary, fontSize: '0.875rem' }}>No conversion data yet</div>
          )}
        </div>

        {/* Pipeline Pie */}
        <div style={card(isDark)}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: t.textPrimary, margin: '0 0 20px' }}>Lead Pipeline</h3>
          {pipelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pipelineData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {pipelineData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ color: chartColor, fontSize: 12 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.textSecondary, fontSize: '0.875rem' }}>No leads in pipeline yet</div>
          )}
        </div>
      </div>

      {/* HR Rankings */}
      <div style={card(isDark)}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: t.textPrimary, margin: 0 }}>HR Performance Rankings</h3>
          <span style={{ fontSize: '0.75rem', color: t.textSecondary }}>Top performers this month</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                {['Rank', 'HR Name', 'Leads', 'Converted', 'Calls', 'Follow-ups', 'Rate'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: '0.72rem', fontWeight: '700', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hrRankings?.length ? hrRankings.map((hr, i) => (
                <tr key={hr.id} style={{ borderBottom: `1px solid ${t.tableBorder}` }}>
                  <td style={{ padding: '12px' }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', fontWeight: '800',
                      background: i === 0 ? '#fef9c3' : i === 1 ? '#f1f5f9' : i === 2 ? '#ffedd5' : t.hoverBg,
                      color: i === 0 ? '#854d0e' : i === 1 ? '#64748b' : i === 2 ? '#9a3412' : t.textSecondary,
                    }}>{i + 1}</div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: isDark ? 'rgba(59,130,246,0.2)' : '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ color: '#3b82f6', fontSize: '0.7rem', fontWeight: '800' }}>{getInitials(hr.name)}</span>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.875rem', fontWeight: '600', color: t.textPrimary, margin: 0 }}>{hr.name}</p>
                        <p style={{ fontSize: '0.72rem', color: t.textSecondary, margin: 0 }}>{hr.department}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px', fontSize: '0.875rem', fontWeight: '600', color: t.textPrimary }}>{hr.total_leads}</td>
                  <td style={{ padding: '12px' }}><span style={{ fontSize: '0.875rem', fontWeight: '700', color: '#10b981' }}>{hr.converted_leads}</span></td>
                  <td style={{ padding: '12px', fontSize: '0.875rem', color: t.textPrimary }}>{hr.total_calls}</td>
                  <td style={{ padding: '12px', fontSize: '0.875rem', color: t.textPrimary }}>{hr.total_followups}</td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '60px', height: '6px', background: isDark ? '#334155' : '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: '#3b82f6', borderRadius: '9999px', width: `${Math.min(hr.conversion_rate, 100)}%` }} />
                      </div>
                      <span style={{ fontSize: '0.8rem', fontWeight: '600', color: t.textPrimary }}>{hr.conversion_rate}%</span>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: t.textSecondary }}>No HR data available</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
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
