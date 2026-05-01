import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import PageHeader from '../../../components/PageHeader.jsx'
import { usersApi } from '../../../services/users.js'
import { useToastFeedback } from '../../../utils/useToastFeedback.js'
import { Icon } from '../../../layouts/icons.jsx'

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/

export default function UserDetail() {
  const { id } = useParams()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [resetForm, setResetForm] = useState({ newPassword: '', confirmPassword: '' })
  const [resettingPassword, setResettingPassword] = useState(false)
  useToastFeedback({ error })

  useEffect(() => {
    let canceled = false
    setLoading(true)
    setError('')

    usersApi
      .get(id)
      .then((data) => {
        if (!canceled) setUser(data)
      })
      .catch((e) => {
        if (!canceled) setError(e.message || 'Failed to load user')
      })
      .finally(() => {
        if (!canceled) setLoading(false)
      })

    return () => {
      canceled = true
    }
  }, [id])

  async function handleResetPassword(e) {
    e.preventDefault()
    setError('')

    if (!resetForm.newPassword || !resetForm.confirmPassword) {
      setError('Fill in both password fields')
      return
    }
    if (!PASSWORD_RULE.test(resetForm.newPassword)) {
      setError('New password must be at least 6 characters and include letters and numbers')
      return
    }
    if (resetForm.newPassword !== resetForm.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setResettingPassword(true)
    try {
      const res = await usersApi.resetPassword(id, { newPassword: resetForm.newPassword })
      setResetForm({ newPassword: '', confirmPassword: '' })
      toast.success(res?.message || 'Password reset successfully')
    } catch (e) {
      setError(e.message || 'Failed to reset password')
    } finally {
      setResettingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="loading-state-centered">
        <div className="spinner-medium" />
        <span>Loading team member profile...</span>
      </div>
    )
  }

  if (error && !user) return <div className="alert error glass-alert">{error}</div>
  if (!user) return <div className="muted center padding40">User not found or has been removed.</div>

  const createdLabel = formatDateTime(user.created_at, 'Not available')
  const lastSeenLabel = formatDateTime(user.login_time || user.last_login, 'Never logged in')

  return (
    <div className="user-profile-container" style={{ background: 'var(--bg)', minHeight: '100vh', padding: '32px' }}>
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Link to="/users" className="back-btn-modern">
          <Icon name="chevron-left" size={18} />
          <span>Back to List</span>
        </Link>
        <Link className="crm-btn-premium" to={`/users/${user.id}/edit`} style={{ background: 'var(--primary)', color: '#ffffff', padding: '8px 24px', borderRadius: '8px', boxShadow: 'var(--shadow-sm)' }}>
          <Icon name="edit" />
          <span>Edit Profile</span>
        </Link>
      </div>

      {/* Profile Header Card */}
      <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '32px', marginBottom: '24px', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--primary-soft)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 700, flexShrink: 0, boxShadow: 'inset 0 0 0 1px var(--primary-soft)', overflow: 'hidden' }}>
             {user.profile_photo ? (
               <img src={user.profile_photo} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
             ) : (
               (user.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase()
             )}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>{user.name}</h1>
              <span style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', padding: '2px 12px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 600, border: '1px solid var(--border)' }}>
                {user.role}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--success)', fontWeight: 600, marginLeft: '4px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }} />
                <span>Active</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', color: 'var(--text-dimmed)', fontSize: '0.9rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Icon name="mail" size={14} />
                <span>{user.email}</span>
              </div>
              {user.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Icon name="phone" size={14} />
                  <span>{user.phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ height: '1px', background: 'var(--border)', margin: '24px 0' }} />

        {/* Time Stats Row */}
        <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <Icon name="clock" size={16} style={{ color: 'var(--text-dimmed)' }} />
             <span style={{ fontSize: '0.9rem', color: 'var(--text-dimmed)' }}>Joined On:</span>
             <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>{createdLabel}</span>
           </div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <Icon name="clock" size={16} style={{ color: 'var(--text-dimmed)' }} />
             <span style={{ fontSize: '0.9rem', color: 'var(--text-dimmed)' }}>Last Online:</span>
             <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>{lastSeenLabel}</span>
           </div>
        </div>
      </section>

      {/* Main Grid */}
      <div className="crm-profile-grid-desktop" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        
        {/* User Details Table Card */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>User Details</h3>
          </div>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Full Name</label>
                <div style={{ color: 'var(--text)', fontWeight: 500 }}>{user.name}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Phone Number</label>
                <div style={{ color: 'var(--text)', fontWeight: 500 }}>{displayValue(user.phone)}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Email Address</label>
                <div style={{ color: 'var(--text)', fontWeight: 500 }}>{user.email}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Account Status</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)', fontWeight: 700 }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)' }} />
                  {user.status}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Account Snapshot Table Card (Redesigned) */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>Account Snapshot</h3>
          </div>
          <div style={{ padding: '0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--border)' }}>
              <div style={{ padding: '20px 24px', borderRight: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dimmed)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🧑💼</span> Operational Role
                </div>
                <div style={{ fontWeight: 600, color: 'var(--text)' }}>{user.role}</div>
              </div>
              <div style={{ padding: '20px 24px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dimmed)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🔌</span> Connectivity
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)', fontWeight: 700 }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)' }} />
                  Active
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              <div style={{ padding: '20px 24px', borderRight: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dimmed)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📅</span> Joined Cycle
                </div>
                <div style={{ fontWeight: 600, color: 'var(--text)' }}>{formatDate(user.created_at)}</div>
              </div>
              <div style={{ padding: '20px 24px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dimmed)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>⏱️</span> Last Interaction
                </div>
                <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.85rem' }}>{lastSeenLabel}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security Protocol Section (Upgraded) */}
      <section style={{ marginTop: '32px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Icon name="settings" size={18} style={{ color: 'var(--text-dimmed)' }} />
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>Security Protocol</h3>
        </div>
        
        <div style={{ padding: '24px' }}>
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.95rem', marginBottom: '4px' }}>Credential Synchronization</div>
          </div>

          <form onSubmit={handleResetPassword} style={{ maxWidth: '800px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
              <div className="sheet-field">
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', display: 'block', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.025em' }}>New Secret Key</label>
                <input 
                  className="crm-input" 
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '10px 14px', borderRadius: '8px', width: '100%', color: 'var(--text)' }} 
                  type="password" 
                  required 
                  placeholder="Min 6 characters" 
                  value={resetForm.newPassword} 
                  onChange={(e) => setResetForm((p) => ({ ...p, newPassword: e.target.value }))} 
                />
              </div>
              <div className="sheet-field">
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', display: 'block', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.025em' }}>Confirm Identity</label>
                <input 
                  className="crm-input" 
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '10px 14px', borderRadius: '8px', width: '100%', color: 'var(--text)' }} 
                  type="password" 
                  required 
                  placeholder="Repeat secret key" 
                  value={resetForm.confirmPassword} 
                  onChange={(e) => setResetForm((p) => ({ ...p, confirmPassword: e.target.value }))} 
                />
              </div>
            </div>
            <button 
              className="crm-btn-premium" 
              type="submit" 
              disabled={resettingPassword} 
              style={{ marginTop: '28px', background: 'var(--primary)', color: '#ffffff', padding: '10px 24px', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', border: 'none', cursor: 'pointer' }}
            >
              <span>{resettingPassword ? 'Updating...' : 'Update Credentials'}</span>
            </button>
          </form>
        </div>
      </section>

      <style>{`
        @media (max-width: 900px) {
          .crm-profile-grid-desktop {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}

function formatDate(value, fallback = '—') {
  if (!value) return fallback
  try {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return fallback
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return fallback }
}

function formatDateTime(value, fallback = '—') {
  if (!value) return fallback
  try {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return fallback
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  } catch { return fallback }
}

function displayValue(value, fallback = 'Not available') {
  const text = String(value ?? '').trim()
  return text || fallback
}

