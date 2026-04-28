import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../services/auth'
import { useToastFeedback } from '../utils/useToastFeedback.js'

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Failed to read image file'))
    reader.readAsDataURL(file)
  })
}

export default function Profile() {
  const { user, refreshUser, updateUser } = useAuth()
  const [form, setForm] = useState({ username: '', email: '', profile_photo: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  useToastFeedback({ error, success: message })

  useEffect(() => {
    let cancelled = false

    refreshUser()
      .then((nextUser) => {
        if (cancelled) return
        setForm({
          username: nextUser?.username || '',
          email: nextUser?.email || '',
          profile_photo: nextUser?.profile_photo || '',
        })
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load profile')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [refreshUser])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')

    try {
      const res = await authApi.updateProfile(form)
      if (res?.user) {
        updateUser(res.user)
        setForm({
          username: res.user.username || '',
          email: res.user.email || '',
          profile_photo: res.user.profile_photo || '',
        })
      }
      setMessage(res?.message || 'Profile updated successfully')
    } catch (err) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  async function handleProfileImageChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file')
      e.target.value = ''
      return
    }

    try {
      const imageData = await readFileAsDataUrl(file)
      setForm((prev) => ({ ...prev, profile_photo: imageData }))
      setError('')
    } catch (err) {
      setError(err.message || 'Failed to load image')
    } finally {
      e.target.value = ''
    }
  }

  if (loading) {
    return <div className="muted">Loading profile...</div>
  }

  return (
    <div className="crm-fullscreen-shell">
      <section className="crm-hero-shell">
        <div className="crm-hero-glow crm-hero-glow-1" />
        <div className="crm-hero-glow crm-hero-glow-2" />

        <div className="crm-hero-topline">
          <span className="status-pill badge-info-vibrant">Account Identity</span>
          <span className="hero-meta-chip">System Access Level: {user?.role || 'Admin'}</span>
        </div>

        <div className="crm-hero-main-row">
          <div className="crm-hero-avatar">
            {form.profile_photo ? (
              <img
                src={form.profile_photo}
                alt={user?.username || 'Profile'}
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
              />
            ) : (
              <span style={{ fontSize: '40px', fontWeight: 900 }}>{user?.username?.charAt(0)?.toUpperCase() || 'A'}</span>
            )}
          </div>

          <div className="crm-hero-copy">
            <h1 className="crm-hero-name">{user?.username || 'Admin'}</h1>
            <div className="crm-hero-subline">
              <div className="crm-hero-subline-item">
                <Icon name="mail" />
                <span>{user?.email || 'No email associated'}</span>
              </div>
              <div className="crm-hero-divider" />
              <div className="crm-hero-subline-item">
                <Icon name="user" />
                <span>Role: {user?.role || 'Administrator'}</span>
              </div>
            </div>
          </div>

          <div className="crm-hero-side-stack">
            <div className="crm-hero-stat-card vibrant-border">
              <span className="crm-hero-stat-label">Member Since</span>
              <span className="crm-hero-stat-value">April 2026</span>
            </div>
          </div>
        </div>
      </section>

      {error ? <div className="alert error">{error}</div> : null}
      {message ? <div className="alert">{message}</div> : null}

      <div className="crm-detail-grid">
        <div className="crm-detail-main">
          <form className="crm-detail-card" onSubmit={handleSubmit}>
            <div className="crm-detail-card-header">
              <div className="crm-detail-card-title">
                <Icon name="edit" />
                <h3>Personal Intelligence</h3>
              </div>
              <button className="crm-btn-premium vibrant" type="submit" disabled={saving}>
                <Icon name="save" />
                <span>{saving ? 'Saving...' : 'Save Profile'}</span>
              </button>
            </div>

            <div className="crm-intel-grid">
              <div className="crm-intel-field">
                <label>Display Name</label>
                <input
                  className="crm-input"
                  value={form.username}
                  onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                  placeholder="Enter username"
                />
              </div>

              <div className="crm-intel-field">
                <label>Email Address</label>
                <input
                  className="crm-input"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email"
                />
              </div>

              <div className="crm-intel-field full-width">
                <label>Update Profile Photo</label>
                <input className="crm-input" type="file" accept="image/*" onChange={handleProfileImageChange} />
              </div>
            </div>

            {form.profile_photo ? (
              <div className="stack margin-top-24">
                <img
                  src={form.profile_photo}
                  alt={form.username || 'Profile preview'}
                  style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '32px', border: '2px solid var(--primary)' }}
                />
                <div className="margin-top-12">
                  <button
                    className="crm-btn-premium glass"
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, profile_photo: '' }))}
                  >
                    <span>Remove Image</span>
                  </button>
                </div>
              </div>
            ) : null}
          </form>
        </div>

        <aside className="crm-detail-side">
          <div className="crm-detail-card accent-card">
            <div className="crm-detail-card-header">
              <div className="crm-detail-card-title">
                <Icon name="info" />
                <h3>Account Summary</h3>
              </div>
            </div>
            
            <div className="snapshot-list">
              <div className="snapshot-row">
                <span className="snapshot-label">System Role</span>
                <span className="snapshot-value">{user?.role || 'Admin'}</span>
              </div>
              <div className="snapshot-row">
                <span className="snapshot-label">Permissions</span>
                <span className="snapshot-value">Full Access</span>
              </div>
              <div className="snapshot-row">
                <span className="snapshot-label">Last Login</span>
                <span className="snapshot-value">Today</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
