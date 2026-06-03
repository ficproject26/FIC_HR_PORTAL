import React, { useEffect, useState } from 'react'
import { RiContactsLine, RiCheckboxCircleLine, RiCalendarCheckLine, RiPhoneLine } from 'react-icons/ri'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import api from '../../utils/api'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import { card, getTheme } from '../../utils/styles'
import useThemeStore from '../../store/themeStore'
import toast from 'react-hot-toast'

const STATUS_COLORS = {
  new: '#3b82f6',
  followup: '#10b981',
  exemption: '#f59e0b',
  converted: '#22c55e',
  not_interested: '#ef4444',
  contacted: '#6366f1',
  qualified: '#8b5cf6',
  proposal: '#ec4899',
  negotiation: '#14b8a6',
  lost: '#94a3b8',
}
const FALLBACK_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#6366f1']

const PIPELINE_ORDER = ['new', 'followup', 'exemption', 'converted', 'not_interested']

function KPI({ label, value, sub, color, icon: Icon }) {
  return (
    <div style={{ padding:'20px', borderRadius:'14px', background: color + '12', display:'flex', flexDirection:'column', gap:'10px' }}>
      <div style={{ width:'40px', height:'40px', borderRadius:'10px', background: color + '22', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Icon style={{ fontSize:'18px', color }} />
      </div>
      <p style={{ fontSize:'0.72rem', fontWeight:'600', color, margin:0, opacity:0.8 }}>{label}</p>
      <p style={{ fontSize:'1.8rem', fontWeight:'800', color, margin:0, lineHeight:1 }}>{value}</p>
      {sub && <p style={{ fontSize:'0.72rem', color, margin:0, opacity:0.6 }}>{sub}</p>}
    </div>
  )
}

export default function Reports() {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const { isDark } = useThemeStore()
  const t = getTheme(isDark)

  useEffect(() => { fetchReports() }, [])

  const fetchReports = async () => {
    setLoading(true)
    try {
      const res = await api.get('/hr/reports')
      setReport(res.data.data)
    } catch (e) {
      toast.error('Failed to load reports')
      setReport(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <PageLoader />

  const stats = report?.stats || {}
  const conv = report?.conversionStats || {}
  const weeklyPerformance = report?.weeklyPerformance || []
  const statusBreakdown = report?.statusBreakdown || []

  const total = parseInt(conv.total || 0, 10)
  const converted = parseInt(conv.converted || 0, 10)
  const convRate = total > 0 ? ((converted / total) * 100).toFixed(1) : '0'

  const chartData = weeklyPerformance.map((d) => ({
    date: d.day,
    calls: d.calls_made || 0,
    followups: d.follow_ups_completed || 0,
    converted: d.leads_converted || 0,
  }))

  const pieData = statusBreakdown.map((s) => ({
    name: s.name,
    value: s.value,
    status: s.status,
  }))

  const pipelineRows = PIPELINE_ORDER.map((status) => {
    const row = statusBreakdown.find((s) => s.status === status)
    return { status, name: row?.name || status, count: row?.value || 0 }
  }).concat(
    statusBreakdown
      .filter((s) => !PIPELINE_ORDER.includes(s.status))
      .map((s) => ({ status: s.status, name: s.name, count: s.value }))
  )

  const tooltipStyle = { background: isDark ? '#1e293b' : '#fff', border:'none', borderRadius:'12px', boxShadow:'0 4px 20px rgba(0,0,0,0.15)' }
  const gridColor = isDark ? '#1e293b' : '#f1f5f9'
  const axisColor = isDark ? '#94a3b8' : '#64748b'
  const hasWeeklyActivity = chartData.some((d) => d.calls > 0 || d.followups > 0 || d.converted > 0)

  return (
    <div style={{ fontFamily:"'Inter', system-ui, sans-serif" }}>
      <div style={{ marginBottom:'24px' }}>
        <h1 style={{ fontSize:'1.5rem', fontWeight:'800', color:t.textPrimary, margin:'0 0 4px' }}>Reports</h1>
        <p style={{ color:t.textSecondary, fontSize:'0.875rem', margin:0 }}>Your performance & lead analytics (live data)</p>
      </div>

      <style>{`
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 24px;
        }
        .charts-grid {
          display: grid;
          grid-template-columns: 1.6fr 1fr;
          gap: 20px;
          margin-bottom: 24px;
        }
        @media (max-width: 768px) {
          .kpi-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .charts-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <div className="kpi-grid">
        <KPI label="Total Leads" value={total} color="#3b82f6" icon={RiContactsLine} />
        <KPI label="Converted" value={converted} sub={`${convRate}% rate`} color="#10b981" icon={RiCheckboxCircleLine} />
        <KPI label="Pending Follow-ups" value={stats.pendingFollowups || 0} color="#f59e0b" icon={RiCalendarCheckLine} />
        <KPI label="Calls Made Today" value={stats.todayPerformance?.calls_made || 0} color="#8b5cf6" icon={RiPhoneLine} />
      </div>

      <div className="charts-grid">
        <div style={card(isDark)}>
          <h3 style={{ fontSize:'0.95rem', fontWeight:'700', color:t.textPrimary, margin:'0 0 20px' }}>Weekly Performance</h3>
          {hasWeeklyActivity ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="date" tick={{ fill:axisColor, fontSize:11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill:axisColor, fontSize:11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:'0.75rem' }} />
                <Bar dataKey="calls" name="Calls" fill="#3b82f6" radius={[4,4,0,0]} />
                <Bar dataKey="followups" name="Follow-ups" fill="#10b981" radius={[4,4,0,0]} />
                <Bar dataKey="converted" name="Converted" fill="#f59e0b" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height:240, display:'flex', alignItems:'center', justifyContent:'center', color:t.textSecondary, fontSize:'0.875rem', textAlign:'center', padding:'0 24px' }}>
              No activity in the last 7 days. Complete follow-ups or convert leads to see data here.
            </div>
          )}
        </div>

        <div style={card(isDark)}>
          <h3 style={{ fontSize:'0.95rem', fontWeight:'700', color:t.textPrimary, margin:'0 0 20px' }}>Lead Status Breakdown</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {pieData.map((entry, i) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:'0.75rem', color:t.textSecondary }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height:240, display:'flex', alignItems:'center', justifyContent:'center', color:t.textSecondary, fontSize:'0.875rem', textAlign:'center', padding:'0 24px' }}>
              No assigned leads yet. Ask admin to assign leads to you.
            </div>
          )}
        </div>
      </div>

      <div style={card(isDark)}>
        <h3 style={{ fontSize:'0.95rem', fontWeight:'700', color:t.textPrimary, margin:'0 0 16px' }}>Lead Pipeline Summary</h3>
        {total > 0 ? (
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            {pipelineRows.filter((r) => r.count > 0 || PIPELINE_ORDER.includes(r.status)).map((row, i) => {
              const pct = total > 0 ? (row.count / total) * 100 : 0
              const color = STATUS_COLORS[row.status] || FALLBACK_COLORS[i % FALLBACK_COLORS.length]
              return (
                <div key={row.status}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                    <span style={{ fontSize:'0.82rem', color:t.textSecondary, fontWeight:'500' }}>{row.name}</span>
                    <span style={{ fontSize:'0.82rem', fontWeight:'700', color:t.textPrimary }}>
                      {row.count} <span style={{ color:t.textSecondary, fontWeight:'400' }}>({pct.toFixed(0)}%)</span>
                    </span>
                  </div>
                  <div style={{ height:'8px', background: isDark ? '#334155' : '#e2e8f0', borderRadius:'9999px', overflow:'hidden' }}>
                    <div style={{ height:'100%', background:color, borderRadius:'9999px', width:`${pct}%`, transition:'width 0.6s ease' }} />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p style={{ color:t.textSecondary, fontSize:'0.875rem', margin:0 }}>No pipeline data yet.</p>
        )}
      </div>
    </div>
  )
}
