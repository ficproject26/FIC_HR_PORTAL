// Shared style helpers — works without Tailwind CSS processing

export const getTheme = (isDark) => ({
  bg: isDark ? '#0f172a' : '#f8fafc',
  cardBg: isDark ? '#1e293b' : '#ffffff',
  border: isDark ? '#334155' : '#e2e8f0',
  textPrimary: isDark ? '#f1f5f9' : '#0f172a',
  textSecondary: isDark ? '#94a3b8' : '#64748b',
  textMuted: isDark ? '#64748b' : '#94a3b8',
  inputBg: isDark ? '#334155' : '#f8fafc',
  inputBorder: isDark ? '#475569' : '#e2e8f0',
  hoverBg: isDark ? '#334155' : '#f1f5f9',
  tableBorder: isDark ? '#1e293b' : '#f1f5f9',
})

export const card = (isDark) => ({
  background: isDark ? '#1e293b' : '#ffffff',
  borderRadius: '16px',
  border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  padding: '24px',
  fontFamily: "'Inter', system-ui, sans-serif",
})

export const btnPrimary = {
  background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
  color: 'white', border: 'none', borderRadius: '10px',
  padding: '8px 16px', fontSize: '0.875rem', fontWeight: '600',
  cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
  gap: '6px', transition: 'opacity 0.2s',
}

export const btnSecondary = (isDark) => ({
  background: isDark ? '#334155' : '#f1f5f9',
  color: isDark ? '#cbd5e1' : '#374151',
  border: `1px solid ${isDark ? '#475569' : '#e2e8f0'}`,
  borderRadius: '10px', padding: '8px 16px',
  fontSize: '0.875rem', fontWeight: '600',
  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px',
})

export const btnDanger = {
  background: '#ef4444', color: 'white', border: 'none',
  borderRadius: '10px', padding: '8px 16px',
  fontSize: '0.875rem', fontWeight: '600',
  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px',
}

export const input = (isDark) => ({
  width: '100%', padding: '10px 14px',
  borderRadius: '10px',
  border: `1px solid ${isDark ? '#475569' : '#e2e8f0'}`,
  background: isDark ? '#334155' : '#f8fafc',
  color: isDark ? '#f1f5f9' : '#0f172a',
  fontSize: '0.875rem', outline: 'none',
  boxSizing: 'border-box',
  fontFamily: "'Inter', system-ui, sans-serif",
})

export const label = (isDark) => ({
  display: 'block', fontSize: '0.8rem', fontWeight: '600',
  color: isDark ? '#cbd5e1' : '#374151', marginBottom: '6px',
})

export const badge = (bg, color) => ({
  display: 'inline-flex', alignItems: 'center',
  padding: '2px 10px', borderRadius: '9999px',
  fontSize: '0.72rem', fontWeight: '600',
  background: bg, color: color,
})

export const statusColors = {
  new:         { bg: '#dbeafe', color: '#1d4ed8' },
  contacted:   { bg: '#fef9c3', color: '#854d0e' },
  qualified:   { bg: '#f3e8ff', color: '#6b21a8' },
  proposal:    { bg: '#ffedd5', color: '#9a3412' },
  negotiation: { bg: '#e0e7ff', color: '#3730a3' },
  converted:   { bg: '#dcfce7', color: '#15803d' },
  lost:        { bg: '#fee2e2', color: '#b91c1c' },
  followup:    { bg: '#fef3c7', color: '#92400e' },
  exemption:   { bg: '#ede9fe', color: '#5b21b6' },
  not_interested: { bg: '#fecaca', color: '#991b1b' },
  pending:     { bg: '#fef9c3', color: '#854d0e' },
  completed:   { bg: '#dcfce7', color: '#15803d' },
  missed:      { bg: '#fee2e2', color: '#b91c1c' },
  rescheduled: { bg: '#e0e7ff', color: '#3730a3' },
  online:      { bg: '#dcfce7', color: '#15803d' },
  offline:     { bg: '#f1f5f9', color: '#64748b' },
  absent:      { bg: '#fee2e2', color: '#b91c1c' },
  present:     { bg: '#dcfce7', color: '#15803d' },
  late:        { bg: '#fef9c3', color: '#854d0e' },
  in_progress: { bg: '#dbeafe', color: '#1d4ed8' },
  cancelled:   { bg: '#f1f5f9', color: '#64748b' },
}

export const priorityColors = {
  low:    { bg: '#f1f5f9', color: '#64748b' },
  medium: { bg: '#dbeafe', color: '#1d4ed8' },
  high:   { bg: '#ffedd5', color: '#9a3412' },
  urgent: { bg: '#fee2e2', color: '#b91c1c' },
}

export const getStatusBadge = (status) => {
  const c = statusColors[status] || { bg: '#f1f5f9', color: '#64748b' }
  return badge(c.bg, c.color)
}

export const getPriorityBadge = (priority) => {
  const c = priorityColors[priority] || { bg: '#f1f5f9', color: '#64748b' }
  return badge(c.bg, c.color)
}
