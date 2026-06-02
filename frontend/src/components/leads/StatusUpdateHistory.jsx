import React from 'react'
import { formatDateTime } from '../../utils/helpers'
import { StatusBadge } from '../ui/Badge'
import { getTheme } from '../../utils/styles'

const STATUS_LABELS = {
  new: 'New',
  followup: 'Follow-up',
  exemption: 'Exemption',
  converted: 'Converted',
  not_interested: 'Not Interested',
  contacted: 'Contacted',
  qualified: 'Qualified',
}

function label(status) {
  if (!status) return '—'
  return STATUS_LABELS[status] || status.replace(/_/g, ' ')
}

export default function StatusUpdateHistory({ activities = [], isDark, loading, compact }) {
  const t = getTheme(isDark)
  const items = activities.filter((a) => a.action === 'status_changed')

  if (loading) {
    return <p style={{ fontSize: '0.8rem', color: t.textMuted, margin: '12px 0 0' }}>Loading status history…</p>
  }

  if (!items.length) {
    return (
      <p style={{ fontSize: '0.8rem', color: t.textMuted, margin: compact ? 0 : '12px 0 0' }}>
        No status updates recorded yet.
      </p>
    )
  }

  return (
    <div style={{ marginTop: compact ? 0 : '16px' }}>
      {!compact && (
        <p style={{ fontSize: '0.72rem', fontWeight: '700', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>
          Status update history
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: compact ? '140px' : '200px', overflowY: 'auto' }}>
        {items.map((item) => (
          <div
            key={item._id || item.id || `${item.created_at}-${item.new_status}`}
            style={{
              padding: '10px 12px',
              borderRadius: '10px',
              background: isDark ? '#0f172a' : '#f8fafc',
              border: `1px solid ${t.border}`,
            }}
          >
            <p style={{ fontSize: '0.72rem', color: t.textMuted, margin: '0 0 6px' }}>
              {formatDateTime(item.created_at)}
              {item.user_name ? ` · ${item.user_name}` : ''}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {item.old_status && <StatusBadge status={item.old_status} />}
              <span style={{ color: t.textMuted, fontSize: '0.75rem' }}>→</span>
              {item.new_status && <StatusBadge status={item.new_status} />}
            </div>
            {item.description && (
              <p style={{ fontSize: '0.75rem', color: t.textSecondary, margin: '6px 0 0' }}>{item.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export { label as statusLabel }
