import React, { useEffect, useState, useCallback } from 'react'
import { RiEditLine, RiUploadLine, RiExternalLinkLine, RiUserHeartLine } from 'react-icons/ri'
import api from '../../utils/api'
import Pagination from '../../components/ui/Pagination'
import { StatusBadge } from '../../components/ui/Badge'
import SearchBar from '../../components/ui/SearchBar'
import Modal from '../../components/ui/Modal'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import { getInitials, debounce } from '../../utils/helpers'
import useThemeStore from '../../store/themeStore'
import { card, getTheme, btnPrimary, btnSecondary, input, label } from '../../utils/styles'
import toast from 'react-hot-toast'

export default function HRCandidates() {
  const [candidates, setCandidates] = useState([])
  const [pagination, setPagination] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({})
  const [resumeFile, setResumeFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const { isDark } = useThemeStore()
  const t = getTheme(isDark)

  useEffect(() => { fetchCandidates() }, [page])
  const debouncedFetch = useCallback(debounce(() => { setPage(1); fetchCandidates() }, 400), [search])
  useEffect(() => { debouncedFetch() }, [search])

  const fetchCandidates = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/candidates?page=${page}&limit=10&search=${search}&status=converted`)
      setCandidates(res.data.data); setPagination(res.data.pagination)
    } catch(e) {} finally { setLoading(false) }
  }

  const openEdit = (c) => {
    setSelected(c)
    setForm({
      current_salary: c.current_salary || '',
      notice_period: c.notice_period || '',
      education: c.education || '',
      certifications: c.certifications?.join(', ') || '',
      portfolio_url: c.portfolio_url || '',
      github_url: c.github_url || '',
      notes: c.notes || '',
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        ...form,
        certifications: form.certifications ? form.certifications.split(',').map(s => s.trim()).filter(Boolean) : [],
      }
      await api.put(`/candidates/${selected.id}`, payload)
      if (resumeFile) {
        const fd = new FormData(); fd.append('resume', resumeFile)
        await api.post(`/candidates/${selected.id}/resume`, fd)
      }
      toast.success('Candidate profile updated'); setShowModal(false); fetchCandidates()
    } catch(e) { toast.error('Error') } finally { setSaving(false) }
  }

  const thStyle = { textAlign:'left', padding:'10px 14px', fontSize:'0.72rem', fontWeight:'700', color:t.textSecondary, textTransform:'uppercase', letterSpacing:'0.05em', background: isDark ? '#0f172a' : '#f8fafc' }
  const tdStyle = { padding:'14px', fontSize:'0.875rem', color:t.textPrimary, borderBottom:`1px solid ${t.tableBorder}` }

  return (
    <div style={{ fontFamily:"'Inter', system-ui, sans-serif" }}>
      <div style={{ marginBottom:'24px' }}>
        <h1 style={{ fontSize:'1.5rem', fontWeight:'800', color:t.textPrimary, margin:'0 0 4px' }}>Candidate Profiles</h1>
        <p style={{ color:t.textSecondary, fontSize:'0.875rem', margin:0 }}>Converted leads only — manage profiles, resumes, and hiring details</p>
      </div>

      <div style={{ ...card(isDark), padding:'14px', marginBottom:'20px' }}>
        <SearchBar value={search} onChange={v => { setSearch(v); setPage(1) }} placeholder="Search converted candidates..." style={{ maxWidth:'320px' }} />
      </div>

      <div style={{ ...card(isDark), padding:0, overflow:'hidden' }}>
        {loading ? <PageLoader /> : (
          <>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr>{['Candidate','Position','Status','Resume','Actions'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {candidates.map(c => (
                    <tr key={c.id}
                      onMouseEnter={e => e.currentTarget.style.background = isDark ? '#334155' : '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={tdStyle}>
                        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                          <div style={{ width:'36px', height:'36px', borderRadius:'50%', background: isDark ? 'rgba(16,185,129,0.2)' : '#ecfdf5', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            <span style={{ color:'#10b981', fontSize:'0.72rem', fontWeight:'800' }}>{getInitials(c.name)}</span>
                          </div>
                          <div>
                            <p style={{ fontWeight:'600', margin: c.email ? '0 0 2px' : 0 }}>{c.name}</p>
                            {c.email && (
                              <p style={{ fontSize:'0.72rem', color:t.textSecondary, margin:0 }}>{c.email}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ ...tdStyle, fontSize:'0.8rem' }}>{c.position_applied || '—'}</td>
                      <td style={tdStyle}><StatusBadge status={c.status} /></td>
                      <td style={tdStyle}>
                        {c.resume_url
                          ? <a href={c.resume_url} target="_blank" rel="noopener noreferrer" style={{ display:'flex', alignItems:'center', gap:'4px', color:'#3b82f6', fontSize:'0.8rem', textDecoration:'none' }}><RiExternalLinkLine /> View</a>
                          : <span style={{ color:t.textMuted, fontSize:'0.78rem' }}>No resume</span>}
                      </td>
                      <td style={tdStyle}>
                        <button onClick={() => openEdit(c)} style={{ padding:'6px', borderRadius:'8px', border:'none', background:'transparent', cursor:'pointer', color:'#3b82f6', fontSize:'16px', display:'flex' }}><RiEditLine /></button>
                      </td>
                    </tr>
                  ))}
                  {candidates.length === 0 && (
                    <tr><td colSpan={5} style={{ padding:'48px', textAlign:'center', color:t.textSecondary }}>
                      <RiUserHeartLine style={{ fontSize:'40px', marginBottom:'8px', display:'block', margin:'0 auto 8px' }} />
                      No converted candidates yet. Mark a lead as Converted on My Leads to add them here.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination pagination={pagination} onPageChange={setPage} />
          </>
        )}
      </div>

      {/* Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Edit Candidate Profile" size="lg"
        footer={<>
          <button onClick={() => setShowModal(false)} style={btnSecondary(isDark)}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving...' : 'Save Profile'}</button>
        </>}>
        {/* Candidate header */}
        <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px', background: isDark ? '#0f172a' : '#f8fafc', borderRadius:'12px', marginBottom:'20px' }}>
          <div style={{ width:'40px', height:'40px', borderRadius:'50%', background: isDark ? 'rgba(16,185,129,0.2)' : '#ecfdf5', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ color:'#10b981', fontWeight:'800' }}>{getInitials(selected?.name)}</span>
          </div>
          <div>
            <p style={{ fontWeight:'700', color:t.textPrimary, margin:'0 0 2px' }}>{selected?.name}</p>
            <p style={{ fontSize:'0.78rem', color:t.textSecondary, margin:0 }}>{selected?.email} • {selected?.phone}</p>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
          {[
            { lbl:'Notice Period (Days)', key:'notice_period', type:'number', ph:'30' },
            { lbl:'Current Salary', key:'current_salary', type:'number', ph:'400000' },
          ].map(f => (
            <div key={f.key}>
              <label style={label(isDark)}>{f.lbl}</label>
              <input type={f.type} placeholder={f.ph} value={form[f.key] || ''} onChange={e => setForm({ ...form, [f.key]:e.target.value })} style={input(isDark)} />
            </div>
          ))}
          <div style={{ gridColumn:'1 / -1' }}>
            <label style={label(isDark)}>Education</label>
            <input placeholder="B.Tech Computer Science" value={form.education || ''} onChange={e => setForm({ ...form, education:e.target.value })} style={input(isDark)} />
          </div>
          <div style={{ gridColumn:'1 / -1' }}>
            <label style={label(isDark)}>Certifications (comma separated)</label>
            <input placeholder="AWS, Google Cloud" value={form.certifications || ''} onChange={e => setForm({ ...form, certifications:e.target.value })} style={input(isDark)} />
          </div>
          <div>
            <label style={label(isDark)}>Portfolio URL</label>
            <input placeholder="https://portfolio.com" value={form.portfolio_url || ''} onChange={e => setForm({ ...form, portfolio_url:e.target.value })} style={input(isDark)} />
          </div>
          <div>
            <label style={label(isDark)}>GitHub URL</label>
            <input placeholder="https://github.com/..." value={form.github_url || ''} onChange={e => setForm({ ...form, github_url:e.target.value })} style={input(isDark)} />
          </div>
          <div style={{ gridColumn:'1 / -1' }}>
            <label style={label(isDark)}>Upload Resume</label>
            <div style={{ border:`2px dashed ${t.border}`, borderRadius:'12px', padding:'20px', textAlign:'center' }}>
              <input type="file" accept=".pdf,.doc,.docx" onChange={e => setResumeFile(e.target.files[0])} id="resume-upload" style={{ display:'none' }} />
              <label htmlFor="resume-upload" style={{ cursor:'pointer' }}>
                <RiUploadLine style={{ fontSize:'28px', color:t.textMuted, marginBottom:'6px', display:'block', margin:'0 auto 6px' }} />
                <p style={{ fontSize:'0.8rem', color:t.textSecondary, margin:0 }}>{resumeFile ? resumeFile.name : 'Click to upload PDF/DOC'}</p>
              </label>
            </div>
          </div>
          <div style={{ gridColumn:'1 / -1' }}>
            <label style={label(isDark)}>Notes</label>
            <textarea rows={3} placeholder="Additional notes about the candidate..." value={form.notes || ''} onChange={e => setForm({ ...form, notes:e.target.value })} style={{ ...input(isDark), resize:'none' }} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
