import React, { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import api from '../../utils/api'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import { getInitials } from '../../utils/helpers'
import useThemeStore from '../../store/themeStore'
import { card, getTheme, btnPrimary } from '../../utils/styles'

export default function AdminPerformance() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const { isDark } = useThemeStore()
  const t = getTheme(isDark)

  useEffect(() => { fetchComparison() }, [])

  const fetchComparison = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)
      const res = await api.get(`/performance/comparison?${params}`)
      setData(res.data.data)
    } catch (e) {}
    finally { setLoading(false) }
  }

  const chartColor = isDark ? '#94a3b8' : '#64748b'
  const gridColor = isDark ? '#1e293b' : '#f1f5f9'
  const tooltipStyle = { background: isDark ? '#1e293b' : '#fff', border: 'none', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', fontSize: '0.85rem', padding: '10px' }
  const top5 = data.slice(0, 5)

  const inputStyle = {
    padding: '8px 12px', borderRadius: '10px',
    border: `1px solid ${t.border}`, background: t.inputBg,
    color: t.textPrimary, fontSize: '0.875rem', outline: 'none',
    fontFamily: "'Inter', system-ui, sans-serif",
  }

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", maxWidth: '100vw', overflowX: 'hidden' }}>
      <style>{`
        @media (max-width: 768px) {
          .perf-table, .perf-table tbody { display: block; width: 100%; }
          .perf-table thead { display: none; }
          .perf-table tr {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-bottom: 16px;
            padding: 16px !important;
            border-radius: 12px !important;
            border: 1px solid ${isDark ? '#334155' : '#e2e8f0'} !important;
            background: ${isDark ? '#1e293b' : '#fff'} !important;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
          }
          .perf-table td {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0 !important;
            border: none !important;
          }
          .perf-table td.hr-name-td {
            justify-content: flex-start;
            border-bottom: 1px solid ${isDark ? '#334155' : '#e2e8f0'} !important;
            padding-bottom: 16px !important;
            margin-bottom: 4px;
          }
          .mobile-label { display: block !important; font-size: 0.8rem; color: #64748b; font-weight: 600; }
          .chart-scroll-wrapper { width: 100%; overflow-x: auto; overflow-y: hidden; }
          .chart-inner { width: 100%; height: 280px; }
          .chart-inner { min-width: 500px; }
        }
        @media (min-width: 769px) {
          .mobile-label { display: none !important; }
          .chart-scroll-wrapper { overflow: visible; }
          .chart-inner { height: 280px; }
        }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: t.textPrimary, margin: '0 0 4px' }}>Performance Tracking</h1>
          <p style={{ color: t.textSecondary, fontSize: '0.875rem', margin: 0 }}>Compare HR performance metrics</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputStyle} />
          <span style={{ color: t.textSecondary }}>to</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inputStyle} />
          <button onClick={fetchComparison} style={btnPrimary}>Apply</button>
        </div>
      </div>

      {loading ? <PageLoader /> : (
        <>
          {/* Bar Chart */}
          <div style={{ ...card(isDark), marginBottom: '20px', padding: '20px 16px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: t.textPrimary, margin: '0 0 20px' }}>HR Performance Comparison</h3>
            <div className="chart-scroll-wrapper">
              <div className="chart-inner">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={top5} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="name" tick={{ fill: chartColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: chartColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: '0.8rem', marginTop: '10px' }} />
                    <Bar dataKey="total_calls" name="Calls" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="total_followups" name="Follow-ups" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="total_conversions" name="Conversions" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Table */}
          <div style={{ ...card(isDark), padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${t.border}` }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: t.textPrimary, margin: 0 }}>Detailed Performance Report</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="perf-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: isDark ? '#0f172a' : '#f8fafc' }}>
                    {['HR Name', 'Total Calls', 'Follow-ups', 'Contacted', 'Converted', 'Conversion Rate', 'Assigned Leads'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: '0.72rem', fontWeight: '700', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((hr, i) => (
                    <tr key={hr.id || i} style={{ borderBottom: `1px solid ${t.tableBorder}` }}
                      onMouseEnter={e => e.currentTarget.style.background = isDark ? '#334155' : '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td className="hr-name-td" style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: isDark ? 'rgba(59,130,246,0.2)' : '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ color: '#3b82f6', fontSize: '0.7rem', fontWeight: '800' }}>{getInitials(hr.name)}</span>
                          </div>
                          <div>
                            <p style={{ fontWeight: '600', fontSize: '0.875rem', color: t.textPrimary, margin: 0 }}>{hr.name}</p>
                            <p style={{ fontSize: '0.72rem', color: t.textSecondary, margin: 0 }}>{hr.department}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px', fontWeight: '600', color: t.textPrimary }}>
                        <span className="mobile-label">Total Calls</span>
                        <span>{hr.total_calls}</span>
                      </td>
                      <td style={{ padding: '14px', color: t.textPrimary }}>
                        <span className="mobile-label">Follow-ups</span>
                        <span>{hr.total_followups}</span>
                      </td>
                      <td style={{ padding: '14px', color: t.textPrimary }}>
                        <span className="mobile-label">Contacted</span>
                        <span>{hr.total_contacted}</span>
                      </td>
                      <td style={{ padding: '14px' }}>
                        <span className="mobile-label">Converted</span>
                        <span style={{ fontWeight: '700', color: '#10b981' }}>{hr.total_conversions}</span>
                      </td>
                      <td style={{ padding: '14px' }}>
                        <span className="mobile-label">Conversion Rate</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '64px', height: '6px', background: isDark ? '#334155' : '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: '#3b82f6', width: `${Math.min(hr.conversion_rate, 100)}%`, borderRadius: '9999px' }} />
                          </div>
                          <span style={{ fontSize: '0.8rem', fontWeight: '600', color: t.textPrimary }}>{hr.conversion_rate}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px', color: t.textPrimary }}>
                        <span className="mobile-label">Assigned Leads</span>
                        <span>{hr.assigned_leads}</span>
                      </td>
                    </tr>
                  ))}
                  {data.length === 0 && (
                    <tr><td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: t.textSecondary }}>No performance data available</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
