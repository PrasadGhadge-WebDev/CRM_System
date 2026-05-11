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
import SearchableSelect from '../components/SearchableSelect.jsx'

import { 
  validateRequired, 
  validateEmail, 
  validatePhone,
  normalizeDigits,
  normalizeName
} from '../../../utils/formValidation.js'

const INITIAL_LEAD = {
  name: '',
  email: '',
  phone: '',
  company: '',
  source: 'Organic',
  status: 'New',
  priority: 'Medium',
  assigned_to: '',
  follow_up_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  city: '',
  state: 'Maharashtra',
  budget: 0,
  requirement: '',
  notes: '',
}

export default function LeadForm({ mode, leadId, onSuccess, onCancel }) {
  const { id: paramsId } = useParams()
  const id = leadId || paramsId
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const isHR = user?.role === 'HR'
  const isAccountant = user?.role === 'Accountant'
  const isEmployee = user?.role === 'Employee'
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
            budget: data.budget || data.dealAmount || data.value || 0,
            requirement: data.requirement || data.notes || '',
            priority: data.priority || 'Medium',
            assigned_to: data.assigned_to?._id || data.assigned_to?.id || data.assigned_to || ''
          }
          setModel(normalized)
          setInitialModel(normalized)
        } else if (!leadId) {
          const defaultSrc = srcRes?.find(s => s.is_default)
          const defaultStat = statRes?.find(s => s.is_default)
          
          let initialAssigned = ''
          if (user?.role === 'Employee') {
            initialAssigned = user.id || user._id
          }

          setModel(prev => ({ 
            ...prev, 
            source: defaultSrc ? defaultSrc.name : prev.source,
            status: defaultStat ? defaultStat.name : prev.status,
            assigned_to: initialAssigned
          }))
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
      if (conflict) setFieldErrors(prev => ({ ...prev, [field]: `Already exists: "${conflict.name}"` }))
      else setFieldErrors(prev => { const next = { ...prev }; delete next[field]; return next })
    } catch { } finally { setChecking(false) }
  }, [id, isEdit])

  const validate = () => {
    const errors = {}
    
    const nameErr = validateRequired('Full Name', model.name)
    if (nameErr) errors.name = nameErr

    const emailErr = validateEmail('Email', model.email) || validateRequired('Email', model.email)
    if (emailErr) errors.email = emailErr

    const phoneErr = validatePhone('Phone', model.phone, { required: true })
    if (phoneErr) errors.phone = phoneErr

    if (!model.source) errors.source = 'Lead source is required'

    if (model.follow_up_date && new Date(model.follow_up_date) < new Date().setHours(0, 0, 0, 0)) {
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
      const payload = { 
        ...model,
        dealAmount: model.budget, // Sync for backward compatibility
        notes: model.requirement, // Sync for backward compatibility
        remarks_internal: model.notes // Sync for backward compatibility
      }
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

  if (loading) return <div className="p-40 text-center text-dimmed">Loading...</div>

  const modalContent = (
    <div className="crm-modal-portal-overlay">
      <div className="crm-modal-sheet animate-sheet-in">
        <div className="crm-modal-sheet-header">
          <div className="sheet-title-area">
            <h2 className="sheet-title">{isEdit ? 'Update Lead' : 'Add New Lead'}</h2>
            <p className="sheet-subtitle">{isEdit ? `Editing record for ${model.name}` : 'Add a new lead to the system'}</p>
          </div>
        </div>

        <form className="crm-modal-sheet-body custom-scrollbar" onKeyDown={handleKeyDown} onSubmit={handleSubmit}>
          <div className="sheet-content-container">
            {initialModel?.status === 'Converted' && (
              <div style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <FiActivity style={{ color: 'var(--primary)' }} />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)' }}>Archived Lead Record</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)' }}>This lead has been converted to a Customer. Editing here will not update the Customer profile.</div>
                </div>
              </div>
            )}
            {/* Core Identity */}
            <section className="form-sheet-section">
              <div className="form-sheet-section-header">
                <FiUser />
                <span>Contact Information</span>
              </div>
              <div className="form-sheet-grid">
                <div className="sheet-field full-width">
                  <label>Full Name</label>
                  <div className={`crm-input-group ${fieldErrors.name ? 'error' : ''}`}>
                    <div className="input-icon-box"><FiUser /></div>
                    <input 
                      autoFocus 
                      value={model.name} 
                      onChange={e => {
                        setModel({ ...model, name: normalizeName(e.target.value) })
                        if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: '' }))
                      }} 
                      placeholder="e.g. John Doe" 
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
                  <label>Phone Number</label>
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
                <div className="sheet-field">
                  <label>Company Name</label>
                  <div className="crm-input-group">
                    <div className="input-icon-box"><FiBriefcase /></div>
                    <input 
                      value={model.company} 
                      onChange={e => setModel({ ...model, company: e.target.value })} 
                      placeholder="e.g. Acme Corp" 
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Classification */}
            <section className="form-sheet-section">
              <div className="form-sheet-section-header">
                <FiLayers />
                <span>Lead Source</span>
              </div>
              <div className="form-sheet-grid">
                <div className="sheet-field">
                  <label>Source *</label>
                  <SearchableSelect
                    value={model.source}
                    onChange={val => setModel({ ...model, source: val })}
                    options={availableSources.length > 0 
                      ? availableSources.map(s => ({ value: s.name, label: s.name }))
                      : ['Organic', 'Referral', 'Social', 'Ads'].map(name => ({ value: name, label: name }))
                    }
                    icon="activity"
                  />
                  {fieldErrors.source && <span className="error-text">{fieldErrors.source}</span>}
                </div>
                <div className="sheet-field">
                  <label>Budget (₹)</label>
                  <div className="crm-input-group">
                    <div className="input-icon-box"><FiTag /></div>
                    <input 
                      type="number"
                      value={model.budget} 
                      onChange={e => setModel({ ...model, budget: e.target.value })} 
                      placeholder="e.g. 50000" 
                    />
                  </div>
                </div>
                <div className="sheet-field">
                  <label>Priority</label>
                  <SearchableSelect
                    value={model.priority}
                    onChange={val => setModel({ ...model, priority: val })}
                    options={['High', 'Medium', 'Low'].map(p => ({ value: p, label: p }))}
                    icon="star"
                  />
                </div>
              </div>
            </section>



            {/* Geography */}
            <section className="form-sheet-section">
              <div className="form-sheet-section-header">
                <FiMapPin />
                <span>Location</span>
              </div>
              <div className="form-sheet-grid">
                <div className="sheet-field">
                  <label>City</label>
                  <div className="crm-input-group">
                    <div className="input-icon-box"><FiMapPin /></div>
                    <input 
                      value={model.city} 
                      onChange={e => setModel({ ...model, city: e.target.value })} 
                      placeholder="e.g. Mumbai" 
                    />
                  </div>
                </div>
                <div className="sheet-field">
                  <label>State</label>
                  <div className="crm-input-group">
                    <div className="input-icon-box"><FiMapPin /></div>
                    <input 
                      value={model.state} 
                      onChange={e => setModel({ ...model, state: e.target.value })} 
                      placeholder="e.g. Maharashtra" 
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Operational */}
            <section className="form-sheet-section no-border">
              <div className="form-sheet-section-header">
                <FiActivity />
                <span>Status & Assignment</span>
              </div>
              <div className="form-sheet-grid">
                <div className="sheet-field">
                  <label>Lead Status {initialModel?.status === 'Converted' ? '(Archived - Converted)' : ''}</label>
                  <SearchableSelect
                    value={model.status}
                    onChange={val => setModel({ ...model, status: val })}
                    options={availableStatuses.length > 0 
                      ? (user?.role === 'Employee' 
                         ? ['New', 'Contacted', 'Qualified', 'Proposal Sent', 'Negotiation', 'Converted', 'Lost'].map(n => ({ value: n, label: n }))
                         : availableStatuses.map(s => ({ value: s.name, label: s.name }))
                        )
                      : ['New', 'Contacted', 'Qualified', 'Proposal Sent', 'Negotiation', 'Converted', 'Lost'].map(name => ({ value: name, label: name }))
                    }
                    icon="activity"
                    disabled={initialModel?.status === 'Converted'}
                  />
                </div>
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
                  <label>Requirement / Service</label>
                  <div className="crm-input-group">
                    <div className="input-icon-box"><FiActivity /></div>
                    <textarea 
                      style={{ minHeight: '80px' }} 
                      value={model.requirement} 
                      onChange={e => setModel({ ...model, requirement: e.target.value })} 
                      placeholder="Describe the customer's requirement..." 
                    />
                  </div>
                </div>
                <div className="sheet-field full-width">
                  <label>Internal Notes</label>
                  <div className="crm-input-group">
                    <div className="input-icon-box"><FiMessageSquare /></div>
                    <textarea 
                      style={{ minHeight: '80px' }} 
                      value={model.notes} 
                      onChange={e => setModel({ ...model, notes: e.target.value })} 
                      placeholder="Additional context or notes..." 
                    />
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
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Lead'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.getElementById('modal-root-content') || document.body)
}
