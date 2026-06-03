import React, { useEffect, useState, useCallback } from 'react'
import { RiArrowLeftLine, RiArrowRightLine, RiCalendarLine, RiTimeLine, RiRefreshLine } from 'react-icons/ri'
import api from '../../utils/api'
import { formatTime, formatDate, isSameLocalDay } from '../../utils/helpers'
import useThemeStore from '../../store/themeStore'
import { card, getTheme, btnSecondary } from '../../utils/styles'

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function HRCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [followUps, setFollowUps] = useState([])
  const [upcoming, setUpcoming] = useState([])
  const [selectedDay, setSelectedDay] = useState(null)
  const [loading, setLoading] = useState(false)
  const { isDark } = useThemeStore()
  const t = getTheme(isDark)

  const fetchCalendar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get(`/hr/calendar?month=${currentDate.getMonth() + 1}&year=${currentDate.getFullYear()}`)
      setFollowUps(res.data.data || [])
      setUpcoming(res.data.upcoming || [])
    } catch (e) {
      setFollowUps([])
      setUpcoming([])
    } finally {
      setLoading(false)
    }
  }, [currentDate])

  useEffect(() => {
    fetchCalendar()
    const onRefresh = () => fetchCalendar()
    window.addEventListener('followups-updated', onRefresh)
    window.addEventListener('focus', onRefresh)
    return () => {
      window.removeEventListener('followups-updated', onRefresh)
      window.removeEventListener('focus', onRefresh)
    }
  }, [fetchCalendar])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()

  const isToday = (d) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear()

  const getFUsForDay = (d) =>
    followUps.filter((fu) => isSameLocalDay(fu.scheduled_at, year, month, d))

  const selectedFUs = selectedDay ? getFUsForDay(selectedDay) : []

  const displayStatus = (fu) => (fu.status === 'rescheduled' ? 'pending' : fu.status)

  return (
    <div style={{ fontFamily:"'Inter', system-ui, sans-serif" }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'24px', gap:'12px' }}>
        <div>
          <h1 style={{ fontSize:'1.5rem', fontWeight:'800', color:t.textPrimary, margin:'0 0 4px' }}>Follow-up Calendar</h1>
          <p style={{ color:t.textSecondary, fontSize:'0.875rem', margin:0 }}>View and manage your scheduled follow-ups</p>
        </div>
        <button type="button" onClick={fetchCalendar} disabled={loading} style={{ ...btnSecondary(isDark), display:'flex', alignItems:'center', gap:'6px' }}>
          <RiRefreshLine /> {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <style>{`
        .calendar-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 20px;
        }
        @media (max-width: 768px) {
          .calendar-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <div className="calendar-grid">
        <div style={card(isDark)}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'24px' }}>
            <h2 style={{ fontSize:'1.1rem', fontWeight:'800', color:t.textPrimary, margin:0 }}>{MONTHS[month]} {year}</h2>
            <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
              <button type="button" onClick={() => { setCurrentDate(new Date(year, month - 1, 1)); setSelectedDay(null) }} style={{ padding:'6px', borderRadius:'8px', border:`1px solid ${t.border}`, background:'transparent', cursor:'pointer', color:t.textSecondary, fontSize:'16px', display:'flex' }}>
                <RiArrowLeftLine />
              </button>
              <button type="button" onClick={() => { setCurrentDate(new Date()); setSelectedDay(today.getDate()) }} style={{ padding:'6px 12px', borderRadius:'8px', border:`1px solid ${t.border}`, background:'transparent', cursor:'pointer', color:'#3b82f6', fontSize:'0.8rem', fontWeight:'600' }}>
                Today
              </button>
              <button type="button" onClick={() => { setCurrentDate(new Date(year, month + 1, 1)); setSelectedDay(null) }} style={{ padding:'6px', borderRadius:'8px', border:`1px solid ${t.border}`, background:'transparent', cursor:'pointer', color:t.textSecondary, fontSize:'16px', display:'flex' }}>
                <RiArrowRightLine />
              </button>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', marginBottom:'8px' }}>
            {DAYS.map((d) => (
              <div key={d} style={{ textAlign:'center', fontSize:'0.72rem', fontWeight:'700', color:t.textSecondary, padding:'6px 0', textTransform:'uppercase', letterSpacing:'0.05em' }}>{d}</div>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:'2px' }}>
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const d = i + 1
              const dayFUs = getFUsForDay(d)
              const hasFUs = dayFUs.length > 0
              const hasMissed = dayFUs.some(
                (fu) => fu.status === 'missed' || (fu.status === 'pending' && new Date(fu.scheduled_at) < new Date())
              )
              const isSelected = selectedDay === d
              const todayDay = isToday(d)

              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDay(isSelected ? null : d)}
                  style={{
                    aspectRatio:'1',
                    borderRadius:'10px',
                    border: isSelected ? '2px solid #3b82f6' : 'none',
                    cursor:'pointer',
                    display:'flex',
                    flexDirection:'column',
                    alignItems:'center',
                    justifyContent:'center',
                    gap:'2px',
                    background: todayDay ? '#3b82f6' : isSelected ? (isDark ? 'rgba(59,130,246,0.2)' : '#eff6ff') : 'transparent',
                    color: todayDay ? 'white' : isSelected ? '#3b82f6' : t.textPrimary,
                    fontWeight: todayDay ? '800' : '500',
                    fontSize:'0.875rem',
                    transition:'all 0.15s',
                  }}
                >
                  {d}
                  {hasFUs && (
                    <div style={{ display:'flex', gap:'2px' }}>
                      {dayFUs.slice(0, 3).map((fu, idx) => (
                        <span
                          key={fu.id || fu._id || idx}
                          style={{
                            width:'4px',
                            height:'4px',
                            borderRadius:'50%',
                            background: fu.status === 'completed' ? '#10b981' : hasMissed ? '#ef4444' : '#3b82f6',
                          }}
                        />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          <div style={{ display:'flex', gap:'16px', marginTop:'20px', paddingTop:'16px', borderTop:`1px solid ${t.border}` }}>
            {[{ color:'#3b82f6', label:'Pending' }, { color:'#10b981', label:'Completed' }, { color:'#ef4444', label:'Missed' }].map((item) => (
              <div key={item.label} style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'0.75rem', color:t.textSecondary }}>
                <span style={{ width:'8px', height:'8px', borderRadius:'50%', background:item.color, display:'inline-block' }} />
                {item.label}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
          <div style={card(isDark)}>
            <h3 style={{ fontSize:'0.875rem', fontWeight:'700', color:t.textPrimary, margin:'0 0 14px' }}>
              {selectedDay ? `${MONTHS[month]} ${selectedDay}, ${year}` : 'Select a day'}
            </h3>
            {selectedDay ? (
              selectedFUs.length > 0 ? (
                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  {selectedFUs.map((fu) => (
                    <div key={fu.id || fu._id} style={{ display:'flex', alignItems:'flex-start', gap:'10px', padding:'10px', background: isDark ? '#0f172a' : '#f8fafc', borderRadius:'10px' }}>
                      <span style={{ width:'8px', height:'8px', borderRadius:'50%', marginTop:'5px', flexShrink:0, background: fu.status === 'completed' ? '#10b981' : fu.status === 'missed' ? '#ef4444' : '#3b82f6' }} />
                      <div>
                        <p style={{ fontSize:'0.8rem', fontWeight:'600', color:t.textPrimary, margin:'0 0 2px' }}>{fu.lead_name}</p>
                        <p style={{ fontSize:'0.72rem', color:t.textSecondary, margin:'0 0 2px', display:'flex', alignItems:'center', gap:'3px' }}>
                          <RiTimeLine /> {formatTime(fu.scheduled_at)}
                        </p>
                        <p style={{ fontSize:'0.7rem', color:t.textMuted, margin:0, textTransform:'capitalize' }}>{fu.type} • {displayStatus(fu)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize:'0.8rem', color:t.textSecondary, textAlign:'center', padding:'16px 0' }}>No follow-ups on this day</p>
              )
            ) : (
              <p style={{ fontSize:'0.8rem', color:t.textSecondary, textAlign:'center', padding:'16px 0' }}>Click a date to see follow-ups</p>
            )}
          </div>

          <div style={card(isDark)}>
            <h3 style={{ fontSize:'0.875rem', fontWeight:'700', color:t.textPrimary, margin:'0 0 14px' }}>Upcoming (7 Days)</h3>
            {upcoming.length > 0 ? (
              <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                {upcoming.map((fu) => (
                  <div key={fu.id || fu._id} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'8px', borderRadius:'8px', background: isDark ? '#0f172a' : '#f8fafc' }}>
                    <RiCalendarLine style={{ color:'#3b82f6', flexShrink:0 }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:'0.78rem', fontWeight:'600', color:t.textPrimary, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{fu.lead_name}</p>
                      <p style={{ fontSize:'0.7rem', color:t.textSecondary, margin:0 }}>
                        {formatDate(fu.scheduled_at, 'MMM dd, yyyy')} • {formatTime(fu.scheduled_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize:'0.78rem', color:t.textSecondary, textAlign:'center', padding:'8px 0' }}>No upcoming follow-ups</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
