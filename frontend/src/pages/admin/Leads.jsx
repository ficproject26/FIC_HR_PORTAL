import React, { useEffect, useState, useCallback } from 'react'
import { RiAddLine, RiUploadLine, RiEditLine, RiDeleteBinLine, RiTeamLine, RiAddCircleLine, RiCloseCircleLine } from 'react-icons/ri'
import api from '../../utils/api'
import Pagination from '../../components/ui/Pagination'
import { StatusBadge, PriorityBadge } from '../../components/ui/Badge'
import SearchBar from '../../components/ui/SearchBar'
import Modal from '../../components/ui/Modal'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import { formatDate, debounce } from '../../utils/helpers'
import useThemeStore from '../../store/themeStore'
import { card, getTheme, btnPrimary, btnSecondary, input, label } from '../../utils/styles'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

const STATUS_OPTIONS = ['new', 'followup', 'exemption', 'converted', 'not_interested', 'contacted', 'qualified', 'proposal', 'negotiation', 'lost']
const PRIORITY_OPTIONS = ['low','medium','high','urgent']
const SOURCE_OPTIONS = ['manual','excel']
const emptyForm = { name:'', email:'', phone:'', source:'manual', status:'new', priority:'medium', position_applied:'', assigned_to:'' }

const getAssignedId = (lead) => lead.assigned_to_id || (lead.assigned_to?._id ?? lead.assigned_to) || ''

const emptyAssignRule = () => ({ hr_id: '', from: 1, to: 50 })

export default function AdminLeads() {
  const [leads, setLeads] = useState([])
  const [pagination, setPagination] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ status:'', priority:'', source:'' })
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [showBulkAssign, setShowBulkAssign] = useState(false)
  const [assignRules, setAssignRules] = useState([emptyAssignRule()])
  const [bulkUnassignedOnly, setBulkUnassignedOnly] = useState(true)
  const [bulkLeadTotal, setBulkLeadTotal] = useState(0)
  const [bulkAssigning, setBulkAssigning] = useState(false)
  const [editLead, setEditLead] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [uploadFile, setUploadFile] = useState(null)
  const [hrUsers, setHrUsers] = useState([])
  const [branches, setBranches] = useState([])
  const [selectedBranch, setSelectedBranch] = useState('')
  const { isDark } = useThemeStore()
  const { user } = useAuthStore()
  const t = getTheme(isDark)

  const [selectedHrView, setSelectedHrView] = useState(null)
  const [dashboardStats, setDashboardStats] = useState(null)

  useEffect(() => { 
    fetchHRUsers(); 
    if (user?.role === 'admin' || user?.role === 'superadmin') {
      api.get('/branches?limit=100').then(res => setBranches(res.data.data)).catch(e => console.error(e))
    }
  }, [user?.role])
  useEffect(() => { fetchDashboardStats() }, [selectedBranch])
  useEffect(() => { fetchLeads() }, [page, filters, selectedHrView])

  const debouncedFetch = useCallback(debounce(() => { setPage(1); fetchLeads() }, 400), [search, filters, selectedHrView])
  useEffect(() => { debouncedFetch() }, [search])

  const fetchDashboardStats = async () => {
    try {
      const url = selectedBranch ? `/admin/dashboard?branch=${selectedBranch}` : '/admin/dashboard'
      const res = await api.get(url)
      setDashboardStats(res.data.data)
    } catch (e) {}
  }

  const fetchHRUsers = async () => {
    try {
      const res = await api.get('/admin/hr-users?limit=100&status=active')
      setHrUsers(res.data.data || [])
    } catch (e) {}
  }

  const fetchLeads = async () => {
    if (!selectedHrView) return;
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 10, search })
      Object.entries(filters).forEach(([k,v]) => v && params.set(k, v))
      if (selectedHrView === 'unassigned') {
        params.set('assigned_to', 'unassigned')
      } else {
        params.set('assigned_to', selectedHrView.id || selectedHrView._id)
      }
      const res = await api.get(`/leads?${params}`)
      setLeads(res.data.data); setPagination(res.data.pagination)
    } catch(e) {} finally { setLoading(false) }
  }

  const openAdd = () => { setEditLead(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (lead) => {
    setEditLead(lead)
    setForm({
      name: lead.name || '',
      email: lead.email || '',
      phone: lead.phone || '',
      source: lead.source || 'manual',
      status: lead.status || 'new',
      priority: lead.priority || 'medium',
      position_applied: lead.position_applied || '',
      assigned_to: getAssignedId(lead),
    })
    setShowModal(true)
  }

  const handleAssign = async (lead, hrId) => {
    const leadId = lead.id || lead._id
    try {
      await api.put(`/leads/${leadId}`, { assigned_to: hrId || null })
      toast.success(hrId ? 'Lead assigned to HR' : 'Lead unassigned')
      fetchLeads()
    } catch (e) {
      toast.error('Failed to assign lead')
    }
  }

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Lead name is required')
    if (!form.phone.trim() && !form.email.trim()) return toast.error('Phone or email is required for contact')
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      source: form.source,
      status: form.status,
      priority: form.priority,
      position_applied: form.position_applied.trim(),
      assigned_to: form.assigned_to || null,
    }
    try {
      if (editLead) { await api.put(`/leads/${editLead.id || editLead._id}`, payload); toast.success('Lead updated') }
      else { await api.post('/leads', payload); toast.success('Lead created') }
      setShowModal(false); fetchLeads()
    } catch(e) { toast.error(e.response?.data?.message || 'Error') } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this lead?')) return
    try { await api.delete(`/leads/${id}`); toast.success('Lead deleted'); fetchLeads() }
    catch(e) { toast.error('Error') }
  }

  const handleBulkUpload = async () => {
    if (!uploadFile) return toast.error('Select a file first')
    const fd = new FormData(); fd.append('file', uploadFile)
    try {
      const res = await api.post('/leads/bulk-upload', fd)
      toast.success(res.data.message)
      setShowUpload(false)
      setFilters((f) => ({ ...f, source: 'excel' }))
      setBulkUnassignedOnly(true)
      fetchLeads()
    } catch(e) { toast.error('Upload failed') }
  }

  const fetchBulkAssignPreview = async (unassignedOnly = bulkUnassignedOnly) => {
    try {
      const params = new URLSearchParams({ search, unassigned_only: unassignedOnly })
      if (filters.status) params.set('status', filters.status)
      if (filters.priority) params.set('priority', filters.priority)
      if (filters.source) params.set('source', filters.source)
      const res = await api.get(`/admin/leads/bulk-assign-preview?${params}`)
      const total = res.data.total || 0
      setBulkLeadTotal(total)
      return total
    } catch (e) {
      setBulkLeadTotal(0)
      return 0
    }
  }

  const openBulkAssign = async () => {
    setAssignRules([emptyAssignRule()])
    setShowBulkAssign(true)
    const total = await fetchBulkAssignPreview(bulkUnassignedOnly)
    if (total > 0) {
      setAssignRules([{ hr_id: '', from: 1, to: Math.min(50, total) }])
    }
  }

  const updateAssignRule = (index, patch) => {
    setAssignRules((rules) => rules.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  const addAssignRule = () => {
    const last = assignRules[assignRules.length - 1]
    const nextFrom = last ? Math.min(last.to + 1, bulkLeadTotal || last.to + 1) : 1
    const nextTo = Math.min(nextFrom + 49, bulkLeadTotal || nextFrom + 49)
    setAssignRules([...assignRules, { hr_id: '', from: nextFrom, to: nextTo }])
  }

  const removeAssignRule = (index) => {
    if (assignRules.length === 1) return
    setAssignRules(assignRules.filter((_, i) => i !== index))
  }

  const splitEquallyAmongHR = () => {
    if (!bulkLeadTotal) return toast.error('No leads to assign')
    if (!hrUsers.length) return toast.error('No active HR users')
    const chunk = Math.ceil(bulkLeadTotal / hrUsers.length)
    setAssignRules(
      hrUsers.map((hr, i) => ({
        hr_id: hr.id || hr._id,
        from: i * chunk + 1,
        to: Math.min((i + 1) * chunk, bulkLeadTotal),
      }))
    )
    toast.success(`Split ${bulkLeadTotal} leads across ${hrUsers.length} HR users`)
  }

  const handleBulkAssign = async () => {
    if (!assignRules.some((r) => r.hr_id)) return toast.error('Select HR for at least one range')
    setBulkAssigning(true)
    try {
      const res = await api.post('/admin/leads/bulk-assign', {
        filters: {
          search,
          status: filters.status,
          priority: filters.priority,
          source: filters.source,
          unassigned_only: bulkUnassignedOnly,
        },
        assignments: assignRules.map((r) => ({
          hr_id: r.hr_id,
          from: parseInt(r.from, 10),
          to: parseInt(r.to, 10),
        })),
      })
      toast.success(res.data.message)
      if (res.data.errors?.length) {
        toast.error(`${res.data.errors.length} range(s) had issues — check details in console`)
        console.warn('Bulk assign errors:', res.data.errors)
      }
      setShowBulkAssign(false)
      fetchLeads()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Bulk assign failed')
    } finally {
      setBulkAssigning(false)
    }
  }

  const thStyle = { textAlign:'left', padding:'10px 14px', fontSize:'0.72rem', fontWeight:'700', color:t.textSecondary, textTransform:'uppercase', letterSpacing:'0.05em', background: isDark ? '#0f172a' : '#f8fafc' }
  const tdStyle = { padding:'14px', fontSize:'0.875rem', color:t.textPrimary, borderBottom:`1px solid ${t.tableBorder}` }

  const selectStyle = { ...input(isDark), width:'auto', padding:'8px 12px' }

  return (
    <div style={{ fontFamily:"'Inter', system-ui, sans-serif" }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'24px', flexWrap:'wrap', gap:'12px' }}>
        <div>
          <h1 style={{ fontSize:'1.5rem', fontWeight:'800', color:t.textPrimary, margin:'0 0 4px', display:'flex', alignItems:'center', gap:'8px' }}>
            {selectedHrView ? (
              <>
                <button onClick={() => { setSelectedHrView(null); setLeads([]); setPage(1); }} style={{ background:'transparent', border:'none', color:t.textSecondary, cursor:'pointer', padding:0, display:'flex', alignItems:'center', fontSize:'1.2rem' }}>←</button>
                {selectedHrView === 'unassigned' ? 'Unassigned Leads' : `${selectedHrView.name}'s Leads`}
              </>
            ) : 'Lead'}
          </h1>
          <p style={{ color:t.textSecondary, fontSize:'0.875rem', margin:0 }}>{selectedHrView ? 'Manage leads for this consultant' : 'Select a consultant to manage their leads'}</p>
        </div>
        <div style={{ display:'flex', gap:'10px' }}>
          <button onClick={() => setShowUpload(true)} style={btnSecondary(isDark)}><RiUploadLine /> Bulk Upload</button>
          <button onClick={openBulkAssign} style={btnSecondary(isDark)}><RiTeamLine /> Bulk Assign</button>
          <button onClick={openAdd} style={btnPrimary}><RiAddLine /> Add Lead</button>
        </div>
      </div>

      {!selectedHrView ? (
        <>
          {(user?.role === 'admin' || user?.role === 'superadmin') && branches.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '8px', WebkitOverflowScrolling: 'touch' }}>
              <button 
                onClick={() => setSelectedBranch('')} 
                style={{ ...btnSecondary(isDark), background: selectedBranch === '' ? (isDark ? '#3b82f6' : '#2563eb') : 'transparent', color: selectedBranch === '' ? '#fff' : t.textPrimary, border: `1px solid ${selectedBranch === '' ? 'transparent' : t.border}`, borderRadius: '20px', padding: '6px 16px', fontSize: '0.85rem' }}
              >
                All Branches
              </button>
              {branches.map(b => (
                <button 
                  key={b.id || b._id} 
                  onClick={() => setSelectedBranch(b.id || b._id)} 
                  style={{ ...btnSecondary(isDark), background: selectedBranch === (b.id || b._id) ? (isDark ? '#3b82f6' : '#2563eb') : 'transparent', color: selectedBranch === (b.id || b._id) ? '#fff' : t.textPrimary, border: `1px solid ${selectedBranch === (b.id || b._id) ? 'transparent' : t.border}`, borderRadius: '20px', padding: '6px 16px', whiteSpace: 'nowrap', fontSize: '0.85rem' }}
                >
                  {b.name}
                </button>
              ))}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px', marginBottom: '24px' }}>
          <div 
            onClick={() => setSelectedHrView('unassigned')}
            style={{
              background: isDark ? '#1e293b' : '#fff',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: isDark ? '0 4px 6px -1px rgba(0, 0, 0, 0.3)' : '0 10px 30px rgba(0,0,0,0.05)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'transform 0.2s', border: `1px dashed ${t.textSecondary}`
            }}
          >
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: isDark ? '#334155' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: t.textSecondary, fontSize: '2rem' }}>
              <RiTeamLine />
            </div>
            <h3 style={{ margin: '0 0 4px', fontSize: '1.15rem', fontWeight: '800', color: t.textPrimary }}>Unassigned Leads</h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: t.textSecondary }}>View all unassigned leads</p>
          </div>
          
          {dashboardStats?.hrRankings?.map(hr => (
            <div 
              key={hr.id}
              onClick={() => setSelectedHrView(hr)}
              style={{
                background: isDark ? '#1e293b' : '#fff',
                borderRadius: '20px',
                padding: '24px',
                boxShadow: isDark ? '0 4px 6px -1px rgba(0, 0, 0, 0.3)' : '0 10px 30px rgba(0,0,0,0.05)',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                cursor: 'pointer', transition: 'transform 0.2s', border: `1px solid ${t.border}`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #2563eb, #eab308)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: '#fff', fontSize: '2rem', fontWeight: '800', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                {hr.name ? hr.name.substring(0, 2).toUpperCase() : 'U'}
              </div>
              <h3 style={{ margin: '0 0 4px', fontSize: '1.15rem', fontWeight: '800', color: t.textPrimary }}>{hr.name || 'Unknown User'}</h3>
              <p style={{ margin: '0 0 20px', fontSize: '0.8rem', color: t.textSecondary }}>{hr.email || `${(hr.name || 'user').split(' ')[0].toLowerCase()}@forgeindia.in`}</p>
              
              <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: t.textPrimary }}>{hr.total_leads}</p>
                  <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: '700', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Leads</p>
                </div>
                <div style={{ textAlign: 'center', background: 'linear-gradient(135deg, #2563eb, #eab308)', padding: '8px 24px', borderRadius: '12px', color: '#fff', boxShadow: '0 4px 10px rgba(37,99,235,0.3)', flexShrink: 0 }}>
                  <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>{hr.converted_leads}</p>
                  <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Won</p>
                </div>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: t.textPrimary }}>{hr.badges?.length || 0}</p>
                  <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: '700', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Badges</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        </>
      ) : (
        <>
          {/* Filters */}
          <div style={{ ...card(isDark), padding:'16px', marginBottom:'20px', display:'flex', flexWrap:'wrap', gap:'10px', alignItems:'center' }}>
            <SearchBar value={search} onChange={v => { setSearch(v); setPage(1) }} placeholder="Search leads..." style={{ flex:'1', minWidth:'200px' }} />
            {[
              { key:'status', opts:STATUS_OPTIONS, ph:'All Status' },
              { key:'priority', opts:PRIORITY_OPTIONS, ph:'All Priority' },
              { key:'source', opts:SOURCE_OPTIONS, ph:'All Sources' },
            ].map(f => (
              <select key={f.key} value={filters[f.key]} onChange={e => setFilters({ ...filters, [f.key]: e.target.value })} style={selectStyle}>
                <option value="">{f.ph}</option>
                {f.opts.map(o => <option key={o} value={o} style={{ textTransform:'capitalize' }}>{o.replace(/_/g, ' ')}</option>)}
              </select>
            ))}
          </div>

          {/* Table */}
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
          .action-buttons { justify-content: flex-end; width: 100%; }
        }
      `}</style>
      <div className="table-container" style={{ ...card(isDark), padding:0, overflow:'hidden' }}>
        {loading ? <PageLoader /> : (
          <>
            <div style={{ overflowX:'auto' }}>
              <table className="responsive-table" style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr>{['Lead','Contact','Branch','Priority','Position Applied','Assigned To','Origin','Created','Status','Actions'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {leads.map(lead => (
                    <tr key={lead.id || lead._id}
                      onMouseEnter={e => e.currentTarget.style.background = isDark ? '#334155' : '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td data-label="Lead" style={tdStyle}>
                        <p style={{ fontWeight:'600', margin:0 }}>{lead.name}</p>
                      </td>
                      <td data-label="Contact" style={tdStyle}>
                        {lead.phone ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <p style={{ margin:0 }}>{lead.phone}</p>
                            {lead.email && (
                              <p style={{ fontSize:'0.75rem', color:t.textSecondary, margin:'2px 0 0' }}>{lead.email}</p>
                            )}
                          </div>
                        ) : lead.email ? (
                          <p style={{ margin:0 }}>{lead.email}</p>
                        ) : (
                          <span style={{ color:t.textMuted }}>—</span>
                        )}
                      </td>
                      <td data-label="Branch" style={tdStyle}>
                        <span style={{ fontWeight:'500' }}>{lead.branch_name || '—'}</span>
                      </td>
                      <td data-label="Priority" style={tdStyle}><PriorityBadge priority={lead.priority} /></td>
                      <td data-label="Position Applied" style={{ ...tdStyle, fontSize:'0.8rem' }}>{lead.position_applied || '—'}</td>
                      <td data-label="Assigned To" style={{ ...tdStyle, minWidth:'160px' }}>
                        <select
                          value={getAssignedId(lead)}
                          onChange={e => handleAssign(lead, e.target.value)}
                          style={{ ...input(isDark), padding:'6px 10px', fontSize:'0.8rem', width:'100%', maxWidth:'180px' }}
                        >
                          <option value="">Unassigned</option>
                          {hrUsers.map(hr => (
                            <option key={hr.id || hr._id} value={hr.id || hr._id}>{hr.name}</option>
                          ))}
                        </select>
                      </td>
                      <td data-label="Origin" style={{ ...tdStyle }}>
                        <span style={{ 
                          padding: '4px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '600',
                          background: lead.lead_source === 'Own Lead' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                          color: lead.lead_source === 'Own Lead' ? '#10b981' : '#3b82f6',
                          whiteSpace: 'nowrap'
                        }}>
                          {lead.lead_source || 'Admin Lead'}
                        </span>
                      </td>
                      <td data-label="Created" style={{ ...tdStyle, fontSize:'0.78rem', color:t.textSecondary }}>{formatDate(lead.created_at)}</td>
                      <td data-label="Status" style={tdStyle}><StatusBadge status={lead.status} /></td>
                      <td data-label="Actions" style={tdStyle}>
                        <div className="action-buttons" style={{ display:'flex', gap:'4px' }}>
                          <button onClick={() => openEdit(lead)} style={{ padding:'6px', borderRadius:'8px', border:'none', background:'transparent', cursor:'pointer', color:'#3b82f6', fontSize:'16px', display:'flex' }}><RiEditLine /></button>
                          <button onClick={() => handleDelete(lead.id || lead._id)} style={{ padding:'6px', borderRadius:'8px', border:'none', background:'transparent', cursor:'pointer', color:'#ef4444', fontSize:'16px', display:'flex' }}><RiDeleteBinLine /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {leads.length === 0 && <tr><td colSpan={10} style={{ padding:'48px', textAlign:'center', color:t.textSecondary }}>No leads found</td></tr>}
                </tbody>
              </table>
            </div>
            <Pagination pagination={pagination} onPageChange={setPage} />
          </>
        )}
      </div>
        </>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editLead ? 'Edit Lead' : 'Add New Lead'} size="md"
        footer={<>
          <button onClick={() => setShowModal(false)} style={btnSecondary(isDark)}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving...' : editLead ? 'Update Lead' : 'Create Lead'}</button>
        </>}>
        <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
          <div>
            <label style={label(isDark)}>Lead *</label>
            <input type="text" placeholder="Full name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={input(isDark)} />
          </div>
          <div>
            <label style={label(isDark)}>Contact *</label>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
              <input type="tel" placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={input(isDark)} />
              <input type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={input(isDark)} />
            </div>
          </div>
          <div>
            <label style={label(isDark)}>Status</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px', marginBottom: '8px' }}>
              {[
                { id: 'new', label: 'New' },
                { id: 'followup', label: 'Followup' },
                { id: 'exemption', label: 'Exemption' },
                { id: 'converted', label: 'Converted' },
                { id: 'not_interested', label: 'Not Interested' }
              ].map(st => {
                const isActive = form.status === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setForm({ ...form, status: st.id })}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: isActive ? 'none' : `1.5px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                      background: isActive ? 'linear-gradient(135deg, #2563eb, #4f46e5)' : (isDark ? '#1e293b' : '#fff'),
                      color: isActive ? '#fff' : t.textPrimary,
                      fontWeight: '700',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: isActive ? '0 4px 12px rgba(37,99,235,0.3)' : 'none',
                      transition: 'all 0.2s',
                    }}
                  >
                    {st.label}
                  </button>
                );
              })}
              {!['new', 'followup', 'exemption', 'converted', 'not_interested'].includes(form.status) && (
                <button
                  key={form.status}
                  type="button"
                  style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                    color: '#fff',
                    fontWeight: '700',
                    fontSize: '0.9rem',
                    gridColumn: '1 / -1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  Current: {form.status}
                </button>
              )}
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
            <div>
              <label style={label(isDark)}>Priority</label>
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} style={{ ...input(isDark) }}>
                {PRIORITY_OPTIONS.map(o => <option key={o} value={o} style={{ textTransform:'capitalize' }}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={label(isDark)}>Position Applied</label>
              <input type="text" placeholder="e.g. Software Engineer" value={form.position_applied} onChange={e => setForm({ ...form, position_applied: e.target.value })} style={input(isDark)} />
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
            <div>
              <label style={label(isDark)}>Source</label>
              <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} style={{ ...input(isDark) }}>
                {SOURCE_OPTIONS.map(o => <option key={o} value={o} style={{ textTransform:'capitalize' }}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={label(isDark)}>Assign To HR</label>
              <select value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} style={{ ...input(isDark) }}>
                <option value="">Unassigned</option>
                {hrUsers.map(hr => (
                  <option key={hr.id || hr._id} value={hr.id || hr._id}>{hr.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label style={label(isDark)}>Created</label>
            <input
              type="text"
              readOnly
              value={editLead ? formatDate(editLead.created_at) : 'Set automatically on save'}
              style={{ ...input(isDark), background: isDark ? '#0f172a' : '#f1f5f9', color: t.textSecondary, cursor: 'not-allowed' }}
            />
          </div>
        </div>
      </Modal>

      {/* Bulk Assign Modal */}
      <Modal isOpen={showBulkAssign} onClose={() => setShowBulkAssign(false)} title="Bulk Assign Leads to HR" size="lg"
        footer={<>
          <button onClick={() => setShowBulkAssign(false)} style={btnSecondary(isDark)}>Cancel</button>
          <button onClick={handleBulkAssign} disabled={bulkAssigning || bulkLeadTotal === 0} style={{ ...btnPrimary, opacity: bulkAssigning || bulkLeadTotal === 0 ? 0.7 : 1 }}>
            {bulkAssigning ? 'Assigning...' : 'Apply assignments'}
          </button>
        </>}>
        <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
          <div style={{ background: isDark ? 'rgba(59,130,246,0.1)' : '#eff6ff', borderRadius:'12px', padding:'14px' }}>
            <p style={{ fontSize:'0.85rem', color: isDark ? '#93c5fd' : '#1d4ed8', margin:'0 0 8px', lineHeight:1.5 }}>
              <strong>{bulkLeadTotal}</strong> lead(s) in scope. Lead <strong>#1</strong> is the newest (top of your list). Use ranges like 1–50, 51–100 for different HR users.
            </p>
            <p style={{ fontSize:'0.75rem', color: t.textSecondary, margin:0 }}>
              Example: 300 Excel leads → Priya 1–100, Raj 101–200, Mano 201–300
            </p>
          </div>

          <label style={{ display:'flex', alignItems:'center', gap:'8px', fontSize:'0.875rem', color: t.textPrimary, cursor:'pointer' }}>
            <input
              type="checkbox"
              checked={bulkUnassignedOnly}
              onChange={async (e) => {
                setBulkUnassignedOnly(e.target.checked)
                const total = await fetchBulkAssignPreview(e.target.checked)
                if (total > 0) setAssignRules([{ hr_id: '', from: 1, to: Math.min(50, total) }])
              }}
            />
            Only unassigned leads (recommended after Excel upload)
          </label>

          <p style={{ fontSize:'0.75rem', color: t.textSecondary, margin:0 }}>
            Uses current filters{filters.source ? ` · source: ${filters.source}` : ''}{search ? ` · search: "${search}"` : ''}. Set filter to <strong>excel</strong> before bulk assign if you only want uploaded leads.
          </p>

          {assignRules.map((rule, index) => (
            <div key={index} style={{ display:'grid', gridTemplateColumns:'1fr 90px 90px auto', gap:'10px', alignItems:'end', padding:'12px', borderRadius:'12px', border:`1px solid ${t.border}`, background: isDark ? '#0f172a' : '#f8fafc' }}>
              <div>
                <label style={label(isDark)}>HR user</label>
                <select value={rule.hr_id} onChange={e => updateAssignRule(index, { hr_id: e.target.value })} style={{ ...input(isDark) }}>
                  <option value="">Select HR</option>
                  {hrUsers.map(hr => <option key={hr.id || hr._id} value={hr.id || hr._id}>{hr.name}</option>)}
                </select>
              </div>
              <div>
                <label style={label(isDark)}>From #</label>
                <input type="number" min={1} max={bulkLeadTotal || undefined} value={rule.from} onChange={e => updateAssignRule(index, { from: e.target.value })} style={input(isDark)} />
              </div>
              <div>
                <label style={label(isDark)}>To #</label>
                <input type="number" min={1} max={bulkLeadTotal || undefined} value={rule.to} onChange={e => updateAssignRule(index, { to: e.target.value })} style={input(isDark)} />
              </div>
              <button
                type="button"
                onClick={() => removeAssignRule(index)}
                disabled={assignRules.length === 1}
                title="Remove range"
                style={{ padding:'10px', border:'none', background:'transparent', cursor: assignRules.length === 1 ? 'not-allowed' : 'pointer', color:'#ef4444', fontSize:'20px', opacity: assignRules.length === 1 ? 0.3 : 1 }}
              >
                <RiCloseCircleLine />
              </button>
            </div>
          ))}

          <div style={{ display:'flex', flexWrap:'wrap', gap:'10px' }}>
            <button type="button" onClick={addAssignRule} style={{ ...btnSecondary(isDark), display:'inline-flex', alignItems:'center', gap:'6px' }}>
              <RiAddCircleLine /> Add another range
            </button>
            <button type="button" onClick={splitEquallyAmongHR} style={{ ...btnSecondary(isDark), display:'inline-flex', alignItems:'center', gap:'6px' }}>
              <RiTeamLine /> Split equally among all HR
            </button>
          </div>
        </div>
      </Modal>

      {/* Bulk Upload Modal */}
      <Modal isOpen={showUpload} onClose={() => setShowUpload(false)} title="Bulk Upload Leads" size="sm"
        footer={<>
          <button onClick={() => setShowUpload(false)} style={btnSecondary(isDark)}>Cancel</button>
          <button onClick={handleBulkUpload} style={btnPrimary}><RiUploadLine /> Upload</button>
        </>}>
        <div style={{ textAlign:'center', padding:'24px', border:`2px dashed ${t.border}`, borderRadius:'14px', marginBottom:'16px' }}>
          <RiUploadLine style={{ fontSize:'40px', color:t.textMuted, marginBottom:'12px' }} />
          <p style={{ color:t.textSecondary, fontSize:'0.875rem', margin:'0 0 12px' }}>Upload Excel file (.xlsx, .xls)</p>
          <input type="file" accept=".xlsx,.xls,.csv" onChange={e => setUploadFile(e.target.files[0])} id="file-upload" style={{ display:'none' }} />
          <label htmlFor="file-upload" style={{ ...btnPrimary, cursor:'pointer', display:'inline-flex' }}>Choose File</label>
          {uploadFile && <p style={{ color:'#10b981', fontSize:'0.8rem', marginTop:'8px' }}>{uploadFile.name}</p>}
        </div>
        <div style={{ background: isDark ? 'rgba(59,130,246,0.1)' : '#eff6ff', borderRadius:'10px', padding:'12px' }}>
          <p style={{ fontSize:'0.8rem', fontWeight:'700', color:'#3b82f6', margin:'0 0 4px' }}>Required columns:</p>
          <p style={{ fontSize:'0.75rem', color: isDark ? '#93c5fd' : '#1d4ed8', margin:0 }}>
            Column headers (first row): <strong>name</strong> (or lead), <strong>phone</strong> (or contact / contact no / mobile), <strong>position</strong> (or position applied), plus optional email, priority, notes
          </p>
          <p style={{ fontSize:'0.75rem', color: isDark ? '#93c5fd' : '#1d4ed8', margin:'8px 0 0' }}>
            After upload, use <strong>Bulk Assign</strong> to assign leads 1–50, 51–100, etc. to each HR.
          </p>
        </div>
      </Modal>
    </div>
  )
}
