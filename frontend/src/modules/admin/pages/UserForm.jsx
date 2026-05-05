import { useEffect, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { 
  FiUser, 
  FiMail, 
  FiPhone, 
  FiLock, 
  FiCalendar, 
  FiShield, 
  FiActivity, 
  FiBriefcase,
  FiMapPin,
  FiCamera,
  FiImage,
  FiEdit
} from 'react-icons/fi'
import { usersApi } from '../../../services/users.js'
import PasswordInput from '../../../components/PasswordInput.jsx'
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
  name: '',
  email: '',
  username: '',
  countryCode: '+91',
  phone: '',
  password: '',
  confirmPassword: '',
  status: 'active',
  profile_photo: '',
  department: '',
  designation: '',
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
  const [initialModel, setInitialModel] = useState(null)
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
        let cCode = '+91'
        let pNum = data.phone || ''
        if (pNum.startsWith('+')) {
          const match = COUNTRY_CODES.find(c => pNum.startsWith(c.code))
          if (match) { cCode = match.code; pNum = pNum.slice(cCode.length).trim() }
        }
        const normalized = {
          ...emptyUser,
          ...data,
          password: '',
          confirmPassword: '',
          countryCode: cCode,
          phone: pNum,
          profile_photo: data.profile_photo || '',
          department: data.department || '',
          designation: data.designation || '',
          manager_id: data.manager_id || '',
          joining_date: toDateInput(data.joining_date) || today,
        }
        setModel(normalized)
        setInitialModel(normalized)
      })
      .catch(() => {
        toast.error('Failed to load user profile')
        if (onCancel) onCancel(); else navigate('/users')
      })
      .finally(() => setLoading(false))
  }, [id, isEdit, navigate, onCancel])

  function handleChange(field, value) {
    let normalized = value
    if (field === 'phone') {
      normalized = normalizeDigits(value)
    } else if (field === 'name') {
      normalized = normalizeName(value)
    }

    setModel(prev => ({ ...prev, [field]: normalized }))

    let err = ''
    if (field === 'phone') {
      if (normalized && normalized.length > 10) err = 'Max 10 digits allowed'
      else if (normalized && normalized.length < 10) err = 'Enter 10 digits'
    } else if (field === 'name') {
      if (normalized && !/^[A-Za-z\s'-]+$/.test(normalized)) err = 'Only letters allowed'
      else if (!normalized) err = 'Full name is required'
    } else if (field === 'email') {
      const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,})+$/
      if (normalized && !emailRegex.test(normalized)) err = 'Invalid email address'
      else if (!normalized) err = 'Email is required'
    } else if (field === 'username') {
      if (!normalized) err = 'Username is required'
    } else if (field === 'password') {
      if (normalized && normalized.length < 6) err = 'Min 6 characters'
      // Also check if it matches confirmPassword if already entered
      if (model.confirmPassword && normalized !== model.confirmPassword) {
        setFieldErrors(p => ({ ...p, confirmPassword: 'Passwords do not match' }))
      } else {
        setFieldErrors(p => ({ ...p, confirmPassword: '' }))
      }
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
      name: !model.name.trim() ? 'Full name is required' : '',
      email: !model.email.trim() ? 'Email is required' : '',
      username: !model.username.trim() ? 'Username is required' : '',
      phone: !model.phone ? 'Phone is required' : model.phone.length !== 10 ? 'Phone must be 10 digits' : '',
      password: !isEdit && !model.password ? 'Password is required' : (model.password && model.password.length < 6 ? 'Password must be at least 6 characters' : ''),
      confirmPassword: model.password && model.password !== model.confirmPassword ? 'Passwords do not match' : '',
    }

    const firstError = Object.values(errors).find(v => v)
    if (firstError) { setFieldErrors(errors); toast.warn(firstError); return }

    if (isEdit && initialModel) {
      const isChanged = Object.keys(emptyUser).some(key => {
        if (key === 'password' || key === 'confirmPassword') return false
        return model[key] !== initialModel[key]
      });
      if (!isChanged && !model.password) {
        return toast.info('No changes detected')
      }
    }

    setSaving(true)
    try {
      const payload = { ...model }
      payload.phone = model.phone ? `${model.countryCode}${model.phone}` : ''
      delete payload.confirmPassword
      delete payload.countryCode
      if (!payload.password) delete payload.password

      const saved = isEdit
        ? await usersApi.update(id, payload)
        : await usersApi.create(payload)

      toast.success(`User ${isEdit ? 'updated' : 'created'} successfully${!isEdit && model.status === 'active' ? ' and welcome email sent' : ''}`)
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
            <p className="sheet-subtitle">{isEdit ? `Editing profile for ${model.name}` : 'Onboard a new team member to your system'}</p>
          </div>
        </div>

        <form className="crm-modal-sheet-body custom-scrollbar" onKeyDown={handleKeyDown} onSubmit={handleSubmit}>
          <div className="sheet-content-container">
            
            {/* 🔹 Basic Info */}
            <section className="form-sheet-section">
              <div className="form-sheet-section-header">
                <FiUser />
                <span>Basic Info</span>
              </div>
              <div className="form-sheet-grid">
                <div className="sheet-field full-width">
                  <label>Full Name</label>
                  <div className={`crm-input-group ${fieldErrors.name ? 'error' : ''}`}>
                    <div className="input-icon-box"><FiUser /></div>
                    <input
                      autoFocus
                      value={model.name}
                      onChange={e => handleChange('name', e.target.value)}
                      placeholder="Enter full name"
                    />
                  </div>
                  {fieldErrors.name && <span className="error-text">{fieldErrors.name}</span>}
                </div>
                
                <div className="sheet-field">
                  <label>Email Address</label>
                  <div className={`crm-input-group ${fieldErrors.email ? 'error' : ''}`}>
                    <div className="input-icon-box"><FiMail /></div>
                    <input
                      type="email"
                      value={model.email}
                      onChange={e => handleChange('email', e.target.value)}
                      placeholder="user@company.com"
                    />
                  </div>
                  {fieldErrors.email && <span className="error-text">{fieldErrors.email}</span>}
                </div>

                <div className="sheet-field">
                  <label>Mobile Number</label>
                  <div className={`crm-input-group ${fieldErrors.phone ? 'error' : ''}`}>
                    <div className="input-icon-box"><FiPhone /></div>
                    <select 
                      style={{ width: '80px', flex: 'none', borderRight: '1px solid var(--border-subtle)' }} 
                      value={model.countryCode} 
                      onChange={e => handleChange('countryCode', e.target.value)}
                    >
                      {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                    </select>
                    <input
                      value={model.phone}
                      onChange={e => handleChange('phone', e.target.value)}
                      placeholder="9876543210"
                    />
                  </div>
                  {fieldErrors.phone && <span className="error-text">{fieldErrors.phone}</span>}
                </div>
              </div>
            </section>

            {/* 🔹 Login Details */}
            {!isEmployeeView && (isAdmin || isHR) && (
              <section className="form-sheet-section">
                <div className="form-sheet-section-header">
                  <FiLock />
                  <span>Login Details</span>
                </div>
                <div className="form-sheet-grid">
                  <div className="sheet-field full-width">
                    <label>Username</label>
                    <div className={`crm-input-group ${fieldErrors.username ? 'error' : ''}`}>
                      <div className="input-icon-box"><FiUser /></div>
                      <input
                        value={model.username}
                        onChange={e => handleChange('username', e.target.value)}
                        placeholder="Enter username"
                        autoComplete="off"
                      />
                    </div>
                    {fieldErrors.username && <span className="error-text">{fieldErrors.username}</span>}
                  </div>

                  <PasswordInput
                    label={`Password ${isEdit ? '(Leave blank to keep current)' : ''}`}
                    value={model.password}
                    onChange={e => handleChange('password', e.target.value)}
                    error={fieldErrors.password}
                    autoComplete="new-password"
                  />
                  <PasswordInput
                    label="Confirm Password"
                    value={model.confirmPassword}
                    onChange={e => handleChange('confirmPassword', e.target.value)}
                    error={fieldErrors.confirmPassword}
                    autoComplete="new-password"
                  />
                </div>
              </section>
            )}

            {/* 🔹 Role & Access */}
            {!isEmployeeView && (
              <section className="form-sheet-section">
                <div className="form-sheet-section-header">
                  <FiShield />
                  <span>Role & Access</span>
                </div>
                <div className="form-sheet-grid">
                  <div className="sheet-field">
                    <label>Role</label>
                    <div className="crm-input-group">
                      <div className="input-icon-box"><FiShield /></div>
                      <select value={model.role} onChange={e => handleChange('role', e.target.value)}>
                        {visibleRoleChoices.map(role => (
                          <option key={role.id || role._id || role.name} value={role.name}>{role.name}</option>
                        ))}
                        {visibleRoleChoices.length === 0 && (
                          ['Admin', 'Manager', 'Employee', 'HR', 'Accountant'].map(roleName => (
                            <option key={roleName} value={roleName}>{roleName}</option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>
                  <div className="sheet-field">
                    <label>Status</label>
                    <div className="crm-input-group">
                      <div className="input-icon-box"><FiActivity /></div>
                      <select value={model.status} onChange={e => handleChange('status', e.target.value)}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="pending">Pending</option>
                      </select>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* 🔹 Work Info */}
            {!isEmployeeView && (
              <section className="form-sheet-section">
                <div className="form-sheet-section-header">
                  <FiBriefcase />
                  <span>Work Info</span>
                </div>
                <div className="form-sheet-grid">
                  <div className="sheet-field">
                    <label>Department</label>
                    <div className="crm-input-group">
                      <div className="input-icon-box"><FiBriefcase /></div>
                      <select value={model.department} onChange={e => handleChange('department', e.target.value)}>
                        <option value="">Select Department</option>
                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="sheet-field">
                    <label>Designation</label>
                    <div className="crm-input-group">
                      <div className="input-icon-box"><FiBriefcase /></div>
                      <input
                        value={model.designation}
                        onChange={e => handleChange('designation', e.target.value)}
                        placeholder="e.g. Manager, Executive"
                      />
                    </div>
                  </div>
                  <div className="sheet-field">
                    <label>Joining Date</label>
                    <div className="crm-input-group">
                      <div className="input-icon-box"><FiCalendar /></div>
                      <input type="date" value={model.joining_date} onChange={e => handleChange('joining_date', e.target.value)} />
                    </div>
                  </div>
                  {!isHR && (
                    <div className="sheet-field">
                      <label>Manager</label>
                      <div className="crm-input-group">
                        <div className="input-icon-box"><FiUser /></div>
                        <select value={model.manager_id} onChange={e => handleChange('manager_id', e.target.value)}>
                          <option value="">None (Self)</option>
                          {managers.map(m => <option key={m.id} value={m.id}>{m.name || m.username}</option>)}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* 🔹 Extra (Profile Photo) */}
            <section className="form-sheet-section no-border">
              <div className="form-sheet-section-header">
                <FiImage />
                <span>Extra</span>
              </div>
              <div className="photo-section-layout">
                <div 
                  className="sheet-avatar-upload"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {model.profile_photo ? (
                    <img src={model.profile_photo} alt="User" />
                  ) : (
                    <FiUser size={40} />
                  )}
                  <div className="upload-overlay"><FiEdit size={20} /></div>
                </div>
                <div className="photo-controls">
                  <button type="button" className="crm-btn-premium glass" onClick={() => fileInputRef.current?.click()}>
                    <FiEdit size={16} />
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

  return createPortal(modalContent, document.getElementById('modal-root-content') || document.body)
}
