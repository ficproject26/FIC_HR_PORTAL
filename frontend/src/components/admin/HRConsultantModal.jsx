import React, { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import { PageLoader } from '../ui/LoadingSpinner'
import api from '../../utils/api'
import useThemeStore from '../../store/themeStore'
import { getTheme, card, btnPrimary, input, label } from '../../utils/styles'
import { getInitials } from '../../utils/helpers'
import { RiCloseLine, RiPulseLine, RiUploadLine, RiBookmarkLine, RiMedalLine, RiCalendarCheckLine, RiFileTextLine, RiKeyLine, RiTimeLine } from 'react-icons/ri'
import toast from 'react-hot-toast'

export default function HRConsultantModal({ isOpen, onClose, hrId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('Overview')
  const [convertLeadId, setConvertLeadId] = useState('')
  const [joinedRole, setJoinedRole] = useState('')
  const [joinedCompany, setJoinedCompany] = useState('')
  const [converting, setConverting] = useState(false)
  const [bulkLeadsText, setBulkLeadsText] = useState('')
  const [allocating, setAllocating] = useState(false)
  const [selectedFollowUp, setSelectedFollowUp] = useState(null)
  const [showFollowUpModal, setShowFollowUpModal] = useState(false)
  const [followUpForm, setFollowUpForm] = useState({
    status: 'completed',
    outcome: '',
    notes: '',
    scheduleDate: '',
    scheduleTime: '10:00',
    language_spoken: '',
  })
  const { isDark } = useThemeStore()
  const t = getTheme(isDark)

  const tabs = [
    { id: 'Overview', label: 'Overview', icon: <RiPulseLine /> },
    { id: 'Leads', label: 'Leads', icon: <RiUploadLine /> },
    { id: 'FollowUps', label: 'Follow Ups', icon: <RiTimeLine /> },
    { id: 'Convert', label: 'Convert', icon: <RiBookmarkLine /> },
    { id: 'Badges', label: 'Badges', icon: <RiMedalLine /> },
    { id: 'Attendance', label: 'Attendance', icon: <RiCalendarCheckLine /> },
    { id: 'Report', label: 'Report', icon: <RiFileTextLine /> },
    { id: 'Account', label: 'Account', icon: <RiKeyLine /> }
  ]

  const handleConvertLead = async (e) => {
    e.preventDefault()
    if (!convertLeadId) return alert('Please select a lead')
    
    setConverting(true)
    try {
      await api.put(`/leads/${convertLeadId}`, {
        status: 'converted',
        position_applied: joinedRole,
        company: joinedCompany
      })
      alert('Lead marked as converted successfully!')
      setConvertLeadId('')
      setJoinedRole('')
      setJoinedCompany('')
      fetchData()
    } catch (err) {
      console.error(err)
      alert('Failed to convert lead')
    } finally {
      setConverting(false)
    }
  }

  const submitFollowUpUpdate = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        status: followUpForm.status,
        notes: followUpForm.notes,
        outcome: followUpForm.outcome,
      }
      if (followUpForm.status === 'exemption' && followUpForm.language_spoken) {
        payload.language_spoken = followUpForm.language_spoken
      }
      if (followUpForm.status === 'rescheduled') {
        const d = followUpForm.scheduleDate
        const t = followUpForm.scheduleTime
        payload.scheduled_at = new Date(`${d}T${t}:00`).toISOString()
      }
      await api.put(`/admin/follow-ups/${selectedFollowUp._id}`, payload)
      toast.success('Follow-up updated successfully')
      setShowFollowUpModal(false)
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating follow-up')
    }
  }

  const handleAllocateLeads = async () => {
    if (!bulkLeadsText.trim()) return alert('Please enter leads');
    setAllocating(true);
    try {
      const res = await api.post(`/admin/hr-consultant/${hrId}/allocate-leads`, { text: bulkLeadsText });
      alert(res.data.message || 'Leads allocated successfully!');
      setBulkLeadsText('');
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to allocate leads');
    } finally {
      setAllocating(false);
    }
  }

  useEffect(() => {
    if (isOpen && hrId) {
      fetchData()
    } else {
      setData(null)
      setActiveTab('Overview')
    }
  }, [isOpen, hrId])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/admin/hr-consultant/${hrId}`)
      setData(res.data.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleBadge = async (badgeId) => {
    try {
      setData(prev => {
        if (!prev) return prev;
        const updatedBadges = prev.badges.map(b => b.id === badgeId ? { ...b, earned: !b.earned } : b);
        const earnedCount = updatedBadges.filter(b => b.earned).length;
        return {
          ...prev,
          badges: updatedBadges,
          stats: {
            ...prev.stats,
            totalBadges: earnedCount
          }
        };
      });
      await api.put(`/admin/hr-consultant/${hrId}/toggle-badge`, { badgeId });
    } catch (e) {
      console.error(e);
      fetchData();
    }
  };

  if (!isOpen) return null

  const { user, stats, badges, leads, attendances, performances, followUps } = data || {}

  const headerGradient = isDark 
    ? 'linear-gradient(90deg, #1e3a8a 0%, #1e40af 50%, #b45309 100%)' 
    : 'linear-gradient(90deg, #1d4ed8 0%, #3b82f6 50%, #fcd34d 100%)'

  const statCard = (title, value, highlight = false) => (
    <div style={{
      background: highlight ? 'linear-gradient(135deg, #2563eb, #eab308)' : (isDark ? '#1e293b' : '#fff'),
      padding: '16px',
      borderRadius: '12px',
      border: highlight ? 'none' : `1px solid ${t.border}`,
      color: highlight ? '#fff' : t.textPrimary,
      boxShadow: highlight ? '0 4px 15px rgba(37,99,235,0.2)' : 'none'
    }}>
      <p style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: highlight ? 'rgba(255,255,255,0.8)' : t.textSecondary, margin: '0 0 8px' }}>
        {title}
      </p>
      <p style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0 }}>
        {value}
      </p>
    </div>
  )

  return (
    <>
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '20px'
    }}>
      <div style={{
        background: t.bg, width: '100%', maxWidth: '900px', maxHeight: '90vh',
        borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
        animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        
        {/* Header section with gradient */}
        <div style={{ background: headerGradient, padding: '24px', position: 'relative', display: 'flex', gap: '20px', alignItems: 'center' }}>
          <button 
            onClick={onClose}
            style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(0,0,0,0.2)', border: 'none', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.2s' }}
          >
            <RiCloseLine size={20} />
          </button>
          
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #93c5fd, #fcd34d)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
            <span style={{ color: '#fff', fontSize: '2rem', fontWeight: '800' }}>
              {user ? getInitials(user.name) : ''}
            </span>
          </div>
          
          <div style={{ color: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '0 0 4px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0 }}>{user ? user.name : 'Loading...'}</h2>
              <span style={{ color: '#fcd34d' }}>✨</span>
            </div>
            <p style={{ fontSize: '0.875rem', opacity: 0.9, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              {user ? user.email : ''} • 📱 {user?.phone || 'No phone'}
            </p>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
              {badges?.filter(b => b.earned).map(b => (
                <span key={b.id} style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {b.icon} {b.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: isDark ? '#1e293b' : '#f8fafc', padding: '12px 24px 0', borderBottom: `1px solid ${t.border}`, overflowX: 'auto', gap: '4px' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: activeTab === tab.id ? t.bg : 'transparent',
                border: 'none', borderTopLeftRadius: '8px', borderTopRightRadius: '8px',
                padding: '12px 20px', fontSize: '0.875rem', fontWeight: '600',
                color: activeTab === tab.id ? t.textPrimary : t.textSecondary,
                cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: activeTab === tab.id ? `0 -2px 10px rgba(0,0,0,0.05)` : 'none'
              }}
            >
              <span style={{ fontSize: '1.1rem', display: 'flex' }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <PageLoader />
          ) : (
            <>
              {activeTab === 'Overview' && stats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  {statCard('Total Leads', stats.totalLeads)}
                  {statCard('Converted', stats.convertedLeads, true)}
                  {statCard('Follow-Up', stats.followupLeads)}
                  {statCard('Exemption', stats.exemptionLeads)}
                  {statCard('Not Interested', stats.notInterestedLeads)}
                  {statCard('Badges', stats.totalBadges)}
                  {statCard('Logins', stats.totalLogins)}
                  {statCard('Conversion %', `${stats.conversionRate}%`, true)}
                </div>
              )}
              
              {activeTab === 'Leads' && (
                <div>
                  {user?.branch?.name?.toLowerCase() === 'krishnagiri' && (
                    <div style={{ background: isDark ? '#1e293b' : '#f8fafc', borderRadius: '12px', padding: '20px', marginBottom: '24px', border: `1px solid ${t.border}` }}>
                      <h3 style={{ fontSize: '1rem', color: t.textPrimary, margin: '0 0 16px', fontWeight: '700' }}>Upload Leads (Name, Mobile per line)</h3>
                      <textarea
                        value={bulkLeadsText}
                        onChange={(e) => setBulkLeadsText(e.target.value)}
                        placeholder="Name 1, 9000000010&#10;Name 2, 9000000011"
                        style={{ width: '100%', height: '120px', padding: '12px', borderRadius: '8px', border: `1px solid ${t.border}`, background: isDark ? '#0f172a' : '#fff', color: t.textPrimary, resize: 'vertical', fontSize: '0.875rem', fontFamily: 'monospace', marginBottom: '16px' }}
                      />
                      <button
                        onClick={handleAllocateLeads}
                        disabled={allocating || !bulkLeadsText.trim()}
                        style={{
                          background: '#1d4ed8', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '8px',
                          fontSize: '0.9rem', fontWeight: '600', cursor: allocating || !bulkLeadsText.trim() ? 'not-allowed' : 'pointer',
                          opacity: allocating || !bulkLeadsText.trim() ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', gap: '8px'
                        }}
                      >
                        {allocating ? 'Allocating...' : '+ Allocate'}
                      </button>
                    </div>
                  )}

                  <h3 style={{ fontSize: '1rem', color: t.textPrimary, margin: '0 0 16px' }}>Recent Leads</h3>
                  {leads?.length > 0 ? (
                     <div style={{ overflowX: 'auto', border: `1px solid ${t.border}`, borderRadius: '8px' }}>
                       <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                         <thead>
                           <tr style={{ background: isDark ? '#1e293b' : '#f8fafc', borderBottom: `1px solid ${t.border}` }}>
                             <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.75rem', color: t.textSecondary }}>Name</th>
                             <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.75rem', color: t.textSecondary }}>Contact</th>
                             <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.75rem', color: t.textSecondary }}>Status</th>
                             <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.75rem', color: t.textSecondary }}>Origin</th>
                           </tr>
                         </thead>
                         <tbody>
                           {leads.map(l => (
                             <tr key={l._id} style={{ borderBottom: `1px solid ${t.border}` }}>
                               <td style={{ padding: '12px', fontSize: '0.875rem', color: t.textPrimary }}>{l.name}</td>
                               <td style={{ padding: '12px', fontSize: '0.875rem', color: t.textSecondary }}>
                                 {l.phone || l.email || '—'}
                               </td>
                               <td style={{ padding: '12px', fontSize: '0.875rem', color: t.textSecondary, textTransform: 'capitalize' }}>{l.status}</td>
                               <td style={{ padding: '12px', fontSize: '0.875rem', color: t.textSecondary, textTransform: 'capitalize' }}>{l.source || 'Manual'}</td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                     </div>
                  ) : <p style={{ color: t.textSecondary, fontSize: '0.875rem' }}>No leads assigned yet.</p>}
                </div>
              )}

              {activeTab === 'FollowUps' && (
                <div>
                  <h3 style={{ fontSize: '1rem', color: t.textPrimary, margin: '0 0 16px' }}>Recent Follow Ups</h3>
                  {followUps?.length > 0 ? (
                     <div style={{ overflowX: 'auto', border: `1px solid ${t.border}`, borderRadius: '8px' }}>
                       <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                         <thead>
                           <tr style={{ background: isDark ? '#1e293b' : '#f8fafc', borderBottom: `1px solid ${t.border}` }}>
                             <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.75rem', color: t.textSecondary }}>Date</th>
                             <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.75rem', color: t.textSecondary }}>Lead</th>
                             <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.75rem', color: t.textSecondary }}>Type</th>
                             <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.75rem', color: t.textSecondary }}>Status</th>
                             <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.75rem', color: t.textSecondary }}>Origin</th>
                             <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.75rem', color: t.textSecondary }}>Action</th>
                           </tr>
                         </thead>
                         <tbody>
                           {followUps.map(f => (
                             <tr key={f._id} style={{ borderBottom: `1px solid ${t.border}` }}>
                               <td style={{ padding: '12px', fontSize: '0.875rem', color: t.textPrimary }}>
                                 {new Date(f.scheduled_at).toLocaleDateString()}<br/>
                                 <span style={{ fontSize: '0.75rem', color: t.textSecondary }}>{new Date(f.scheduled_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                               </td>
                               <td style={{ padding: '12px', fontSize: '0.875rem', color: t.textPrimary }}>
                                 {f.lead_id?.name || 'Unknown'}<br/>
                                 <span style={{ fontSize: '0.75rem', color: t.textSecondary }}>{f.lead_id?.phone || ''}</span>
                               </td>
                               <td style={{ padding: '12px', fontSize: '0.875rem', color: t.textSecondary, textTransform: 'capitalize' }}>{f.type || 'Call'}</td>
                               <td style={{ padding: '12px', fontSize: '0.875rem', color: t.textSecondary, textTransform: 'capitalize' }}>
                                  <span style={{
                                    padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold',
                                    background: f.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : f.status === 'missed' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                    color: f.status === 'completed' ? '#10b981' : f.status === 'missed' ? '#ef4444' : '#f59e0b'
                                  }}>
                                    {f.status}
                                  </span>
                               </td>
                               <td style={{ padding: '12px', fontSize: '0.875rem', color: t.textSecondary, textTransform: 'capitalize' }}>{f.lead_id?.source || 'Manual'}</td>
                               <td style={{ padding: '12px', fontSize: '0.875rem' }}>
                                 {['pending', 'rescheduled'].includes(f.status) ? (
                                   <button 
                                     onClick={() => {
                                       setSelectedFollowUp(f);
                                       setFollowUpForm({ ...followUpForm, notes: f.notes || '', status: 'completed' });
                                       setShowFollowUpModal(true);
                                     }}
                                     style={{ ...btnPrimary, padding: '4px 10px', fontSize: '0.75rem' }}
                                   >
                                     Update
                                   </button>
                                 ) : <span style={{ color: t.textMuted }}>—</span>}
                               </td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                     </div>
                  ) : <p style={{ color: t.textSecondary, fontSize: '0.875rem' }}>No follow ups scheduled yet.</p>}
                </div>
              )}

              {activeTab === 'Attendance' && (
                <div>
                  <h3 style={{ fontSize: '1rem', color: t.textPrimary, margin: '0 0 16px' }}>Recent Attendance</h3>
                  {attendances?.length > 0 ? (
                     <div style={{ overflowX: 'auto', border: `1px solid ${t.border}`, borderRadius: '8px' }}>
                       <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                         <thead>
                           <tr style={{ background: isDark ? '#1e293b' : '#f8fafc', borderBottom: `1px solid ${t.border}` }}>
                             <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.75rem', color: t.textSecondary }}>Date</th>
                             <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.75rem', color: t.textSecondary }}>Login Time</th>
                           </tr>
                         </thead>
                         <tbody>
                           {attendances.map(a => (
                             <tr key={a._id} style={{ borderBottom: `1px solid ${t.border}` }}>
                               <td style={{ padding: '12px', fontSize: '0.875rem', color: t.textPrimary }}>{new Date(a.date).toLocaleDateString()}</td>
                               <td style={{ padding: '12px', fontSize: '0.875rem', color: t.textSecondary }}>{a.login_time ? new Date(a.login_time).toLocaleTimeString() : 'N/A'}</td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                     </div>
                  ) : <p style={{ color: t.textSecondary, fontSize: '0.875rem' }}>No attendance records found.</p>}
                </div>
              )}

              {activeTab === 'Convert' && (
                <div>
                  <div style={{ background: isDark ? '#1e293b' : '#fff', borderRadius: '12px', border: `1px solid ${t.border}`, padding: '24px', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '1.1rem', color: t.textPrimary, margin: '0 0 20px', fontWeight: '700' }}>Mark a Lead as Converted</h3>
                    <form onSubmit={handleConvertLead} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: t.textPrimary, marginBottom: '8px' }}>Lead</label>
                        <select
                          value={convertLeadId}
                          onChange={(e) => setConvertLeadId(e.target.value)}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${t.border}`, background: isDark ? '#0f172a' : '#f8fafc', color: t.textPrimary, fontSize: '0.9rem', outline: 'none' }}
                        >
                          <option value="">Select a lead...</option>
                          {leads?.filter(l => l.status !== 'converted').map(l => (
                            <option key={l._id} value={l._id}>
                              {l.name} — {l.phone || 'No phone'} ({l.status})
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: t.textPrimary, marginBottom: '8px' }}>Joined Role</label>
                        <input
                          type="text"
                          value={joinedRole}
                          onChange={(e) => setJoinedRole(e.target.value)}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${t.border}`, background: isDark ? '#0f172a' : '#f8fafc', color: t.textPrimary, fontSize: '0.9rem', outline: 'none' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: t.textPrimary, marginBottom: '8px' }}>Joined Company</label>
                        <input
                          type="text"
                          value={joinedCompany}
                          onChange={(e) => setJoinedCompany(e.target.value)}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${t.border}`, background: isDark ? '#0f172a' : '#f8fafc', color: t.textPrimary, fontSize: '0.9rem', outline: 'none' }}
                        />
                      </div>

                      <div style={{ marginTop: '8px' }}>
                        <button
                          type="submit"
                          disabled={converting || !convertLeadId}
                          style={{
                            background: '#1d4ed8', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px',
                            fontSize: '0.9rem', fontWeight: '600', cursor: converting || !convertLeadId ? 'not-allowed' : 'pointer',
                            opacity: converting || !convertLeadId ? 0.7 : 1, transition: 'all 0.2s'
                          }}
                        >
                          {converting ? 'Saving...' : 'Save Conversion'}
                        </button>
                      </div>
                    </form>
                  </div>

                  <h3 style={{ fontSize: '1rem', color: t.textPrimary, margin: '0 0 16px' }}>Converted Leads</h3>
                  {leads?.filter(l => l.status === 'converted').length > 0 ? (
                     <div style={{ overflowX: 'auto', border: `1px solid ${t.border}`, borderRadius: '8px' }}>
                       <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                         <thead>
                           <tr style={{ background: isDark ? '#1e293b' : '#f8fafc', borderBottom: `1px solid ${t.border}` }}>
                             <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.75rem', color: t.textSecondary }}>Name</th>
                             <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.75rem', color: t.textSecondary }}>Company</th>
                             <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.75rem', color: t.textSecondary }}>Email</th>
                           </tr>
                         </thead>
                         <tbody>
                           {leads.filter(l => l.status === 'converted').map(l => (
                             <tr key={l._id} style={{ borderBottom: `1px solid ${t.border}` }}>
                               <td style={{ padding: '12px', fontSize: '0.875rem', color: t.textPrimary, fontWeight: '600' }}>{l.name}</td>
                               <td style={{ padding: '12px', fontSize: '0.875rem', color: t.textSecondary }}>{l.company || '—'}</td>
                               <td style={{ padding: '12px', fontSize: '0.875rem', color: t.textSecondary }}>{l.email || '—'}</td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                     </div>
                  ) : <p style={{ color: t.textSecondary, fontSize: '0.875rem' }}>No converted leads yet.</p>}
                </div>
              )}

              {activeTab === 'Badges' && (
                <div>
                  <p style={{ fontSize: '0.9rem', color: t.textSecondary, marginBottom: '20px' }}>
                    Click any badge to award or revoke it. Changes apply instantly.
                  </p>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {badges?.map(b => {
                      const badgeColors = {
                        employee_of_the_week: { bg: '#8b5cf6', text: '#fff' },
                        employee_of_the_month: { bg: '#3b82f6', text: '#fff' },
                        best_caller: { bg: '#06b6d4', text: '#fff' },
                        best_consultant: { bg: '#0d9488', text: '#fff' },
                        fast_lead_closer: { bg: '#f97316', text: '#fff' },
                        professional_attitude: { bg: '#ec4899', text: '#fff' },
                        active_bee: { bg: '#eab308', text: '#fff' },
                        newbie: { bg: '#22c55e', text: '#fff' },
                      };

                      const colors = badgeColors[b.id] || { bg: '#3b82f6', text: '#fff' };
                      const isEarned = b.earned;

                      return (
                        <button
                          key={b.id}
                          onClick={() => handleToggleBadge(b.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 20px',
                            borderRadius: '30px',
                            border: 'none',
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            background: isEarned ? colors.bg : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(156, 163, 175, 0.5)'),
                            color: '#fff',
                            opacity: isEarned ? 1 : 0.6,
                            boxShadow: isEarned ? `0 4px 12px ${colors.bg}40` : 'none',
                            transform: 'scale(1)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.opacity = isEarned ? '0.95' : '0.8';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.opacity = isEarned ? '1' : '0.6';
                          }}
                        >
                          <span style={{ fontSize: '1.1rem' }}>{b.icon}</span>
                          <span>{b.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === 'Report' && (
                <div>
                  <h3 style={{ fontSize: '1rem', color: t.textPrimary, margin: '0 0 16px' }}>Performance Reports</h3>
                  {performances?.length > 0 ? (
                     <div style={{ overflowX: 'auto', border: `1px solid ${t.border}`, borderRadius: '8px' }}>
                       <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ background: isDark ? '#1e293b' : '#f8fafc', borderBottom: `1px solid ${t.border}` }}>
                              <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.75rem', color: t.textSecondary }}>Date</th>
                              <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.75rem', color: t.textSecondary }}>Leads</th>
                              <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.75rem', color: t.textSecondary }}>Calls</th>
                              <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.75rem', color: t.textSecondary }}>Follow-ups</th>
                              <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.75rem', color: t.textSecondary }}>Converted</th>
                            </tr>
                          </thead>
                          <tbody>
                            {performances.map(p => (
                              <tr key={p._id} style={{ borderBottom: `1px solid ${t.border}` }}>
                                <td style={{ padding: '12px', fontSize: '0.875rem', color: t.textPrimary }}>{new Date(p.date).toLocaleDateString()}</td>
                                <td style={{ padding: '12px', fontSize: '0.875rem', color: t.textPrimary }}>{p.leads_contacted || 0}</td>
                                <td style={{ padding: '12px', fontSize: '0.875rem', color: t.textPrimary }}>{p.calls_made || 0}</td>
                                <td style={{ padding: '12px', fontSize: '0.875rem', color: t.textSecondary }}>{p.follow_ups_completed || 0}</td>
                                <td style={{ padding: '12px', fontSize: '0.875rem', color: t.textPrimary, fontWeight: '600' }}>{p.leads_converted || 0}</td>
                              </tr>
                            ))}
                          </tbody>
                       </table>
                     </div>
                  ) : <p style={{ color: t.textSecondary, fontSize: '0.875rem' }}>No performance reports logged yet.</p>}
                </div>
              )}

              {activeTab === 'Account' && user && (
                <div>
                  <h3 style={{ fontSize: '1rem', color: t.textPrimary, margin: '0 0 16px' }}>Account Information</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                    <div style={{ background: isDark ? '#1e293b' : '#f8fafc', padding: '16px', borderRadius: '12px', border: `1px solid ${t.border}` }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: t.textSecondary, margin: '0 0 4px' }}>Full Name</p>
                      <p style={{ fontSize: '1rem', fontWeight: '600', color: t.textPrimary, margin: 0 }}>{user.name}</p>
                    </div>
                    <div style={{ background: isDark ? '#1e293b' : '#f8fafc', padding: '16px', borderRadius: '12px', border: `1px solid ${t.border}` }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: t.textSecondary, margin: '0 0 4px' }}>Email Address</p>
                      <p style={{ fontSize: '1rem', fontWeight: '600', color: t.textPrimary, margin: 0 }}>{user.email}</p>
                    </div>
                    <div style={{ background: isDark ? '#1e293b' : '#f8fafc', padding: '16px', borderRadius: '12px', border: `1px solid ${t.border}` }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: t.textSecondary, margin: '0 0 4px' }}>Phone Number</p>
                      <p style={{ fontSize: '1rem', fontWeight: '600', color: t.textPrimary, margin: 0 }}>{user.phone || 'Not provided'}</p>
                    </div>
                    <div style={{ background: isDark ? '#1e293b' : '#f8fafc', padding: '16px', borderRadius: '12px', border: `1px solid ${t.border}` }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: t.textSecondary, margin: '0 0 4px' }}>Department</p>
                      <p style={{ fontSize: '1rem', fontWeight: '600', color: t.textPrimary, margin: 0, textTransform: 'capitalize' }}>{user.department || 'HR'}</p>
                    </div>
                    <div style={{ background: isDark ? '#1e293b' : '#f8fafc', padding: '16px', borderRadius: '12px', border: `1px solid ${t.border}` }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: t.textSecondary, margin: '0 0 4px' }}>Role</p>
                      <p style={{ fontSize: '1rem', fontWeight: '600', color: t.textPrimary, margin: 0, textTransform: 'uppercase' }}>{user.role}</p>
                    </div>
                    <div style={{ background: isDark ? '#1e293b' : '#f8fafc', padding: '16px', borderRadius: '12px', border: `1px solid ${t.border}` }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: t.textSecondary, margin: '0 0 4px' }}>Joined Date</p>
                      <p style={{ fontSize: '1rem', fontWeight: '600', color: t.textPrimary, margin: 0 }}>{new Date(user.created_at || Date.now()).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      <style>{`
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>

      {showFollowUpModal && selectedFollowUp && (
        <Modal isOpen={true} onClose={() => setShowFollowUpModal(false)} title="Update Follow-up" zIndex={1050}>
          <form onSubmit={submitFollowUpUpdate}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={label(isDark)}>Status</label>
                <select 
                  value={followUpForm.status} 
                  onChange={e => setFollowUpForm({...followUpForm, status: e.target.value})} 
                  style={{ ...input(isDark) }}
                >
                  <option value="completed">Completed</option>
                  <option value="converted">Converted</option>
                  <option value="exemption">Exemption</option>
                  <option value="not_interested">Not Interested</option>
                  <option value="missed">Missed</option>
                  <option value="rescheduled">Rescheduled</option>
                </select>
              </div>
              
              {followUpForm.status === 'exemption' && (
                <div>
                  <label style={label(isDark)}>Language spoken</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Telugu, Tamil..."
                    value={followUpForm.language_spoken} 
                    onChange={e => setFollowUpForm({ ...followUpForm, language_spoken: e.target.value })} 
                    style={{ ...input(isDark) }} 
                  />
                </div>
              )}

              {followUpForm.status === 'rescheduled' && (
                <div>
                  <label style={label(isDark)}>New date & time *</label>
                  <div style={{ display:'flex', gap:'10px' }}>
                    <input type="date" required value={followUpForm.scheduleDate} onChange={e => setFollowUpForm({...followUpForm, scheduleDate: e.target.value})} style={{ ...input(isDark), flex:1 }} />
                    <input type="time" required value={followUpForm.scheduleTime} onChange={e => setFollowUpForm({...followUpForm, scheduleTime: e.target.value})} style={{ ...input(isDark), width:'120px' }} />
                  </div>
                </div>
              )}

              {['completed', 'not_interested'].includes(followUpForm.status) && (
                <div>
                  <label style={label(isDark)}>Outcome / Reason</label>
                  <input type="text" value={followUpForm.outcome} onChange={e => setFollowUpForm({...followUpForm, outcome: e.target.value})} placeholder={followUpForm.status === 'completed' ? "e.g. Discussed proposal" : "e.g. Budget too low"} style={{ ...input(isDark) }} />
                </div>
              )}

              <div>
                <label style={label(isDark)}>Notes (Optional)</label>
                <textarea value={followUpForm.notes} onChange={e => setFollowUpForm({...followUpForm, notes: e.target.value})} rows="3" style={{ ...input(isDark), resize:'vertical' }} placeholder="Any additional details..." />
              </div>

              <button type="submit" style={{ ...btnPrimary, marginTop: '10px' }}>
                Save Update
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
