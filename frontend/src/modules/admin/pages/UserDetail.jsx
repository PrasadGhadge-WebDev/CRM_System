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
      toast.success(res.message || 'Password reset successfully')
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
        title="Team Member Profile"
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

      <section className="user-hero-shell">
        <div className="hero-glow hero-glow-a" />
        <div className="hero-glow hero-glow-b" />

        <div className="hero-topline">
          <span className={`status-pill ${statusClass}`}>{user.status || 'active'}</span>
          <span className="hero-meta-chip">Member since {formatDate(user.created_at)}</span>
        </div>

        <div className="hero-main-row">
          <div className="hero-avatar-modern" aria-hidden="true">
            {user.profile_photo ? (
              <img src={user.profile_photo} alt={user.name} />
            ) : (
              (user.name || 'U').charAt(0).toUpperCase()
            )}
          </div>

          <div className="hero-copy">
            <h1 className="hero-name-modern">{user.name || 'Unnamed Member'}</h1>
            <div className="hero-subline">
              <div className="hero-subline-item">
                <Icon name="user" />
                <span>{user.role || 'Teammate'}</span>
              </div>
              <div className="hero-divider" />
              <div className="hero-subline-item">
                <Icon name="mail" />
                <span>{user.email || 'No email'}</span>
              </div>
              {user.phone ? (
                <>
                  <div className="hero-divider" />
                  <div className="hero-subline-item">
                    <Icon name="phone" />
                    <span>{user.phone}</span>
                  </div>
                </>
              ) : null}
            </div>
          </div>

          <div className="hero-side-stack">
            <div className="hero-stat-card">
              <span className="hero-stat-label">Created</span>
              <span className="hero-stat-value">{createdLabel}</span>
            </div>
            <div className="hero-stat-card">
              <span className="hero-stat-label">Last active</span>
              <span className="hero-stat-value">{lastSeenLabel}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="user-detail-grid">
        <div className="user-detail-main">
          <section className="detail-card">
            <div className="detail-card-header">
              <div className="detail-card-title">
                <Icon name="user" />
                <h3>Personal Details</h3>
              </div>
              <span className="detail-card-badge">Core record</span>
            </div>
            <div className="detail-card-body detail-grid-2">
              <div className="intel-field">
                <label>Full name</label>
                <div className="intel-value">{displayValue(user.name)}</div>
              </div>
              <div className="intel-field">
                <label>Email address</label>
                <div className="intel-value">{displayValue(user.email)}</div>
              </div>
              <div className="intel-field">
                <label>Phone number</label>
                <div className="intel-value">{displayValue(user.phone)}</div>
              </div>
              <div className="intel-field">
                <label>Account status</label>
                <div className="intel-value">{displayValue(user.status)}</div>
              </div>
              <div className="intel-field full-width">
                <label>Member since</label>
                <div className="intel-value highlight">{createdLabel}</div>
              </div>
            </div>
          </section>

          <section className="detail-card">
            <div className="detail-card-header">
              <div className="detail-card-title">
                <Icon name="settings" />
                <h3>Security &amp; Access</h3>
              </div>
              <span className="detail-card-badge subtle">Admin action</span>
            </div>
            <div className="detail-card-body">
              <div className="detail-grid-2" style={{ marginBottom: '28px' }}>
                <div className="intel-field">
                  <label>Access role</label>
                  <div className="intel-value highlight">{displayValue(user.role)}</div>
                </div>
                <div className="intel-field">
                  <label>Last login</label>
                  <div className="intel-value">{lastSeenLabel}</div>
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
                  <div className="detail-grid-2">
                    <div className="intel-field">
                      <label>New password</label>
                      <input
                        className="input-sleek-detail"
                        type="password"
                        required
                        placeholder="Min 6 chars, letters + numbers"
                        value={resetForm.newPassword}
                        onChange={(e) => setResetForm((p) => ({ ...p, newPassword: e.target.value }))}
                      />
                    </div>
                    <div className="intel-field">
                      <label>Confirm password</label>
                      <input
                        className="input-sleek-detail"
                        type="password"
                        required
                        placeholder="Repeat new password"
                        value={resetForm.confirmPassword}
                        onChange={(e) => setResetForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                      />
                    </div>
                  </div>
                  <button
                    className="btn-premium action-vibrant"
                    type="submit"
                    disabled={resettingPassword}
                    style={{ marginTop: '16px' }}
                  >
                    <Icon name="settings" />
                    <span>{resettingPassword ? 'Updating...' : 'Set New Password'}</span>
                  </button>
                </form>
              </div>
            </div>
          </section>
        </div>

        <aside className="user-detail-side">
          <section className="detail-card accent-card">
            <div className="detail-card-header">
              <div className="detail-card-title">
                <Icon name="user" />
                <h3>Account Snapshot</h3>
              </div>
              <span className="detail-card-badge success">Live data</span>
            </div>
            <div className="detail-card-body">
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
                <div className="snapshot-row">
                  <span className="snapshot-label">Phone</span>
                  <span className="snapshot-value">{user.phone || '—'}</span>
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

      <style>{`
        .user-profile-container { padding-bottom: 60px; }

        .control-bar-premium { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; justify-content: flex-end; }
        .btn-premium { display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 12px; font-weight: 700; font-size: 0.88rem; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border: 1px solid transparent; cursor: pointer; text-decoration: none; }
        .action-vibrant { background: var(--primary); color: white; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }
        .action-secondary { background: var(--bg-surface); color: var(--text-muted); border-color: var(--border); }
        .btn-premium:hover { transform: translateY(-2px); filter: brightness(1.05); }

        .user-hero-shell { position: relative; overflow: hidden; background: radial-gradient(circle at top left, rgba(99, 102, 241, 0.15), transparent 40%), linear-gradient(135deg, rgba(17, 24, 39, 0.98), rgba(15, 23, 42, 0.95)); border: 1px solid var(--border); border-radius: 32px; padding: 32px; box-shadow: var(--shadow-xl); backdrop-filter: blur(14px); }
        .hero-glow { position: absolute; border-radius: 999px; filter: blur(40px); pointer-events: none; opacity: 0.5; }
        .hero-glow-a { top: -80px; left: -40px; width: 300px; height: 300px; background: rgba(59, 130, 246, 0.2); }
        .hero-glow-b { right: -70px; bottom: -100px; width: 350px; height: 350px; background: rgba(99, 102, 241, 0.15); }

        .hero-topline { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; position: relative; z-index: 1; }
        .status-pill, .hero-meta-chip { display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; font-size: 0.75rem; font-weight: 800; letter-spacing: 0.04em; padding: 7px 14px; text-transform: uppercase; }
        .badge-success-vibrant { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
        .badge-danger-vibrant { background: rgba(239, 68, 68, 0.12); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.28); }
        .badge-muted-vibrant { background: rgba(148, 163, 184, 0.12); color: rgba(255, 255, 255, 0.7); border: 1px solid rgba(148, 163, 184, 0.25); }
        .hero-meta-chip { background: rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.85); border: 1px solid rgba(255, 255, 255, 0.15); }

        .hero-main-row { display: flex; align-items: center; gap: 32px; justify-content: space-between; position: relative; z-index: 1; }
        .hero-avatar-modern { width: 100px; height: 100px; flex: 0 0 auto; background: linear-gradient(135deg, #4f46e5, #9333ea); border-radius: 30px; border: 2px solid rgba(255, 255, 255, 0.1); display: flex; align-items: center; justify-content: center; font-size: 3.2rem; font-weight: 900; color: white; box-shadow: 0 16px 32px rgba(0, 0, 0, 0.4); overflow: hidden; }
        .hero-avatar-modern img { width: 100%; height: 100%; object-fit: cover; }
        .hero-copy { min-width: 0; }
        .hero-name-modern { margin: 0 0 12px; font-size: clamp(2rem, 4vw, 3.2rem); line-height: 1; letter-spacing: -0.04em; color: white; font-weight: 900; }
        .hero-subline { display: flex; align-items: center; flex-wrap: wrap; gap: 16px; }
        .hero-subline-item { display: inline-flex; align-items: center; gap: 8px; color: rgba(255, 255, 255, 0.75); font-size: 0.95rem; font-weight: 500; }
        .hero-subline-item svg { color: var(--primary); width: 18px; }
        .hero-divider { width: 1px; height: 14px; background: rgba(255, 255, 255, 0.1); }

        .hero-side-stack { display: grid; gap: 14px; min-width: 280px; grid-template-columns: 1fr; }
        .hero-stat-card { padding: 16px 18px; border-radius: 18px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.24); }
        .hero-stat-label { display: block; color: rgba(255, 255, 255, 0.72); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; margin-bottom: 6px; }
        .hero-stat-value { color: white; font-weight: 700; line-height: 1.3; word-break: break-word; text-shadow: 0 1px 0 rgba(0, 0, 0, 0.2); }

        .user-detail-grid { display: flex; gap: 24px; align-items: start; }
        .user-detail-main { display: grid; gap: 24px; flex: 1 1 auto; min-width: 0; }
        .user-detail-side { width: 360px; flex: 0 0 auto; position: sticky; top: 96px; }

        .detail-card { background: var(--bg-surface); border: 1px solid rgba(148, 163, 184, 0.38); border-radius: 24px; overflow: hidden; box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08); }
        .detail-card-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 22px 24px; border-bottom: 1px solid rgba(148, 163, 184, 0.3); background: rgba(255, 255, 255, 0.06); }
        .detail-card-title { display: flex; align-items: center; gap: 12px; }
        .detail-card-title h3 { margin: 0; font-size: 1.05rem; font-weight: 800; }
        .detail-card-title svg { color: var(--primary); }
        .detail-card-body { padding: 24px; }

        .detail-card-badge { display: inline-flex; align-items: center; justify-content: center; padding: 6px 12px; border-radius: 999px; font-size: 0.7rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.06em; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.14); color: rgba(255, 255, 255, 0.82); }
        .detail-card-badge.success { background: rgba(16, 185, 129, 0.1); color: #10b981; border-color: rgba(16, 185, 129, 0.2); }
        .detail-card-badge.subtle { background: rgba(59, 130, 246, 0.08); color: #93c5fd; border-color: rgba(59, 130, 246, 0.18); }

        .detail-grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 22px; }
        .intel-field label { display: block; font-size: 0.75rem; font-weight: 800; color: var(--text-dimmed); text-transform: uppercase; margin-bottom: 10px; letter-spacing: 0.06em; }
        .intel-value { font-size: 1.05rem; font-weight: 600; color: var(--text); word-break: break-word; }
        .intel-value.highlight { color: var(--primary); }
        .full-width { grid-column: 1 / -1; }

        .password-reset-panel { border-top: 1px solid rgba(148, 163, 184, 0.3); padding-top: 24px; }
        .password-reset-header { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 20px; }
        .password-reset-header svg { color: var(--primary); margin-top: 2px; flex-shrink: 0; }
        .password-reset-title { font-size: 0.95rem; font-weight: 800; color: var(--text); margin-bottom: 4px; }
        .password-reset-sub { font-size: 0.82rem; color: var(--text-muted); line-height: 1.4; }

        .input-sleek-detail { width: 100%; background: rgba(0, 0, 0, 0.15); border: 1px solid var(--border); border-radius: 12px; padding: 12px 16px; color: var(--text); font-size: 0.95rem; outline: none; transition: all 0.2s ease; }
        .input-sleek-detail::placeholder { color: var(--text-dimmed); }
        .input-sleek-detail:focus { border-color: var(--primary); background: rgba(0, 0, 0, 0.25); box-shadow: 0 0 0 3px var(--primary-soft); }

        .accent-card { background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, var(--bg-surface) 100%); }
        .milestone-panel { margin-bottom: 18px; padding: 20px; background: rgba(255, 255, 255, 0.08); border-radius: 18px; text-align: center; border: 1px solid rgba(255, 255, 255, 0.3); }
        .milestone-label { font-size: 0.8rem; font-weight: 700; color: var(--text-dimmed); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.08em; }
        .milestone-value { font-size: 1.35rem; font-weight: 900; color: var(--primary); line-height: 1.25; text-transform: capitalize; }

        .snapshot-list { display: grid; gap: 12px; margin-bottom: 18px; }
        .snapshot-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 16px; border-radius: 14px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.24); }
        .snapshot-label { font-size: 0.75rem; color: rgba(255, 255, 255, 0.68); text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; }
        .snapshot-value { color: rgba(255, 255, 255, 0.94); font-weight: 700; text-align: right; word-break: break-word; text-transform: capitalize; }

        .converted-link-premium { display: flex; align-items: center; gap: 16px; background: var(--bg-elevated); padding: 16px; border-radius: 16px; border: 1px solid rgba(148, 163, 184, 0.34); text-decoration: none; transition: all 0.2s ease; }
        .converted-link-premium:hover { border-color: var(--primary); transform: translateX(4px); }
        .link-icon { color: var(--primary); }
        .link-text { display: flex; flex-direction: column; gap: 2px; }
        .link-text strong { color: var(--text); font-size: 0.95rem; }
        .link-text span { color: var(--text-muted); font-size: 0.8rem; }

        @media (max-width: 1024px) {
          .user-detail-grid { flex-direction: column; }
          .user-detail-side { width: 100%; position: static; }
          .hero-main-row { flex-direction: column; align-items: flex-start; }
          .hero-side-stack { width: 100%; min-width: 0; grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }

        @media (max-width: 768px) {
          .user-hero-shell { padding: 20px; }
          .hero-side-stack { grid-template-columns: 1fr; }
          .hero-divider { display: none; }
          .detail-grid-2 { grid-template-columns: 1fr; }
          .full-width { grid-column: span 1; }
          .detail-card-header, .detail-card-body { padding-left: 18px; padding-right: 18px; }
        }
      `}</style>
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

