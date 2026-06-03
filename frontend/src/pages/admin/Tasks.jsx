import React, { useEffect, useState } from 'react'
import { RiAddLine, RiDeleteBinLine, RiTimeLine, RiUserLine } from 'react-icons/ri'
import api from '../../utils/api'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import Pagination from '../../components/ui/Pagination'
import { StatusBadge, PriorityBadge } from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import { formatDateTime } from '../../utils/helpers'
import useThemeStore from '../../store/themeStore'
import { card, getTheme, btnPrimary, btnSecondary, input, label } from '../../utils/styles'
import toast from 'react-hot-toast'

const emptyForm = { title: '', description: '', priority: 'medium', due_date: '', user_id: '' }

export default function AdminTasks() {
  const [tasks, setTasks] = useState([])
  const [hrUsers, setHrUsers] = useState([])
  const [pagination, setPagination] = useState({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [hrFilter, setHrFilter] = useState('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const { isDark } = useThemeStore()
  const t = getTheme(isDark)

  useEffect(() => { fetchHRUsers() }, [])
  useEffect(() => { fetchTasks() }, [page, filter, hrFilter])

  const fetchHRUsers = async () => {
    try {
      const res = await api.get('/admin/hr-users?limit=100')
      setHrUsers(res.data.data || [])
    } catch {
      setHrUsers([])
    }
  }

  const fetchTasks = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 10 })
      if (filter) params.set('status', filter)
      if (hrFilter) params.set('user_id', hrFilter)
      const res = await api.get(`/tasks?${params}`)
      setTasks(res.data.data)
      setPagination(res.data.pagination)
    } catch {
      toast.error('Could not load tasks')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!form.title.trim()) return toast.error('Title is required')
    if (!form.user_id) return toast.error('Select an HR user to assign')
    setSaving(true)
    try {
      await api.post('/tasks', form)
      toast.success('Task assigned to HR')
      setShowModal(false)
      setForm(emptyForm)
      fetchTasks()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to create task')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this task?')) return
    try {
      await api.delete(`/tasks/${id}`)
      toast.success('Task deleted')
      fetchTasks()
    } catch {
      toast.error('Could not delete task')
    }
  }

  const tabs = ['all', 'pending', 'in_progress', 'completed']

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", maxWidth: '100vw', overflowX: 'hidden' }}>
      <style>{`
        @media (max-width: 768px) {
          .header-container { flex-direction: column !important; align-items: stretch !important; gap: 16px !important; }
          .assign-task-btn { width: 100% !important; min-height: 48px !important; justify-content: center !important; }
          .hr-filter-container { width: 100% !important; margin-bottom: 24px !important; }
          .hr-filter-select { width: 100% !important; max-width: 100% !important; }
          .tabs-container { margin-bottom: 24px !important; }
          .tab-btn { flex: 1 1 calc(50% - 4px); min-height: 44px; display: flex; align-items: center; justify-content: center; }
          .task-card-inner { flex-direction: column !important; align-items: flex-start !important; gap: 16px !important; }
          .task-card-title-container { flex-direction: column !important; align-items: flex-start !important; gap: 8px !important; }
          .badge-container { display: flex; gap: 8px; flex-wrap: wrap; }
          .task-card-actions { width: 100%; justify-content: space-between !important; margin-top: 4px; border-top: 1px solid ${isDark ? '#334155' : '#e2e8f0'}; padding-top: 16px; }
          .empty-state-container { padding: 48px 16px !important; }
        }
      `}</style>
      <div className="header-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: t.textPrimary, margin: '0 0 4px' }}>Task</h1>
          <p style={{ color: t.textSecondary, fontSize: '0.875rem', margin: 0 }}>Create tasks and assign them to HR team members</p>
        </div>
        <button className="assign-task-btn" onClick={() => { setForm(emptyForm); setShowModal(true) }} style={btnPrimary}>
          <RiAddLine /> Assign Task
        </button>
      </div>

      <div className="hr-filter-container" style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="hr-filter-select" value={hrFilter} onChange={(e) => { setHrFilter(e.target.value); setPage(1) }} style={{ ...input(isDark), width: 'auto', minWidth: '180px' }}>
          <option value="">All HR users</option>
          {hrUsers.map((hr) => (
            <option key={hr.id} value={hr.id}>{hr.name}</option>
          ))}
        </select>
      </div>

      <div className="tabs-container" style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {tabs.map((tab) => {
          const isActive = filter === tab || (tab === 'all' && !filter)
          return (
            <button
              key={tab}
              className="tab-btn"
              onClick={() => { setFilter(tab === 'all' ? '' : tab); setPage(1) }}
              style={{
                padding: '8px 18px',
                borderRadius: '10px',
                border: isActive ? 'none' : `1px solid ${t.border}`,
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '600',
                textTransform: 'capitalize',
                background: isActive ? 'linear-gradient(135deg, #2563eb, #4f46e5)' : (isDark ? '#1e293b' : '#ffffff'),
                color: isActive ? 'white' : t.textSecondary,
              }}
            >
              {tab.replace('_', ' ')}
            </button>
          )
        })}
      </div>

      {loading ? <PageLoader /> : (
        <div>
          {tasks.map((task) => (
            <div
              key={task.id}
              style={{
                ...card(isDark),
                borderLeft: '4px solid #3b82f6',
                marginBottom: '10px',
                padding: '16px 20px',
              }}
            >
              <div className="task-card-inner" style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
                  <div className="task-card-title-container" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <span style={{ fontWeight: '700', color: t.textPrimary, wordBreak: 'break-word' }}>{task.title}</span>
                    <div className="badge-container">
                      <PriorityBadge priority={task.priority} />
                      <StatusBadge status={task.status} />
                    </div>
                  </div>
                  {task.description && (
                    <p style={{ fontSize: '0.8rem', color: t.textSecondary, margin: '0 0 12px', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{task.description}</p>
                  )}
                  <p style={{ fontSize: '0.75rem', color: '#3b82f6', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <RiUserLine /> Assigned to: <strong style={{ wordBreak: 'break-word' }}>{task.assigned_to_name || '—'}</strong>
                  </p>
                </div>
                <div className="task-card-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  {task.due_date && (
                    <span style={{ fontSize: '0.75rem', color: t.textSecondary, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <RiTimeLine /> {formatDateTime(task.due_date)}
                    </span>
                  )}
                  <button
                    onClick={() => handleDelete(task.id)}
                    style={{ padding: '6px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444', fontSize: '16px' }}
                  >
                    <RiDeleteBinLine />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {tasks.length === 0 && (
            <div className="empty-state-container" style={{ ...card(isDark), textAlign: 'center', padding: '64px 24px' }}>
              <div style={{ fontSize: '48px', color: isDark ? '#334155' : '#cbd5e1', marginBottom: '16px', display: 'flex', justifyContent: 'center' }}><RiAddLine /></div>
              <p style={{ color: t.textSecondary, margin: 0, fontSize: '0.875rem' }}>No tasks yet. Click &quot;Assign Task&quot; to add one for HR.</p>
            </div>
          )}
          <Pagination pagination={pagination} onPageChange={setPage} />
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Assign Task to HR"
        size="sm"
        footer={
          <>
            <button onClick={() => setShowModal(false)} style={btnSecondary(isDark)}>Cancel</button>
            <button onClick={handleCreate} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving...' : 'Assign Task'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={label(isDark)}>Assign to HR *</label>
            <select value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} style={input(isDark)}>
              <option value="">Select HR user</option>
              {hrUsers.map((hr) => (
                <option key={hr.id} value={hr.id}>{hr.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={label(isDark)}>Title *</label>
            <input placeholder="Task title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={input(isDark)} />
          </div>
          <div>
            <label style={label(isDark)}>Description</label>
            <textarea rows={3} placeholder="Task details..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ ...input(isDark), resize: 'none' }} />
          </div>
          <div>
            <label style={label(isDark)}>Priority</label>
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} style={input(isDark)}>
              {['low', 'medium', 'high', 'urgent'].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={label(isDark)}>Due Date</label>
            <input type="datetime-local" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} style={input(isDark)} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
