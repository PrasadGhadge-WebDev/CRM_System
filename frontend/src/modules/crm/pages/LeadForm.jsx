import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { leadsApi } from '../../../services/leads.js'
import { usersApi } from '../../../services/users.js'
import { statusesApi } from '../../../services/statuses.js'
import { leadSourcesApi } from '../../../services/leadSources.js'
import { Icon } from '../../../layouts/icons.jsx'
import { useAuth } from '../../../context/AuthContext'
import {
  normalizeDigits,
} from '../../../utils/formValidation.js'
import DuplicateLeadModal from '../components/DuplicateLeadModal.jsx'

const INDIA_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
  'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka',
  'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
  'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Andaman & Nicobar Islands','Chandigarh','Dadra & Nagar Haveli','Daman & Diu',
  'Delhi','Jammu & Kashmir','Ladakh','Lakshadweep','Puducherry',
]

const FALLBACK_STATUSES = ['New','Contacted','Follow-up','Proposal','Won','Lost']
const FALLBACK_SOURCES  = ['Organic','Referral','Social Media','Cold Call','Website','Other']

const emptyLead = {
  firstName:       '',
  lastName:        '',
  email:           '',
  phone:           '',
  city:            '',
  state:           '',
  pincode:         '',
  source:          '',
  status:          '',
  dealAmount:      '',
  address:         '',
  assignedTo:      '',
  notes:           '',
  followUpDate:    '',
  lastContactDate: '',
  followupNote:    '',
  priority:        'Warm',
  whatsapp_available: false,
  email_verified: false,
}

export default function LeadForm({ mode, leadId, onSuccess, onCancel }) {
  const { id: paramsId } = useParams()
  const [searchParams] = useSearchParams()
  const id = leadId || paramsId
  const navigate = useNavigate()
  const { user } = useAuth()
  const isEdit = mode === 'edit' || (!!id && id !== 'new')

  const isAdmin   = user?.role === 'Admin'
  const isManager = user?.role === 'Manager'
  const canAssign = isAdmin || isManager

  const [model, setModel]     = useState(emptyLead)
  const [loading, setLoading] = useState(isEdit && !!id)
  const [saving, setSaving]   = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [duplicateModal, setDuplicateModal] = useState(null)

  const [employees, setEmployees]             = useState([])
  const [availableStatuses, setAvailableStatuses] = useState([])
  const [availableSources,  setAvailableSources]  = useState([])

  useEffect(() => {
    async function loadLookups() {
      try {
        const [empRes, statRes, sourceRes] = await Promise.all([
          usersApi.list({ limit: 200 }),
          statusesApi.list('lead'),
          leadSourcesApi.list(),
        ])
        setEmployees(empRes.items || [])
        setAvailableStatuses(statRes?.length ? statRes.map(s => s.name) : FALLBACK_STATUSES)
        setAvailableSources(sourceRes?.length ? sourceRes.map(s => s.name) : FALLBACK_SOURCES)

        if (!isEdit) {
          const urlStatus = searchParams.get('status')
          const urlSource = searchParams.get('source')
          const defStat = statRes?.find(s => s.is_default)?.name || FALLBACK_STATUSES[0]
          const defSrc  = sourceRes?.find(s => s.is_default)?.name || ''
          setModel(prev => ({
            ...prev,
            status: urlStatus || defStat,
            source: urlSource || defSrc
          }))
        }
      } catch (err) {
        console.error('Lookup load failed:', err)
      }
    }
    loadLookups()
  }, [isEdit, searchParams])

  useEffect(() => {
    if (!isEdit || !id) return
    setLoading(true)
    leadsApi.get(id)
      .then(data => {
        const [firstName = '', ...rest] = (data.name || '').split(' ')
        const lastName = rest.join(' ')
        setModel({
          ...emptyLead,
          ...data,
          firstName:         data.firstName   || firstName,
          lastName:          data.lastName    || lastName,
          address:           data.address || '',
          state:             data.state          || '',
          pincode:           data.pincode        || '',
          dealAmount:        data.dealAmount     || data.estimated_value || '',
          notes:             data.notes          || '',
          followUpDate:      data.followUpDate ? new Date(data.followUpDate).toISOString().split('T')[0] : '',
          lastContactDate:   data.lastContactDate ? new Date(data.lastContactDate).toISOString().split('T')[0] : (data.last_contact_date || ''),
          followupNote:      data.followupNote || data.follow_up_note || '',
          assignedTo:         data.assignedTo?._id || data.assignedTo?.id || data.assignedTo || '',
        })
      })
      .catch(() => {
        toast.error('Failed to load lead')
        if (onCancel) onCancel(); else navigate('/leads')
      })
      .finally(() => setLoading(false))
  }, [id, isEdit, navigate, onCancel])

  async function handleChange(field, value) {
    const isPhone = field === 'phone'
    const isPin   = field === 'pincode'
    const normalized = isPhone || isPin ? normalizeDigits(value, isPhone ? 10 : 6) : value
    
    setModel(prev => ({ ...prev, [field]: normalized }))
    if (fieldErrors[field]) setFieldErrors(prev => ({ ...prev, [field]: '' }))

    if (field === 'pincode' && normalized.length === 6) {
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${normalized}`)
        const data = await res.json()
        if (data[0].Status === 'Success') {
          const postOffice = data[0].PostOffice[0]
          setModel(prev => ({ ...prev, city: postOffice.District, state: postOffice.State }))
        }
      } catch (err) {}
    }
  }

  function validate() {
    const errors = {}
    if (!model.firstName.trim()) errors.firstName = 'First Name is required'
    if (!model.lastName.trim()) errors.lastName = 'Last Name is required'
    if (!model.email.trim()) errors.email = 'Email Address is required'
    if (!model.phone.trim()) errors.phone = 'Phone Number is required'
    else if (model.phone.trim().length !== 10) errors.phone = 'Must be 10 digits'
    if (!model.source) errors.source = 'Source is required'
    if (!model.status) errors.status = 'Status is required'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      const payload = {
        ...model,
        name: `${model.firstName} ${model.lastName}`.trim(),
        dealAmount: model.dealAmount ? Number(model.dealAmount) : 0,
      }
      const saved = isEdit ? await leadsApi.update(id, payload) : await leadsApi.create(payload)
      toast.success(`Lead ${isEdit ? 'updated' : 'created'}`)
      if (onSuccess) onSuccess(saved)
      else navigate(`/leads/${saved.id || id}`)
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.duplicate) {
        setDuplicateModal({ existing: err.response.data.existing, matchedBy: err.response.data.matchedBy })
        return
      }
      toast.error(err.response?.data?.message || 'Failed to save')
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

  if (loading) return <div className="p-40 text-center text-dimmed">Loading lead details...</div>

  return (
    <div className="crm-modal-portal-overlay">
      <div className="crm-modal-sheet animate-sheet-in">
        <div className="crm-modal-sheet-header">
          <div className="sheet-title-area">
            <h2 className="sheet-title">{isEdit ? 'Update Lead' : 'Add New Lead'}</h2>
            <p className="sheet-subtitle">{isEdit ? `Editing lead for ${model.firstName}` : 'Capture a new opportunity'}</p>
          </div>
        </div>

        <form className="crm-modal-sheet-body custom-scrollbar" onKeyDown={handleKeyDown} onSubmit={handleSubmit}>
          <div className="sheet-content-container">
            {/* Personal Details */}
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
                <div className="sheet-field full-width">
                  <label>Email Address</label>
                  <input
                    className="crm-input"
                    type="email"
                    autoComplete="off"
                    value={model.email}
                    onChange={e => handleChange('email', e.target.value)}
                    placeholder="email@example.com"
                  />
                  {fieldErrors.email && <span className="error-text">{fieldErrors.email}</span>}
                </div>
                <div className="sheet-field">
                  <label>Phone Number</label>
                  <input
                    className="crm-input"
                    value={model.phone}
                    onChange={e => handleChange('phone', e.target.value)}
                    placeholder="9876543210"
                    maxLength={10}
                  />
                  {fieldErrors.phone && <span className="error-text">{fieldErrors.phone}</span>}
                </div>
                <div className="sheet-field">
                  <label>Pincode</label>
                  <input
                    className="crm-input"
                    value={model.pincode}
                    onChange={e => handleChange('pincode', e.target.value)}
                    placeholder="400001"
                    maxLength={6}
                  />
                  {fieldErrors.pincode && <span className="error-text">{fieldErrors.pincode}</span>}
                </div>
              </div>
            </section>

            {/* Lead Details */}
            <section className="form-sheet-section">
              <div className="form-sheet-section-header">
                <Icon name="briefcase" />
                <span>Lead Qualification</span>
              </div>
              <div className="form-sheet-grid">
                <div className="sheet-field">
                  <label>Source</label>
                  <select className="crm-input" value={model.source} onChange={e => handleChange('source', e.target.value)}>
                    <option value="">Select Source</option>
                    {availableSources.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {fieldErrors.source && <span className="error-text">{fieldErrors.source}</span>}
                </div>
                <div className="sheet-field">
                  <label>Status</label>
                  <select className="crm-input" value={model.status} onChange={e => handleChange('status', e.target.value)}>
                    <option value="">Select Status</option>
                    {availableStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {fieldErrors.status && <span className="error-text">{fieldErrors.status}</span>}
                </div>
                <div className="sheet-field">
                  <label>Priority</label>
                  <select className="crm-input" value={model.priority} onChange={e => handleChange('priority', e.target.value)}>
                    <option value="Hot">Hot</option>
                    <option value="Warm">Warm</option>
                    <option value="Cold">Cold</option>
                  </select>
                </div>
                <div className="sheet-field">
                  <label>Estimated Amount (₹)</label>
                  <input
                    className="crm-input"
                    type="number"
                    value={model.dealAmount}
                    onChange={e => handleChange('dealAmount', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                {canAssign && (
                  <div className="sheet-field full-width">
                    <label>Assigned Staff</label>
                    <select className="crm-input" value={model.assignedTo} onChange={e => handleChange('assignedTo', e.target.value)}>
                      <option value="">Unassigned</option>
                      {employees.map(u => <option key={u.id || u._id} value={u.id || u._id}>{u.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </section>

            {/* Follow-up */}
            <section className="form-sheet-section no-border">
              <div className="form-sheet-section-header">
                <Icon name="calendar" />
                <span>Follow-up Planning</span>
              </div>
              <div className="form-sheet-grid">
                <div className="sheet-field">
                  <label>Call Back Date</label>
                  <input
                    className="crm-input"
                    type="date"
                    value={model.followUpDate}
                    onChange={e => handleChange('followUpDate', e.target.value)}
                  />
                </div>
                <div className="sheet-field full-width">
                  <label>Internal Notes</label>
                  <textarea
                    className="crm-input"
                    style={{ minHeight: '100px' }}
                    value={model.notes}
                    onChange={e => handleChange('notes', e.target.value)}
                    placeholder="Add any relevant information about this lead..."
                  />
                </div>
              </div>
            </section>
          </div>
        </form>

        <div className="crm-modal-sheet-footer">
          <p className="footer-hint">Lead data is securely synchronized across the CRM.</p>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button className="btn-premium secondary" onClick={() => (onCancel ? onCancel() : navigate(-1))}>Cancel</button>
            <button className="btn-premium action-vibrant" disabled={saving} onClick={handleSubmit}>
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Lead'}
            </button>
          </div>
        </div>
      </div>

      {duplicateModal && (
        <DuplicateLeadModal
          duplicate={duplicateModal.existing}
          matchedBy={duplicateModal.matchedBy}
          onClose={() => setDuplicateModal(null)}
          onUpdate={async (existing) => {
             // Logic simplified for template consistency
             leadsApi.update(existing.id, { ...model, name: `${model.firstName} ${model.lastName}`.trim() })
             .then(() => {
               toast.success('Lead updated');
               navigate(`/leads/${existing.id}`);
             });
          }}
        />
      )}
    </div>
  )
}
