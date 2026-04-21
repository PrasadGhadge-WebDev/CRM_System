import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { usersApi } from '../../../services/users.js'
import { Icon } from '../../../layouts/icons.jsx'
import { useAuth } from '../../../context/AuthContext'
import { rolesApi } from '../../../services/roles.js'
import {
  normalizeDigits,
  normalizeName,
  validateEmail,
  validateName,
  validatePhone,
  validateRequired
} from '../../../utils/formValidation.js'
import '../../../styles/userForm.css'

const COUNTRY_CODES = [
  { code: '+1', label: 'US/CA (+1)' },
  { code: '+91', label: 'IN (+91)' },
  { code: '+44', label: 'UK (+44)' },
  { code: '+61', label: 'AU (+61)' },
]

const DEPARTMENTS = [
  'Sales', 'Support', 'Development', 'Finance',
  'HR', 'Marketing', 'Operations', 'Management',
]


function toDateInput(dateStr) {
  if (!dateStr) return ''
  try { return new Date(dateStr).toISOString().split('T')[0] } catch { return '' }
}

function calculatePasswordStrength(pass) {
  if (!pass) return { score: 0, label: 'None', color: 'transparent' }
  let score = 0
  if (pass.length > 5) score++
  if (pass.length > 8) score++
  if (/[A-Z]/.test(pass)) score++
  if (/[0-9]/.test(pass)) score++
  if (/[^A-Za-z0-9]/.test(pass)) score++
  if (score <= 2) return { score, label: 'Weak', color: '#ef4444' }
  if (score <= 4) return { score, label: 'Medium', color: '#f59e0b' }
  return { score, label: 'Strong', color: '#10b981' }
}

const today = new Date().toISOString().split('T')[0]

const emptyUser = {
  role: 'Employee',
  firstName: '',
  lastName: '',
  email: '',
  countryCode: '+91',
  phone: '',
  password: '',
  confirmPassword: '',
  status: 'active',
  profile_photo: '',
  date_of_birth: '',
  department: '',
  manager_id: '',
  joining_date: today,
}

export default function UserForm({ mode, userId, onSuccess, onCancel }) {
  const { id: paramsId } = useParams()
  const id = userId || paramsId
  const navigate = useNavigate()
  const isEdit = mode === 'edit' || (!!id && id !== 'new')

  const { user: currentUser } = useAuth()
  const isAdmin = currentUser?.role === 'Admin'
  const isManager = currentUser?.role === 'Manager'
  const isEmployeeView = !isAdmin && !isManager

  const [model, setModel] = useState(emptyUser)
  const [managers, setManagers] = useState([])
  const [availableRoles, setAvailableRoles] = useState([])
  const roleChoices = Array.isArray(availableRoles) ? availableRoles : []
  const [loading, setLoading] = useState(isEdit && !!id)
  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [tagInput, setTagInput] = useState('')
  const fileInputRef = useRef(null)

  // Fetch manager list for dropdown
  useEffect(() => {
    usersApi.list({ role: 'Manager', limit: 'all' })
      .then(res => setManagers(res.items || []))
      .catch(() => { })

    rolesApi.list()
      .then((data) => setAvailableRoles(Array.isArray(data) ? data : []))
      .catch(() => { })
  }, [])

  // Load existing user in Edit mode
  useEffect(() => {
    if (!isEdit || !id) return
    setLoading(true)
    usersApi.get(id)
      .then(data => {
        const [first, ...rest] = (data.name || '').split(' ')
        let cCode = '+91'
        let pNum = data.phone || ''
        if (pNum.startsWith('+')) {
          const match = COUNTRY_CODES.find(c => pNum.startsWith(c.code))
          if (match) { cCode = match.code; pNum = pNum.slice(cCode.length).trim() }
        }
        setModel({
          ...emptyUser,
          ...data,
          password: '',
          firstName: first || '',
          lastName: rest.join(' ') || '',
          countryCode: cCode,
          phone: pNum,
          confirmEmail: data.email || '',
          profile_photo: data.profile_photo || '',
          date_of_birth: toDateInput(data.date_of_birth),
          department: data.department || '',
          manager_id: data.manager_id || '',
          joining_date: toDateInput(data.joining_date) || today,
        })
      })
      .catch(() => {
        toast.error('Identity record lookup failed')
        if (onCancel) onCancel(); else navigate('/users')
      })
      .finally(() => setLoading(false))
  }, [id, isEdit, navigate, onCancel])

  function handleChange(field, value) {
    const normalized =
      field === 'phone'
        ? normalizeDigits(value)
        : (field === 'firstName' || field === 'lastName')
          ? normalizeName(value)
          : value

    setModel(prev => ({ ...prev, [field]: normalized }))

    // Live validation per field
    let err = ''
    if (field === 'phone') {
      if (normalized && normalized.length > 10) err = 'Phone cannot exceed 10 digits'
      else if (normalized && normalized.length < 10) err = 'Enter exactly 10 digits'
    } else if (field === 'firstName' || field === 'lastName') {
      if (normalized && !/^[A-Za-z\s'-]+$/.test(normalized)) err = 'Only letters allowed'
    } else if (field === 'email') {
      const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,})+$/
      if (normalized && !emailRegex.test(normalized)) err = 'Invalid email address'
    } else if (field === 'password') {
      // Backend pattern: at least 6 chars, letters and numbers
      if (normalized && normalized.length < 6) err = 'At least 6 characters'
      else if (normalized && !/(?=.*[A-Za-z])(?=.*\d)/.test(normalized)) err = 'Include both letters and numbers'
    } else if (field === 'confirmPassword') {
      if (normalized && normalized !== model.password) err = 'Passwords do not match'
    } else if (field === 'date_of_birth') {
      if (normalized && normalized > today) err = 'Birth date cannot be in future'
    }

    setFieldErrors(p => ({ ...p, [field]: err }))
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.warn('Max image size is 2 MB'); return }
    const reader = new FileReader()
    reader.onloadend = () => handleChange('profile_photo', reader.result)
    reader.readAsDataURL(file)
  }

  const handleAddTag = (e) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const t = tagInput.trim()
    if (t && !model.tags.includes(t)) handleChange('tags', [...model.tags, t])
    setTagInput('')
  }

  function formatMetaDate(d) {
    if (!d) return 'N/A'
    const date = new Date(d)
    if (isNaN(date.getTime())) return 'N/A'
    return date.toLocaleString()
  }

  async function handleSubmit(e) {
    e.preventDefault()

    const errors = {
      firstName:
        !model.firstName.trim() ? 'First Name is required'
          : !/^[A-Za-z\s'-]+$/.test(model.firstName) ? 'Only letters allowed'
            : '',
      lastName:
        !model.lastName.trim() ? 'Last Name is required'
          : !/^[A-Za-z\s'-]+$/.test(model.lastName) ? 'Only letters allowed'
            : '',
      email:
        !model.email.trim() ? 'Email is required'
          : !/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,})+$/.test(model.email) ? 'Invalid email address'
            : '',
      phone:
        !model.phone ? 'Phone is required' : model.phone.length !== 10 ? 'Phone must be exactly 10 digits' : '',
      password:
        !isEdit && !model.password ? 'Password is required'
          : model.password && model.password.length < 6 ? 'Password must be at least 6 characters'
            : '',
      confirmPassword:
        (!isEdit || model.password) && model.password !== model.confirmPassword ? 'Passwords do not match' : '',
      date_of_birth:
        model.date_of_birth && model.date_of_birth > today ? 'Date of Birth cannot be in the future' : '',
      joining_date:
        !isEmployeeView && !model.joining_date ? 'Join Date is required' : '',
    }

    const firstError = Object.values(errors).find(v => v)
    if (firstError) { setFieldErrors(errors); toast.warn(firstError); return }

    setSaving(true)
    try {
      const payload = { ...model }
      payload.name = `${model.firstName} ${model.lastName}`.trim()
      payload.phone = model.phone ? `${model.countryCode}${model.phone}` : ''
      delete payload.firstName
      delete payload.lastName
      delete payload.confirmPassword
      delete payload.countryCode
      if (!payload.password) delete payload.password

      const saved = isEdit
        ? await usersApi.update(id, payload)
        : await usersApi.create(payload)

      // Update model with server response (to get created_at, updated IDs, etc.)
      const [first, ...rest] = (saved.name || '').split(' ')
      let cCode = '+91'
      let pNum = saved.phone || ''
      if (pNum.startsWith('+')) {
        const match = COUNTRY_CODES.find(c => pNum.startsWith(c.code))
        if (match) { cCode = match.code; pNum = pNum.slice(cCode.length).trim() }
      }

      setModel({
        ...emptyUser,
        ...saved,
        password: '',
        firstName: first || '',
        lastName: rest.join(' ') || '',
        countryCode: cCode,
        phone: pNum,
        profile_photo: saved.profile_photo || '',
        date_of_birth: toDateInput(saved.date_of_birth),
        department: saved.department || '',
        manager_id: saved.manager_id || '',
        joining_date: toDateInput(saved.joining_date) || today,
      })

      toast.success(`User ${isEdit ? 'updated' : 'created'} successfully`)
      if (onSuccess) onSuccess(saved); else navigate(`/users/${saved.id || saved._id}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() { if (onCancel) onCancel(); else navigate('/users') }

  if (loading) return <div className="crm-loader-state">Loading user profile…</div>

  const passStrength = calculatePasswordStrength(model.password)

  function handleBack() {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate('/users')
  }

  return (
    <div className="crm-form-page crmContent" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
        <form className="premium-form-card" onSubmit={handleSubmit} noValidate>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '20px' }}>
            <button className="btn-modern-back" type="button" onClick={handleBack} style={{ background: 'rgba(255,255,255,0.03)' }}>
              <Icon name="arrowLeft" size={16} />
              <span>Back</span>
            </button>
            <h1 className="userFormTitle" style={{ margin: 0, fontSize: '1.5rem' }}>{isEdit ? 'Edit User' : 'Add New User'}</h1>
          </div>

          {/* ── PERSONAL INFORMATION ── */}
          <div className="stack gap-16">
            <div className="section-header-row">
              <div className="section-icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
                <Icon name="user" size={18} color="white" />
              </div>
              <h4 className="section-title">Personal Information</h4>
            </div>

            {/* First / Last name */}
            <div className="grid2">
              <div className="stack tiny-gap">
                <label className="text-small muted" style={{ fontWeight: 600 }}>First Name *</label>
                <input
                  className={`input ${fieldErrors.firstName ? 'error' : ''}`}
                  value={model.firstName}
                  onChange={e => handleChange('firstName', e.target.value)}
                  placeholder="John"
                  maxLength={50}
                />
                {fieldErrors.firstName && <span className="text-small text-danger">{fieldErrors.firstName}</span>}
              </div>
              <div className="stack tiny-gap">
                <label className="text-small muted" style={{ fontWeight: 600 }}>Last Name *</label>
                <input
                  className={`input ${fieldErrors.lastName ? 'error' : ''}`}
                  value={model.lastName}
                  onChange={e => handleChange('lastName', e.target.value)}
                  placeholder="Doe"
                  maxLength={50}
                />
                {fieldErrors.lastName && <span className="text-small text-danger">{fieldErrors.lastName}</span>}
              </div>
            </div>

            {/* Phone + DOB */}
            <div className="grid2">
              <div className="stack tiny-gap">
                <label className="text-small muted" style={{ fontWeight: 600 }}>Primary Phone *
                  <span className="muted" style={{ fontWeight: 400 }}> (10 digits)</span>
                </label>
                <div className="row tiny-gap">
                  <div className="crm-input-joined" style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', overflow: 'hidden' }}>
                    <select className="input" style={{ width: '85px', border: 'none', background: 'transparent', paddingRight: '5px', fontWeight: 600, borderRight: '1px solid var(--border)', borderRadius: 0 }} 
                      value={model.countryCode}
                      onChange={e => handleChange('countryCode', e.target.value)}>
                      {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                    </select>
                    <input
                      className={`input ${fieldErrors.phone ? 'error' : model.phone.length === 10 ? 'success' : ''}`}
                      style={{ flex: 1, border: 'none', background: 'transparent' }}
                      value={model.phone}
                      onChange={e => handleChange('phone', e.target.value)}
                      placeholder="88888 88888"
                      inputMode="numeric"
                      maxLength={10}
                    />
                  </div>
                </div>
                {fieldErrors.phone
                  ? <span className="text-small text-danger">{fieldErrors.phone}</span>
                  : model.phone.length === 10 && <span className="text-small" style={{ color: '#10b981' }}>✓ Valid phone number</span>
                }
              </div>

              <div className="stack tiny-gap">
                <label className="text-small muted" style={{ fontWeight: 600 }}>Date of Birth
                  <span className="muted" style={{ fontWeight: 400 }}> (optional)</span>
                </label>
                <input
                  className={`input ${fieldErrors.date_of_birth ? 'error' : ''}`}
                  type="date"
                  value={model.date_of_birth}
                  onChange={e => handleChange('date_of_birth', e.target.value)}
                  max={today}
                />
                {fieldErrors.date_of_birth && <span className="text-small text-danger">{fieldErrors.date_of_birth}</span>}
              </div>
            </div>


          </div>

          {!isEmployeeView && isAdmin && (
            <div className="stack gap-16">
              <div className="section-header-row">
                <div className="section-icon" style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}>
                  <Icon name="shield" size={18} color="white" />
                </div>
                <h4 className="section-title">Account Security</h4>
              </div>
              <div className="grid2">
                <div className="stack tiny-gap">
                  <label className="text-small muted" style={{ fontWeight: 600 }}>Login Email *</label>
                  <input
                    className={`input ${fieldErrors.email ? 'error' : model.email && !fieldErrors.email ? 'success' : ''}`}
                    type="email"
                    value={model.email}
                    onChange={e => handleChange('email', e.target.value)}
                    placeholder="user@example.com"
                    autoComplete="off"
                  />
                  {fieldErrors.email && <span className="text-small text-danger">{fieldErrors.email}</span>}
                </div>

              </div>

              <div className="grid2">
                <div className="stack tiny-gap">
                  <label className="text-small muted" style={{ fontWeight: 600 }}>
                    Password {isEdit ? <span style={{ fontWeight: 400, fontSize: '0.8rem' }}>(leave blank to keep)</span> : '*'}
                  </label>
                  <input
                    className={`input ${fieldErrors.password ? 'error' : model.password && !fieldErrors.password ? 'success' : ''}`}
                    type="password"
                    value={model.password}
                    onChange={e => handleChange('password', e.target.value)}
                    placeholder="Password (letters + numbers)"
                    autoComplete="new-password"
                  />
                  {fieldErrors.password && <span className="text-small text-danger">{fieldErrors.password}</span>}
                  {!fieldErrors.password && model.password && (
                    <span className="text-small text-success">Strong password format captured</span>
                  )}
                </div>
                <div className="stack tiny-gap">
                  <label className="text-small muted" style={{ fontWeight: 600 }}>Confirm Password *</label>
                  <input
                    className={`input ${fieldErrors.confirmPassword ? 'error' : model.confirmPassword && model.confirmPassword === model.password ? 'success' : ''}`}
                    type="password"
                    value={model.confirmPassword}
                    onChange={e => handleChange('confirmPassword', e.target.value)}
                    placeholder="Repeat password"
                    autoComplete="new-password"
                    onPaste={e => e.preventDefault()}
                  />
                  {fieldErrors.confirmPassword
                    ? <span className="text-small text-danger">{fieldErrors.confirmPassword}</span>
                    : model.confirmPassword && model.confirmPassword === model.password && <span className="text-small text-success">✓ Passwords match</span>
                  }
                </div>
              </div>
            </div>
          )}

          {/* ── EMPLOYMENT DETAILS (Admin / Manager) ── */}
          {!isEmployeeView && (
            <div className="stack gap-16">
              <div className="section-header-row">
                <div className="section-icon" style={{ background: 'linear-gradient(135deg, #10b981, #3b82f6)' }}>
                  <Icon name="briefcase" size={18} color="white" />
                </div>
                <h4 className="section-title">Employment Details</h4>
              </div>

              <div className="grid2">
                {/* Join Date */}
                <div className="stack tiny-gap">
                  <label className="text-small muted" style={{ fontWeight: 600 }}>Join Date *</label>
                  <input
                    className={`input ${fieldErrors.joining_date ? 'error' : ''}`}
                    type="date"
                    value={model.joining_date}
                    onChange={e => handleChange('joining_date', e.target.value)}
                  />
                  {fieldErrors.joining_date && <span className="text-small text-danger">{fieldErrors.joining_date}</span>}
                </div>

                {/* Department */}
                <div className="stack tiny-gap">
                  <label className="text-small muted" style={{ fontWeight: 600 }}>Department</label>
                  <select className="input" value={model.department}
                    onChange={e => handleChange('department', e.target.value)}>
                    <option value="">— Select Department —</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                {/* Reporting Manager */}
                <div className="stack tiny-gap">
                  <label className="text-small muted" style={{ fontWeight: 600 }}>Reporting Manager</label>
                  <select className="input" value={model.manager_id}
                    onChange={e => handleChange('manager_id', e.target.value)}>
                    <option value="">— None —</option>
                    {managers.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name || m.username} ({m.department || 'Manager'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ── ADMINISTRATIVE SETUP (Admin / Manager) ── */}
          {!isEmployeeView && (
            <div className="stack gap-16">
              <div className="section-header-row">
                <div className="section-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
                  <Icon name="settings" size={18} color="white" />
                </div>
                <h4 className="section-title">Administrative Setup</h4>
              </div>
              <div className="grid2">
                <div className="stack tiny-gap">
                  <label className="text-small muted" style={{ fontWeight: 600 }}>System Role</label>
                  <select className="input" value={model.role} onChange={e => handleChange('role', e.target.value)}>
                    <option value="Admin">Administrator</option>
                    <option value="Manager">Manager</option>
                    {roleChoices
                      .map((roleItem) => (typeof roleItem === 'string' ? { name: roleItem } : roleItem))
                      .filter((r) => r?.name && r.name !== 'Admin' && r.name !== 'Manager')
                      .map((r) => (
                        <option key={r.id ?? r._id ?? r.name} value={r.name}>
                          {r.name}
                        </option>
                      ))}
                    {!roleChoices
                      .map((roleItem) => (typeof roleItem === 'string' ? { name: roleItem } : roleItem))
                      .some((r) => r?.name === 'Employee') && <option value="Employee">Employee</option>}
                  </select>
                </div>
                <div className="stack tiny-gap">
                  <label className="text-small muted" style={{ fontWeight: 600 }}>Operational Status</label>
                  <select className="input" value={model.status} onChange={e => handleChange('status', e.target.value)}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="pending">Pending Auth</option>
                  </select>
                </div>
              </div>



              {/* Identity snapshot (edit mode) */}
              {isEdit && (
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px' }}>
                  <h4 className="text-small muted" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                    <Icon name="info" /> Identity Snapshot
                  </h4>
                  <div className="grid3" style={{ fontSize: '0.82rem', gap: '12px' }}>
                    <div>
                      <span className="muted" style={{ display: 'block', fontSize: '0.68rem', marginBottom: '2px' }}>Created</span>
                      <strong>{formatMetaDate(model.created_at)}</strong>
                    </div>
                    <div>
                      <span className="muted" style={{ display: 'block', fontSize: '0.68rem', marginBottom: '2px' }}>Official Join Date</span>
                      <strong>{formatMetaDate(model.joining_date || model.created_at)}</strong>
                    </div>
                    <div>
                      <span className="muted" style={{ display: 'block', fontSize: '0.68rem', marginBottom: '2px' }}>Last Login</span>
                      <strong>{formatMetaDate(model.last_login)}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── PROFILE PHOTO ── */}
          <div className="stack gap-16">
            <div className="section-header-row">
              <div className="section-icon" style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
                <Icon name="image" size={18} color="white" />
              </div>
              <h4 className="section-title">Profile Photo</h4>
            </div>
            <div className="row gap-24" style={{ alignItems: 'flex-start' }}>
              <div
                style={{ width: '96px', height: '96px', flexShrink: 0, borderRadius: '50%', background: 'var(--bg-elevated)', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', position: 'relative', boxShadow: 'var(--shadow-lg)' }}
                onClick={() => fileInputRef.current?.click()}
                title="Upload profile picture"
              >
                {model.profile_photo
                  ? <img src={model.profile_photo} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ opacity: 0.5 }}><Icon name="user" size={32} /></div>}
                <div style={{ position: 'absolute', bottom: 0, width: '100%', background: 'rgba(59, 130, 246, 0.85)', fontSize: '0.6rem', textAlign: 'center', color: 'white', padding: '4px 0', letterSpacing: '0.05em', fontWeight: 600 }}>CHANGE</div>
              </div>
              <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImageUpload} />
              <div className="stack tiny-gap" style={{ justifyContent: 'center', paddingTop: '8px' }}>
                <p className="extra-small muted" style={{ margin: 0 }}>Square Image, Max 2MB</p>
                {model.profile_photo && (
                  <button type="button" className="btn secondary" style={{ fontSize: '0.75rem', padding: '3px 10px' }}
                    onClick={() => handleChange('profile_photo', '')}>Remove photo</button>
                )}
              </div>
            </div>
          </div>

          {/* ── ACTIONS ── */}
          <div className="row gap-16" style={{ marginTop: '20px', justifyContent: 'flex-end', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <button className="btn secondary" type="button" onClick={handleCancel} style={{ padding: '12px 24px', borderRadius: '12px' }}>Cancel</button>
            <button 
              className="btn primary" 
              type="submit" 
              disabled={saving}
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                padding: '12px 32px',
                borderRadius: '12px',
                border: 'none',
                boxShadow: '0 8px 16px rgba(59, 130, 246, 0.4)',
                fontWeight: 600
              }}
            >
              {saving ? 'Saving…' : isEdit ? 'Update User Account' : 'Create New User Account'}
            </button>
          </div>

        </form>
    </div>
  )
}
