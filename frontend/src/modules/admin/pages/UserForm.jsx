import { useEffect, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { usersApi } from '../../../services/users.js'
import { Icon } from '../../../layouts/icons.jsx'
import { useAuth } from '../../../context/AuthContext'
import { rolesApi } from '../../../services/roles.js'
import {
  normalizeDigits,
  normalizeName
} from '../../../utils/formValidation.js'

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
  const fileInputRef = useRef(null)

  const loadData = useCallback(async () => {
    try {
      const [mRes, rRes] = await Promise.all([
        usersApi.list({ role: 'Manager', limit: 'all' }),
        rolesApi.list()
      ])
      setManagers(mRes.items || [])
      setAvailableRoles(Array.isArray(rRes) ? rRes : [])
    } catch (err) {
      console.error('Failed to load setup data', err)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

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
          profile_photo: data.profile_photo || '',
          date_of_birth: toDateInput(data.date_of_birth),
          department: data.department || '',
          manager_id: data.manager_id || '',
          joining_date: toDateInput(data.joining_date) || today,
        })
      })
      .catch(() => {
        toast.error('Failed to load user profile')
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

    let err = ''
    if (field === 'phone') {
      if (normalized && normalized.length > 10) err = 'Max 10 digits allowed'
      else if (normalized && normalized.length < 10) err = 'Enter 10 digits'
    } else if (field === 'firstName' || field === 'lastName') {
      if (normalized && !/^[A-Za-z\s'-]+$/.test(normalized)) err = 'Only letters allowed'
    } else if (field === 'email') {
      const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,})+$/
      if (normalized && !emailRegex.test(normalized)) err = 'Invalid email address'
    } else if (field === 'password') {
      if (normalized && normalized.length < 6) err = 'Min 6 characters'
    } else if (field === 'confirmPassword') {
      if (normalized && normalized !== model.password) err = 'Passwords do not match'
    }

    setFieldErrors(p => ({ ...p, [field]: err }))
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.warn('Max photo size is 2MB'); return }
    const reader = new FileReader()
    reader.onloadend = () => handleChange('profile_photo', reader.result)
    reader.readAsDataURL(file)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      const form = e.target.form
      if (!form) return
      
      // If it's a textarea or a submit button, allow default Enter behavior
      if (e.target.tagName === 'TEXTAREA' || e.target.type === 'submit') return

      e.preventDefault()
      const index = Array.from(form.elements).indexOf(e.target)
      const nextElement = form.elements[index + 1]

      if (nextElement && nextElement.tagName !== 'BUTTON') {
        nextElement.focus()
      } else {
        handleSubmit(e)
      }
    }
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault()

    const errors = {
      firstName: !model.firstName.trim() ? 'First name is required' : '',
      lastName: !model.lastName.trim() ? 'Last name is required' : '',
      email: !model.email.trim() ? 'Email is required' : '',
      phone: !model.phone ? 'Phone is required' : model.phone.length !== 10 ? 'Phone must be 10 digits' : '',
      password: !isEdit && !model.password ? 'Password is required' : '',
      confirmPassword: (!isEdit || model.password) && model.password !== model.confirmPassword ? 'Passwords do not match' : '',
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

      toast.success(`User ${isEdit ? 'updated' : 'created'} successfully`)
      if (onSuccess) onSuccess(saved); else navigate(`/users/${saved.id || saved._id}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save user')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() { if (onCancel) onCancel(); else navigate('/users') }

  if (loading) return null

  const modalContent = (
    <div className="crm-modal-portal-overlay">
      <div className="crm-modal-sheet animate-sheet-in">
        <div className="crm-modal-sheet-header">
          <div className="sheet-title-area">
            <h2 className="sheet-title">{isEdit ? 'Update User' : 'Add New User'}</h2>
            <p className="sheet-subtitle">{isEdit ? `Editing profile for ${model.firstName}` : 'Onboard a new team member to your system'}</p>
          </div>
        </div>

        <form className="crm-modal-sheet-body custom-scrollbar" onKeyDown={handleKeyDown} onSubmit={handleSubmit}>
          <div className="sheet-content-container">
            {/* Personal Information */}
            <section className="form-sheet-section">
              <div className="form-sheet-section-header">
                <Icon name="user" />
                <span>Personal Information</span>
              </div>
              <div className="form-sheet-grid">
                <div className="sheet-field">
                  <label>First Name</label>
                  <input
                    className="crm-input"
                    autoFocus
                    value={model.firstName}
                    onChange={e => handleChange('firstName', e.target.value)}
                    placeholder="Enter first name"
                  />
                  {fieldErrors.firstName && <span className="error-text">{fieldErrors.firstName}</span>}
                </div>
                <div className="sheet-field">
                  <label>Last Name</label>
                  <input
                    className="crm-input"
                    value={model.lastName}
                    onChange={e => handleChange('lastName', e.target.value)}
                    placeholder="Enter last name"
                  />
                  {fieldErrors.lastName && <span className="error-text">{fieldErrors.lastName}</span>}
                </div>
                <div className="sheet-field">
                  <label>Phone Number</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <select 
                      className="crm-input" 
                      style={{ width: '75px', flexShrink: 0, paddingRight: '10px' }} 
                      value={model.countryCode} 
                      onChange={e => handleChange('countryCode', e.target.value)}
                    >
                      {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                    </select>
                    <input
                      className="crm-input"
                      style={{ flex: 1, minWidth: 0 }}
                      value={model.phone}
                      onChange={e => handleChange('phone', e.target.value)}
                      placeholder="9876543210"
                    />
                  </div>
                  {fieldErrors.phone && <span className="error-text">{fieldErrors.phone}</span>}
                </div>
                <div className="sheet-field">
                  <label>Date of Birth</label>
                  <input className="crm-input" type="date" value={model.date_of_birth} onChange={e => handleChange('date_of_birth', e.target.value)} />
                </div>
              </div>
            </section>

            {/* Login & Security */}
            {!isEmployeeView && (isAdmin || isHR) && (
              <section className="form-sheet-section">
                <div className="form-sheet-section-header">
                  <Icon name="shield" />
                  <span>Login & Security</span>
                </div>
                <div className="form-sheet-grid">
                  <div className="sheet-field full-width">
                    <label>Email Address</label>
                    <input
                      className="crm-input"
                      type="email"
                      autoComplete="off"
                      value={model.email}
                      onChange={e => handleChange('email', e.target.value)}
                      placeholder="user@company.com"
                    />
                    {fieldErrors.email && <span className="error-text">{fieldErrors.email}</span>}
                  </div>
                  <div className="sheet-field">
                    <label>Password {isEdit && '(Leave blank to keep current)'}</label>
                    <input
                      className="crm-input"
                      type="password"
                      autoComplete="new-password"
                      value={model.password}
                      onChange={e => handleChange('password', e.target.value)}
                      placeholder="••••••••"
                    />
                    {fieldErrors.password && <span className="error-text">{fieldErrors.password}</span>}
                  </div>
                  <div className="sheet-field">
                    <label>Confirm Password</label>
                    <input
                      className="crm-input"
                      type="password"
                      autoComplete="new-password"
                      value={model.confirmPassword}
                      onChange={e => handleChange('confirmPassword', e.target.value)}
                      placeholder="••••••••"
                    />
                    {fieldErrors.confirmPassword && <span className="error-text">{fieldErrors.confirmPassword}</span>}
                  </div>
                </div>
              </section>
            )}

            {/* Work Details */}
            {!isEmployeeView && (
              <section className="form-sheet-section">
                <div className="form-sheet-section-header">
                  <Icon name="briefcase" />
                  <span>Work Details</span>
                </div>
                <div className="form-sheet-grid">
                  <div className="sheet-field">
                    <label>Role</label>
                    <select className="crm-input" value={model.role} onChange={e => handleChange('role', e.target.value)}>
                      {['HR', 'Accountant', 'Manager', 'Employee'].map(roleName => (
                        <option key={roleName} value={roleName}>{roleName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sheet-field">
                    <label>Status</label>
                    <select className="crm-input" value={model.status} onChange={e => handleChange('status', e.target.value)}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                  <div className="sheet-field">
                    <label>Joining Date</label>
                    <input className="crm-input" type="date" value={model.joining_date} onChange={e => handleChange('joining_date', e.target.value)} />
                  </div>
                  <div className="sheet-field">
                    <label>Department</label>
                    <select className="crm-input" value={model.department} onChange={e => handleChange('department', e.target.value)}>
                      <option value="">Select Department</option>
                      {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  {!isHR && (
                    <div className="sheet-field full-width">
                      <label>Manager</label>
                      <select className="crm-input" value={model.manager_id} onChange={e => handleChange('manager_id', e.target.value)}>
                        <option value="">None (Self)</option>
                        {managers.map(m => <option key={m.id} value={m.id}>{m.name || m.username}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Profile Photo */}
            <section className="form-sheet-section no-border">
              <div className="form-sheet-section-header">
                <Icon name="image" />
                <span>Profile Photo</span>
              </div>
              <div className="photo-section-layout">
                <div 
                  className="sheet-avatar-upload"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {model.profile_photo ? (
                    <img src={model.profile_photo} alt="User" />
                  ) : (
                    <Icon name="user" size={40} />
                  )}
                  <div className="upload-overlay"><Icon name="edit" size={20} /></div>
                </div>
                <div className="photo-controls">
                  <button type="button" className="crm-btn-premium glass" onClick={() => fileInputRef.current?.click()}>
                    <Icon name="edit" size={16} />
                    <span>Change Profile Photo</span>
                  </button>
                  <p className="footer-hint" style={{ fontStyle: 'normal' }}>Recommended: JPG or PNG, max 2MB</p>
                </div>
                <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImageUpload} />
              </div>
            </section>
          </div>
        </form>

        <div className="crm-modal-sheet-footer">
          <p className="footer-hint">All fields are securely encrypted.</p>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button className="crm-btn-premium glass" onClick={handleCancel}>Cancel</button>
            <button className="crm-btn-premium vibrant" disabled={saving} onClick={handleSubmit}>
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
