import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { toast } from 'react-toastify'
import { 
  FiUser, 
  FiMail, 
  FiPhone, 
  FiMapPin, 
  FiLink, 
  FiTag, 
  FiStar, 
  FiMessageSquare, 
  FiLayers,
  FiBriefcase,
  FiActivity
} from 'react-icons/fi'
import { leadsApi } from '../../../services/leads.js'
import { leadSourcesApi as sourcesApi } from '../../../services/leadSources.js'
import { statusesApi } from '../../../services/statuses.js'
import { usersApi } from '../../../services/users.js'
import { useAuth } from '../../../context/AuthContext.jsx'

import { 
  validateRequired, 
  validateEmail, 
  validatePhone,
  normalizeDigits,
  normalizeName
} from '../../../utils/formValidation.js'

const INITIAL_LEAD = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  source: 'Organic',
  status: 'New',
  assigned_to: '',
  follow_up_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  address: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'India',
  notes: '',
  interest_level: 'Medium',
}

export default function LeadForm({ mode, leadId, onSuccess, onCancel }) {
  const { id: paramsId } = useParams()
  const id = leadId || paramsId
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const isHR = user?.role === 'HR'
  const isAccountant = user?.role === 'Accountant'
  const isReadOnly = isHR || isAccountant
  const isEdit = mode === 'edit' || (!!id && id !== 'new')

  const [model, setModel] = useState(INITIAL_LEAD)
  const [initialModel, setInitialModel] = useState(null)
  const [loading, setLoading] = useState(isEdit && !!id)
  const [saving, setSaving] = useState(false)
  const [availableSources, setAvailableSources] = useState([])
  const [availableStatuses, setAvailableStatuses] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [fieldErrors, setFieldErrors] = useState({})
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (isReadOnly) {
       toast.error('Access denied: Read-only profile')
       navigate('/leads')
       return
    }
    
    async function loadData() {
      try {
        const [srcRes, statRes, userRes] = await Promise.all([
          sourcesApi.list(),
          statusesApi.list('lead'),
          usersApi.list({ limit: 'all' })
        ])
        setAvailableSources(srcRes || [])
        setAvailableStatuses(statRes || [])
        setAllUsers(userRes.items || [])

        if (isEdit && id) {
          setLoading(true)
          const data = await leadsApi.get(id)
          // Normalize status/source to match enum (Sentence Case)
          const status = data.status ? (data.status.charAt(0).toUpperCase() + data.status.slice(1).toLowerCase()) : 'New'
          const source = data.source ? (data.source.charAt(0).toUpperCase() + data.source.slice(1).toLowerCase()) : 'Organic'
          
          const normalized = {
            ...INITIAL_LEAD,
            ...data,
            status,
            source,
            assigned_to: data.assigned_to?._id || data.assigned_to?.id || data.assigned_to || ''
          }
          setModel(normalized)
          setInitialModel(normalized)
        } else if (!leadId) {
          const defaultSrc = srcRes?.find(s => s.is_default)
          const defaultStat = statRes?.find(s => s.is_default)
          if (defaultSrc) setModel(prev => ({ ...prev, source: defaultSrc.name }))
          if (defaultStat) setModel(prev => ({ ...prev, status: defaultStat.name }))
        }
      } catch (err) {
        toast.error('Initialization failed')
        if (!isEdit) navigate('/leads')
      } finally { setLoading(false) }
    }
    loadData()
  }, [id, isEdit, navigate, leadId, isReadOnly])

  const checkDuplicate = useCallback(async (field, value) => {
    if (!value || !value.trim()) return
    setChecking(true)
    try {
      const res = await leadsApi.list({ q: value.trim(), limit: 5 })
      const conflict = (res?.items || []).find(l => {
        const matches = field === 'email' ? l.email?.toLowerCase() === value.trim().toLowerCase() : l.phone === value.trim()
        return matches && (isEdit ? l.id !== id : true)
      })
      if (conflict) setFieldErrors(prev => ({ ...prev, [field]: `Already exists: "${conflict.first_name} ${conflict.last_name}"` }))
      else setFieldErrors(prev => { const next = { ...prev }; delete next[field]; return next })
    } catch { } finally { setChecking(false) }
  }, [id, isEdit])

  const validate = () => {
    const errors = {}
    
    const fNameErr = validateRequired('First Name', model.first_name)
    if (fNameErr) errors.first_name = fNameErr

    const emailErr = validateEmail('Email', model.email) || validateRequired('Email', model.email)
    if (emailErr) errors.email = emailErr

    const phoneErr = validatePhone('Phone', model.phone, { required: true })
    if (phoneErr) errors.phone = phoneErr

    if (!model.follow_up_date) {
      errors.follow_up_date = 'Follow-up date is required'
    } else if (new Date(model.follow_up_date) < new Date().setHours(0, 0, 0, 0)) {
      errors.follow_up_date = 'Follow-up date cannot be in the past'
    }

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
      const isChanged = Object.keys(INITIAL_LEAD).some(key => model[key] !== initialModel[key])
      if (!isChanged) {
        return toast.info('No changes detected')
      }
    }

    setSaving(true)
    try {
      const payload = { ...model }
      delete payload.id
      delete payload._id
      delete payload.created_at
      delete payload.updated_at
      delete payload.__v

      const saved = isEdit ? await leadsApi.update(id, payload) : await leadsApi.create(payload)
      toast.success(`Lead ${isEdit ? 'updated' : 'created'}`)
      if (onSuccess) onSuccess(saved); else navigate(`/leads/${saved.id || id}`)
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

  if (loading) return <div className="p-40 text-center text-dimmed">Accessing lead vault...</div>

  const modalContent = (
    <div className="crm-modal-portal-overlay">
      <div className="crm-modal-sheet animate-sheet-in">
        <div className="crm-modal-sheet-header">
          <div className="sheet-title-area">
            <h2 className="sheet-title">{isEdit ? 'Update Lead' : 'Add New Lead'}</h2>
            <p className="sheet-subtitle">{isEdit ? `Editing record for ${model.first_name} ${model.last_name}` : 'Initialize a new prospect in the CRM'}</p>
          </div>
        </div>

        <form className="crm-modal-sheet-body custom-scrollbar" onKeyDown={handleKeyDown} onSubmit={handleSubmit}>
          <div className="sheet-content-container">
            {/* Core Identity */}
            <section className="form-sheet-section">
              <div className="form-sheet-section-header">
                <FiUser />
                <span>Prospect Identity</span>
              </div>
              <div className="form-sheet-grid">
                <div className="sheet-field">
                  <label>First Name</label>
                  <div className={`crm-input-group ${fieldErrors.first_name ? 'error' : ''}`}>
                    <div className="input-icon-box"><FiUser /></div>
                    <input 
                      autoFocus 
                      value={model.first_name} 
                      onChange={e => {
                        setModel({ ...model, first_name: normalizeName(e.target.value) })
                        if (fieldErrors.first_name) setFieldErrors(prev => ({ ...prev, first_name: '' }))
                      }} 
                      placeholder="e.g. John" 
                    />
                  </div>
                  {fieldErrors.first_name && <span className="error-text">{fieldErrors.first_name}</span>}
                </div>
                <div className="sheet-field">
                  <label>Last Name</label>
                  <div className="crm-input-group">
                    <div className="input-icon-box"><FiUser /></div>
                    <input 
                      value={model.last_name} 
                      onChange={e => setModel({ ...model, last_name: normalizeName(e.target.value) })} 
                      placeholder="e.g. Doe" 
                    />
                  </div>
                </div>
                <div className="sheet-field">
                  <label>Primary Email</label>
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
                      placeholder="john.doe@example.com" 
                    />
                  </div>
                  {fieldErrors.email && <span className="error-text">{fieldErrors.email}</span>}
                </div>
                <div className="sheet-field">
                  <label>Secure Phone</label>
                  <div className={`crm-input-group ${fieldErrors.phone ? 'error' : ''}`}>
                    <div className="input-icon-box"><FiPhone /></div>
                    <input 
                      value={model.phone} 
                      onBlur={e => checkDuplicate('phone', e.target.value)} 
                      onChange={e => {
                        setModel({ ...model, phone: normalizeDigits(e.target.value).slice(0, 10) })
                        if (fieldErrors.phone) setFieldErrors(prev => ({ ...prev, phone: '' }))
                      }} 
                      placeholder="10-digit number" 
                    />
                  </div>
                  {fieldErrors.phone && <span className="error-text">{fieldErrors.phone}</span>}
                </div>
              </div>
            </section>

            {/* Classification */}
            <section className="form-sheet-section">
              <div className="form-sheet-section-header">
                <FiLayers />
                <span>Classification & Source</span>
              </div>
              <div className="form-sheet-grid">
                <div className="sheet-field">
                  <label>Acquisition Source</label>
                  <div className="crm-input-group">
                    <div className="input-icon-box"><FiLink /></div>
                    <select value={model.source} onChange={e => setModel({ ...model, source: e.target.value })}>
                      {availableSources.length > 0 
                        ? availableSources.map(s => <option key={s.id} value={s.name}>{s.name}</option>)
                        : ['Organic', 'Referral', 'Social', 'Ads'].map(name => <option key={name} value={name}>{name}</option>)
                      }
                    </select>
                  </div>
                </div>
                <div className="sheet-field">
                  <label>Interest Level</label>
                  <div className="crm-input-group">
                    <div className="input-icon-box"><FiStar /></div>
                    <select value={model.interest_level} onChange={e => setModel({ ...model, interest_level: e.target.value })}>
                      <option value="High">High (Hot)</option>
                      <option value="Medium">Medium (Warm)</option>
                      <option value="Low">Low (Cold)</option>
                    </select>
                  </div>
                </div>
              </div>
            </section>

            {/* Geography */}
            <section className="form-sheet-section">
              <div className="form-sheet-section-header">
                <FiMapPin />
                <span>Geographic Intelligence</span>
              </div>
              <div className="form-sheet-grid">
                <div className="sheet-field full-width">
                  <label>Street Address</label>
                  <div className="crm-input-group">
                    <div className="input-icon-box"><FiMapPin /></div>
                    <input 
                      value={model.address} 
                      onChange={e => setModel({ ...model, address: e.target.value })} 
                      placeholder="Suite, Building, Street..." 
                    />
                  </div>
                </div>
                <div className="sheet-field">
                  <label>City / Region</label>
                  <div className="crm-input-group">
                    <div className="input-icon-box"><FiMapPin /></div>
                    <input value={model.city} onChange={e => setModel({ ...model, city: e.target.value })} placeholder="e.g. Mumbai" />
                  </div>
                </div>
                <div className="sheet-field">
                  <label>State / Province</label>
                  <div className="crm-input-group">
                    <div className="input-icon-box"><FiMapPin /></div>
                    <input value={model.state} onChange={e => setModel({ ...model, state: e.target.value })} placeholder="e.g. Maharashtra" />
                  </div>
                </div>
              </div>
            </section>

            {/* Operational */}
            <section className="form-sheet-section no-border">
              <div className="form-sheet-section-header">
                <FiActivity />
                <span>Operational Governance</span>
              </div>
              <div className="form-sheet-grid">
                <div className="sheet-field">
                  <label>Lifecycle Status</label>
                  <div className="crm-input-group">
                    <div className="input-icon-box"><FiTag /></div>
                    <select value={model.status} onChange={e => setModel({ ...model, status: e.target.value })}>
                      {availableStatuses.length > 0 
                        ? availableStatuses.map(s => <option key={s.id} value={s.name}>{s.name}</option>)
                        : ['New', 'Contacted', 'Qualified', 'Lost'].map(name => <option key={name} value={name}>{name}</option>)
                      }
                    </select>
                  </div>
                </div>
                {user?.role !== 'Employee' && (
                  <div className="sheet-field">
                    <label>Assigned Officer</label>
                    <div className="crm-input-group">
                      <div className="input-icon-box"><FiBriefcase /></div>
                      <select value={model.assigned_to} onChange={e => setModel({ ...model, assigned_to: e.target.value })}>
                        <option value="">Unassigned</option>
                        {allUsers.map(u => <option key={u.id || u._id} value={u.id || u._id}>{u.name}</option>)}
                      </select>
                    </div>
                  </div>
                )}
                <div className="sheet-field">
                  <label>Next Follow-up Date</label>
                  <div className={`crm-input-group ${fieldErrors.follow_up_date ? 'error' : ''}`}>
                    <div className="input-icon-box"><FiActivity /></div>
                    <input 
                      type="date" 
                      value={model.follow_up_date} 
                      onChange={e => setModel({ ...model, follow_up_date: e.target.value })} 
                    />
                  </div>
                  {fieldErrors.follow_up_date && <span className="error-text">{fieldErrors.follow_up_date}</span>}
                </div>
                <div className="sheet-field full-width">
                  <label>Strategic Notes</label>
                  <div className="crm-input-group">
                    <div className="input-icon-box"><FiMessageSquare /></div>
                    <textarea 
                      style={{ minHeight: '100px' }} 
                      value={model.notes} 
                      onChange={e => setModel({ ...model, notes: e.target.value })} 
                      placeholder="Add background context, requirements, or meeting summaries..." 
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>
        </form>

        <div className="crm-modal-sheet-footer">
          <p className="footer-hint">Data is encrypted with 256-bit security.</p>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button className="crm-btn-premium glass" onClick={() => (onCancel ? onCancel() : navigate(-1))}>Cancel</button>
            <button className="crm-btn-premium vibrant" disabled={saving || checking} onClick={handleSubmit}>
              {saving ? 'Processing...' : isEdit ? 'Save Changes' : 'Create Lead'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.getElementById('modal-root-content') || document.body)
}
