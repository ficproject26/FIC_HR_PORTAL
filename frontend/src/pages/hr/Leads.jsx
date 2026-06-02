import React, { useEffect, useState, useCallback } from 'react'
import { RiEditLine, RiCalendarLine, RiAddLine, RiPhoneLine } from 'react-icons/ri'
import api from '../../utils/api'
import Pagination from '../../components/ui/Pagination'
import { StatusBadge, PriorityBadge } from '../../components/ui/Badge'
import SearchBar from '../../components/ui/SearchBar'
import Modal from '../../components/ui/Modal'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import { formatDate, formatDateTime, debounce } from '../../utils/helpers'
import StatusUpdateHistory, { statusLabel } from '../../components/leads/StatusUpdateHistory'
import useThemeStore from '../../store/themeStore'
import { card, getTheme, btnPrimary, btnSecondary, input, label, statusColors, getStatusBadge, getPriorityBadge } from '../../utils/styles'
import toast from 'react-hot-toast'

const STATUS_OPTIONS = ['new','followup','exemption','converted','not_interested']
const STATUS_LABELS = { new:'new', followup:'followup', exemption:'exemption', converted:'converted', not_interested:'not interested' }
const PRIORITY_OPTIONS = ['low','medium','high','urgent']

const emptyAdd = { name:'', phone:'', position_applied:'', notes:'' }

export default function HRLeads() {
  const [leads, setLeads] = useState([])
  const [pagination, setPagination] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ status:'', priority:'' })
  const [page, setPage] = useState(1)

  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showFUModal, setShowFUModal] = useState(false)

  const [editLead, setEditLead] = useState(null)
  const [selectedLead, setSelectedLead] = useState(null)
  const [form, setForm] = useState({ status:'new', position_applied:'', notes:'' })
  const [addForm, setAddForm] = useState(emptyAdd)
  const [fuForm, setFuForm] = useState({ scheduled_at:'', type:'call', notes:'' })
  const [saving, setSaving] = useState(false)
  const [statusHistory, setStatusHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const { isDark } = useThemeStore()
  const t = getTheme(isDark)

  const [pipelineCounts, setPipelineCounts] = useState({
    new: 0,
    followup: 0,
    exemption: 0,
    converted: 0,
    not_interested: 0
  })

  const fetchPipelineCounts = async () => {
    try {
      const res = await api.get('/leads/pipeline/stats')
      const countsObj = {
        new: 0,
        followup: 0,
        exemption: 0,
        converted: 0,
        not_interested: 0
      }
      if (res.data && res.data.success && Array.isArray(res.data.data)) {
        res.data.data.forEach(item => {
          if (countsObj.hasOwnProperty(item.status)) {
            countsObj[item.status] = item.count
          }
        })
      }
      setPipelineCounts(countsObj)
    } catch (e) {
      console.error(e)
    }
  }

  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [detailModalTitle, setDetailModalTitle] = useState('')
  const [detailModalList, setDetailModalList] = useState([])
  const [detailModalLoading, setDetailModalLoading] = useState(false)
  const [hoveredIndex, setHoveredIndex] = useState(null)

  const handleCardClick = async (status, label) => {
    setDetailModalTitle(`${label} Leads`)
    setDetailModalOpen(true)
    setDetailModalLoading(true)
    setDetailModalList([])
    try {
      const params = new URLSearchParams({ page: 1, limit: 100, status })
      const res = await api.get(`/leads?${params}`)
      setDetailModalList(res.data.data)
    } catch (e) {
      console.error(e)
    } finally {
      setDetailModalLoading(false)
    }
  }

  const renderModalContent = () => {
    if (detailModalList.length === 0) {
      return <p style={{ textAlign: 'center', color: t.textSecondary, padding: '24px 0' }}>No leads available</p>
    }

    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${t.border}` }}>
              {['Lead Name', 'Company', 'Position', 'Priority', 'Status'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '12px', fontSize: '0.75rem', fontWeight: '700', color: t.textSecondary, textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {detailModalList.map(lead => (
              <tr key={lead.id} style={{ borderBottom: `1px solid ${t.tableBorder}` }}>
                <td style={{ padding: '12px' }}>
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: '600', color: t.textPrimary, margin: 0 }}>{lead.name}</p>
                    <p style={{ fontSize: '0.72rem', color: t.textSecondary, margin: 0 }}>{lead.email || lead.phone || '—'}</p>
                  </div>
                </td>
                <td style={{ padding: '12px', fontSize: '0.875rem', color: t.textPrimary }}>{lead.company || '—'}</td>
                <td style={{ padding: '12px', fontSize: '0.875rem', color: t.textSecondary }}>{lead.position_applied || '—'}</td>
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

  useEffect(() => { fetchLeads() }, [page, filters])
  const debouncedFetch = useCallback(debounce(() => { setPage(1); fetchLeads() }, 400), [search])
  useEffect(() => { debouncedFetch() }, [search])

  const fetchLeads = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit:10, search })
      Object.entries(filters).forEach(([k,v]) => v && params.set(k, v))
      const res = await api.get(`/leads?${params}`)
      setLeads(res.data.data); setPagination(res.data.pagination)
      fetchPipelineCounts()
    } catch(e) {} finally { setLoading(false) }
  }

  const openEdit = async (lead) => {
    setEditLead(lead)
    setForm({
      status: lead.status,
      position_applied: lead.position_applied || '',
      notes: lead.notes || '',
    })
    setStatusHistory([])
    setShowUpdateModal(true)
    setHistoryLoading(true)
    try {
      const res = await api.get(`/leads/${lead.id}`)
      setStatusHistory(res.data.data?.statusHistory || res.data.data?.activities || [])
    } catch {
      setStatusHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put(`/leads/${editLead.id}`, {
        status: form.status,
        position_applied: form.position_applied.trim(),
        notes: form.notes,
      })
      toast.success('Lead updated')
      setShowUpdateModal(false)
      fetchLeads()
    } catch(e) { toast.error('Error updating lead') } finally { setSaving(false) }
  }

  const handleAdd = async () => {
    if (!addForm.name.trim()) return toast.error('Name is required')
    if (!addForm.phone.trim()) return toast.error('Phone is required')
    setSaving(true)
    try {
      await api.post('/leads', { ...addForm, source:'manual', status:'new' })
      toast.success('Lead added'); setShowAddModal(false); setAddForm(emptyAdd); fetchLeads()
    } catch(e) { toast.error('Failed to add lead') } finally { setSaving(false) }
  }

  const handleScheduleFU = async () => {
    if (!fuForm.scheduled_at) return toast.error('Select date and time')
    setSaving(true)
    try {
      await api.post('/hr/follow-ups', { lead_id: selectedLead.id, ...fuForm })
      toast.success('Follow-up scheduled'); setShowFUModal(false); setFuForm({ scheduled_at:'', type:'call', notes:'' })
    } catch(e) { toast.error('Error') } finally { setSaving(false) }
  }

  const thStyle = { textAlign:'left', padding:'10px 14px', fontSize:'0.72rem', fontWeight:'700', color:t.textSecondary, textTransform:'uppercase', letterSpacing:'0.05em', background: isDark ? '#0f172a' : '#f8fafc' }
  const tdStyle = { padding:'14px', fontSize:'0.875rem', color:t.textPrimary, borderBottom:`1px solid ${t.tableBorder}` }

  return (
    <div style={{ fontFamily:"'Inter', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'24px' }}>
        <div>
          <h1 style={{ fontSize:'1.5rem', fontWeight:'800', color:t.textPrimary, margin:'0 0 4px' }}>Leads</h1>
          <p style={{ color:t.textSecondary, fontSize:'0.875rem', margin:0 }}>Manage all your recruitment leads</p>
        </div>
        <button onClick={() => { setAddForm(emptyAdd); setShowAddModal(true) }} style={{ ...btnPrimary, padding:'10px 20px', display:'flex', alignItems:'center', gap:'6px' }}>
          <RiAddLine /> Add Lead
        </button>
      </div>

      {/* Pipeline Summary */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:'10px', marginBottom:'20px' }}>
        {STATUS_OPTIONS.map(s => {
          const c = statusColors[s] || { bg:'#f1f5f9', color:'#64748b' }
          const isHovered = hoveredIndex === s
          return (
            <button key={s} 
              onClick={() => handleCardClick(s, STATUS_LABELS[s] || s)}
              onMouseEnter={() => setHoveredIndex(s)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{
                padding:'16px 8px', borderRadius:'14px',
                border: isHovered ? `2px solid ${c.color}` : '2px solid transparent',
                background: c.bg, cursor:'pointer', textAlign:'center',
                boxShadow: isHovered ? `0 4px 12px ${c.color}30` : '0 2px 6px rgba(0,0,0,0.06)',
                transition:'all 0.2s',
                transform: isHovered ? 'translateY(-3px)' : 'translateY(0)',
              }}
            >
              <p style={{ fontSize:'1.4rem', fontWeight:'800', color: c.color, margin:'0 0 4px' }}>{pipelineCounts[s] || 0}</p>
              <p style={{ fontSize:'0.7rem', fontWeight:'700', color: c.color, margin:0, textTransform:'capitalize', opacity:0.85 }}>{STATUS_LABELS[s] || s}</p>
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div style={{ ...card(isDark), padding:'14px', marginBottom:'20px', display:'flex', flexWrap:'wrap', gap:'10px' }}>
        <SearchBar value={search} onChange={v => { setSearch(v); setPage(1) }} placeholder="Search leads..." style={{ flex:'1', minWidth:'200px' }} />
        <select value={filters.status} onChange={e => setFilters({ ...filters, status:e.target.value })} style={{ ...input(isDark), width:'auto', padding:'8px 12px' }}>
          <option value="">All Status</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s} style={{ textTransform:'capitalize' }}>{STATUS_LABELS[s] || s}</option>)}
        </select>
        <select value={filters.priority} onChange={e => setFilters({ ...filters, priority:e.target.value })} style={{ ...input(isDark), width:'auto', padding:'8px 12px' }}>
          <option value="">All Priority</option>
          {PRIORITY_OPTIONS.map(p => <option key={p} value={p} style={{ textTransform:'capitalize' }}>{p}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ ...card(isDark), padding:0, overflow:'hidden' }}>
        {loading ? <PageLoader /> : (
          <>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr>{['Lead','Phone','Position','Status','Priority','Status Updated','Created','Actions'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {leads.map(lead => (
                    <tr key={lead.id}
                      onMouseEnter={e => e.currentTarget.style.background = isDark ? '#334155' : '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={tdStyle}>
                        <p style={{ fontWeight:'600', margin: lead.company ? '0 0 2px' : 0 }}>{lead.name}</p>
                        {lead.company && (
                          <p style={{ fontSize:'0.75rem', color:t.textSecondary, margin:0 }}>{lead.company}</p>
                        )}
                      </td>
                      <td style={tdStyle}>
                        {lead.phone ? (
                          <>
                            <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                              <RiPhoneLine style={{ color:'#10b981', fontSize:'14px', flexShrink:0 }} />
                              <span>{lead.phone}</span>
                            </div>
                            {lead.email && (
                              <p style={{ fontSize:'0.72rem', color:t.textSecondary, margin:'2px 0 0', paddingLeft:'20px' }}>{lead.email}</p>
                            )}
                          </>
                        ) : lead.email ? (
                          <span>{lead.email}</span>
                        ) : (
                          <span style={{ color:t.textMuted }}>—</span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, fontSize:'0.8rem' }}>{lead.position_applied || '—'}</td>
                      <td style={tdStyle}><StatusBadge status={lead.status} /></td>
                      <td style={tdStyle}><PriorityBadge priority={lead.priority} /></td>

                      <td style={{ ...tdStyle, fontSize:'0.78rem', color:t.textSecondary, minWidth:'140px' }}>
                        {lead.status_updated_at ? (
                          <>
                            <p style={{ margin:'0 0 4px', fontWeight:'600', color:t.textPrimary }}>{formatDateTime(lead.status_updated_at)}</p>
                            {(lead.previous_status || lead.status_updated_to) && (
                              <p style={{ margin:0, fontSize:'0.72rem' }}>
                                {statusLabel(lead.previous_status)} → {statusLabel(lead.status_updated_to || lead.status)}
                              </p>
                            )}
                          </>
                        ) : (
                          <span style={{ color:t.textMuted }}>—</span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, fontSize:'0.78rem', color:t.textSecondary }}>{formatDate(lead.created_at)}</td>
                      <td style={tdStyle}>
                        <div style={{ display:'flex', gap:'4px' }}>
                          <button onClick={() => openEdit(lead)} title="Edit lead" style={{ padding:'6px', borderRadius:'8px', border:'none', background:'transparent', cursor:'pointer', color:'#3b82f6', fontSize:'16px', display:'flex' }}><RiEditLine /></button>
                          <button onClick={() => { setSelectedLead(lead); setShowFUModal(true) }} title="Schedule Follow-up" style={{ padding:'6px', borderRadius:'8px', border:'none', background:'transparent', cursor:'pointer', color:'#10b981', fontSize:'16px', display:'flex' }}><RiCalendarLine /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {leads.length === 0 && <tr><td colSpan={9} style={{ padding:'48px', textAlign:'center', color:t.textSecondary }}>No leads found. Click "Add Lead" to create one.</td></tr>}
                </tbody>
              </table>
            </div>
            <Pagination pagination={pagination} onPageChange={setPage} />
          </>
        )}
      </div>

      {/* Add Lead Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Lead" size="sm"
        footer={<>
          <button onClick={() => setShowAddModal(false)} style={btnSecondary(isDark)}>Cancel</button>
          <button onClick={handleAdd} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>{saving ? 'Adding...' : 'Add Lead'}</button>
        </>}>
        <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
          <div>
            <label style={label(isDark)}>Name *</label>
            <input type="text" placeholder="Full name" value={addForm.name} onChange={e => setAddForm({ ...addForm, name:e.target.value })} style={input(isDark)} />
          </div>
          <div>
            <label style={label(isDark)}>Phone *</label>
            <input type="tel" placeholder="Phone number" value={addForm.phone} onChange={e => setAddForm({ ...addForm, phone:e.target.value })} style={input(isDark)} />
          </div>
          <div>
            <label style={label(isDark)}>Position Applied</label>
            <input type="text" placeholder="e.g. React Developer" value={addForm.position_applied} onChange={e => setAddForm({ ...addForm, position_applied:e.target.value })} style={input(isDark)} />
          </div>
          <div>
            <label style={label(isDark)}>Notes</label>
            <textarea rows={3} placeholder="Additional notes..." value={addForm.notes} onChange={e => setAddForm({ ...addForm, notes:e.target.value })} style={{ ...input(isDark), resize:'vertical' }} />
          </div>
        </div>
      </Modal>

      {/* Update Lead Modal */}
      <Modal isOpen={showUpdateModal} onClose={() => setShowUpdateModal(false)} title={editLead ? `Update — ${editLead.name}` : 'Update Lead'} size="sm"
        footer={<button onClick={handleSave} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1, minWidth:'100px', justifyContent:'center' }}>{saving ? 'Saving...' : 'Save'}</button>}>
        {editLead && (
          <div>
            <p style={{ fontSize:'0.9rem', color:t.textSecondary, margin:'0 0 20px' }}>{editLead.phone || 'No phone'}</p>
            <div style={{ marginBottom:'20px' }}>
              <label style={label(isDark)}>Position</label>
              <input
                type="text"
                placeholder="e.g. React Developer"
                value={form.position_applied}
                onChange={e => setForm({ ...form, position_applied: e.target.value })}
                style={input(isDark)}
              />
            </div>
            <div style={{ marginBottom:'20px' }}>
              <label style={label(isDark)}>Status</label>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                {STATUS_OPTIONS.map(s => {
                  const active = form.status === s
                  return (
                    <button key={s} onClick={() => setForm({ ...form, status: s })} style={{
                      padding:'12px 16px', borderRadius:'12px', fontSize:'0.875rem', fontWeight:'600',
                      cursor:'pointer', transition:'all 0.2s',
                      background: active ? 'linear-gradient(135deg, #2563eb, #4f46e5)' : (isDark ? '#0f172a' : '#ffffff'),
                      color: active ? '#ffffff' : t.textPrimary,
                      border: active ? '2px solid #2563eb' : `2px solid ${t.border}`,
                      textTransform:'capitalize',
                    }}>{STATUS_LABELS[s] || s}</button>
                  )
                })}
              </div>
            </div>
            <div>
              <label style={label(isDark)}>Notes</label>
              <textarea rows={4} placeholder="Call back tomorrow 4pm..." value={form.notes} onChange={e => setForm({ ...form, notes:e.target.value })} style={{ ...input(isDark), resize:'vertical' }} />
            </div>
            <StatusUpdateHistory activities={statusHistory} isDark={isDark} loading={historyLoading} />
          </div>
        )}
      </Modal>

      {/* Schedule Follow-up Modal */}
      <Modal isOpen={showFUModal} onClose={() => setShowFUModal(false)} title="Schedule Follow-up" size="sm"
        footer={<>
          <button onClick={() => setShowFUModal(false)} style={btnSecondary(isDark)}>Cancel</button>
          <button onClick={handleScheduleFU} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>{saving ? 'Scheduling...' : 'Schedule'}</button>
        </>}>
        <p style={{ fontSize:'0.875rem', color:t.textSecondary, marginBottom:'16px' }}>
          Scheduling follow-up for <strong style={{ color:t.textPrimary }}>{selectedLead?.name}</strong>
        </p>
        <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
          <div>
            <label style={label(isDark)}>Date & Time</label>
            <input type="datetime-local" value={fuForm.scheduled_at} onChange={e => setFuForm({ ...fuForm, scheduled_at:e.target.value })} style={input(isDark)} />
          </div>
          <div>
            <label style={label(isDark)}>Type</label>
            <select value={fuForm.type} onChange={e => setFuForm({ ...fuForm, type:e.target.value })} style={{ ...input(isDark) }}>
              {['call','email','meeting','whatsapp','other'].map(t => <option key={t} value={t} style={{ textTransform:'capitalize' }}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={label(isDark)}>Notes</label>
            <textarea rows={3} placeholder="What to discuss..." value={fuForm.notes} onChange={e => setFuForm({ ...fuForm, notes:e.target.value })} style={{ ...input(isDark), resize:'none' }} />
          </div>
        </div>
      </Modal>
      {/* Leads Detail Modal */}
      <Modal isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)} title={detailModalTitle} size="lg">
        {detailModalLoading ? (
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
