import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Icon } from '../../../layouts/icons'
import { api } from '../../../services/api'
import { toast } from 'react-toastify'
import { formatCurrency } from '../../../utils/formatters'

export default function EmployeeProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [emp, setEmp] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/api/users/${id}`)
      .then(setEmp)
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="crmContent p-12 text-center"><div className="spinner-medium" /></div>
  if (!emp) return <div className="crmContent p-12 muted">Employee not found.</div>

  return (
    <div className="stack leadsListPage crmContent">
      <section className="leadsFullscreenShell">
        <header className="leadsHeader">
           <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <div className="payee-avatar-mini" style={{ width: '80px', height: '80px', fontSize: '2rem' }}>{emp.name?.charAt(0)}</div>
              <div>
                 <h1 className="leadsTitle" style={{ fontSize: '2.4rem' }}>{emp.name}</h1>
                 <p className="leadsDescription">{emp.designation} • {emp.department} • <span className={`status-pill-modern ${emp.status === 'active' ? 'success' : 'danger'}`} style={{ fontSize: '0.6rem' }}>{emp.status?.toUpperCase()}</span></p>
              </div>
           </div>
           <div className="leadsHeaderActions">
              <button className="btn-link" onClick={() => navigate('/hr/employees')}>Back to List</button>
              <button className="btn-premium action-vibrant" onClick={() => navigate(`/hr/employees/edit/${emp.id}`)}><Icon name="edit" /> Edit Profile</button>
           </div>
        </header>

        <div className="grid-2 gap-24" style={{ marginTop: '40px' }}>
           {/* Section 1: Personal & Account */}
           <section className="intel-card glass-panel">
              <div className="card-header-premium"><Icon name="user" /> <h3>Personal & Login Info</h3></div>
              <div className="card-body-premium p-24">
                 <div className="profile-detail-grid">
                    <div className="detail-item"><label>Email</label><span>{emp.email}</span></div>
                    <div className="detail-item"><label>Phone</label><span>{emp.phone || '---'}</span></div>
                    <div className="detail-item"><label>Gender</label><span>{emp.gender || '---'}</span></div>
                    <div className="detail-item"><label>DOB</label><span>{emp.date_of_birth ? new Date(emp.date_of_birth).toLocaleDateString() : '---'}</span></div>
                    <div className="detail-item"><label>Username</label><span>{emp.username}</span></div>
                    <div className="detail-item"><label>Address</label><span>{emp.address || '---'}</span></div>
                 </div>
              </div>
           </section>

           {/* Section 2: Job & Salary */}
           <section className="intel-card glass-panel">
              <div className="card-header-premium"><Icon name="billing" /> <h3>Job & Salary</h3></div>
              <div className="card-body-premium p-24">
                 <div className="profile-detail-grid">
                    <div className="detail-item"><label>Employee ID</label><span className="font-numeric-bold">{emp.employee_id || '---'}</span></div>
                    <div className="detail-item"><label>Joining Date</label><span>{emp.joining_date ? new Date(emp.joining_date).toLocaleDateString() : '---'}</span></div>
                    <div className="detail-item"><label>Role Access</label><span>{emp.role}</span></div>
                    <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                       <label>Salary Structure</label>
                       <div className="salary-pills" style={{ marginTop: '8px' }}>
                          <span className="salary-pill">Basic: {formatCurrency(emp.basic_salary)}</span>
                          <span className="salary-pill success">+ Allowances: {formatCurrency(emp.allowances)}</span>
                          <span className="salary-pill danger">- Deductions: {formatCurrency(emp.deductions)}</span>
                       </div>
                       <div className="net-payout-box" style={{ marginTop: '16px' }}>
                          <label>Monthly Salary (Total)</label>
                          <div className="value">{formatCurrency((emp.basic_salary || 0) + (emp.allowances || 0) - (emp.deductions || 0))}</div>
                       </div>
                    </div>
                 </div>
              </div>
           </section>

           {/* Section 3: Files */}
           <section className="intel-card glass-panel">
              <div className="card-header-premium"><Icon name="download" /> <h3>Company Documents</h3></div>
              <div className="card-body-premium p-24">
                 <div className="docs-list">
                    {(emp.documents?.length ? emp.documents : [{name: 'Resume_Audit.pdf', doc_type: 'RESUME'}]).map((doc, i) => (
                      <div key={i} className="doc-item">
                         <Icon name="download" size={14} />
                         <div className="stack gap-0">
                            <span className="text-xs font-bold">{doc.name}</span>
                            <span className="text-xxs muted">{doc.doc_type}</span>
                         </div>
                         <button className="btn-link small" style={{ marginLeft: 'auto' }}>Download</button>
                      </div>
                    ))}
                 </div>
              </div>
           </section>

           {/* Section 4: Stats */}
           <section className="intel-card glass-panel">
              <div className="card-header-premium"><Icon name="activity" /> <h3>Team Stats</h3></div>
              <div className="card-body-premium p-24">
                 <div className="grid-2 gap-16">
                    <div className="metric-mini glass-panel" onClick={() => navigate('/hr/attendance')}>
                       <Icon name="calendar" />
                       <div className="stack gap-0">
                          <span className="val">85%</span>
                          <span className="lab">Attendance</span>
                       </div>
                    </div>
                    <div className="metric-mini glass-panel" onClick={() => navigate('/hr/leaves')}>
                       <Icon name="clock" />
                       <div className="stack gap-0">
                          <span className="val">12</span>
                          <span className="lab">Leaves Left</span>
                       </div>
                    </div>
                 </div>
              </div>
           </section>
        </div>
      </section>

      <style>{`
        .profile-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .detail-item { display: flex; flex-direction: column; gap: 4px; }
        .detail-item label { font-size: 0.65rem; font-weight: 800; color: var(--text-dimmed); text-transform: uppercase; letter-spacing: 0.05em; }
        .detail-item span { font-size: 0.95rem; font-weight: 700; color: var(--text); }
        
        .salary-pill { padding: 4px 12px; border-radius: 8px; font-size: 0.75rem; font-weight: 800; background: rgba(255,255,255,0.05); border: 1px solid var(--border-subtle); display: inline-block; margin-right: 8px; }
        .salary-pill.success { color: #10b981; }
        .salary-pill.danger { color: #ef4444; }

        .net-payout-box { padding: 16px; border-radius: 16px; background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, transparent 100%); border: 1px solid rgba(99, 102, 241, 0.2); }
        .net-payout-box .value { font-size: 1.5rem; font-weight: 900; color: var(--primary); }

        .docs-list { display: flex; flex-direction: column; gap: 12px; }
        .doc-item { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 12px; background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); }
        .text-xxs { font-size: 0.65rem; }

        .metric-mini { padding: 16px; border-radius: 16px; display: flex; align-items: center; gap: 12px; cursor: pointer; transition: transform 0.2s; }
        .metric-mini:hover { transform: translateY(-2px); border-color: var(--primary); }
        .metric-mini .val { font-size: 1.2rem; font-weight: 900; color: var(--text); }
        .metric-mini .lab { font-size: 0.6rem; font-weight: 800; color: var(--text-dimmed); text-transform: uppercase; }
      `}</style>
    </div>
  )
}
