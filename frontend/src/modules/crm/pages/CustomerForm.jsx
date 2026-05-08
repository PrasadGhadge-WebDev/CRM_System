import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { toast } from 'react-toastify'
import { 
  FiUser, 
  FiMail, 
  FiPhone, 
  FiMapPin, 
  FiBriefcase, 
  FiShield, 
  FiActivity, 
  FiStar,
  FiBox
} from 'react-icons/fi'
import { customersApi } from '../../../services/customers.js'
import { statusesApi } from '../../../services/statuses.js'
import { useAuth } from '../../../context/AuthContext.jsx'
import { Icon } from '../../../layouts/icons.jsx'

import { 
  validateRequired, 
  validateEmail, 
  validatePhone 
} from '../../../utils/formValidation.js'

const INITIAL_CUSTOMER = {
  name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'India',
  industry: 'Technology',
  is_vip: false,
  status: 'Active',
  gst_number: '',
}

export default function CustomerForm({ mode, customerId, onSuccess, onCancel }) {
  const { id: paramsId } = useParams()
  const id = customerId || paramsId
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const isHR = user?.role === 'HR'
  const isAccountant = user?.role === 'Accountant'
  const isReadOnly = isHR || isAccountant
  const isEdit = mode === 'edit' || (!!id && id !== 'new')

  const [model, setModel] = useState(INITIAL_CUSTOMER)
  const [initialModel, setInitialModel] = useState(null)
  const [loading, setLoading] = useState(isEdit && !!id)
  const [saving, setSaving] = useState(false)
  const [availableStatuses, setAvailableStatuses] = useState([])
  const [fieldErrors, setFieldErrors] = useState({})
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (isReadOnly) {
       toast.error('Access denied: Read-only profile')
       navigate('/customers')
       return
    }
    
    async function loadData() {
      try {
        const [statRes] = await Promise.all([statusesApi.list('customer')])
        setAvailableStatuses(statRes || [])

        if (isEdit && id) {
          setLoading(true)
          const data = await customersApi.get(id)
          // Normalize status to match enum (Sentence Case)
          const status = data.status ? (data.status.charAt(0).toUpperCase() + data.status.slice(1).toLowerCase()) : 'Active'
          const normalized = { ...INITIAL_CUSTOMER, ...data, status }
          setModel(normalized)
          setInitialModel(normalized)
        } else if (!customerId) {
          const defaultStat = statRes?.find(s => s.is_default)
          if (defaultStat) setModel(prev => ({ ...prev, status: defaultStat.name }))
        }
      } catch (err) {
        toast.error('Initialization failed')
        if (!isEdit) navigate('/customers')
      } finally { setLoading(false) }
    }
    loadData()
  }, [id, isEdit, navigate, customerId, isReadOnly])

  const checkDuplicate = useCallback(async (field, value) => {
    if (!value || !value.trim()) return
    setChecking(true)
    try {
      const res = await customersApi.list({ q: value.trim(), limit: 5 })
      const conflict = (res?.items || []).find(c => {
        const matches = field === 'email' ? c.email?.toLowerCase() === value.trim().toLowerCase() : c.phone === value.trim()
        return matches && (isEdit ? c.id !== id : true)
      })
      if (conflict) setFieldErrors(prev => ({ ...prev, [field]: `Already assigned to "${conflict.name}"` }))
      else setFieldErrors(prev => { const next = { ...prev }; delete next[field]; return next })
    } catch { } finally { setChecking(false) }
  }, [id, isEdit])

  const validate = () => {
    const errors = {}
    
    const nameErr = validateRequired('Entity Name', model.name)
    if (nameErr) errors.name = nameErr

    const emailErr = validateEmail('Email', model.email) || validateRequired('Email', model.email)
    if (emailErr) errors.email = emailErr

    const phoneErr = validatePhone('Phone', model.phone, { required: true })
    if (phoneErr) errors.phone = phoneErr

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault()
    if (isReadOnly) return
    
    if (!validate()) {
      const firstError = Object.values(fieldErrors)[0] || 'Please fix validation errors'
      return toast.warn(firstError)
    }

    if (isEdit && initialModel) {
      const isChanged = Object.keys(INITIAL_CUSTOMER).some(key => model[key] !== initialModel[key])
      if (!isChanged) {
        return toast.info('No changes detected')
      }
    }

    setSaving(true)
    try {
      const payload = { ...model }
      if (payload.assigned_to && typeof payload.assigned_to === 'object') {
        payload.assigned_to = payload.assigned_to._id || payload.assigned_to.id
      }
      if (payload.converted_from_lead_id && typeof payload.converted_from_lead_id === 'object') {
        payload.converted_from_lead_id = payload.converted_from_lead_id._id || payload.converted_from_lead_id.id
      }
      delete payload.id
      delete payload._id
      delete payload.created_at
      delete payload.updated_at
      delete payload.__v

      const saved = isEdit ? await customersApi.update(id, payload) : await customersApi.create(payload)
      toast.success(`Customer ${isEdit ? 'updated' : 'created'}`)
      if (onSuccess) onSuccess(saved); else navigate(`/customers/${saved.id || id}`)
    } catch (err) { 
      toast.error(err.message || 'Failed to save') 
    } finally { 
      setSaving(false) 
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      const form = e.target.form
      if (!form || e.target.tagName === 'TEXTAREA' || e.target.type === 'submit') return
      e.preventDefault()
      const index = Array.from(form.elements).indexOf(e.target)
      const nextElement = form.elements[index + 1]
      if (nextElement && nextElement.tagName !== 'BUTTON') nextElement.focus()
      else handleSubmit(e)
    }
  }

  if (loading) return <div className="p-40 text-center text-dimmed">Loading...</div>

  const modalContent = (
    <div className="crm-modal-portal-overlay">
      <div className="crm-modal-sheet animate-sheet-in">
        <div className="crm-modal-sheet-header">
          <div className="sheet-title-area">
            <h2 className="sheet-title">{isEdit ? 'Update Customer' : 'Add New Customer'}</h2>
            <p className="sheet-subtitle">{isEdit ? `Editing record for ${model.name}` : 'Add a new customer to the system'}</p>
          </div>
        </div>

        <form className="crm-modal-sheet-body custom-scrollbar" onKeyDown={handleKeyDown} onSubmit={handleSubmit}>
          <div className="sheet-content-container">
            {/* Core Identity */}
            <section className="form-sheet-section">
              <div className="form-sheet-section-header">
                <FiUser />
                <span>Customer Info</span>
              </div>
              <div className="form-sheet-grid">
                <div className="sheet-field full-width">
                  <label>Customer Name</label>
                  <div className={`crm-input-group ${fieldErrors.name ? 'error' : ''}`}>
                    <div className="input-icon-box"><FiUser /></div>
                    <input 
                      autoFocus 
                      value={model.name} 
                      onChange={e => {
                        setModel({ ...model, name: e.target.value })
                        if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: '' }))
                      }} 
                      placeholder="e.g. Acme Corporation" 
                    />
                  </div>
                  {fieldErrors.name && <span className="error-text">{fieldErrors.name}</span>}
                </div>
                <div className="sheet-field">
                  <label>GST Number</label>
                  <div className="crm-input-group">
                    <div className="input-icon-box"><FiShield /></div>
                    <input 
                      value={model.gst_number} 
                      onChange={e => setModel({ ...model, gst_number: e.target.value.toUpperCase() })} 
                      placeholder="e.g. 22AAAAA0000A1Z5" 
                    />
                  </div>
                </div>
                <div className="sheet-field">
                  <label>Email Address</label>
                  <div className={`crm-input-group ${fieldErrors.email ? 'error' : ''}`}>
                    <div className="input-icon-box"><FiMail /></div>
                    <input 
                      type="email" 
                      value={model.email} 
                      onBlur={e => checkDuplicate('email', e.target.value)} 
                      onChange={e => {
                        setModel({ ...model, email: e.target.value })
                        if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: '' }))
                      }} 
                      placeholder="contact@entity.com" 
                    />
                  </div>
                  {fieldErrors.email && <span className="error-text">{fieldErrors.email}</span>}
                </div>
                <div className="sheet-field">
                  <label>Phone Number</label>
                  <div className={`crm-input-group ${fieldErrors.phone ? 'error' : ''}`}>
                    <div className="input-icon-box"><FiPhone /></div>
                    <input 
                      value={model.phone} 
                      onBlur={e => checkDuplicate('phone', e.target.value)} 
                      onChange={e => {
                        setModel({ ...model, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })
                        if (fieldErrors.phone) setFieldErrors(prev => ({ ...prev, phone: '' }))
                      }} 
                      placeholder="10-digit number" 
                    />
                  </div>
                  {fieldErrors.phone && <span className="error-text">{fieldErrors.phone}</span>}
                </div>
              </div>
            </section>

            {/* Firmographic Info */}
            <section className="form-sheet-section">
              <div className="form-sheet-section-header">
                <FiBriefcase />
                <span>Business Details</span>
              </div>
              <div className="form-sheet-grid">
                <div className="sheet-field">
                  <label>Industry</label>
                  <div className="crm-input-group">
                    <div className="input-icon-box"><FiBox /></div>
                    <input 
                      value={model.industry} 
                      onChange={e => setModel({ ...model, industry: e.target.value })} 
                      placeholder="e.g. Technology, Finance" 
                    />
                  </div>
                </div>
                <div className="sheet-field full-width">
                  <label>Office Address</label>
                  <div className="crm-input-group">
                    <div className="input-icon-box"><FiMapPin /></div>
                    <input 
                      value={model.address} 
                      onChange={e => setModel({ ...model, address: e.target.value })} 
                      placeholder="Complete street address" 
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Account Governance */}
            <section className="form-sheet-section no-border">
              <div className="form-sheet-section-header">
                <FiShield />
                <span>Account Status</span>
              </div>
              <div className="form-sheet-grid">
                <div className="sheet-field">
                  <label>Operational Status</label>
                  <div className="crm-input-group">
                    <div className="input-icon-box"><FiActivity /></div>
                    <select value={model.status} onChange={e => setModel({ ...model, status: e.target.value })}>
                      {availableStatuses.length > 0 
                        ? availableStatuses.map(s => <option key={s.id} value={s.name}>{s.name}</option>)
                        : ['Active', 'Inactive', 'Lost', 'Repeat'].map(name => <option key={name} value={name}>{name}</option>)
                      }
                    </select>
                  </div>
                </div>
                <div className="sheet-field">
                  <label>Strategic Tier</label>
                  <div className="crm-input-group" style={{ padding: '4px' }}>
                    <div className="input-icon-box"><FiStar /></div>
                    <div style={{ 
                      padding: '8px 12px', 
                      display: 'flex', 
                      alignItems: 'center',
                      flex: 1
                    }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.85rem', margin: 0, textTransform: 'none' }}>
                        <input type="checkbox" checked={model.is_vip} onChange={e => setModel({ ...model, is_vip: e.target.checked })} />
                        <span>Mark as VIP Customer</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </form>

        <div className="crm-modal-sheet-footer">
          <p className="footer-hint">Your data is safe and secure.</p>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button className="crm-btn-premium glass" onClick={() => (onCancel ? onCancel() : navigate(-1))}>Cancel</button>
            <button className="crm-btn-premium vibrant" disabled={saving || checking} onClick={handleSubmit}>
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Customer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.getElementById('modal-root-content') || document.body)
}
