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

  const statusClass =
    user.status === 'active'
      ? 'badge-success-vibrant'
      : user.status === 'inactive'
        ? 'badge-danger-vibrant'
        : 'badge-muted-vibrant'

  const createdLabel = formatDateTime(user.created_at, 'Not available')
  const lastSeenLabel = formatDateTime(user.login_time || user.last_login, 'Never logged in')

  return (
    <div className="stack gap-32 user-profile-container">
      <PageHeader
        title="User Profile"
        backTo="/users"
        actions={
          <div className="control-bar-premium">
            <Link className="btn-premium action-secondary" to={`/users/${user.id}/edit`}>
              <Icon name="edit" />
              <span>Edit Profile</span>
            </Link>
          </div>
        }
      />

      <section className="crm-hero-shell">
        <div className="crm-hero-glow crm-hero-glow-1" />
        <div className="crm-hero-glow crm-hero-glow-2" />

        <div className="crm-hero-topline">
          <span className={`status-pill ${statusClass}`}>{user.status || 'active'}</span>
          <span className="hero-meta-chip">Joined on {formatDate(user.created_at)}</span>
        </div>

        <div className="crm-hero-main-row">
          <div className="crm-hero-avatar" aria-hidden="true">
            {user.profile_photo ? (
              <img src={user.profile_photo} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
            ) : (
              <span style={{ fontSize: '40px', fontWeight: 900 }}>{(user.name || 'U').charAt(0).toUpperCase()}</span>
            )}
          </div>

          <div className="crm-hero-copy">
            <h1 className="crm-hero-name">{user.name || 'Unnamed Member'}</h1>
            <div className="crm-hero-subline">
              <div className="crm-hero-subline-item">
                <Icon name="user" />
                <span>{user.role || 'Teammate'}</span>
              </div>
              <div className="crm-hero-divider" />
              <div className="crm-hero-subline-item">
                <Icon name="mail" />
                <span>{user.email || 'No email'}</span>
              </div>
              {user.phone ? (
                <>
                  <div className="crm-hero-divider" />
                  <div className="crm-hero-subline-item">
                    <Icon name="phone" />
                    <span>{user.phone}</span>
                  </div>
                </>
              ) : null}
            </div>
          </div>

          <div className="crm-hero-side-stack">
            <div className="crm-hero-stat-card">
              <span className="crm-hero-stat-label">Joined On</span>
              <span className="crm-hero-stat-value">{createdLabel}</span>
            </div>
            <div className="crm-hero-stat-card">
              <span className="crm-hero-stat-label">Last Online</span>
              <span className="crm-hero-stat-value">{lastSeenLabel}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="crm-detail-grid">
        <div className="crm-detail-main">
          <section className="crm-detail-card">
            <div className="crm-detail-card-header">
              <div className="crm-detail-card-title">
                <Icon name="user" />
                <h3>User Details</h3>
              </div>
            </div>
            <div className="crm-detail-card-body">
              <div className="crm-intel-grid">
                <div className="crm-intel-field">
                  <label>Full Name</label>
                  <div className="crm-intel-value">{displayValue(user.name)}</div>
                </div>
                <div className="crm-intel-field">
                  <label>Email Address</label>
                  <div className="intel-value">{displayValue(user.email)}</div>
                </div>
                <div className="crm-intel-field">
                  <label>Phone Number</label>
                  <div className="crm-intel-value">{displayValue(user.phone)}</div>
                </div>
                <div className="crm-intel-field">
                  <label>Account Status</label>
                  <div className="crm-intel-value">{displayValue(user.status)}</div>
                </div>
                <div className="crm-intel-field full-width">
                  <label>Joined On</label>
                  <div className="crm-intel-value highlight">{createdLabel}</div>
                </div>
              </div>
            </div>
          </section>

          <section className="crm-detail-card">
            <div className="crm-detail-card-header">
              <div className="crm-detail-card-title">
                <Icon name="settings" />
                <h3>Security &amp; Access</h3>
              </div>
            </div>
            <div className="crm-detail-card-body">
              <div className="crm-intel-grid" style={{ marginBottom: '28px' }}>
                <div className="crm-intel-field">
                  <label>Access role</label>
                  <div className="crm-intel-value highlight">{displayValue(user.role)}</div>
                </div>
                <div className="crm-intel-field">
                  <label>Last login</label>
                  <div className="crm-intel-value">{lastSeenLabel}</div>
                </div>
              </div>

              <div className="password-reset-panel">
                <div className="password-reset-header">
                  <Icon name="settings" />
                  <div>
                    <div className="password-reset-title">Reset User Password</div>
                    <div className="password-reset-sub">Force a secure credential update for this account.</div>
                  </div>
                </div>
                <form className="password-reset-form" onSubmit={handleResetPassword}>
                  <div className="crm-intel-grid">
                    <div className="crm-intel-field">
                      <label>New password</label>
                      <input
                        className="crm-input"
                        type="password"
                        required
                        placeholder="Min 6 chars, letters + numbers"
                        value={resetForm.newPassword}
                        onChange={(e) => setResetForm((p) => ({ ...p, newPassword: e.target.value }))}
                      />
                    </div>
                    <div className="crm-intel-field">
                      <label>Confirm password</label>
                      <input
                        className="crm-input"
                        type="password"
                        required
                        placeholder="Repeat new password"
                        value={resetForm.confirmPassword}
                        onChange={(e) => setResetForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                      />
                    </div>
                  </div>
                  <button
                    className="crm-btn-premium vibrant"
                    type="submit"
                    disabled={resettingPassword}
                    style={{ marginTop: '24px', width: 'auto' }}
                  >
                    <Icon name="settings" />
                    <span>{resettingPassword ? 'Updating...' : 'Set New Password'}</span>
                  </button>
                </form>
              </div>
            </div>
          </section>
        </div>

        <aside className="crm-detail-side">
          <section className="crm-detail-card accent-card">
            <div className="crm-detail-card-header">
              <div className="crm-detail-card-title">
                <Icon name="user" />
                <h3>Account Snapshot</h3>
              </div>
            </div>
            <div className="crm-detail-card-body">
              <div className="milestone-panel">
                <div className="milestone-label">Current role</div>
                <div className="milestone-value">{user.role || 'Teammate'}</div>
              </div>

              <div className="snapshot-list">
                <div className="snapshot-row">
                  <span className="snapshot-label">Status</span>
                  <span className="snapshot-value">{user.status || 'active'}</span>
                </div>
                <div className="snapshot-row">
                  <span className="snapshot-label">Joined</span>
                  <span className="snapshot-value">{formatDate(user.created_at, '—')}</span>
                </div>
                <div className="snapshot-row">
                  <span className="snapshot-label">Last seen</span>
                  <span className="snapshot-value">{lastSeenLabel}</span>
                </div>
              </div>

              <Link to={`/users/${user.id}/edit`} className="converted-link-premium">
                <div className="link-icon">
                  <Icon name="edit" />
                </div>
                <div className="link-text">
                  <strong>Edit this profile</strong>
                  <span>Update name, role, or status</span>
                </div>
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

function formatDate(value, fallback = 'Not available') {
  if (!value) return fallback
  try {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return fallback
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return fallback
  }
}

function formatDateTime(value, fallback = 'Not available') {
  if (!value) return fallback
  try {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return fallback
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return fallback
  }
}

function displayValue(value, fallback = 'Not available') {
  const text = String(value ?? '').trim()
  return text || fallback
}

