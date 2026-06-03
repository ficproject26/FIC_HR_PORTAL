import React from 'react'
import useThemeStore from '../../store/themeStore'

const colorMap = {
  blue:   { bg: 'linear-gradient(135deg, #eff6ff, #dbeafe)', iconBg: '#ffffff', color: '#1d4ed8', darkBg: 'linear-gradient(135deg, rgba(30,58,138,0.2), rgba(30,58,138,0.4))', darkIconBg: 'rgba(59,130,246,0.25)', darkColor: '#60a5fa' },
  green:  { bg: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', iconBg: '#ffffff', color: '#15803d', darkBg: 'linear-gradient(135deg, rgba(6,78,59,0.2), rgba(6,78,59,0.4))', darkIconBg: 'rgba(16,185,129,0.25)', darkColor: '#34d399' },
  purple: { bg: 'linear-gradient(135deg, #faf5ff, #f3e8ff)', iconBg: '#ffffff', color: '#6b21a8', darkBg: 'linear-gradient(135deg, rgba(88,28,135,0.2), rgba(88,28,135,0.4))', darkIconBg: 'rgba(139,92,246,0.25)', darkColor: '#a78bfa' },
  orange: { bg: 'linear-gradient(135deg, #fff7ed, #ffedd5)', iconBg: '#ffffff', color: '#9a3412', darkBg: 'linear-gradient(135deg, rgba(124,45,18,0.2), rgba(124,45,18,0.4))', darkIconBg: 'rgba(249,115,22,0.25)', darkColor: '#fb923c' },
  red:    { bg: 'linear-gradient(135deg, #fef2f2, #fee2e2)', iconBg: '#ffffff', color: '#b91c1c', darkBg: 'linear-gradient(135deg, rgba(127,29,29,0.2), rgba(127,29,29,0.4))',  darkIconBg: 'rgba(239,68,68,0.25)', darkColor: '#f87171' },
  indigo: { bg: 'linear-gradient(135deg, #eef2ff, #e0e7ff)', iconBg: '#ffffff', color: '#3730a3', darkBg: 'linear-gradient(135deg, rgba(49,46,129,0.2), rgba(49,46,129,0.4))', darkIconBg: 'rgba(99,102,241,0.25)', darkColor: '#818cf8' },
  teal:   { bg: 'linear-gradient(135deg, #f0fdfa, #ccfbf1)', iconBg: '#ffffff', color: '#0f766e', darkBg: 'linear-gradient(135deg, rgba(19,78,74,0.2), rgba(19,78,74,0.4))', darkIconBg: 'rgba(20,184,166,0.25)', darkColor: '#2dd4bf' },
}

export default function StatCard({ icon: Icon, label, value, sub, color = 'blue', trend, onClick, className = '' }) {
  const { isDark } = useThemeStore()
  const c = colorMap[color] || colorMap.blue
  const [hovered, setHovered] = React.useState(false)

  return (
    <div 
      className={`stat-card ${className}`}
      onClick={onClick}
      onMouseEnter={() => onClick && setHovered(true)}
      onMouseLeave={() => onClick && setHovered(false)}
      style={{
        background: isDark ? c.darkBg : c.bg,
        borderRadius: '16px',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}`,
        padding: '20px 16px',
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px',
        boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.08)' : '0 4px 15px rgba(0,0,0,0.03)',
        transition: 'transform 0.2s, box-shadow 0.2s',
        fontFamily: "'Inter', system-ui, sans-serif",
        cursor: onClick ? 'pointer' : 'default',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
      }}
    >
      <div className="stat-card-icon-wrapper" style={{
        width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
        background: isDark ? c.darkIconBg : c.iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)'
      }}>
        <Icon className="stat-card-icon" style={{ fontSize: '20px', color: isDark ? c.darkColor : c.color }} />
      </div>
      <div style={{ width: '100%' }}>
        <p className="stat-card-label" style={{ fontSize: '0.78rem', color: isDark ? '#cbd5e1' : c.color, opacity: 0.85, fontWeight: '700', margin: '0 0 6px', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <p className="stat-card-value" style={{ fontSize: '2rem', fontWeight: '800', color: isDark ? c.darkColor : c.color, margin: 0, lineHeight: 1 }}>{value ?? '—'}</p>
          {trend !== undefined && (
            <div style={{
              padding: '4px 8px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: '700',
              background: trend >= 0 ? (isDark ? 'rgba(21,128,61,0.2)' : 'rgba(21,128,61,0.1)') : (isDark ? 'rgba(185,28,28,0.2)' : 'rgba(185,28,28,0.1)'),
              color: trend >= 0 ? (isDark ? '#4ade80' : '#15803d') : (isDark ? '#f87171' : '#b91c1c'),
            }}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </div>
          )}
        </div>
        {sub && <p style={{ fontSize: '0.72rem', color: isDark ? '#94a3b8' : c.color, opacity: 0.75, margin: '6px 0 0' }}>{sub}</p>}
      </div>
    </div>
  )
}
