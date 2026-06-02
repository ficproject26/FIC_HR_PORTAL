import React, { useState } from 'react'
import { RiUserLine, RiLockLine, RiSaveLine } from 'react-icons/ri'
import api from '../../utils/api'
import useAuthStore from '../../store/authStore'
import useThemeStore from '../../store/themeStore'
import { getInitials } from '../../utils/helpers'
import { card, getTheme, btnPrimary, input, label } from '../../utils/styles'
import toast from 'react-hot-toast'

export default function HRProfile() {
  const { user, updateUser } = useAuthStore()
  const { isDark } = useThemeStore()
  const t = getTheme(isDark)
  const [activeTab, setActiveTab] = useState('profile')
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '', department: user?.department || '', designation: user?.designation || '' })
  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [saving, setSaving] = useState(false)

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      await api.put('/auth/me', form)
      updateUser(form)
      toast.success('Profile updated')
    } catch (e) { toast.error('Error updating profile') }
    finally { setSaving(false) }
  }

  const handleChangePassword = async () => {
    if (passForm.newPassword !== passForm.confirmPassword) return toast.error('Passwords do not match')
    if (passForm.newPassword.length < 6) return toast.error('Min 6 characters')
    setSaving(true)
    try {
      await api.post('/auth/change-password', { currentPassword: passForm.currentPassword, newPassword: passForm.newPassword })
      toast.success('Password changed')
      setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (e) { toast.error(e.response?.data?.message || 'Error') }
    finally { setSaving(false) }
  }

  const tabs = [
    { id: 'profile', label: 'Profile Info', icon: RiUserLine },
    { id: 'password', label: 'Change Password', icon: RiLockLine },
  ]

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", maxWidth: '640px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: t.textPrimary, margin: '0 0 4px' }}>My Profile</h1>
        <p style={{ color: t.textSecondary, fontSize: '0.875rem', margin: 0 }}>Manage your account settings</p>
      </div>

      {/* Profile Header Card */}
      <div style={{ ...card(isDark), marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: 'white', fontSize: '1.5rem', fontWeight: '800' }}>{getInitials(user?.name)}</span>
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: t.textPrimary, margin: '0 0 4px' }}>{user?.name}</h2>
            <p style={{ color: t.textSecondary, fontSize: '0.875rem', margin: '0 0 8px' }}>{user?.email}</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ padding: '2px 10px', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: '700', background: '#dcfce7', color: '#15803d', textTransform: 'capitalize' }}>{user?.role}</span>
              {user?.department && <span style={{ padding: '2px 10px', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: '600', background: isDark ? '#334155' : '#f1f5f9', color: t.textSecondary }}>{user.department}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '9px 18px', borderRadius: '10px', border: 'none',
            fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer',
            background: activeTab === tab.id ? 'linear-gradient(135deg, #2563eb, #4f46e5)' : (isDark ? '#334155' : '#f1f5f9'),
            color: activeTab === tab.id ? 'white' : t.textSecondary,
            transition: 'all 0.15s',
          }}>
            <tab.icon /> {tab.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div style={card(isDark)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={label(isDark)}>Full Name</label>
              <input style={input(isDark)} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label style={label(isDark)}>Email</label>
              <input style={{ ...input(isDark), opacity: 0.6, cursor: 'not-allowed' }} value={user?.email} disabled />
            </div>
            <div>
              <label style={label(isDark)}>Phone</label>
              <input style={input(isDark)} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+91 9876543210" />
            </div>
            <div>
              <label style={label(isDark)}>Department</label>
              <input style={input(isDark)} value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} placeholder="Recruitment" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={label(isDark)}>Designation</label>
              <input style={input(isDark)} value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} placeholder="HR Executive" />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={handleSaveProfile} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>
              <RiSaveLine /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Password Tab */}
      {activeTab === 'password' && (
        <div style={card(isDark)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
            {[
              { lbl: 'Current Password', key: 'currentPassword', ph: '••••••••' },
              { lbl: 'New Password', key: 'newPassword', ph: 'Min 6 characters' },
              { lbl: 'Confirm New Password', key: 'confirmPassword', ph: 'Repeat new password' },
            ].map(f => (
              <div key={f.key}>
                <label style={label(isDark)}>{f.lbl}</label>
                <input type="password" placeholder={f.ph} style={input(isDark)} value={passForm[f.key]} onChange={e => setPassForm({ ...passForm, [f.key]: e.target.value })} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={handleChangePassword} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>
              <RiLockLine /> {saving ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
