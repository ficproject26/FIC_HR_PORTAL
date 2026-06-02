import React from 'react'
import { RiSearchLine } from 'react-icons/ri'
import useThemeStore from '../../store/themeStore'

export default function SearchBar({ value, onChange, placeholder = 'Search...', style = {} }) {
  const { isDark } = useThemeStore()
  return (
    <div style={{ position: 'relative', ...style }}>
      <RiSearchLine style={{
        position: 'absolute', left: '12px', top: '50%',
        transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '16px',
      }} />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '9px 14px 9px 36px',
          borderRadius: '10px',
          border: `1px solid ${isDark ? '#475569' : '#e2e8f0'}`,
          background: isDark ? '#334155' : '#f8fafc',
          color: isDark ? '#f1f5f9' : '#0f172a',
          fontSize: '0.875rem', outline: 'none',
          boxSizing: 'border-box',
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      />
    </div>
  )
}
