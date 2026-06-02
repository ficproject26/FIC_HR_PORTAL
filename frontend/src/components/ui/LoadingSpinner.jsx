import React from 'react'

export default function LoadingSpinner({ size = 'md' }) {
  const s = { sm: 16, md: 32, lg: 48 }[size]
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <svg style={{ animation: 'spin 0.8s linear infinite', width: s, height: s }} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="#e2e8f0" strokeWidth="3" />
        <path fill="#3b82f6" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export function PageLoader() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '240px', gap: '12px' }}>
      <LoadingSpinner size="lg" />
      <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>Loading...</p>
    </div>
  )
}
