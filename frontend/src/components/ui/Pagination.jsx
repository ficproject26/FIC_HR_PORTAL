import React from 'react'
import { RiArrowLeftLine, RiArrowRightLine } from 'react-icons/ri'
import useThemeStore from '../../store/themeStore'

export default function Pagination({ pagination, onPageChange }) {
  const { isDark } = useThemeStore()
  if (!pagination || pagination.pages <= 1) return null
  const { page, pages, total, limit } = pagination
  const start = (page - 1) * limit + 1
  const end = Math.min(page * limit, total)

  const getPages = () => {
    const arr = []
    for (let i = Math.max(1, page - 2); i <= Math.min(pages, page + 2); i++) arr.push(i)
    return arr
  }

  const btnStyle = (active) => ({
    width: '32px', height: '32px', borderRadius: '8px', border: 'none',
    cursor: 'pointer', fontSize: '0.8rem', fontWeight: active ? '700' : '500',
    background: active ? '#3b82f6' : (isDark ? '#334155' : '#f1f5f9'),
    color: active ? 'white' : (isDark ? '#94a3b8' : '#64748b'),
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  })

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 16px', borderTop: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <p style={{ fontSize: '0.8rem', color: isDark ? '#94a3b8' : '#64748b', margin: 0 }}>
        Showing <strong style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>{start}–{end}</strong> of{' '}
        <strong style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>{total}</strong>
      </p>
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        <button onClick={() => onPageChange(page - 1)} disabled={page === 1} style={{ ...btnStyle(false), opacity: page === 1 ? 0.4 : 1 }}>
          <RiArrowLeftLine />
        </button>
        {getPages().map(p => (
          <button key={p} onClick={() => onPageChange(p)} style={btnStyle(p === page)}>{p}</button>
        ))}
        <button onClick={() => onPageChange(page + 1)} disabled={page === pages} style={{ ...btnStyle(false), opacity: page === pages ? 0.4 : 1 }}>
          <RiArrowRightLine />
        </button>
      </div>
    </div>
  )
}
