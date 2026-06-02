import React, { useEffect, useState } from 'react'
import { RiCheckLine, RiDeleteBinLine, RiTimeLine } from 'react-icons/ri'
import api from '../../utils/api'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import Pagination from '../../components/ui/Pagination'
import { StatusBadge, PriorityBadge } from '../../components/ui/Badge'
import { formatDateTime } from '../../utils/helpers'
import useThemeStore from '../../store/themeStore'
import { card, getTheme } from '../../utils/styles'
import toast from 'react-hot-toast'

export default function HRTasks() {
  const [tasks, setTasks] = useState([])
  const [pagination, setPagination] = useState({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(1)
  const { isDark } = useThemeStore()
  const t = getTheme(isDark)

  useEffect(() => { fetchTasks() }, [page, filter])

  const fetchTasks = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit:10 })
      if (filter) params.set('status', filter)
      const res = await api.get(`/tasks?${params}`)
      setTasks(res.data.data); setPagination(res.data.pagination)
    } catch(e) {} finally { setLoading(false) }
  }

  const handleComplete = async (task) => {
    try { await api.put(`/tasks/${task.id || task._id}`, { status: 'completed' }); toast.success('Task completed'); fetchTasks() }
    catch(e) { toast.error('Error') }
  }

  const handleDelete = async (id) => {
    try { await api.delete(`/tasks/${id}`); toast.success('Task deleted'); fetchTasks() }
    catch(e) { toast.error('Error') }
  }

  const isOverdue = (task) => task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed'
  const tabs = ['all', 'pending', 'in_progress', 'completed']

  return (
    <div style={{ fontFamily:"'Inter', system-ui, sans-serif" }}>
      <div style={{ marginBottom:'24px' }}>
        <h1 style={{ fontSize:'1.5rem', fontWeight:'800', color:t.textPrimary, margin:'0 0 4px' }}>Tasks</h1>
        <p style={{ color:t.textSecondary, fontSize:'0.875rem', margin:0 }}>Tasks assigned to you by admin</p>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:'8px', marginBottom:'20px', flexWrap:'wrap' }}>
        {tabs.map(tab => {
          const isActive = filter === tab || (tab === 'all' && !filter)
          return (
            <button key={tab} onClick={() => { setFilter(tab === 'all' ? '' : tab); setPage(1) }} style={{
              padding:'8px 18px', borderRadius:'10px', border: isActive ? 'none' : `1px solid ${t.border}`,
              cursor:'pointer', fontSize:'0.875rem', fontWeight:'600',
              textTransform:'capitalize', whiteSpace:'nowrap',
              background: isActive ? 'linear-gradient(135deg, #2563eb, #4f46e5)' : (isDark ? '#1e293b' : '#ffffff'),
              color: isActive ? 'white' : t.textSecondary,
              boxShadow: isActive ? '0 2px 8px rgba(37,99,235,0.3)' : 'none',
            }}>{tab.replace('_',' ')}</button>
          )
        })}
      </div>

      {loading ? <PageLoader /> : (
        <div>
          {tasks.map(task => (
            <div key={task.id || task._id} style={{
              ...card(isDark),
              borderLeft:`4px solid ${isOverdue(task) ? '#ef4444' : task.status === 'completed' ? '#10b981' : '#3b82f6'}`,
              marginBottom:'10px', padding:'16px 20px',
              opacity: task.status === 'completed' ? 0.75 : 1,
            }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'12px' }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:'12px', flex:1 }}>
                  {/* Checkbox */}
                  <button onClick={() => task.status !== 'completed' && handleComplete(task)} style={{
                    width:'20px', height:'20px', borderRadius:'50%', flexShrink:0, marginTop:'2px',
                    border: task.status === 'completed' ? 'none' : `2px solid ${isDark ? '#475569' : '#cbd5e1'}`,
                    background: task.status === 'completed' ? '#10b981' : 'transparent',
                    cursor: task.status === 'completed' ? 'default' : 'pointer',
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}>
                    {task.status === 'completed' && <RiCheckLine style={{ color:'white', fontSize:'12px' }} />}
                  </button>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap', marginBottom:'4px' }}>
                      <span style={{ fontWeight:'700', color:t.textPrimary, fontSize:'0.95rem', textDecoration: task.status === 'completed' ? 'line-through' : 'none' }}>{task.title}</span>
                      <PriorityBadge priority={task.priority} />
                      <StatusBadge status={task.status} />
                    </div>
                    {task.description && <p style={{ fontSize:'0.8rem', color:t.textSecondary, margin:'0 0 4px' }}>{task.description}</p>}
                    {task.created_by_name && (
                      <p style={{ fontSize:'0.75rem', color:'#6366f1', margin:'0 0 2px' }}>Assigned by {task.created_by_name}</p>
                    )}
                    {task.lead_name && <p style={{ fontSize:'0.75rem', color:'#3b82f6', margin:0 }}>📋 {task.lead_name}</p>}
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'10px', flexShrink:0 }}>
                  {task.due_date && (
                    <span style={{ fontSize:'0.75rem', color: isOverdue(task) ? '#ef4444' : t.textSecondary, display:'flex', alignItems:'center', gap:'3px' }}>
                      <RiTimeLine /> {formatDateTime(task.due_date)}
                    </span>
                  )}
                  <button onClick={() => handleDelete(task.id)} style={{ padding:'6px', borderRadius:'8px', border:'none', background:'transparent', cursor:'pointer', color:'#ef4444', fontSize:'16px', display:'flex' }}>
                    <RiDeleteBinLine />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {tasks.length === 0 && (
            <div style={{ ...card(isDark), textAlign:'center', padding:'64px 24px' }}>
              <RiCheckLine style={{ fontSize:'48px', color:t.textMuted, marginBottom:'12px' }} />
              <p style={{ color:t.textSecondary, margin:0 }}>No tasks assigned yet. Ask admin to assign tasks from HR Tasks.</p>
            </div>
          )}
          <Pagination pagination={pagination} onPageChange={setPage} />
        </div>
      )}

    </div>
  )
}
