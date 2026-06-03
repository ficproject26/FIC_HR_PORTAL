import React, { useEffect, useState } from 'react'
import { RiTimeLine, RiCheckboxCircleLine, RiLoginBoxLine, RiLogoutBoxLine, RiCalendarLine } from 'react-icons/ri'
import api from '../../utils/api'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import { card, getTheme } from '../../utils/styles'
import useThemeStore from '../../store/themeStore'
import { formatDate } from '../../utils/helpers'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function StatBox({ icon: Icon, label, value, color }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'14px', padding:'18px', borderRadius:'14px', background: color + '15', flex:1 }}>
      <div style={{ width:'44px', height:'44px', borderRadius:'12px', background: color + '25', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <Icon style={{ fontSize:'20px', color }} />
      </div>
      <div>
        <p style={{ fontSize:'0.72rem', fontWeight:'600', color, margin:'0 0 4px', opacity:0.8 }}>{label}</p>
        <p style={{ fontSize:'1.5rem', fontWeight:'800', color, margin:0 }}>{value}</p>
      </div>
    </div>
  )
}

export default function Attendance() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const { isDark } = useThemeStore()
  const t = getTheme(isDark)

  useEffect(() => { fetchAttendance() }, [month, year])

  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(timer)
  }, [])

  const fetchAttendance = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/hr/attendance?month=${month}&year=${year}`)
      setRecords(res.data.data || [])
    } catch(e) { setRecords([]) } finally { setLoading(false) }
  }

  const present = records.filter(r => r.login_time).length
  const totalDays = records.length
  const totalHours = records.reduce((sum, r) => sum + parseFloat(r.working_hours || 0), 0)
  const totalBreak = records.reduce((sum, r) => sum + parseFloat(r.idle_time || 0), 0)

  const thStyle = { textAlign:'left', padding:'10px 14px', fontSize:'0.72rem', fontWeight:'700', color:t.textSecondary, textTransform:'uppercase', letterSpacing:'0.05em', background: isDark ? '#0f172a' : '#f8fafc' }
  const tdStyle = { padding:'13px 14px', fontSize:'0.875rem', color:t.textPrimary, borderBottom:`1px solid ${t.tableBorder}` }

  const formatTime = (ts) => ts ? new Date(ts).toLocaleTimeString('en', { hour:'2-digit', minute:'2-digit' }) : '—'

  return (
    <div style={{ fontFamily:"'Inter', system-ui, sans-serif" }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'24px', flexWrap:'wrap', gap:'12px' }}>
        <div>
          <h1 style={{ fontSize:'1.5rem', fontWeight:'800', color:t.textPrimary, margin:'0 0 4px' }}>Attendance</h1>
          <p style={{ color:t.textSecondary, fontSize:'0.875rem', margin:0 }}>Your monthly attendance records</p>
        </div>
        <div style={{ display:'flex', gap:'8px' }}>
          <select value={month} onChange={e => setMonth(Number(e.target.value))} style={{ padding:'8px 12px', borderRadius:'10px', border:`1px solid ${t.border}`, background: isDark ? '#1e293b' : '#fff', color:t.textPrimary, fontSize:'0.875rem' }}>
            {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ padding:'8px 12px', borderRadius:'10px', border:`1px solid ${t.border}`, background: isDark ? '#1e293b' : '#fff', color:t.textPrimary, fontSize:'0.875rem' }}>
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display:'flex', gap:'12px', marginBottom:'20px', flexWrap:'wrap' }}>
        <StatBox icon={RiCalendarLine} label="Total Days" value={totalDays} color="#3b82f6" />
        <StatBox icon={RiCheckboxCircleLine} label="Present" value={present} color="#10b981" />
        <StatBox icon={RiTimeLine} label="Absent" value={totalDays - present} color="#ef4444" />
        <StatBox icon={RiTimeLine} label="Total Hours" value={`${totalHours.toFixed(1)}h`} color="#8b5cf6" />
        <StatBox icon={RiTimeLine} label="Break Time" value={`${totalBreak.toFixed(1)}h`} color="#f59e0b" />
      </div>

      {/* Table */}
      <div style={{ ...card(isDark), padding:0, overflow:'hidden' }}>
        {loading ? <PageLoader /> : (
          <>
            <style>{`
              @media (max-width: 768px) {
                .table-container { background: transparent !important; box-shadow: none !important; padding: 0 !important; border: none !important; overflow: visible !important; }
                .responsive-table thead { display: none; }
                .responsive-table, .responsive-table tbody, .responsive-table tr, .responsive-table td { display: block; width: 100%; box-sizing: border-box; }
                .responsive-table tr { 
                  margin-bottom: 12px; 
                  border: 1px solid ${isDark ? '#334155' : '#e2e8f0'}; 
                  border-radius: 12px; 
                  background: ${isDark ? '#1e293b' : '#ffffff'};
                  overflow: hidden;
                  box-shadow: 0 4px 6px rgba(0,0,0,0.02);
                }
                .responsive-table td { 
                  display: flex; 
                  justify-content: space-between; 
                  align-items: center; 
                  padding: 8px 12px !important; 
                  border-bottom: 1px solid ${isDark ? '#334155' : '#e2e8f0'};
                  text-align: right;
                  font-size: 0.8rem !important;
                }
                .responsive-table td:last-child { border-bottom: none; }
                .responsive-table td::before { 
                  content: attr(data-label); 
                  font-weight: 700; 
                  font-size: 0.65rem; 
                  text-transform: uppercase; 
                  color: ${isDark ? '#94a3b8' : '#64748b'}; 
                  margin-right: 12px;
                }
                .responsive-table td > * {
                  text-align: right;
                  margin: 0;
                  font-size: inherit;
                }
              }
            `}</style>
            <div className="table-container" style={{ overflowX:'auto' }}>
              <table className="responsive-table" style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>{['Date','Login','Logout','Working Hours','Break','Status'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {records.map((r, i) => {
                  const isPresent = !!r.login_time

                  let currentBreakHrs = parseFloat(r.idle_time || 0);
                  let currentWHrs = parseFloat(r.working_hours || 0);

                  if (isPresent && !r.logout_time) {
                    const loginTimeMs = new Date(r.login_time).getTime();
                    
                    if (r.break_start_time) {
                      const breakStartMs = new Date(r.break_start_time).getTime();
                      currentBreakHrs += (now - breakStartMs) / (1000 * 60 * 60);
                      currentWHrs = (breakStartMs - loginTimeMs) / (1000 * 60 * 60) - parseFloat(r.idle_time || 0);
                    } else {
                      currentWHrs = (now - loginTimeMs) / (1000 * 60 * 60) - currentBreakHrs;
                    }
                  }
                  
                  currentWHrs = Math.max(0, currentWHrs);

                  return (
                    <tr key={i}
                      onMouseEnter={e => e.currentTarget.style.background = isDark ? '#334155' : '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td data-label="Date" style={tdStyle}>{formatDate(r.date)}</td>
                      <td data-label="Login" style={tdStyle}>
                        <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                          <RiLoginBoxLine style={{ color:'#10b981', fontSize:'14px' }} />
                          {formatTime(r.login_time)}
                        </div>
                      </td>
                      <td data-label="Logout" style={tdStyle}>
                        <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                          <RiLogoutBoxLine style={{ color:'#ef4444', fontSize:'14px' }} />
                          {r.logout_time ? formatTime(r.logout_time) : <span style={{ color:'#f59e0b' }}>Active</span>}
                        </div>
                      </td>
                      <td data-label="Working Hours" style={tdStyle}>{currentWHrs.toFixed(1)}h</td>
                      <td data-label="Break" style={tdStyle}>{currentBreakHrs.toFixed(1)}h</td>
                      <td data-label="Status" style={tdStyle}>
                        <span style={{ padding:'3px 10px', borderRadius:'9999px', fontSize:'0.72rem', fontWeight:'700',
                          background: isPresent ? '#dcfce7' : '#fee2e2',
                          color: isPresent ? '#15803d' : '#b91c1c' }}>
                          {isPresent ? 'Present' : 'Absent'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
                {records.length === 0 && (
                  <tr><td colSpan={6} style={{ padding:'48px', textAlign:'center', color:t.textSecondary }}>No attendance records for this period</td></tr>
                )}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  )
}
