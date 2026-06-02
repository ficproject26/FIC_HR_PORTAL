import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RiEyeLine, RiEyeOffLine, RiShieldUserLine, RiLockLine, RiMailLine } from 'react-icons/ri'
import useAuthStore from '../store/authStore'
import useThemeStore from '../store/themeStore'
import toast from 'react-hot-toast'

export default function Login() {
  const [form, setForm] = useState({ email: 'admin@hrcrm.com', password: 'Admin@123' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuthStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email || !form.password) return toast.error('Please fill all fields')
    setLoading(true)
    const result = await login(form.email, form.password)
    setLoading(false)
    if (result.success) {
      toast.success(`Welcome back, ${result.user.name}!`)
      navigate(result.user.role === 'admin' ? '/admin' : '/hr')
    } else {
      toast.error(result.message || 'Login failed')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #4338ca 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Decorative blobs */}
      <div style={{
        position: 'absolute', top: '-10rem', right: '-10rem',
        width: '20rem', height: '20rem',
        background: 'rgba(99,102,241,0.3)', borderRadius: '50%', filter: 'blur(60px)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-10rem', left: '-10rem',
        width: '20rem', height: '20rem',
        background: 'rgba(59,130,246,0.3)', borderRadius: '50%', filter: 'blur(60px)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', width: '100%', maxWidth: '420px' }}>
        {/* Card */}
        <div style={{
          background: isDark ? '#1e293b' : '#ffffff',
          borderRadius: '24px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
          padding: '2.5rem',
          border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              width: '64px', height: '64px',
              background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
              borderRadius: '16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1rem',
              boxShadow: '0 8px 24px rgba(37,99,235,0.4)',
            }}>
              <RiShieldUserLine style={{ color: 'white', fontSize: '28px' }} />
            </div>
            <h1 style={{
              fontSize: '1.5rem', fontWeight: '800',
              color: isDark ? '#f1f5f9' : '#0f172a',
              margin: '0 0 0.25rem',
            }}>HR CRM Portal</h1>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>
              Sign in to your account
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{
                display: 'block', fontSize: '0.875rem', fontWeight: '600',
                color: isDark ? '#cbd5e1' : '#374151', marginBottom: '0.5rem',
              }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <RiMailLine style={{
                  position: 'absolute', left: '14px', top: '50%',
                  transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '18px',
                }} />
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="admin@hrcrm.com"
                  style={{
                    width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem',
                    borderRadius: '12px',
                    border: isDark ? '1px solid #475569' : '1px solid #e2e8f0',
                    background: isDark ? '#334155' : '#f8fafc',
                    color: isDark ? '#f1f5f9' : '#0f172a',
                    fontSize: '0.9rem', outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#3b82f6'}
                  onBlur={e => e.target.style.borderColor = isDark ? '#475569' : '#e2e8f0'}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: '1.75rem' }}>
              <label style={{
                display: 'block', fontSize: '0.875rem', fontWeight: '600',
                color: isDark ? '#cbd5e1' : '#374151', marginBottom: '0.5rem',
              }}>Password</label>
              <div style={{ position: 'relative' }}>
                <RiLockLine style={{
                  position: 'absolute', left: '14px', top: '50%',
                  transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '18px',
                }} />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  style={{
                    width: '100%', padding: '0.75rem 3rem 0.75rem 2.75rem',
                    borderRadius: '12px',
                    border: isDark ? '1px solid #475569' : '1px solid #e2e8f0',
                    background: isDark ? '#334155' : '#f8fafc',
                    color: isDark ? '#f1f5f9' : '#0f172a',
                    fontSize: '0.9rem', outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#3b82f6'}
                  onBlur={e => e.target.style.borderColor = isDark ? '#475569' : '#e2e8f0'}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: 'absolute', right: '14px', top: '50%',
                    transform: 'translateY(-50%)', background: 'none',
                    border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '18px',
                    padding: 0,
                  }}
                >
                  {showPass ? <RiEyeOffLine /> : <RiEyeLine />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '0.875rem',
                background: loading ? '#93c5fd' : 'linear-gradient(135deg, #2563eb, #4f46e5)',
                color: 'white', border: 'none', borderRadius: '12px',
                fontSize: '1rem', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 15px rgba(37,99,235,0.4)',
                transition: 'all 0.2s', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: '8px',
              }}
            >
              {loading ? (
                <>
                  <svg style={{ animation: 'spin 1s linear infinite', width: '20px', height: '20px' }} viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="4" />
                    <path fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </>
              ) : 'Sign In →'}
            </button>
          </form>

          {/* Demo credentials */}
          <div style={{
            marginTop: '1.5rem', padding: '1rem',
            background: isDark ? '#0f172a' : '#f0f9ff',
            borderRadius: '12px',
            border: isDark ? '1px solid #1e3a5f' : '1px solid #bae6fd',
          }}>
            <p style={{ fontSize: '0.75rem', fontWeight: '700', color: '#0ea5e9', margin: '0 0 0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Demo Credentials
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {[
                { role: 'Admin', email: 'admin@hrcrm.com' },
                { role: 'HR', email: 'priya@hrcrm.com' },
              ].map(c => (
                <button
                  key={c.role}
                  type="button"
                  onClick={() => setForm({ email: c.email, password: 'Admin@123' })}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    textAlign: 'left', padding: '2px 0',
                    fontSize: '0.8rem', color: isDark ? '#94a3b8' : '#475569',
                  }}
                >
                  <span style={{ fontWeight: '600', color: isDark ? '#cbd5e1' : '#1e293b' }}>{c.role}:</span>{' '}
                  {c.email} / Admin@123
                  <span style={{ color: '#3b82f6', marginLeft: '6px', fontSize: '0.7rem' }}>(click to fill)</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', marginTop: '1.5rem' }}>
          © 2024 HR CRM. All rights reserved.
        </p>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input::placeholder { color: #94a3b8; }
      `}</style>
    </div>
  )
}
