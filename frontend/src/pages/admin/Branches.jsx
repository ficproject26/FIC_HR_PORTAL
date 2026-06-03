import React, { useEffect, useState, useCallback } from 'react'
import { RiAddLine, RiEditLine, RiDeleteBinLine, RiCheckboxCircleLine, RiCloseCircleLine, RiBuildingLine, RiMapPinLine } from 'react-icons/ri'
import api from '../../utils/api'
import Pagination from '../../components/ui/Pagination'
import SearchBar from '../../components/ui/SearchBar'
import Modal from '../../components/ui/Modal'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import useThemeStore from '../../store/themeStore'
import { card, getTheme, btnPrimary, btnSecondary, btnDanger, input, label } from '../../utils/styles'
import toast from 'react-hot-toast'

const emptyForm = { name: '', code: '', address: '', city: '', state: '', phone: '', email: '', manager_name: '', branch_type: '', is_active: true, sub_admin_email: '', sub_admin_password: '', sub_admin_confirm_password: '', country: '', pincode: '', opening_date: '' }

export default function AdminBranches() {
  const [branches, setBranches] = useState([])
  const [pagination, setPagination] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [editBranch, setEditBranch] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const { isDark } = useThemeStore()
  const t = getTheme(isDark)

  useEffect(() => { fetchBranches() }, [page, search])

  const fetchBranches = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/branches?page=${page}&limit=10&search=${search}`)
      setBranches(res.data.data)
      setPagination(res.data.pagination)
    } catch (e) { toast.error('Failed to load branches') }
    finally { setLoading(false) }
  }

  const openAdd = () => { setEditBranch(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (b) => { setEditBranch(b); setForm({ name: b.name, code: b.code, address: b.address || '', city: b.city || '', state: b.state || '', phone: b.phone || '', email: b.email || '', manager_name: b.manager_name || '', branch_type: b.branch_type || '', country: b.country || '', pincode: b.pincode || '', opening_date: b.opening_date ? new Date(b.opening_date).toISOString().split('T')[0] : '', sub_admin_email: b.sub_admin_email || '', sub_admin_password: '', sub_admin_confirm_password: '' }); setShowModal(true) }

  const handleSave = async () => {
    if (!form.name || !form.code) return toast.error('Name and code are required')
    setSaving(true)
    try {
      if (editBranch) {
        await api.put(`/branches/${editBranch.id}`, form)
        toast.success('Branch updated')
      } else {
        await api.post('/branches', form)
        toast.success('Branch created')
      }
      setShowModal(false); fetchBranches()
    } catch (e) { 
      console.error("Save branch error:", e, e.response);
      toast.error(e.response?.data?.message || `Error: ${e.message}`);
    }
    finally { setSaving(false) }
  }

  const handleToggle = async (b) => {
    try {
      await api.patch(`/branches/${b.id}/toggle`)
      toast.success(`Branch ${b.is_active ? 'deactivated' : 'activated'}`)
      fetchBranches()
    } catch (e) { toast.error('Error toggling branch status') }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this branch? This action cannot be undone.')) return
    try {
      await api.delete(`/branches/${id}`)
      toast.success('Branch deleted')
      fetchBranches()
    } catch (e) { toast.error(e.response?.data?.message || 'Error deleting branch') }
  }

  const thStyle = { textAlign: 'left', padding: '10px 14px', fontSize: '0.72rem', fontWeight: '700', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', background: isDark ? '#0f172a' : '#f8fafc' }
  const tdStyle = { padding: '14px', fontSize: '0.875rem', color: t.textPrimary, borderBottom: `1px solid ${t.tableBorder}` }

  const totalActive = branches.filter(b => b.is_active).length
  const totalInactive = branches.filter(b => !b.is_active).length

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        .branches-table { width: 100%; border-collapse: collapse; }
        @media (max-width: 768px) {
          .branches-header { flex-direction: column !important; align-items: stretch !important; }
          .branches-add-btn { width: 100% !important; justify-content: center !important; }
          .branches-search { max-width: 100% !important; }
          .branches-table thead { display: none; }
          .branches-table, .branches-table tbody, .branches-table tr, .branches-table td { display: block; width: 100%; box-sizing: border-box; }
          .branches-table tr {
            margin-bottom: 12px;
            border: 1px solid ${isDark ? '#334155' : '#e2e8f0'};
            border-radius: 12px;
            background: ${isDark ? '#1e293b' : '#ffffff'};
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.02);
          }
          .branches-table td {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 12px !important;
            border-bottom: 1px solid ${isDark ? '#334155' : '#e2e8f0'};
            text-align: right;
            font-size: 0.8rem !important;
          }
          .branches-table td:last-child { border-bottom: none; }
          .branches-table td::before {
            content: attr(data-label);
            font-weight: 700;
            font-size: 0.65rem;
            text-transform: uppercase;
            color: ${isDark ? '#94a3b8' : '#64748b'};
            margin-right: 12px;
          }
        }
      `}</style>

      {/* Header */}
      <div className="branches-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: t.textPrimary, margin: '0 0 4px' }}>Branches</h1>
          <p style={{ color: t.textSecondary, fontSize: '0.875rem', margin: 0 }}>Manage company office locations</p>
        </div>
        <button className="branches-add-btn" onClick={openAdd} style={btnPrimary}>
          <RiAddLine /> Add Branch
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[
          { label: 'Total Branches', value: pagination.total || 0, color: '#3b82f6', icon: RiBuildingLine },
          { label: 'Active', value: totalActive, color: '#10b981', icon: RiCheckboxCircleLine },
          { label: 'Inactive', value: totalInactive, color: '#ef4444', icon: RiCloseCircleLine },
        ].map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', borderRadius: '14px', background: s.color + '12', flex: 1, minWidth: '140px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: s.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <s.icon style={{ fontSize: '18px', color: s.color }} />
            </div>
            <div>
              <p style={{ fontSize: '0.72rem', fontWeight: '600', color: s.color, margin: '0 0 2px', opacity: 0.8 }}>{s.label}</p>
              <p style={{ fontSize: '1.4rem', fontWeight: '800', color: s.color, margin: 0, lineHeight: 1 }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: '16px' }}>
        <SearchBar className="branches-search" value={search} onChange={v => { setSearch(v); setPage(1) }} placeholder="Search branches by name, code, city..." style={{ maxWidth: '360px' }} />
      </div>

      {/* Table */}
      <div style={{ ...card(isDark), padding: 0, overflow: 'hidden' }}>
        {loading ? <PageLoader /> : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="branches-table">
                <thead>
                  <tr>{['Branch', 'Code', 'City', 'State', 'Phone', 'Manager', 'Status', 'Actions'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {branches.map(b => (
                    <tr key={b.id}
                      onMouseEnter={e => e.currentTarget.style.background = isDark ? '#334155' : '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td data-label="Branch" style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: isDark ? 'rgba(59,130,246,0.2)' : '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <RiBuildingLine style={{ color: '#3b82f6', fontSize: '16px' }} />
                          </div>
                          <div>
                            <p style={{ fontWeight: '600', margin: '0 0 2px' }}>{b.name}</p>
                            {b.address && <p style={{ fontSize: '0.72rem', color: t.textSecondary, margin: 0 }}>{b.address}</p>}
                          </div>
                        </div>
                      </td>
                      <td data-label="Code" style={tdStyle}>
                        <span style={{ background: isDark ? '#334155' : '#f1f5f9', padding: '2px 8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '700', letterSpacing: '0.5px' }}>{b.code}</span>
                      </td>
                      <td data-label="City" style={tdStyle}>{b.city || '—'}</td>
                      <td data-label="State" style={tdStyle}>{b.state || '—'}</td>
                      <td data-label="Phone" style={tdStyle}>{b.phone || '—'}</td>
                      <td data-label="Manager" style={tdStyle}>{b.manager_name || '—'}</td>
                      <td data-label="Status" style={tdStyle}>
                        <span style={{
                          padding: '3px 10px', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: '700',
                          background: b.is_active ? '#dcfce7' : '#fee2e2',
                          color: b.is_active ? '#15803d' : '#b91c1c',
                        }}>
                          {b.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td data-label="Actions" style={tdStyle}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button onClick={() => openEdit(b)} style={{ padding: '6px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#3b82f6', fontSize: '16px', display: 'flex' }} title="Edit">
                            <RiEditLine />
                          </button>
                          <button onClick={() => handleToggle(b)} style={{ padding: '6px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', color: b.is_active ? '#f59e0b' : '#10b981', fontSize: '16px', display: 'flex' }} title={b.is_active ? 'Deactivate' : 'Activate'}>
                            {b.is_active ? <RiCloseCircleLine /> : <RiCheckboxCircleLine />}
                          </button>
                          <button onClick={() => handleDelete(b.id)} style={{ padding: '6px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444', fontSize: '16px', display: 'flex' }} title="Delete">
                            <RiDeleteBinLine />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {branches.length === 0 && (
                    <tr><td colSpan={8} style={{ padding: '48px', textAlign: 'center', color: t.textSecondary }}>
                      <RiBuildingLine style={{ fontSize: '40px', marginBottom: '8px', display: 'block', margin: '0 auto 8px' }} />
                      No branches found. Click "Add Branch" to create one.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination pagination={pagination} onPageChange={setPage} />
          </>
        )}
      </div>

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editBranch ? 'Edit Branch' : 'Add New Branch'} size="lg" isDark={isDark}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={label(isDark)}>Branch Name *</label>
            <input type="text" placeholder="e.g. Chennai HQ" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={input(isDark)} />
          </div>
          <div>
            <label style={label(isDark)}>Branch Code *</label>
            <input type="text" placeholder="e.g. CHN" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} style={input(isDark)} maxLength={20} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={label(isDark)}>Branch Type</label>
            <select value={form.branch_type} onChange={e => setForm({ ...form, branch_type: e.target.value })} style={input(isDark)}>
              <option value="">Select Type</option>
              <option value="Regional Office">Regional Office</option>
              <option value="Local Office">Local Office</option>
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={label(isDark)}>Status</label>
            <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} style={{ marginLeft: '8px' }} /> Active
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={label(isDark)}>Address</label>
            <input type="text" placeholder="Full street address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} style={input(isDark)} />
          </div>
          <div>
            <label style={label(isDark)}>City</label>
            <input type="text" placeholder="City" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} style={input(isDark)} />
          </div>
          <div>
            <label style={label(isDark)}>State / Province</label>
            <input type="text" placeholder="State" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} style={input(isDark)} />
          </div>
          <div>
            <label style={label(isDark)}>Country</label>
            <input type="text" placeholder="Country" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} style={input(isDark)} />
          </div>
          <div>
            <label style={label(isDark)}>Pincode</label>
            <input type="text" placeholder="Pincode" value={form.pincode} onChange={e => setForm({ ...form, pincode: e.target.value })} style={input(isDark)} />
          </div>
          <div>
            <label style={label(isDark)}>Opening Date</label>
            <input type="date" value={form.opening_date} onChange={e => setForm({ ...form, opening_date: e.target.value })} style={input(isDark)} />
          </div>
          <div>
            <label style={label(isDark)}>Phone</label>
            <input type="text" placeholder="Office phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={input(isDark)} />
          </div>
          <div>
            <label style={label(isDark)}>Email</label>
            <input type="email" placeholder="Branch email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={input(isDark)} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={label(isDark)}>Manager Name</label>
            <input type="text" placeholder="Branch manager name" value={form.manager_name} onChange={e => setForm({ ...form, manager_name: e.target.value })} style={input(isDark)} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={label(isDark)}>Sub Admin Email</label>
            <input type="email" placeholder="subadmin@example.com" value={form.sub_admin_email} onChange={e => setForm({ ...form, sub_admin_email: e.target.value })} style={input(isDark)} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={label(isDark)}>Sub Admin Password</label>
            <input type="password" placeholder="Enter password..." value={form.sub_admin_password} onChange={e => setForm({ ...form, sub_admin_password: e.target.value })} style={input(isDark)} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={label(isDark)}>Confirm Sub Admin Password</label>
            <input type="password" placeholder="Confirm password..." value={form.sub_admin_confirm_password} onChange={e => setForm({ ...form, sub_admin_confirm_password: e.target.value })} style={input(isDark)} />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
          <button onClick={() => setShowModal(false)} style={btnSecondary(isDark)}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : editBranch ? 'Update Branch' : 'Create Branch'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
