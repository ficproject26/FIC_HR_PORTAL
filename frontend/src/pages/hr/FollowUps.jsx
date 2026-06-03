import React, { useEffect, useState } from 'react'
import { RiCheckLine, RiTimeLine, RiPhoneLine, RiMailLine, RiCalendarLine } from 'react-icons/ri'
import api from '../../utils/api'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import Pagination from '../../components/ui/Pagination'
import { StatusBadge } from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import { formatDateTime, timeAgo, localDatetimeToISO } from '../../utils/helpers'
import useThemeStore from '../../store/themeStore'
import useAuthStore from '../../store/authStore'
import { card, getTheme, btnPrimary, btnSecondary, input, label } from '../../utils/styles'
import toast from 'react-hot-toast'

const typeIcons = { call: RiPhoneLine, email: RiMailLine, meeting: RiCalendarLine, whatsapp: RiPhoneLine, other: RiTimeLine }
const typeColors = { call:'#3b82f6', email:'#8b5cf6', meeting:'#10b981', whatsapp:'#22c55e', other:'#94a3b8' }

const defaultForm = () => ({
  status: 'completed',
  outcome: '',
  notes: '',
  scheduleDate: '',
  scheduleTime: '10:00',
  language_spoken: '',
})

const pad2 = (n) => String(n).padStart(2, '0')

const toDateInputValue = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

const defaultRescheduleDate = (fromIso) => {
  const d = new Date(fromIso || Date.now())
  d.setDate(d.getDate() + 1)
  d.setHours(10, 0, 0, 0)
  return { scheduleDate: toDateInputValue(d), scheduleTime: '10:00' }
}

export default function HRFollowUps() {
  const [followUps, setFollowUps] = useState([])
  const [pagination, setPagination] = useState({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(defaultForm())
  const [saving, setSaving] = useState(false)
  const { isDark } = useThemeStore()
  const { user } = useAuthStore()
  const t = getTheme(isDark)
  const isKrishnagiri = user?.branch?.name?.toLowerCase() === 'krishnagiri'

  useEffect(() => { fetchFollowUps() }, [page, filter])

  const fetchFollowUps = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit:10 })
      if (filter) params.set('status', filter)
      const res = await api.get(`/hr/follow-ups?${params}`)
      setFollowUps(res.data.data); setPagination(res.data.pagination)
    } catch(e) {} finally { setLoading(false) }
  }

  const openComplete = (fu) => {
    setSelected(fu)
    const rescheduleDefaults = defaultRescheduleDate(fu.scheduled_at)
    setForm({
      status: isKrishnagiri ? 'not_interested' : 'completed',
      outcome: '',
      notes: fu.notes || '',
      language_spoken: '',
      ...rescheduleDefaults,
    })
    setShowModal(true)
  }

  const handleStatusChange = (newStatus) => {
    if (newStatus === 'rescheduled' && selected) {
      setForm({
        ...form,
        status: newStatus,
        ...defaultRescheduleDate(selected.scheduled_at),
      })
    } else {
      setForm({ ...form, status: newStatus })
    }
  }

  const buildRescheduleISO = () => {
    if (!form.scheduleDate) return null
    return localDatetimeToISO(`${form.scheduleDate}T${form.scheduleTime || '10:00'}`)
  }

  const handleUpdate = async () => {
    const followUpId = selected?._id || selected?.id
    if (!followUpId) return toast.error('Invalid follow-up')

    if (form.status === 'rescheduled' && !form.scheduleDate) {
      return toast.error('Select a new date to reschedule')
    }

    setSaving(true)
    try {
      const payload = {
        status: form.status,
        notes: form.notes,
        outcome: form.outcome,
      }
      if (form.status === 'exemption' && form.language_spoken) {
        payload.language_spoken = form.language_spoken
      }
      if (form.status === 'rescheduled') {
        payload.scheduled_at = buildRescheduleISO()
      }

      const res = await api.put(`/hr/follow-ups/${followUpId}`, payload)
      const updated = res.data.data

      if (updated) {
        const updatedId = updated.id || updated._id
        setFollowUps((prev) =>
          prev.map((fu) => {
            const id = fu.id || fu._id
            return id === updatedId ? { ...fu, ...updated, status: updated.status } : fu
          })
        )
      }

      toast.success(res.data.message || 'Follow-up updated')
      setShowModal(false)
      fetchFollowUps()
      window.dispatchEvent(new Event('followups-updated'))
    } catch (e) {
      const msg = e.response?.data?.message
      if (msg) toast.error(msg)
      else if (e.response?.status !== 500) toast.error('Could not update follow-up')
    } finally {
      setSaving(false)
    }
  }

  const reschedulePreview = form.scheduleDate
    ? formatDateTime(buildRescheduleISO())
    : null

  const isMissed = (fu) => new Date(fu.scheduled_at) < new Date() && ['pending', 'rescheduled'].includes(fu.status)

  const allTabs = ['all', 'pending', 'missed', 'completed']
  const tabs = isKrishnagiri ? allTabs.filter(t => t !== 'completed') : allTabs
  const submitLabel =
    form.status === 'rescheduled' ? 'Reschedule'
      : form.status === 'completed' ? 'Mark Complete'
      : form.status === 'converted' ? 'Mark Converted'
      : form.status === 'exemption' ? 'Mark Exemption'
      : form.status === 'not_interested' ? 'Mark Not Interested'
      : 'Save'

  const thStyle = { textAlign:'left', padding:'10px 14px', fontSize:'0.72rem', fontWeight:'700', color:t.textSecondary, textTransform:'uppercase', letterSpacing:'0.05em', background: isDark ? '#0f172a' : '#f8fafc' }
  const tdStyle = { padding:'14px', fontSize:'0.875rem', color:t.textPrimary, borderBottom:`1px solid ${t.tableBorder}` }

  return (
    <div style={{ fontFamily:"'Inter', system-ui, sans-serif" }}>
      <div style={{ marginBottom:'24px' }}>
        <h1 style={{ fontSize:'1.5rem', fontWeight:'800', color:t.textPrimary, margin:'0 0 4px' }}>Follow-ups</h1>
        <p style={{ color:t.textSecondary, fontSize:'0.875rem', margin:0 }}>Track and manage your follow-up activities</p>
      </div>

      <div style={{ display:'flex', gap:'8px', marginBottom:'20px', flexWrap:'wrap' }}>
        {tabs.map(tab => {
          const isActive = filter === tab || (tab === 'all' && !filter)
          return (
            <button key={tab} onClick={() => { setFilter(tab === 'all' ? '' : tab); setPage(1) }} style={{
              padding:'8px 18px', borderRadius:'10px', cursor:'pointer',
              fontSize:'0.875rem', fontWeight:'600', textTransform:'capitalize',
              background: isActive ? 'linear-gradient(135deg, #2563eb, #4f46e5)' : (isDark ? '#1e293b' : '#ffffff'),
              color: isActive ? 'white' : t.textSecondary,
              border: isActive ? 'none' : `1px solid ${t.border}`,
              boxShadow: isActive ? '0 2px 8px rgba(37,99,235,0.3)' : 'none',
            }}>{tab}</button>
          )
        })}
      </div>

      {loading ? <PageLoader /> : (
        <>
          <style>{`
            .cell-content { align-items: flex-start; text-align: left; }
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
              .cell-content { align-items: flex-end !important; text-align: right !important; }
              .action-buttons { justify-content: flex-end; width: 100%; }
            }
          `}</style>
          <div className="table-container" style={{ ...card(isDark), padding:0, overflow:'hidden' }}>
            <div style={{ overflowX:'auto' }}>
              <table className="responsive-table" style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  {['Lead Name', 'Phone No', 'Position Applied', 'Schedule / Type', 'Status', 'Notes', 'Action'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {followUps.map(fu => {
                  const TypeIcon = typeIcons[fu.type] || RiTimeLine
                  const missed = isMissed(fu)
                  const rowKey = fu.id || fu._id

                  return (
                    <tr key={rowKey}
                      onMouseEnter={e => e.currentTarget.style.background = isDark ? '#334155' : '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td data-label="Lead Name" style={tdStyle}>
                        <p style={{ fontWeight:'600', margin: fu.lead_company ? '0 0 2px' : 0 }}>{fu.lead_name}</p>
                        {fu.lead_company && (
                          <p style={{ fontSize:'0.75rem', color:t.textSecondary, margin:0 }}>{fu.lead_company}</p>
                        )}
                      </td>
                      <td data-label="Phone No" style={tdStyle}>
                        <div className="cell-content" style={{ display: 'flex', flexDirection: 'column' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                            <RiPhoneLine style={{ color:'#10b981', fontSize:'14px', flexShrink:0 }} />
                            <span>{fu.lead_phone || '—'}</span>
                          </div>
                          {fu.lead_email && (
                            <p style={{ fontSize:'0.72rem', color:t.textSecondary, margin:'2px 0 0', paddingLeft:'20px' }}>{fu.lead_email}</p>
                          )}
                        </div>
                      </td>
                      <td data-label="Position Applied" style={tdStyle}>{fu.lead_position_applied || '—'}</td>
                      <td data-label="Schedule / Type" style={tdStyle}>
                        <div className="cell-content" style={{ display: 'flex', flexDirection: 'column' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'4px' }}>
                            <TypeIcon style={{ color: typeColors[fu.type] || t.textSecondary }} />
                            <span style={{ fontSize:'0.8rem', fontWeight:'600', textTransform:'capitalize' }}>{fu.type}</span>
                          </div>
                          <p style={{ fontSize:'0.78rem', color: missed ? '#ef4444' : t.textSecondary, margin:0 }}>{formatDateTime(fu.scheduled_at)}</p>
                          <p style={{ fontSize:'0.7rem', color:t.textMuted, margin:0 }}>{timeAgo(fu.scheduled_at)}</p>
                        </div>
                      </td>
                      <td data-label="Status" style={tdStyle}>
                        <div className="cell-content" style={{ display: 'flex', flexDirection: 'column' }}>
                          <StatusBadge status={missed ? 'missed' : fu.status} />
                          {fu.outcome && <p style={{ fontSize:'0.75rem', color:'#10b981', margin:'4px 0 0' }}>✓ {fu.outcome}</p>}
                        </div>
                      </td>
                      <td data-label="Notes" style={{ ...tdStyle, maxWidth:'200px', whiteSpace:'normal', wordBreak:'break-word' }}>
                        {fu.notes || <span style={{ color:t.textMuted }}>—</span>}
                      </td>
                      <td data-label="Action" style={tdStyle}>
                        <div className="action-buttons" style={{ display: 'flex' }}>
                          {['pending', 'rescheduled'].includes(fu.status) ? (
                            <button onClick={() => openComplete(fu)} style={{ ...btnPrimary, padding:'6px 12px', fontSize:'0.8rem', display:'flex', alignItems:'center', gap:'4px' }}>
                              <RiCheckLine /> Complete
                            </button>
                          ) : (
                            <span style={{ color:t.textMuted }}>—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {followUps.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding:'48px', textAlign:'center', color:t.textSecondary }}>
                      <RiCalendarLine style={{ fontSize:'48px', color:t.textMuted, marginBottom:'12px' }} />
                      <p style={{ color:t.textSecondary, margin:0 }}>No follow-ups found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
            <Pagination pagination={pagination} onPageChange={setPage} />
          </div>
        </>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Update Follow-up" size="sm"
        footer={<>
          <button onClick={() => setShowModal(false)} style={btnSecondary(isDark)}>Cancel</button>
          <button onClick={handleUpdate} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : submitLabel}
          </button>
        </>}>
        <p style={{ fontSize:'0.875rem', color:t.textSecondary, marginBottom:'8px' }}>
          Follow-up with <strong style={{ color:t.textPrimary }}>{selected?.lead_name}</strong>
        </p>
        {selected?.scheduled_at && (
          <p style={{ fontSize:'0.75rem', color:t.textMuted, margin:'0 0 16px' }}>
            Current schedule: <strong style={{ color:t.textSecondary }}>{formatDateTime(selected.scheduled_at)}</strong>
          </p>
        )}
        <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
          <div>
            <label style={label(isDark)}>Status</label>
            <select value={form.status} onChange={e => handleStatusChange(e.target.value)} style={{ ...input(isDark) }}>
              {!isKrishnagiri && <option value="completed">Completed</option>}
              {!isKrishnagiri && <option value="converted">Converted</option>}
              <option value="exemption">Exemption</option>
              <option value="not_interested">Not Interested</option>
              <option value="missed">Missed</option>
              <option value="rescheduled">Rescheduled</option>
            </select>
          </div>

          {form.status === 'exemption' && (
            <div>
              <label style={label(isDark)}>Language spoken</label>
              <input 
                type="text" 
                placeholder="e.g. Telugu, Tamil..."
                value={form.language_spoken} 
                onChange={e => setForm({ ...form, language_spoken: e.target.value })} 
                style={{ ...input(isDark) }} 
              />
            </div>
          )}

          {form.status === 'rescheduled' && (
            <div>
              <label style={label(isDark)}>New date & time *</label>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                <input
                  type="date"
                  value={form.scheduleDate}
                  onChange={e => setForm({ ...form, scheduleDate: e.target.value })}
                  style={input(isDark)}
                />
                <input
                  type="time"
                  value={form.scheduleTime}
                  onChange={e => setForm({ ...form, scheduleTime: e.target.value })}
                  style={input(isDark)}
                />
              </div>
              {reschedulePreview && (
                <p style={{ fontSize:'0.8rem', color:'#2563eb', fontWeight:'600', margin:'8px 0 0' }}>
                  New schedule: {reschedulePreview}
                </p>
              )}
              <p style={{ fontSize:'0.72rem', color:t.textSecondary, margin:'6px 0 0' }}>
                Pick a different date than today’s schedule (e.g. June 6 → choose day <strong>06</strong> in the date picker).
              </p>
            </div>
          )}

          {form.status === 'completed' && (
            <div>
              <label style={label(isDark)}>Outcome</label>
              <input placeholder="What was the result?" value={form.outcome} onChange={e => setForm({ ...form, outcome:e.target.value })} style={input(isDark)} />
            </div>
          )}
          {(form.status === 'converted' || form.status === 'not_interested') && (
            <p style={{ fontSize:'0.8rem', color:t.textSecondary, margin:0 }}>
              The linked lead will be set to <strong>{form.status === 'converted' ? 'Converted' : 'Not Interested'}</strong>.
            </p>
          )}

          <div>
            <label style={label(isDark)}>Notes</label>
            <textarea rows={3} placeholder="Additional notes..." value={form.notes} onChange={e => setForm({ ...form, notes:e.target.value })} style={{ ...input(isDark), resize:'none' }} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
