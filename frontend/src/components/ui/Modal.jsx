import React, { useEffect } from 'react'
import { RiCloseLine } from 'react-icons/ri'
import useThemeStore from '../../store/themeStore'

const sizeMap = { sm: '400px', md: '520px', lg: '680px', xl: '900px', full: '1100px' }

export default function Modal({ isOpen, onClose, title, children, size = 'md', footer, zIndex = 50 }) {
  const { isDark } = useThemeStore()

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      />
      {/* Dialog */}
      <div style={{
        position: 'relative', width: '100%', maxWidth: sizeMap[size],
        background: isDark ? '#1e293b' : '#ffffff',
        borderRadius: '20px',
        border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
        boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        fontFamily: "'Inter', system-ui, sans-serif",
        animation: 'slideUp 0.2s ease-out',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          flexShrink: 0,
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', color: isDark ? '#f1f5f9' : '#0f172a', margin: 0 }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              padding: '6px', borderRadius: '8px', border: 'none',
              background: isDark ? '#334155' : '#f1f5f9',
              cursor: 'pointer', color: isDark ? '#94a3b8' : '#64748b',
              fontSize: '18px', display: 'flex', alignItems: 'center',
            }}
          >
            <RiCloseLine />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div style={{
            padding: '16px 24px', borderTop: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px',
            flexShrink: 0,
          }}>
            {footer}
          </div>
        )}
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  )
}
