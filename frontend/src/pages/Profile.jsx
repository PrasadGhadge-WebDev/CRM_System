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
      updateUser(res.user)
      setForm({
        username: res.user.username || '',
        email: res.user.email || '',
        profile_photo: res.user.profile_photo || '',
      })
      setMessage(res.message || 'Profile updated successfully')
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
    <div className="accountPage stack">
      <div className="accountHero">
        <div>
          <h1>Profile</h1>
          <p className="muted">Manage your account identity and contact details.</p>
        </div>

        <div className="accountBadge">
          {form.profile_photo ? (
            <img
              className="accountAvatar"
              src={form.profile_photo}
              alt={user?.username || 'Profile'}
              style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '50%' }}
            />
          ) : (
            <div className="avatar accountAvatar">
              {user?.username?.charAt(0)?.toUpperCase() || 'A'}
            </div>
          )}
          <div>
            <div className="accountBadgeTitle">{user?.username || 'Admin'}</div>
            <div className="muted">{user?.role || 'Admin'}</div>
          </div>
        </div>
      </div>

      {error ? <div className="alert error">{error}</div> : null}
      {message ? <div className="alert">{message}</div> : null}

      <div className="accountGrid">
        <form className="card stack" onSubmit={handleSubmit}>
          <div className="row">
            <h2>Edit Details</h2>
            <button className="btn primary" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>

          <div className="accountFormGrid">
            <label className="accountField">
              <span>Profile Image</span>
              <input className="input" type="file" accept="image/*" onChange={handleProfileImageChange} />
            </label>

            <label className="accountField">
              <span>Username</span>
              <input
                className="input"
                value={form.username}
                onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                placeholder="Enter username"
              />
            </label>

            <label className="accountField">
              <span>Email</span>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email"
              />
            </label>
          </div>

          {form.profile_photo ? (
            <div className="stack">
              <img
                src={form.profile_photo}
                alt={form.username || 'Profile preview'}
                style={{ width: '88px', height: '88px', objectFit: 'cover', borderRadius: '50%' }}
              />
              <div>
                <button
                  className="btn"
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, profile_photo: '' }))}
                >
                  Remove Image
                </button>
              </div>
            </div>
          ) : null}
        </form>

        <div className="card stack">
          <h2>Account Summary</h2>
          <div className="kv">
            <span className="k">Profile Image</span>
            <span className="v">{form.profile_photo ? 'Updated' : 'Not set'}</span>
          </div>
          <div className="kv">
            <span className="k">Username</span>
            <span className="v">{user?.username || '-'}</span>
          </div>
          <div className="kv">
            <span className="k">Email</span>
            <span className="v">{user?.email || '-'}</span>
          </div>
          <div className="kv">
            <span className="k">Role</span>
            <span className="v">{user?.role || 'Admin'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
