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
  const isHR = currentUser?.role === 'HR'
  const isEmployeeView = !isAdmin && !isManager && !isHR

  const [model, setModel] = useState(emptyUser)
  const [managers, setManagers] = useState([])
  const [availableRoles, setAvailableRoles] = useState([])
  const roleChoices = Array.isArray(availableRoles) ? availableRoles : []
  const visibleRoleChoices = isHR
    ? roleChoices.filter((role) => role.name === 'Employee')
    : roleChoices
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
    <div className="crm-form-page crmContent page-enter">
      <div className="lead-form-page">
        <header className="leadsHeader">
          <div>
            <h1 className="leadsTitle">{isEdit ? 'Refine Identity' : 'Onboard Personnel'}</h1>
            <p className="leadsDescription">Configure system access, organizational role, and personnel profile metadata.</p>
          </div>
          <div className="leadsHeaderActions">
            <button className="btn-premium secondary" onClick={handleCancel}>
              <Icon name="close" />
              <span>Cancel</span>
            </button>
            <button 
              className="btn-premium action-vibrant" 
              onClick={handleSubmit}
              disabled={saving}
            >
              <Icon name={saving ? 'spinner' : 'check'} className={saving ? 'spinner' : ''} />
              <span>{saving ? 'Processing...' : isEdit ? 'Update Identity' : 'Authorize User'}</span>
            </button>
          </div>
        </header>

        <div className="intelligence-form-grid">
          {/* Personnel Identity */}
          <div className="intel-form-card glass-panel">
            <div className="card-header-premium">
              <Icon name="user" />
              <h3>Personnel Identity</h3>
            </div>
            <div className="card-body-premium">
              <div className="grid-2">
                <div className="intel-field-group">
                  <label className="intel-label">First Name</label>
                  <input
                    className="input-premium"
                    value={model.firstName}
                    onChange={e => handleChange('firstName', e.target.value)}
                    placeholder="e.g. Alexander"
                  />
                  {fieldErrors.firstName && <span className="intel-error-msg">{fieldErrors.firstName}</span>}
                </div>
                <div className="intel-field-group">
                  <label className="intel-label">Last Name</label>
                  <input
                    className="input-premium"
                    value={model.lastName}
                    onChange={e => handleChange('lastName', e.target.value)}
                    placeholder="e.g. Hamilton"
                  />
                  {fieldErrors.lastName && <span className="intel-error-msg">{fieldErrors.lastName}</span>}
                </div>
                <div className="intel-field-group">
                  <label className="intel-label">Contact Intelligence (Phone)</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select className="input-premium" style={{ width: '90px' }} value={model.countryCode} onChange={e => handleChange('countryCode', e.target.value)}>
                      {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                    </select>
                    <input
                      className="input-premium"
                      style={{ flex: 1 }}
                      value={model.phone}
                      onChange={e => handleChange('phone', e.target.value)}
                      placeholder="98765 43210"
                    />
                  </div>
                  {fieldErrors.phone && <span className="intel-error-msg">{fieldErrors.phone}</span>}
                </div>
                <div className="intel-field-group">
                  <label className="intel-label">Date of Birth</label>
                  <input
                    className="input-premium"
                    type="date"
                    value={model.date_of_birth}
                    onChange={e => handleChange('date_of_birth', e.target.value)}
                  />
                  {fieldErrors.date_of_birth && <span className="intel-error-msg">{fieldErrors.date_of_birth}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* System Security */}
          {!isEmployeeView && (isAdmin || isHR) && (
            <div className="intel-form-card glass-panel">
              <div className="card-header-premium">
                <Icon name="shield" />
                <h3>System Security & Credentials</h3>
              </div>
              <div className="card-body-premium">
                <div className="grid-2">
                  <div className="intel-field-group span-2">
                    <label className="intel-label">Primary Access Email</label>
                    <input
                      className="input-premium"
                      type="email"
                      value={model.email}
                      onChange={e => handleChange('email', e.target.value)}
                      placeholder="personnel@institutional.com"
                    />
                    {fieldErrors.email && <span className="intel-error-msg">{fieldErrors.email}</span>}
                  </div>
                  <div className="intel-field-group">
                    <label className="intel-label">Secure Passphrase {isEdit && '(Leave blank to retain)'}</label>
                    <input
                      className="input-premium"
                      type="password"
                      value={model.password}
                      onChange={e => handleChange('password', e.target.value)}
                      placeholder="••••••••"
                    />
                    {fieldErrors.password && <span className="intel-error-msg">{fieldErrors.password}</span>}
                  </div>
                  <div className="intel-field-group">
                    <label className="intel-label">Verify Passphrase</label>
                    <input
                      className="input-premium"
                      type="password"
                      value={model.confirmPassword}
                      onChange={e => handleChange('confirmPassword', e.target.value)}
                      placeholder="••••••••"
                    />
                    {fieldErrors.confirmPassword && <span className="intel-error-msg">{fieldErrors.confirmPassword}</span>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Organizational Setup */}
          {!isEmployeeView && (
            <div className="intel-form-card glass-panel">
              <div className="card-header-premium">
                <Icon name="briefcase" />
                <h3>Organizational Setup</h3>
              </div>
              <div className="card-body-premium">
                <div className="grid-3">
                  <div className="intel-field-group">
                    <label className="intel-label">Institutional Role</label>
                    <select className="input-premium" value={model.role} onChange={e => handleChange('role', e.target.value)}>
                      {!isHR && <option value="Admin">Administrator</option>}
                      {!isHR && <option value="Manager">Manager</option>}
                      {!isHR && !visibleRoleChoices.some(r => r.name === 'HR') && <option value="HR">HR</option>}
                      {visibleRoleChoices.map(r => <option key={r.id || r._id} value={r.name}>{r.name}</option>)}
                      {!visibleRoleChoices.some(r => r.name === 'Employee') && <option value="Employee">Employee</option>}
                    </select>
                  </div>
                  <div className="intel-field-group">
                    <label className="intel-label">Deployment Status</label>
                    <select className="input-premium" value={model.status} onChange={e => handleChange('status', e.target.value)}>
                      <option value="active">Active Service</option>
                      <option value="inactive">Suspended</option>
                      <option value="pending">Awaiting Auth</option>
                    </select>
                  </div>
                  <div className="intel-field-group">
                    <label className="intel-label">Onboarding Date</label>
                    <input className="input-premium" type="date" value={model.joining_date} onChange={e => handleChange('joining_date', e.target.value)} />
                  </div>
                  <div className="intel-field-group">
                    <label className="intel-label">Department</label>
                    <select className="input-premium" value={model.department} onChange={e => handleChange('department', e.target.value)}>
                      <option value="">Select Dept</option>
                      {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  {!isHR && (
                    <div className="intel-field-group span-2">
                      <label className="intel-label">Reporting Authority</label>
                      <select className="input-premium" value={model.manager_id} onChange={e => handleChange('manager_id', e.target.value)}>
                        <option value="">Direct Accountability</option>
                        {managers.map(m => <option key={m.id} value={m.id}>{m.name || m.username} ({m.department || 'Lead'})</option>)}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Profile Visual */}
          <div className="intel-form-card glass-panel">
            <div className="card-header-premium">
              <Icon name="image" />
              <h3>Personnel Visual Identity</h3>
            </div>
            <div className="card-body-premium">
              <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                <div 
                  style={{ width: '120px', height: '120px', borderRadius: '32px', background: 'rgba(255,255,255,0.03)', border: '2px dashed rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {model.profile_photo ? (
                    <img src={model.profile_photo} alt="Identity" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Icon name="user" size={40} style={{ opacity: 0.2 }} />
                  )}
                </div>
                <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImageUpload} />
                <div className="stack gap-8">
                  <button type="button" className="btn-premium action-secondary" onClick={() => fileInputRef.current?.click()}>
                    <Icon name="image" />
                    <span>Upload New Visual</span>
                  </button>
                  <p className="text-xs muted">Supported: PNG, JPG (Max 2MB)</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="form-action-footer">
          <button className="btn-premium action-secondary" type="button" onClick={handleCancel}>Cancel</button>
          <button className="btn-premium action-vibrant" type="submit" disabled={saving} onClick={handleSubmit}>
            {saving ? 'Processing Identity...' : isEdit ? 'Commit Changes' : 'Finalize Onboarding'}
          </button>
        </div>
      </div>

      <style>{`
        .lead-form-page { padding-bottom: 80px; }
        .intelligence-form-grid { display: grid; grid-template-columns: 1fr; gap: 24px; margin-top: 32px; max-width: 1000px; }
        .intel-form-card { border-radius: 24px; overflow: hidden; }
        .card-header-premium { padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.02); }
        .card-header-premium h3 { margin: 0; font-size: 1rem; font-weight: 800; }
        .card-header-premium svg { color: var(--primary); }
        .card-body-premium { padding: 24px; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }
        .span-2 { grid-column: span 2; }
        
        .intel-field-group { display: flex; flex-direction: column; gap: 8px; }
        .intel-label { font-size: 0.65rem; font-weight: 900; color: var(--text-dimmed); text-transform: uppercase; letter-spacing: 0.08em; }
        .intel-error-msg { font-size: 0.7rem; color: #ef4444; margin-top: 4px; font-weight: 600; }

        .form-action-footer { display: flex; align-items: center; justify-content: flex-end; gap: 16px; margin-top: 32px; padding: 24px; background: rgba(15, 23, 42, 0.4); border-radius: 24px; border: 1px solid rgba(255,255,255,0.05); }
        
        @media (max-width: 768px) {
          .grid-2, .grid-3 { grid-template-columns: 1fr; }
          .span-2 { grid-column: span 1; }
        }
      `}</style>
    </div>
  )
}
