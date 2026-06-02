import React from 'react'
import { statusColors, priorityColors } from '../../utils/styles'

export function StatusBadge({ status }) {
  const c = statusColors[status] || { bg: '#f1f5f9', color: '#64748b' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 10px', borderRadius: '9999px',
      fontSize: '0.72rem', fontWeight: '600',
      background: c.bg, color: c.color,
      textTransform: 'capitalize', whiteSpace: 'nowrap',
    }}>
      {status?.replace(/_/g, ' ')}
    </span>
  )
}

export function PriorityBadge({ priority }) {
  const c = priorityColors[priority] || { bg: '#f1f5f9', color: '#64748b' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 10px', borderRadius: '9999px',
      fontSize: '0.72rem', fontWeight: '600',
      background: c.bg, color: c.color,
      textTransform: 'capitalize', whiteSpace: 'nowrap',
    }}>
      {priority}
    </span>
  )
}

export function OnlineBadge({ isOnline }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '2px 10px', borderRadius: '9999px',
      fontSize: '0.72rem', fontWeight: '600',
      background: isOnline ? '#dcfce7' : '#f1f5f9',
      color: isOnline ? '#15803d' : '#64748b',
    }}>
      <span style={{
        width: '6px', height: '6px', borderRadius: '50%',
        background: isOnline ? '#22c55e' : '#94a3b8',
        display: 'inline-block',
      }} />
      {isOnline ? 'Online' : 'Offline'}
    </span>
  )
}
