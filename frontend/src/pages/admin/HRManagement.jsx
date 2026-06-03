import React, { useEffect, useState } from 'react'
import { RiAddLine, RiEditLine, RiLockLine, RiLockUnlockLine, RiDeleteBinLine, RiKeyLine, RiSearchLine } from 'react-icons/ri'
import api from '../../utils/api'
import Pagination from '../../components/ui/Pagination'
import { OnlineBadge } from '../../components/ui/Badge'
import SearchBar from '../../components/ui/SearchBar'
import Modal from '../../components/ui/Modal'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import { formatTime, getInitials, timeAgo } from '../../utils/helpers'
import useThemeStore from '../../store/themeStore'
import { card, getTheme, btnPrimary, btnSecondary, btnDanger, input, label } from '../../utils/styles'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

const emptyForm = { name: '', email: '', password: '', phone: '', department: '', designation: '', role: 'hr', branch: '', aadhar_no: '', pan_no: '' }

export default function HRManagement() {
  const [hrList, setHrList] = useState([])
  const [pagination, setPagination] = useState({})
  const [stats, setStats] = useState({ totalAdmin: 0, totalHr: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [editHR, setEditHR] = useState(null)
  const [selectedHR, setSelectedHR] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [branches, setBranches] = useState([])
  const { isDark } = useThemeStore()
  const { user } = useAuthStore()
  const t = getTheme(isDark)

  useEffect(() => { fetchHRUsers() }, [page, search])

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'superadmin') {
      api.get('/branches?limit=100').then(res => setBranches(res.data.data)).catch(e => console.error(e))
    }
  }, [user?.role])

  const fetchHRUsers = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/admin/hr-users?page=${page}&limit=10&search=${search}`)
      setHrList(res.data.data)
      setPagination(res.data.pagination)
      if (res.data.stats) setStats(res.data.stats)
    } catch (e) {}
    finally { setLoading(false) }
  }

  const openAdd = () => { setEditHR(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (hr) => { setEditHR(hr); setForm({ ...hr, password: '', branch: hr.branch || '', aadhar_no: hr.aadhar_no || '', pan_no: hr.pan_no || '' }); setShowModal(true) }

  const handleSave = async () => {
    if (!form.name || !form.email) return toast.error('Name and email required')
    if (!editHR && !form.password) return toast.error('Password required for new HR')
    setSaving(true)
    try {
      if (editHR) { await api.put(`/admin/hr-users/${editHR.id || editHR._id}`, form); toast.success('HR user updated') }
      else { await api.post('/admin/hr-users', form); toast.success('HR user created') }
      setShowModal(false); fetchHRUsers()
    } catch (e) { toast.error(e.response?.data?.message || 'Error saving') }
    finally { setSaving(false) }
  }

  const handleBlock = async (hr) => {
    try {
      await api.post(`/admin/hr-users/${hr.id || hr._id}/block`, { block: !hr.is_blocked })
      toast.success(`HR ${hr.is_blocked ? 'unblocked' : 'blocked'}`)
      fetchHRUsers()
    } catch (e) { toast.error(e.response?.data?.message || 'Error blocking HR') }
  }

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) return toast.error('Min 6 characters')
    try {
      await api.post(`/admin/hr-users/${selectedHR.id || selectedHR._id}/reset-password`, { newPassword })
      toast.success('Password reset'); setShowResetModal(false); setNewPassword('')
    } catch (e) { toast.error(e.response?.data?.message || 'Error resetting password') }
  }

  const handleDelete = async (id) => {
    if (!confirm('Deactivate this HR user?')) return
    try { await api.delete(`/admin/hr-users/${id}`); toast.success('Deactivated'); fetchHRUsers() }
    catch (e) { toast.error(e.response?.data?.message || 'Error deactivating HR user') }
  }

  const thStyle = { textAlign: 'left', padding: '10px 14px', fontSize: '0.72rem', fontWeight: '700', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', background: isDark ? '#0f172a' : '#f8fafc' }
  const tdStyle = { padding: '14px', fontSize: '0.875rem', color: t.textPrimary, borderBottom: `1px solid ${t.tableBorder}` }

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", maxWidth: '100vw', overflowX: 'hidden' }}>
      <style>{`
        .hr-management-table { width: 100%; border-collapse: collapse; }
        .mobile-label { display: none; }
        @media (max-width: 768px) {
          .header-container { flex-direction: column !important; align-items: stretch !important; }
          .add-user-btn { width: 100% !important; justify-content: center !important; }
          .search-bar-container { max-width: 100% !important; }
          .hr-management-table thead { display: none; }
          .hr-management-table, .hr-management-table tbody { display: block; width: 100%; }
          .hr-management-table tr {
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
          .hr-management-table td {
            display: flex;
            flex-direction: column;
            padding: 0 !important;
            border: none !important;
            align-items: flex-start;
          }
          .hr-management-table tr {
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
          .hr-management-table td {
            display: block;
            padding: 0 !important;
            border: none !important;
          }
          .mobile-row {
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 8px;
          }
          .mobile-label {
            display: inline-block !important;
            font-size: 0.8rem;
            color: #64748b;
            font-weight: 600;
            width: 75px;
            flex-shrink: 0;
            margin: 0;
          }
          .email-text {
            word-break: break-word;
            overflow-wrap: anywhere;
            max-width: 100%;
          }
          .desktop-only { display: none !important; }
          .mobile-only-flex { display: flex !important; }
        }
        @media (min-width: 769px) {
          .mobile-only-flex { display: none !important; }
        }
      `}</style>
      <div className="header-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: t.textPrimary, margin: '0 0 4px' }}>User Management</h1>
          <p style={{ color: t.textSecondary, fontSize: '0.875rem', margin: 0 }}>Manage Admin and HR users, roles and permissions</p>
          <div style={{ display: 'flex', gap: '16px', marginTop: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', color: t.textPrimary, background: isDark ? '#334155' : '#f1f5f9', padding: '4px 12px', borderRadius: '20px' }}>
              <strong>{stats.totalAdmin}</strong> Admin{stats.totalAdmin !== 1 ? 's' : ''}
            </span>
            <span style={{ fontSize: '0.85rem', color: t.textPrimary, background: isDark ? '#334155' : '#f1f5f9', padding: '4px 12px', borderRadius: '20px' }}>
              <strong>{stats.totalHr}</strong> HR{stats.totalHr !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <button onClick={openAdd} className="add-user-btn" style={btnPrimary}>
          <RiAddLine /> Add User
        </button>
      </div>

      <div style={{ ...card(isDark), padding: '16px', marginBottom: '20px' }}>
        <div className="search-bar-container" style={{ maxWidth: '320px', width: '100%' }}>
          <SearchBar value={search} onChange={v => { setSearch(v); setPage(1) }} placeholder="Search users..." />
        </div>
      </div>

      <div style={{ ...card(isDark), padding: 0, overflow: 'hidden' }}>
        {loading ? <PageLoader /> : (
          <>
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table className="hr-management-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['User', 'Contact', 'Role & Dept', 'Leads', 'Status', 'Actions'].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hrList.map(hr => (
                    <tr key={hr.id || hr._id} style={{ transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = isDark ? '#334155' : '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={tdStyle}>
                        <div className="mobile-only-flex mobile-row">
                          <span className="mobile-label">Name:</span>
                          <span className="email-text" style={{ fontWeight: '600', color: t.textPrimary }}>{hr.name}</span>
                        </div>
                        <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: isDark ? 'rgba(59,130,246,0.2)' : '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ color: '#3b82f6', fontSize: '0.72rem', fontWeight: '800' }}>{getInitials(hr.name)}</span>
                          </div>
                          <div>
                            <p style={{ fontWeight: '600', margin: 0, fontSize: '0.875rem' }}>{hr.name}</p>
                            <p style={{ fontSize: '0.72rem', color: t.textSecondary, margin: 0 }}>{hr.designation || 'HR Executive'}</p>
                          </div>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <div className="mobile-only-flex mobile-row" style={{ marginBottom: '8px' }}>
                          <span className="mobile-label">Email:</span>
                          <span className="email-text">{hr.email}</span>
                        </div>
                        <div className="mobile-only-flex mobile-row">
                          <span className="mobile-label">Contact:</span>
                          <span>{hr.phone || '—'}</span>
                        </div>
                        <div className="desktop-only">
                          <p style={{ margin: 0 }}>{hr.email}</p>
                          <p style={{ fontSize: '0.75rem', color: t.textSecondary, margin: 0 }}>{hr.phone || '—'}</p>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <div className="mobile-only-flex mobile-row">
                          <span className="mobile-label">Role & Dept:</span>
                          <span>{hr.role === 'admin' ? 'Admin' : 'HR'} {hr.department || ''}</span>
                        </div>
                        <div className="desktop-only" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ 
                            alignSelf: 'flex-start',
                            display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase',
                            background: hr.role === 'admin' ? (isDark ? 'rgba(139,92,246,0.2)' : '#ede9fe') : (isDark ? 'rgba(59,130,246,0.2)' : '#eff6ff'),
                            color: hr.role === 'admin' ? '#8b5cf6' : '#3b82f6'
                          }}>
                            {hr.role === 'admin' ? 'Admin' : 'HR'}
                          </span>
                          <div style={{ fontSize: '0.85rem' }}>{hr.department || '—'}</div>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <div className="mobile-only-flex mobile-row">
                          <span className="mobile-label">Leads:</span>
                          <span>{hr.assigned_leads || 0}({hr.converted_leads || 0} conv)</span>
                        </div>
                        <div className="desktop-only">
                          <span style={{ fontWeight: '600' }}>{hr.assigned_leads || 0}</span>
                          <span style={{ fontSize: '0.75rem', color: '#10b981', marginLeft: '4px' }}>({hr.converted_leads || 0} conv.)</span>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <div className="mobile-only-flex mobile-row">
                          <span className="mobile-label">Status:</span>
                          <span>{!!(hr.today_login && !hr.today_logout) ? 'online' : 'offline'}</span>
                        </div>
                        <div className="desktop-only" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                          <OnlineBadge isOnline={!!(hr.today_login && !hr.today_logout)} />
                          {hr.is_blocked && <span style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: '600', background: '#fee2e2', color: '#b91c1c' }}>Blocked</span>}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <div className="mobile-row" style={{ display: 'flex', alignItems: 'center' }}>
                          <span className="mobile-label">Action:</span>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {[
                              { icon: RiEditLine, color: '#3b82f6', title: 'Edit', onClick: () => openEdit(hr) },
                              { icon: RiKeyLine, color: '#f59e0b', title: 'Reset Password', onClick: () => { setSelectedHR(hr); setShowResetModal(true) } },
                              { icon: hr.is_blocked ? RiLockUnlockLine : RiLockLine, color: hr.is_blocked ? '#22c55e' : '#ef4444', title: hr.is_blocked ? 'Unblock' : 'Block', onClick: () => handleBlock(hr) },
                              { icon: RiDeleteBinLine, color: '#ef4444', title: 'Deactivate', onClick: () => handleDelete(hr.id || hr._id) },
                            ].map(({ icon: Icon, color, title, onClick }) => (
                              <button key={title} onClick={onClick} title={title} style={{
                                padding: '6px', borderRadius: '8px', border: 'none',
                                background: 'transparent', cursor: 'pointer', color, fontSize: '16px', display: 'flex',
                              }}>
                                <Icon />
                              </button>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {hrList.length === 0 && (
                    <tr><td colSpan={8} style={{ padding: '48px', textAlign: 'center', color: t.textSecondary }}>No HR users found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination pagination={pagination} onPageChange={setPage} />
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editHR ? 'Edit User' : 'Add User'}
        footer={<>
          <button onClick={() => setShowModal(false)} style={btnSecondary(isDark)}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving...' : editHR ? 'Update' : 'Create'}</button>
        </>}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {[
            { lbl: 'Full Name *', key: 'name', type: 'text', ph: 'Jane Smith' },
            { lbl: 'Email *', key: 'email', type: 'email', ph: 'jane@company.com' },
            { lbl: 'Phone', key: 'phone', type: 'text', ph: '+91 9876543210' },
            ...(!editHR ? [{ lbl: 'Password *', key: 'password', type: 'password', ph: 'Min 6 characters' }] : []),
            { lbl: 'Designation', key: 'designation', type: 'text', ph: 'HR Executive' },
            { lbl: 'Aadhar No', key: 'aadhar_no', type: 'text', ph: '1234 5678 9012' },
            { lbl: 'PAN Card No', key: 'pan_no', type: 'text', ph: 'ABCDE1234F' },
          ].map(f => (
            <div key={f.key}>
              <label style={label(isDark)}>{f.lbl}</label>
              <input type={f.type} placeholder={f.ph} value={form[f.key] || ''} onChange={e => setForm({ ...form, [f.key]: e.target.value })} style={input(isDark)} />
            </div>
          ))}
          <div>
            <label style={label(isDark)}>Department</label>
            <select value={form.department || ''} onChange={e => setForm({ ...form, department: e.target.value })} style={input(isDark)}>
              <option value="">Select Department</option>
              <option value="Administration">Administration</option>
              <option value="Recruitment">Recruitment</option>
              <option value="Sales">Sales</option>
              <option value="IT Support">IT Support</option>
              <option value="Operations">Operations</option>
            </select>
          </div>
          <div>
            <label style={label(isDark)}>Role *</label>
            <select value={form.role || 'hr'} onChange={e => setForm({ ...form, role: e.target.value })} style={input(isDark)} disabled={user?.role === 'branchadmin'}>
              <option value="hr">HR</option>
              {user?.role !== 'branchadmin' && <option value="admin">Admin</option>}
              {user?.role !== 'branchadmin' && <option value="branchadmin">Branch Admin</option>}
            </select>
          </div>
          {(user?.role === 'admin' || user?.role === 'superadmin') && (
            <div>
              <label style={label(isDark)}>Branch Name</label>
              <select value={form.branch || ''} onChange={e => setForm({ ...form, branch: e.target.value })} style={input(isDark)}>
                <option value="">No Branch / Global</option>
                {branches.map(b => (
                  <option key={b.id || b._id} value={b.id || b._id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal isOpen={showResetModal} onClose={() => setShowResetModal(false)} title="Reset Password" size="sm"
        footer={<>
          <button onClick={() => setShowResetModal(false)} style={btnSecondary(isDark)}>Cancel</button>
          <button onClick={handleResetPassword} style={btnPrimary}><RiKeyLine /> Reset</button>
        </>}>
        <p style={{ fontSize: '0.875rem', color: t.textSecondary, marginBottom: '16px' }}>Reset password for <strong style={{ color: t.textPrimary }}>{selectedHR?.name}</strong></p>
        <label style={label(isDark)}>New Password</label>
        <input type="password" placeholder="Min 6 characters" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={input(isDark)} />
      </Modal>
    </div>
  )
}
