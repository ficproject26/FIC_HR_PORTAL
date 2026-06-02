import React, { useState } from 'react'
import { RiFileExcelLine, RiEyeLine, RiCloseLine, RiArrowLeftSLine, RiArrowRightSLine, RiSearchLine, RiCalendarLine, RiRefreshLine } from 'react-icons/ri'
import api from '../../utils/api'
import useThemeStore from '../../store/themeStore'
import { card, getTheme, btnPrimary, btnSecondary, getStatusBadge, getPriorityBadge } from '../../utils/styles'
import toast from 'react-hot-toast'

const reportDefs = [
  {
    id: 'leads', label: 'Leads Report', desc: 'All leads with status, assignment and conversion data',
    emoji: '📋', color: '#3b82f6', bg: '#dbeafe', darkBg: 'rgba(59,130,246,0.15)',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'company', label: 'Company' },
      { key: 'status', label: 'Status', badge: true },
      { key: 'priority', label: 'Priority', priority: true },
      { key: 'source', label: 'Source' },
      { key: 'assigned_to', label: 'Assigned To' },
      { key: 'created_at', label: 'Created', date: true },
      { key: 'converted_at', label: 'Converted', date: true },
    ]
  },
  {
    id: 'performance', label: 'Performance Report', desc: 'HR metrics: calls, follow-ups, conversions and rates',
    emoji: '📊', color: '#10b981', bg: '#dcfce7', darkBg: 'rgba(16,185,129,0.15)',
    columns: [
      { key: 'hr_name', label: 'HR Name' },
      { key: 'email', label: 'Email' },
      { key: 'department', label: 'Department' },
      { key: 'total_calls', label: 'Calls', num: true },
      { key: 'total_emails', label: 'Emails', num: true },
      { key: 'total_followups', label: 'Follow-ups', num: true },
      { key: 'total_contacted', label: 'Contacted', num: true },
      { key: 'total_converted', label: 'Converted', num: true },
      { key: 'conversion_rate', label: 'Conv. Rate', pct: true },
      { key: 'working_days', label: 'Working Days', num: true },
    ]
  },
  {
    id: 'attendance', label: 'Attendance Report', desc: 'Login/logout times, working hours and idle time',
    emoji: '🕐', color: '#8b5cf6', bg: '#f3e8ff', darkBg: 'rgba(139,92,246,0.15)',
    columns: [
      { key: 'hr_name', label: 'HR Name' },
      { key: 'email', label: 'Email' },
      { key: 'department', label: 'Department' },
      { key: 'date', label: 'Date', date: true },
      { key: 'login_time', label: 'Login', time: true },
      { key: 'logout_time', label: 'Logout', time: true },
      { key: 'working_hours', label: 'Work Hrs' },
      { key: 'status', label: 'Status', badge: true },
    ]
  },
]

const PAGE_SIZE = 10

export default function AdminReports() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [downloading, setDownloading] = useState({})
  const [previewing, setPreviewing] = useState({})
  const [previewData, setPreviewData] = useState({})
  const [previewPage, setPreviewPage] = useState({})
  const [activePreview, setActivePreview] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const { isDark } = useThemeStore()
  const t = getTheme(isDark)

  const setRange = (days) => {
    const to = new Date()
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    setDateFrom(from.toISOString().split('T')[0])
    setDateTo(to.toISOString().split('T')[0])
  }

  const downloadReport = async (type) => {
    setDownloading(prev => ({ ...prev, [type]: true }))
    try {
      const params = new URLSearchParams({ format: 'excel' })
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)
      const res = await api.get(`/reports/${type}?${params}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${type}_report.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Report downloaded successfully')
    } catch (e) {
      toast.error('Error downloading report')
    } finally {
      setDownloading(prev => ({ ...prev, [type]: false }))
    }
  }

  const previewReport = async (type) => {
    setPreviewing(prev => ({ ...prev, [type]: true }))
    try {
      const params = new URLSearchParams()
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)
      const res = await api.get(`/reports/${type}?${params}`)
      setPreviewData(prev => ({ ...prev, [type]: res.data.data || [] }))
      setPreviewPage(prev => ({ ...prev, [type]: 1 }))
      setActivePreview(type)
      setSearchTerm('')
    } catch (e) {
      toast.error('Error loading report preview')
    } finally {
      setPreviewing(prev => ({ ...prev, [type]: false }))
    }
  }

  const formatDate = (val) => {
    if (!val) return '—'
    return new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }
  const formatTime = (val) => {
    if (!val) return '—'
    return new Date(val).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  }

  const getFilteredData = (type) => {
    const data = previewData[type] || []
    if (!searchTerm.trim()) return data
    const q = searchTerm.toLowerCase()
    return data.filter(row =>
      Object.values(row).some(v => v && String(v).toLowerCase().includes(q))
    )
  }

  const inputStyle = {
    padding: '9px 12px', borderRadius: '10px',
    border: `1px solid ${t.border}`, background: t.inputBg,
    color: t.textPrimary, fontSize: '0.875rem', outline: 'none',
    fontFamily: "'Inter', system-ui, sans-serif",
  }

  const thStyle = {
    textAlign: 'left', padding: '10px 12px', fontSize: '0.7rem', fontWeight: '700',
    color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em',
    borderBottom: `2px solid ${t.border}`, whiteSpace: 'nowrap',
    position: 'sticky', top: 0, background: isDark ? '#1e293b' : '#fff', zIndex: 1,
  }

  const tdStyle = {
    padding: '10px 12px', fontSize: '0.82rem', color: t.textPrimary,
    borderBottom: `1px solid ${t.tableBorder || t.border}`, whiteSpace: 'nowrap',
  }

  const renderCellValue = (col, row) => {
    const val = row[col.key]
    if (col.date) return formatDate(val)
    if (col.time) return formatTime(val)
    if (col.pct) return <span style={{ fontWeight: '700', color: '#3b82f6' }}>{val != null ? `${val}%` : '—'}</span>
    if (col.num) return <span style={{ fontWeight: '600' }}>{val ?? 0}</span>
    if (col.badge) {
      if (!val) return '—'
      return <span style={getStatusBadge(val)}>{val}</span>
    }
    if (col.priority) {
      if (!val) return '—'
      return <span style={getPriorityBadge(val)}>{val}</span>
    }
    return val || '—'
  }

  const activeReport = reportDefs.find(r => r.id === activePreview)

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: t.textPrimary, margin: '0 0 4px' }}>Reports & Analytics</h1>
        <p style={{ color: t.textSecondary, fontSize: '0.875rem', margin: 0 }}>Preview and export detailed reports</p>
      </div>

      {/* Date Range */}
      <div style={{ ...card(isDark), marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <RiCalendarLine style={{ color: t.textSecondary }} />
          <h3 style={{ fontSize: '0.875rem', fontWeight: '700', color: t.textPrimary, margin: 0 }}>Date Range Filter</h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: '0.75rem', color: t.textSecondary, margin: '0 0 6px', fontWeight: '600' }}>From</p>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: t.textSecondary, margin: '0 0 6px', fontWeight: '600' }}>To</p>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '22px' }}>
            {[7, 30, 90].map(d => (
              <button key={d} onClick={() => setRange(d)} style={{ ...btnSecondary(isDark), padding: '8px 14px', fontSize: '0.8rem' }}>
                Last {d}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Report Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {reportDefs.map(r => (
          <div key={r.id} style={{
            ...card(isDark), display: 'flex', flexDirection: 'column',
            border: activePreview === r.id ? `2px solid ${r.color}` : undefined,
            transition: 'border-color 0.2s ease',
          }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: isDark ? r.darkBg : r.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '16px' }}>
              {r.emoji}
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: t.textPrimary, margin: '0 0 8px' }}>{r.label}</h3>
            <p style={{ fontSize: '0.8rem', color: t.textSecondary, margin: '0 0 20px', flex: 1, lineHeight: 1.5 }}>{r.desc}</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => previewReport(r.id)}
                disabled={previewing[r.id]}
                style={{
                  ...btnSecondary(isDark), flex: 1, justifyContent: 'center',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '9px 12px', fontSize: '0.82rem', fontWeight: '600',
                  opacity: previewing[r.id] ? 0.7 : 1,
                }}
              >
                <RiEyeLine />
                {previewing[r.id] ? 'Loading...' : 'Preview'}
              </button>
              <button
                onClick={() => downloadReport(r.id)}
                disabled={downloading[r.id]}
                style={{
                  ...btnPrimary, flex: 1, justifyContent: 'center',
                  background: downloading[r.id] ? '#94a3b8' : `linear-gradient(135deg, ${r.color}, ${r.color}dd)`,
                  opacity: downloading[r.id] ? 0.8 : 1,
                  padding: '9px 12px', fontSize: '0.82rem',
                }}
              >
                <RiFileExcelLine />
                {downloading[r.id] ? 'Saving...' : 'Excel'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Preview Table Section */}
      {activePreview && activeReport && (() => {
        const filtered = getFilteredData(activePreview)
        const currentPage = previewPage[activePreview] || 1
        const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
        const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

        return (
          <div style={{ ...card(isDark), marginBottom: '24px' }}>
            {/* Preview Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: isDark ? activeReport.darkBg : activeReport.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                  {activeReport.emoji}
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: '700', color: t.textPrimary, margin: 0 }}>{activeReport.label} Preview</h3>
                  <p style={{ fontSize: '0.75rem', color: t.textSecondary, margin: '2px 0 0' }}>
                    {filtered.length} record{filtered.length !== 1 ? 's' : ''} found
                    {dateFrom || dateTo ? ` · ${dateFrom || '...'} to ${dateTo || 'now'}` : ' · Default last 30 days'}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Search */}
                <div style={{ position: 'relative' }}>
                  <RiSearchLine style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: t.textSecondary, fontSize: '14px' }} />
                  <input
                    type="text"
                    placeholder="Search records..."
                    value={searchTerm}
                    onChange={e => { setSearchTerm(e.target.value); setPreviewPage(prev => ({ ...prev, [activePreview]: 1 })) }}
                    style={{ ...inputStyle, paddingLeft: '32px', width: '180px' }}
                  />
                </div>
                {/* Refresh */}
                <button
                  onClick={() => previewReport(activePreview)}
                  title="Refresh"
                  style={{ ...btnSecondary(isDark), padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <RiRefreshLine style={{ fontSize: '16px' }} />
                </button>
                {/* Close */}
                <button
                  onClick={() => setActivePreview(null)}
                  title="Close preview"
                  style={{ ...btnSecondary(isDark), padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <RiCloseLine style={{ fontSize: '16px' }} />
                </button>
              </div>
            </div>

            {/* Data Table */}
            {filtered.length === 0 ? (
              <div style={{ padding: '48px 0', textAlign: 'center' }}>
                <p style={{ fontSize: '2rem', margin: '0 0 8px' }}>📭</p>
                <p style={{ fontSize: '0.95rem', fontWeight: '600', color: t.textPrimary, margin: '0 0 4px' }}>
                  {searchTerm ? 'No matching records' : 'No data found'}
                </p>
                <p style={{ fontSize: '0.8rem', color: t.textSecondary, margin: 0 }}>
                  {searchTerm ? 'Try a different search term' : 'Try adjusting the date range or add some data first'}
                </p>
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto', borderRadius: '10px', border: `1px solid ${t.border}`, maxHeight: '480px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                    <thead>
                      <tr>
                        <th style={{ ...thStyle, width: '40px', textAlign: 'center' }}>#</th>
                        {activeReport.columns.map(col => (
                          <th key={col.key} style={thStyle}>{col.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((row, idx) => (
                        <tr key={idx} style={{
                          transition: 'background 0.15s',
                          background: idx % 2 === 0 ? 'transparent' : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)'),
                        }}
                          onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}
                          onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)')}
                        >
                          <td style={{ ...tdStyle, textAlign: 'center', color: t.textSecondary, fontSize: '0.75rem', fontWeight: '600' }}>
                            {(currentPage - 1) * PAGE_SIZE + idx + 1}
                          </td>
                          {activeReport.columns.map(col => (
                            <td key={col.key} style={tdStyle}>{renderCellValue(col, row)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px', flexWrap: 'wrap', gap: '8px' }}>
                    <p style={{ fontSize: '0.78rem', color: t.textSecondary, margin: 0 }}>
                      Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        onClick={() => setPreviewPage(prev => ({ ...prev, [activePreview]: Math.max(1, currentPage - 1) }))}
                        disabled={currentPage === 1}
                        style={{
                          ...btnSecondary(isDark), padding: '6px 8px', display: 'flex',
                          opacity: currentPage === 1 ? 0.4 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <RiArrowLeftSLine style={{ fontSize: '16px' }} />
                      </button>
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        let page
                        if (totalPages <= 5) {
                          page = i + 1
                        } else if (currentPage <= 3) {
                          page = i + 1
                        } else if (currentPage >= totalPages - 2) {
                          page = totalPages - 4 + i
                        } else {
                          page = currentPage - 2 + i
                        }
                        return (
                          <button
                            key={page}
                            onClick={() => setPreviewPage(prev => ({ ...prev, [activePreview]: page }))}
                            style={{
                              ...btnSecondary(isDark),
                              padding: '6px 10px', fontSize: '0.78rem', fontWeight: '600', minWidth: '34px',
                              background: page === currentPage ? activeReport.color : undefined,
                              color: page === currentPage ? '#fff' : undefined,
                              border: page === currentPage ? 'none' : undefined,
                            }}
                          >
                            {page}
                          </button>
                        )
                      })}
                      <button
                        onClick={() => setPreviewPage(prev => ({ ...prev, [activePreview]: Math.min(totalPages, currentPage + 1) }))}
                        disabled={currentPage === totalPages}
                        style={{
                          ...btnSecondary(isDark), padding: '6px 8px', display: 'flex',
                          opacity: currentPage === totalPages ? 0.4 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <RiArrowRightSLine style={{ fontSize: '16px' }} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )
      })()}

      {/* Tips */}
      <div style={{ ...card(isDark) }}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: '700', color: t.textPrimary, margin: '0 0 16px' }}>Quick Tips</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          {[
            { color: isDark ? 'rgba(59,130,246,0.15)' : '#dbeafe', textColor: isDark ? '#93c5fd' : '#1d4ed8', title: '📋 Leads Report', body: 'Includes all lead details, status, assigned HR, and conversion timestamps.' },
            { color: isDark ? 'rgba(16,185,129,0.15)' : '#dcfce7', textColor: isDark ? '#6ee7b7' : '#15803d', title: '📊 Performance', body: 'Aggregated metrics per HR: calls, emails, follow-ups, conversions and rate.' },
            { color: isDark ? 'rgba(139,92,246,0.15)' : '#f3e8ff', textColor: isDark ? '#c4b5fd' : '#6b21a8', title: '🕐 Attendance', body: 'Daily login/logout times, working hours, idle time and status per HR.' },
            { color: isDark ? 'rgba(249,115,22,0.15)' : '#ffedd5', textColor: isDark ? '#fdba74' : '#9a3412', title: '💡 Pro Tip', body: 'Click Preview to see data on screen, or Excel to download. Set a date range first for filtered data.' },
          ].map(tip => (
            <div key={tip.title} style={{ background: tip.color, borderRadius: '12px', padding: '14px' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: '700', color: tip.textColor, margin: '0 0 6px' }}>{tip.title}</p>
              <p style={{ fontSize: '0.75rem', color: tip.textColor, margin: 0, opacity: 0.85, lineHeight: 1.5 }}>{tip.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
