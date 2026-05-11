import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../services/auth'
import { useToastFeedback } from '../utils/useToastFeedback.js'
import { Icon } from '../layouts/icons.jsx'
import { toast } from 'react-toastify'

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Failed to read image file'))
    reader.readAsDataURL(file)
  })
}

export default function Profile() {
  const { user, refreshUser, updateUser, logout } = useAuth()
  const [form, setForm] = useState({
    username: '',
    name: '',
    email: '',
    phone: '',
    gender: '',
    date_of_birth: '',
    city: '',
    state: '',
    pincode: '',
    address: '',
    permanent_address: '',
    profile_photo: '',
  })
  const [insight, setInsight] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [error, setError] = useState('')
  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })

  const loadProfileData = useCallback(async () => {
    try {
      const [u, i] = await Promise.all([
        refreshUser(),
        authApi.getProfileInsight()
      ])
      setForm({
        username: u?.username || '',
        name: u?.name || '',
        email: u?.email || '',
        phone: u?.phone || '',
        gender: u?.gender || '',
        date_of_birth: u?.date_of_birth ? new Date(u.date_of_birth).toISOString().split('T')[0] : '',
        city: u?.city || '',
        state: u?.state || '',
        pincode: u?.pincode || '',
        address: u?.address || '',
        permanent_address: u?.permanent_address || '',
        profile_photo: u?.profile_photo || '',
      })
      setInsight(i)
    } catch (err) {
      setError(err.message || 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }, [refreshUser])

  useEffect(() => {
    loadProfileData()
  }, [loadProfileData])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await authApi.updateProfile(form)
      updateUser(res.user)
      toast.success('Profile updated successfully')
    } catch (err) {
      toast.error(err.message || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault()
    if (passForm.newPassword !== passForm.confirmPassword) {
       return toast.error('Passwords do not match')
    }
    setSaving(true)
    try {
       await authApi.updatePassword(passForm)
       toast.success('Password changed successfully')
       setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
       toast.error(err.message || 'Password change failed')
    } finally {
       setSaving(false)
    }
  }

  async function handleProfileImageChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const imageData = await readFileAsDataUrl(file)
      setForm(prev => ({ ...prev, profile_photo: imageData }))
    } catch (err) {
      toast.error(err.message || 'Failed to load image')
    }
  }

  if (loading) return (
    <div className="flex-center h-screen stack gap-20">
       <div className="spinner-medium" />
       <span className="muted">Synchronizing account identity...</span>
    </div>
  )

  return (
    <div className="crm-fullscreen-shell" style={{ background: 'var(--bg)', minHeight: '100vh', padding: '32px' }}>
      
      {/* 1. TOP HERO SECTION */}
      <section className="profile-hero-v3 shadow-soft" style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)', padding: '32px', marginBottom: '32px', position: 'relative', overflow: 'hidden' }}>
        <div className="v3-hero-glow" />
        <div style={{ display: 'flex', gap: '32px', alignItems: 'center', position: 'relative', zIndex: 1 }}>
           <div className="profile-avatar-xl" style={{ width: '120px', height: '120px', borderRadius: '40px', background: 'var(--primary-soft)', border: '4px solid var(--bg-card)', boxShadow: 'var(--shadow-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {form.profile_photo ? (
                <img src={form.profile_photo} alt={form.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '48px', fontWeight: 900, color: 'var(--primary)' }}>{form.name?.charAt(0) || 'U'}</span>
              )}
           </div>
           
           <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                 <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0 }}>{form.name}</h1>
                 <span className="badge-premium-v3 success">ACTIVE</span>
              </div>
              <div className="muted" style={{ fontSize: '1rem', marginTop: '4px' }}>{user.designation} • {user.department}</div>
              <div style={{ display: 'flex', gap: '20px', marginTop: '16px' }}>
                 <div className="hero-stat-mini">
                    <span className="label">Employee ID</span>
                    <span className="value">#{user.employee_id || 'N/A'}</span>
                 </div>
                 <div className="hero-stat-mini">
                    <span className="label">Reporting to</span>
                    <span className="value">Admin</span>
                 </div>
                 <div className="hero-stat-mini">
                    <span className="label">Joining Date</span>
                    <span className="value">{user.joining_date ? new Date(user.joining_date).toLocaleDateString() : 'N/A'}</span>
                 </div>
              </div>
           </div>

           <div style={{ display: 'flex', gap: '12px' }}>
              <button className="crm-btn-premium secondary" onClick={logout}>
                 <Icon name="logout" />
                 <span>Logout</span>
              </button>
           </div>
        </div>
      </section>

      {/* 2. STATS ROW */}
      <div className="profile-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '32px' }}>
         <div className="p-stat-card shadow-soft">
            <div className="p-stat-icon blue"><Icon name="activity" /></div>
            <div className="p-stat-main">
               <div className="label">Performance Score</div>
               <div className="value">{insight?.performance?.score}%</div>
               <div className="sub">Sales Efficiency</div>
            </div>
         </div>
         <div className="p-stat-card shadow-soft">
            <div className="p-stat-icon green"><Icon name="user" /></div>
            <div className="p-stat-main">
               <div className="label">Customers Managed</div>
               <div className="value">{insight?.performance?.customersManaged}</div>
               <div className="sub">Active Portfolio</div>
            </div>
         </div>
         <div className="p-stat-card shadow-soft">
            <div className="p-stat-icon purple"><Icon name="calendar" /></div>
            <div className="p-stat-main">
               <div className="label">Attendance</div>
               <div className="value">{insight?.attendance?.present} Days</div>
               <div className="sub">Current Month</div>
            </div>
         </div>
         <div className="p-stat-card shadow-soft">
            <div className="p-stat-icon orange"><Icon name="clock" /></div>
            <div className="p-stat-main">
               <div className="label">Leaves Balance</div>
               <div className="value">{insight?.leaves?.remaining}</div>
               <div className="sub">Remaining Allowed</div>
            </div>
         </div>
      </div>

      {/* 3. TABS NAVIGATION */}
      <div className="profile-tabs-v3" style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', marginBottom: '32px' }}>
         {['Overview', 'Performance', 'Attendance', 'Security', 'Settings'].map(tab => (
            <button 
              key={tab} 
              className={`profile-tab-item ${activeTab === tab.toLowerCase() ? 'is-active' : ''}`}
              onClick={() => setActiveTab(tab.toLowerCase())}
            >
               {tab}
            </button>
         ))}
      </div>

      {/* 4. TAB CONTENT */}
      <div className="profile-content-wrap">
         
         {activeTab === 'overview' && (
           <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '32px' }}>
              <div className="stack gap-32">
                 {/* BASIC INFO */}
                 <div className="profile-section-card shadow-soft">
                    <div className="section-header">
                       <h3>🧍 Basic Profile Info</h3>
                       <button className="btn-text-only" onClick={() => setActiveTab('settings')}>Edit Details</button>
                    </div>
                    <div className="section-grid-2">
                       <div className="info-item">
                          <label>Full Name</label>
                          <div className="val">{form.name}</div>
                       </div>
                       <div className="info-item">
                          <label>Username</label>
                          <div className="val">@{form.username}</div>
                       </div>
                       <div className="info-item">
                          <label>Gender</label>
                          <div className="val">{form.gender || 'Not Specified'}</div>
                       </div>
                       <div className="info-item">
                          <label>Date of Birth</label>
                          <div className="val">{form.date_of_birth || 'Not Specified'}</div>
                       </div>
                       <div className="info-item">
                          <label>Phone Number</label>
                          <div className="val">{form.phone}</div>
                       </div>
                       <div className="info-item">
                          <label>Email Address</label>
                          <div className="val">{form.email}</div>
                       </div>
                    </div>
                 </div>

                 {/* ADDRESS INFO */}
                 <div className="profile-section-card shadow-soft">
                    <div className="section-header">
                       <h3>📍 Address Information</h3>
                    </div>
                    <div className="section-grid-2">
                       <div className="info-item full">
                          <label>Current Address</label>
                          <div className="val">{form.address || '—'}</div>
                       </div>
                       <div className="info-item">
                          <label>City / State</label>
                          <div className="val">{form.city} {form.state ? `, ${form.state}` : ''}</div>
                       </div>
                       <div className="info-item">
                          <label>Pincode</label>
                          <div className="val">{form.pincode}</div>
                       </div>
                    </div>
                 </div>
              </div>

              <aside className="stack gap-32">
                 <div className="profile-section-card shadow-soft accent">
                    <div className="section-header">
                       <h3>🏢 Work Information</h3>
                    </div>
                    <div className="stack gap-16">
                       <div className="work-chip">
                          <span className="label">Department</span>
                          <span className="val">{user.department}</span>
                       </div>
                       <div className="work-chip">
                          <span className="label">Designation</span>
                          <span className="val">{user.designation}</span>
                       </div>
                       <div className="work-chip">
                          <span className="label">Role</span>
                          <span className="val">{user.role}</span>
                       </div>
                       <div className="work-chip">
                          <span className="label">Location</span>
                          <span className="val">{user.work_location || 'Head Office'}</span>
                       </div>
                    </div>
                 </div>

                 <div className="profile-section-card shadow-soft">
                    <div className="section-header">
                       <h3>🛡️ Account Security</h3>
                    </div>
                    <div className="stack gap-12">
                       <div className="sec-item">
                          <Icon name="clock" size={14} />
                          <span>Last Login: {user.last_login ? new Date(user.last_login).toLocaleString() : 'Just now'}</span>
                       </div>
                       <div className="sec-item">
                          <Icon name="activity" size={14} />
                          <span>Status: <span className="text-success">Active</span></span>
                       </div>
                       <button className="crm-btn-premium secondary w-full mt-8" onClick={() => setActiveTab('security')}>
                          Update Password
                       </button>
                    </div>
                 </div>
              </aside>
           </div>
         )}

         {activeTab === 'performance' && (
           <div className="stack gap-32">
              <div className="profile-section-card shadow-soft">
                 <div className="section-header">
                    <h3>📊 Performance Metrics</h3>
                 </div>
                 <div className="performance-grid">
                    <div className="perf-box">
                       <div className="val">{insight?.performance?.leadsHandled}</div>
                       <div className="label">Total Leads</div>
                    </div>
                    <div className="perf-box">
                       <div className="val">{insight?.performance?.dealsClosed}</div>
                       <div className="label">Deals Closed</div>
                    </div>
                    <div className="perf-box">
                       <div className="val">{insight?.performance?.ticketsResolved}</div>
                       <div className="label">Issues Resolved</div>
                    </div>
                    <div className="perf-box accent">
                       <div className="val">{insight?.performance?.score}%</div>
                       <div className="label">Quality Score</div>
                    </div>
                 </div>
              </div>
              
              <div className="profile-section-card shadow-soft">
                 <div className="section-header">
                    <h3>📝 Activity Timeline</h3>
                 </div>
                 <div className="activity-list">
                    {insight?.activities?.length > 0 ? insight.activities.map((act, i) => (
                       <div key={i} className="activity-item">
                          <div className="dot" />
                          <div className="main">
                             <div className="text">{act.description || act.activity_type}</div>
                             <div className="time">{new Date(act.created_at).toLocaleString()}</div>
                          </div>
                       </div>
                    )) : <div className="muted p-20 center">No recent activity logged</div>}
                 </div>
              </div>
           </div>
         )}

         {activeTab === 'attendance' && (
           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
              <div className="profile-section-card shadow-soft">
                 <div className="section-header">
                    <h3>🕒 Attendance Summary</h3>
                 </div>
                 <div className="stack gap-20 mt-16">
                    <div className="att-row">
                       <span>Total Present Days</span>
                       <span className="val">{insight?.attendance?.present}</span>
                    </div>
                    <div className="att-row">
                       <span>Absent Days</span>
                       <span className="val text-danger">{insight?.attendance?.absent}</span>
                    </div>
                    <div className="att-row">
                       <span>Late Marks</span>
                       <span className="val text-warning">{insight?.attendance?.late}</span>
                    </div>
                    <div className="att-row">
                       <span>Overtime Hours</span>
                       <span className="val text-success">{insight?.attendance?.overtime}h</span>
                    </div>
                 </div>
              </div>

              <div className="profile-section-card shadow-soft">
                 <div className="section-header">
                    <h3>🏖️ Leave Summary</h3>
                 </div>
                 <div className="stack gap-20 mt-16">
                    <div className="att-row">
                       <span>Leaves Allowed (Annual)</span>
                       <span className="val">24</span>
                    </div>
                    <div className="att-row">
                       <span>Leaves Used</span>
                       <span className="val">{insight?.leaves?.used}</span>
                    </div>
                    <div className="att-row">
                       <span>Remaining Balance</span>
                       <span className="val text-primary">{insight?.leaves?.remaining}</span>
                    </div>
                    <div className="att-row">
                       <span>Pending Requests</span>
                       <span className="val text-warning">{insight?.leaves?.pending}</span>
                    </div>
                 </div>
              </div>
           </div>
         )}

         {activeTab === 'security' && (
           <div className="profile-section-card shadow-soft" style={{ maxWidth: '600px' }}>
              <div className="section-header">
                 <h3>🔐 Change Password</h3>
              </div>
              <form className="stack gap-24 mt-20" onSubmit={handlePasswordSubmit}>
                 <div className="crm-intel-field">
                    <label>Current Password</label>
                    <input className="crm-input" type="password" value={passForm.currentPassword} onChange={e => setPassForm(f => ({ ...f, currentPassword: e.target.value }))} required />
                 </div>
                 <div className="crm-intel-field">
                    <label>New Password</label>
                    <input className="crm-input" type="password" value={passForm.newPassword} onChange={e => setPassForm(f => ({ ...f, newPassword: e.target.value }))} required />
                 </div>
                 <div className="crm-intel-field">
                    <label>Confirm New Password</label>
                    <input className="crm-input" type="password" value={passForm.confirmPassword} onChange={e => setPassForm(f => ({ ...f, confirmPassword: e.target.value }))} required />
                 </div>
                 <button className="crm-btn-premium primary" type="submit" disabled={saving}>
                    Update Password
                 </button>
              </form>
           </div>
         )}

         {activeTab === 'settings' && (
            <div className="stack gap-32">
               <form className="profile-section-card shadow-soft" onSubmit={handleSubmit}>
                  <div className="section-header">
                     <h3>⚙️ Profile Settings</h3>
                     <button className="crm-btn-premium vibrant" type="submit" disabled={saving}>
                        {saving ? 'Saving...' : 'Save Changes'}
                     </button>
                  </div>
                  
                  <div className="section-grid-2 mt-20">
                     <div className="crm-intel-field">
                        <label>Display Name</label>
                        <input className="crm-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                     </div>
                     <div className="crm-intel-field">
                        <label>Phone Number</label>
                        <input className="crm-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                     </div>
                     <div className="crm-intel-field">
                        <label>Gender</label>
                        <select className="crm-input" value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                           <option value="">Select Gender</option>
                           <option value="Male">Male</option>
                           <option value="Female">Female</option>
                           <option value="Other">Other</option>
                        </select>
                     </div>
                     <div className="crm-intel-field">
                        <label>Date of Birth</label>
                        <input className="crm-input" type="date" value={form.date_of_birth} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} />
                     </div>
                     <div className="crm-intel-field full">
                        <label>Current Address</label>
                        <textarea className="crm-input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                     </div>
                     <div className="crm-intel-field">
                        <label>City</label>
                        <input className="crm-input" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                     </div>
                     <div className="crm-intel-field">
                        <label>State</label>
                        <input className="crm-input" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} />
                     </div>
                     <div className="crm-intel-field">
                        <label>Pincode</label>
                        <input className="crm-input" value={form.pincode} onChange={e => setForm(f => ({ ...f, pincode: e.target.value }))} />
                     </div>
                     <div className="crm-intel-field full">
                        <label>Profile Photo</label>
                        <input className="crm-input" type="file" accept="image/*" onChange={handleProfileImageChange} />
                     </div>
                  </div>
               </form>

               <div className="profile-section-card shadow-soft">
                  <div className="section-header">
                     <h3>🌍 Preferences</h3>
                  </div>
                  <div className="section-grid-2 mt-20">
                     <div className="crm-intel-field">
                        <label>Language Preference</label>
                        <select className="crm-input">
                           <option>English</option>
                           <option>Marathi</option>
                           <option>Hindi</option>
                        </select>
                     </div>
                     <div className="crm-intel-field">
                        <label>Notifications</label>
                        <div className="flex items-center gap-12 mt-8">
                           <input type="checkbox" defaultChecked />
                           <span>Email Notifications</span>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         )}

      </div>

      <style>{`
        .p-stat-card {
           background: var(--bg-card);
           border: 1px solid var(--border);
           border-radius: 16px;
           padding: 24px;
           display: flex;
           gap: 16px;
           align-items: center;
        }
        .p-stat-icon {
           width: 48px;
           height: 48px;
           border-radius: 12px;
           display: flex;
           align-items: center;
           justify-content: center;
           font-size: 20px;
        }
        .p-stat-icon.blue { background: var(--primary-soft); color: var(--primary); }
        .p-stat-icon.green { background: var(--success-soft); color: var(--success); }
        .p-stat-icon.purple { background: #f5f3ff; color: #8b5cf6; }
        .p-stat-icon.orange { background: #fff7ed; color: #f97316; }
        
        .p-stat-main .label { font-size: 0.75rem; color: var(--text-dimmed); text-transform: uppercase; letter-spacing: 0.05em; }
        .p-stat-main .value { font-size: 1.5rem; font-weight: 800; color: var(--text); margin: 2px 0; }
        .p-stat-main .sub { font-size: 0.7rem; color: var(--text-muted); }

        .profile-tab-item {
           padding: 12px 24px;
           font-size: 0.9rem;
           font-weight: 600;
           color: var(--text-dimmed);
           border: none;
           background: none;
           cursor: pointer;
           position: relative;
           transition: all 0.2s;
        }
        .profile-tab-item:hover { color: var(--text); }
        .profile-tab-item.is-active { color: var(--primary); }
        .profile-tab-item.is-active::after {
           content: '';
           position: absolute;
           bottom: -1px;
           left: 0;
           right: 0;
           height: 2px;
           background: var(--primary);
           box-shadow: 0 0 8px var(--primary);
        }

        .profile-section-card {
           background: var(--bg-card);
           border: 1px solid var(--border);
           border-radius: 16px;
           padding: 24px;
        }
        .profile-section-card.accent { border-left: 4px solid var(--primary); }
        .profile-section-card .section-header {
           display: flex;
           justify-content: space-between;
           align-items: center;
           margin-bottom: 24px;
        }
        .profile-section-card h3 { margin: 0; font-size: 1.1rem; font-weight: 700; }

        .section-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .info-item label { font-size: 0.75rem; color: var(--text-dimmed); text-transform: uppercase; margin-bottom: 4px; display: block; }
        .info-item .val { font-size: 1rem; font-weight: 600; color: var(--text); }
        .info-item.full { grid-column: span 2; }

        .work-chip {
           display: flex;
           justify-content: space-between;
           align-items: center;
           padding: 12px;
           background: var(--bg-surface);
           border-radius: 12px;
           border: 1px solid var(--border-subtle);
        }
        .work-chip .label { font-size: 0.75rem; color: var(--text-dimmed); }
        .work-chip .val { font-size: 0.85rem; font-weight: 700; color: var(--text); }

        .sec-item { display: flex; align-items: center; gap: 10px; color: var(--text-muted); font-size: 0.85rem; }

        .performance-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-top: 16px; }
        .perf-box {
           background: var(--bg-surface);
           padding: 20px;
           border-radius: 16px;
           text-align: center;
           border: 1px solid var(--border-subtle);
        }
        .perf-box.accent { background: var(--primary-soft); border-color: var(--primary-soft); }
        .perf-box .val { font-size: 1.5rem; font-weight: 800; color: var(--text); }
        .perf-box.accent .val { color: var(--primary); }
        .perf-box .label { font-size: 0.7rem; color: var(--text-dimmed); text-transform: uppercase; margin-top: 4px; }

        .activity-item { display: flex; gap: 16px; padding-bottom: 16px; position: relative; }
        .activity-item::before {
           content: '';
           position: absolute;
           left: 4px;
           top: 16px;
           bottom: 0;
           width: 2px;
           background: var(--border-subtle);
        }
        .activity-item:last-child::before { display: none; }
        .activity-item .dot { width: 10px; height: 10px; border-radius: 50%; background: var(--primary); margin-top: 6px; z-index: 1; }
        .activity-item .main .text { font-size: 0.9rem; font-weight: 600; color: var(--text); }
        .activity-item .main .time { font-size: 0.75rem; color: var(--text-dimmed); margin-top: 2px; }

        .att-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border-subtle); }
        .att-row:last-child { border-bottom: none; }
        .att-row .val { font-weight: 700; font-size: 1rem; }

        .v3-hero-glow {
           position: absolute;
           top: -100px;
           right: -100px;
           width: 300px;
           height: 300px;
           background: radial-gradient(circle, var(--primary-soft) 0%, transparent 70%);
           opacity: 0.5;
        }

        .hero-stat-mini { display: flex; flex-direction: column; gap: 2px; }
        .hero-stat-mini .label { font-size: 0.65rem; color: var(--text-dimmed); text-transform: uppercase; letter-spacing: 0.05em; }
        .hero-stat-mini .value { font-size: 0.85rem; font-weight: 700; color: var(--text); }
      `}</style>
    </div>
  )
}
