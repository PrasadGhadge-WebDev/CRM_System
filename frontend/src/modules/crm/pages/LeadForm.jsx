import { useEffect, useState } from 'react'
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

// ─── Constants ───────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionHeader({ icon, title, subtitle }) {
  return (
    <div className="lf-section-header">
      <div className="lf-section-icon">{icon}</div>
      <div>
        <div className="lf-section-title">{title}</div>
        {subtitle && <div className="lf-section-sub">{subtitle}</div>}
      </div>
    </div>
  )
}

function Field({ label, required, error, children, span2 }) {
  return (
    <div className={`lf-field ${span2 ? 'span2' : ''}`}>
      <label className="lf-label">
        {label}{required && <span className="lf-required">*</span>}
      </label>
      {children}
      {error && <span className="lf-field-error">{error}</span>}
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

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
  // Duplicate detection state
  const [duplicateModal, setDuplicateModal] = useState(null) // { existing, matchedBy }

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

  // ── Load existing lead ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isEdit || !id) {
      const email = searchParams.get('email') || ''
      const status = searchParams.get('status') || ''
      const source = searchParams.get('source') || ''
      if (email || status || source) {
        setModel(prev => ({
          ...prev,
          ...(email ? { email } : {}),
          ...(status ? { status } : {}),
          ...(source ? { source } : {})
        }))
      }
      return
    }
    setLoading(true)
    leadsApi.get(id)
      .then(data => {
        // Split legacy "name" into firstName/lastName
        const [firstName = '', ...rest] = (data.name || '').split(' ')
        const lastName = rest.join(' ')
        setModel({
          ...emptyLead,
          ...data,
          firstName:         data.firstName   || firstName,
          lastName:          data.lastName    || lastName,
          address:           data.address || '',
          state:             data.state          || '',
          country:           data.country        || 'India',
          pincode:           data.pincode        || '',
          dealAmount:        data.dealAmount     || data.estimated_value || '',
          notes:             data.notes          || '',
          followUpDate:      data.followUpDate ? new Date(data.followUpDate).toISOString().split('T')[0] : '',
          lastContactDate:   data.lastContactDate ? new Date(data.lastContactDate).toISOString().split('T')[0] : (data.last_contact_date || ''),
          followupNote:      data.followupNote || data.follow_up_note || '',
          whatsapp_available: data.whatsapp_available || false,
          email_verified:     data.email_verified     || false,
          assignedTo:         data.assignedTo?._id || data.assignedTo?.id || data.assignedTo || '',
        })
      })
      .catch(() => {
        toast.error('Failed to load lead')
        if (onCancel) onCancel(); else navigate('/leads')
      })
      .finally(() => setLoading(false))
  }, [id, isEdit, navigate, onCancel, searchParams])

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function handleChange(field, value) {
    const isPhone = field === 'phone' || field === 'alternatePhone'
    const isPin   = field === 'pincode'
    const normalized = isPhone || isPin ? normalizeDigits(value, isPhone ? 15 : 6) : value
    
    setModel(prev => {
      const updated = { ...prev, [field]: normalized }
      return updated
    })

    if (fieldErrors[field]) setFieldErrors(prev => ({ ...prev, [field]: '' }))

    // Auto-populate City/State from Pincode
    if (field === 'pincode' && normalized.length === 6) {
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${normalized}`)
        const data = await res.json()
        if (data[0].Status === 'Success') {
          const postOffice = data[0].PostOffice[0]
          setModel(prev => ({
            ...prev,
            city: postOffice.District,
            state: postOffice.State
          }))
        }
      } catch (err) {
        console.error('Pincode lookup failed:', err)
      }
    }
  }


  function validate() {
    const errors = {}
    
    // First Name: Required, Letters only
    if (!model.firstName.trim()) {
      errors.firstName = 'First Name is required'
    } else if (!/^[A-Za-z\s]+$/.test(model.firstName.trim())) {
      errors.firstName = 'Letters and spaces only'
    }

    // Last Name: Required, Letters only
    if (!model.lastName.trim()) {
      errors.lastName = 'Last Name is required'
    } else if (!/^[A-Za-z\s]+$/.test(model.lastName.trim())) {
      errors.lastName = 'Letters and spaces only'
    }
 
    // Email: Required, Valid format
    if (!model.email.trim()) {
      errors.email = 'Email Address is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(model.email.trim())) {
      errors.email = 'Enter a valid email'
    }
 
    // Phone: Required, Exactly 10 digits
    if (!model.phone.trim()) {
      errors.phone = 'Phone Number is required'
    } else if (model.phone.trim().length !== 10) {
      errors.phone = 'Must be exactly 10 digits'
    }
 
    // Pincode: Exactly 6 digits if provided
    if (model.pincode.trim() && model.pincode.trim().length !== 6) {
      errors.pincode = 'Must be exactly 6 digits'
    }
 
    // dealAmount: Required, Must be positive
    if (!model.dealAmount) {
      errors.dealAmount = 'Deal Amount is required'
    } else if (Number(model.dealAmount) < 0) {
      errors.dealAmount = 'Deal Amount cannot be negative'
    }
 
    if (!model.source) errors.source = 'Lead Source is required'
    if (!model.status) errors.status = 'Lead Status is required'
    // Assignee is optional for Admin/Manager (server can auto-assign); hidden for Employees
    if (!model.notes || !model.notes.trim()) errors.notes = 'Notes are required'
 
    // Follow-up date >= today
    if (model.followUpDate) {
      const today = new Date(); today.setHours(0,0,0,0)
      if (new Date(model.followUpDate) < today) {
        errors.followUpDate = 'Date must be today or in the future'
      }
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) {
      toast.warn('Please fix the highlighted fields')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...model,
        name: `${model.firstName} ${model.lastName}`.trim(),
        dealAmount: model.dealAmount ? Number(model.dealAmount) : 0,
      }
      if (!payload.assignedTo)    delete payload.assignedTo
      if (!payload.followUpDate)  delete payload.followUpDate
      if (!payload.lastContactDate) delete payload.lastContactDate
      if (!payload.followupNote) delete payload.followupNote
      if (payload.id)             delete payload.id
      if (payload._id)            delete payload._id

      const saved = isEdit ? await leadsApi.update(id, payload) : await leadsApi.create(payload)
      toast.success(`Lead ${isEdit ? 'updated' : 'created'} successfully`)
      if (onSuccess) onSuccess(saved)
      else navigate(`/leads/${saved.id || id}`)
    } catch (err) {
      // ── Duplicate detected (409) ──────────────────────────────────────────
      const status = err.response?.status
      const data   = err.response?.data
      if (status === 409 && data?.duplicate) {
        setDuplicateModal({ existing: data.existing, matchedBy: data.matchedBy })
        return // Do NOT show generic toast — modal handles UX
      }
      const msg = err.response?.data?.message || err.message || 'Failed to save'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  // Called when user picks "Update Existing Lead" from the duplicate modal
  async function handleUpdateExisting(existing) {
    try {
      setSaving(true)
      const payload = {
        ...model,
        name: `${model.firstName} ${model.lastName}`.trim(),
        dealAmount: model.dealAmount ? Number(model.dealAmount) : 0,
      }
      if (!payload.assignedTo)   delete payload.assignedTo
      if (!payload.followUpDate) delete payload.followUpDate
      delete payload.id; delete payload._id

      await leadsApi.update(existing.id, payload)
      toast.success('Existing lead updated successfully')
      navigate(`/leads/${existing.id}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    if (onCancel) onCancel(); else navigate(-1)
  }

  if (loading) return (
    <div className="lf-loader">
      <div className="lf-loader-spinner" />
      <span>Loading lead data...</span>
    </div>
  )

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="lf-page">
      <form className="lf-form" onSubmit={handleSubmit} noValidate>

        {/* ── Form Header ── */}
        <div className="lf-form-header">
          <button type="button" className="lf-back-btn" onClick={handleCancel}>
            <Icon name="arrowLeft" size={16} />
            <span>Back</span>
          </button>
          <div className="lf-form-title-wrap">
            <h1 className="lf-form-title">
              {isEdit ? '✏️ Edit Lead' : '✨ Add New Lead'}
            </h1>
            <p className="lf-form-subtitle">
              {isEdit ? 'Update the lead information below' : 'Fill in the details to create a new lead'}
            </p>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════
            SECTION 1: Basic Information
        ═══════════════════════════════════════════════════ */}
        <div className="lf-section">
          <SectionHeader
            icon="👤"
            title="Basic Information"
            subtitle="Contact details and personal information"
          />
          <div className="lf-grid-3">
            <Field label="First Name" required error={fieldErrors.firstName}>
              <input
                className={`lf-input ${fieldErrors.firstName ? 'lf-input-error' : ''}`}
                value={model.firstName}
                onChange={e => handleChange('firstName', e.target.value)}
                placeholder="Rahul"
                maxLength={50}
              />
            </Field>
            <Field label="Last Name" required error={fieldErrors.lastName}>
               <input
                 className={`lf-input ${fieldErrors.lastName ? 'lf-input-error' : ''}`}
                 value={model.lastName}
                 onChange={e => handleChange('lastName', e.target.value)}
                 placeholder="Sharma"
                 maxLength={50}
               />
             </Field>
             <Field label="Phone Number" required error={fieldErrors.phone} span2>
               <input
                 className={`lf-input ${fieldErrors.phone ? 'lf-input-error' : ''}`}
                 type="tel"
                 value={model.phone}
                 onChange={e => handleChange('phone', e.target.value)}
                 placeholder="9876543210"
                 maxLength={10}
               />
             </Field>
             <Field label="Email Address" required error={fieldErrors.email} span2>
               <input
                 className={`lf-input ${fieldErrors.email ? 'lf-input-error' : ''}`}
                 type="email"
                 value={model.email}
                 onChange={e => handleChange('email', e.target.value)}
                 placeholder="name@example.com"
               />
             </Field>

            <Field label="District">
              <input
                className="lf-input"
                value={model.city}
                onChange={e => handleChange('city', e.target.value)}
                placeholder="Mumbai"
              />
            </Field>
            <Field label="State">
              <select
                className="lf-select"
                value={model.state}
                onChange={e => handleChange('state', e.target.value)}
              >
                <option value="">Select State</option>
                {INDIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Pincode" error={fieldErrors.pincode}>
              <input
                className={`lf-input ${fieldErrors.pincode ? 'lf-input-error' : ''}`}
                value={model.pincode}
                onChange={e => handleChange('pincode', e.target.value)}
                placeholder="400001"
                maxLength={6}
              />
            </Field>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════
            SECTION 2: Lead Details
        ═══════════════════════════════════════════════════ */}
        <div className="lf-section">
          <SectionHeader
            icon="📊"
            title="Lead Details"
            subtitle="Source, status, and assignment"
          />
          <div className="lf-grid-3">
            <Field label="Lead Source" required error={fieldErrors.source}>
              <select
                className={`lf-select ${fieldErrors.source ? 'lf-input-error' : ''}`}
                value={model.source}
                onChange={e => handleChange('source', e.target.value)}
              >
                <option value="">Select Source</option>
                {availableSources.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Lead Status" required error={fieldErrors.status}>
              <select
                className={`lf-select ${fieldErrors.status ? 'lf-input-error' : ''}`}
                value={model.status}
                onChange={e => handleChange('status', e.target.value)}
              >
                <option value="">Select Status</option>
                {availableStatuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Priority">
              <select
                className="lf-select"
                value={model.priority}
                onChange={e => handleChange('priority', e.target.value)}
              >
                <option value="Hot">🔥 Hot</option>
                <option value="Warm">☀️ Warm</option>
                <option value="Cold">❄️ Cold</option>
              </select>
            </Field>
            <Field label="Deal Amount (₹)" required error={fieldErrors.dealAmount}>
               <input
                 className={`lf-input ${fieldErrors.dealAmount ? 'lf-input-error' : ''}`}
                 type="number"
                 value={model.dealAmount}
                 onChange={e => handleChange('dealAmount', e.target.value)}
                 placeholder="e.g. 50000"
                 min={0}
               />
             </Field>
              {canAssign && (
                <Field label="Assigned To" error={fieldErrors.assignedTo}>
                  <select
                    className={`lf-select ${fieldErrors.assignedTo ? 'lf-input-error' : ''}`}
                    value={model.assignedTo}
                    onChange={e => handleChange('assignedTo', e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {employees.map(u => {
                      const uid = u.id || u._id
                      if (!uid) return null
                      return <option key={uid} value={uid}>{u.name} ({u.role})</option>
                    })}
                  </select>
                </Field>
              )}
             <Field label="Notes" required error={fieldErrors.notes} span2>
               <textarea
                 className={`lf-textarea ${fieldErrors.notes ? 'lf-input-error' : ''}`}
                 rows={3}
                 value={model.notes}
                 onChange={e => handleChange('notes', e.target.value)}
                 placeholder="Any internal notes about this lead..."
               />
             </Field>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════
            SECTION 3: Follow-up Info
        ═══════════════════════════════════════════════════ */}
        <div className="lf-section">
          <SectionHeader
            icon="📅"
            title="Follow-up Info"
            subtitle="Track contact history and schedule next steps"
          />
          <div className="lf-grid-3">
            <Field label="Last Contact Date">
              <input
                className="lf-input"
                type="date"
                value={model.lastContactDate}
                onChange={e => handleChange('lastContactDate', e.target.value)}
              />
            </Field>
            <Field label="Next Follow-up" error={fieldErrors.followUpDate}>
              <input
                className={`lf-input ${fieldErrors.followUpDate ? 'lf-input-error' : ''}`}
                type="date"
                value={model.followUpDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => handleChange('followUpDate', e.target.value)}
              />
            </Field>
            <Field label="Follow-up Note" span2>
              <textarea
                className="lf-textarea"
                rows={2}
                value={model.followupNote}
                onChange={e => handleChange('followupNote', e.target.value)}
                placeholder="What to discuss in the next follow-up..."
              />
            </Field>
          </div>
        </div>


        {/* ── Form Actions ── */}
        <div className="lf-actions">
          <div className="lf-required-note">
            <span className="lf-required">*</span> Required fields
          </div>
          <div className="lf-action-btns">
            <button type="button" className="lf-btn-cancel" onClick={handleCancel}>
              Cancel
            </button>
            <button type="submit" className="lf-btn-save" disabled={saving}>
              {saving
                ? <><span className="lf-btn-spinner" />Saving...</>
                : <>{isEdit ? '💾 Update Lead' : '✨ Create Lead'}</>
              }
            </button>
          </div>
        </div>

      </form>

      {/* ── Duplicate Lead Modal ── */}
      {duplicateModal && (
        <DuplicateLeadModal
          duplicate={duplicateModal.existing}
          matchedBy={duplicateModal.matchedBy}
          onClose={() => setDuplicateModal(null)}
          onUpdate={handleUpdateExisting}
        />
      )}

      {/* ── Styles ── */}
      <style>{`
        .lf-page {
          padding: 0;
          width: 100%;
        }

        .lf-form {
          display: flex;
          flex-direction: column;
          gap: 0;
          background: var(--panel-bg, rgba(15,23,42,0.8));
          backdrop-filter: blur(20px);
          border: 1px solid var(--panel-border, rgba(255,255,255,0.08));
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.2);
        }

        /* ── Form Header ──────────────────────────────── */
        .lf-form-header {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 28px 36px 24px;
          border-bottom: 1px solid var(--border, rgba(255,255,255,0.07));
          background: rgba(59,130,246,0.04);
        }

        .lf-back-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 16px;
          border-radius: 10px;
          border: 1px solid var(--border, rgba(255,255,255,0.1));
          background: rgba(255,255,255,0.04);
          color: var(--text-muted);
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 600;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }
        .lf-back-btn:hover {
          background: rgba(59,130,246,0.12);
          border-color: rgba(59,130,246,0.4);
          color: var(--primary);
        }

        .lf-form-title {
          font-size: 1.4rem;
          font-weight: 800;
          margin: 0 0 4px;
          background: linear-gradient(135deg, #60a5fa, #a78bfa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .lf-form-subtitle {
          font-size: 0.83rem;
          color: var(--text-dimmed);
          margin: 0;
        }

        /* ── Sections ─────────────────────────────────── */
        .lf-section {
          padding: 28px 36px;
          border-bottom: 1px solid var(--border, rgba(255,255,255,0.06));
        }
        .lf-section:last-of-type { border-bottom: none; }

        .lf-section-header {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 22px;
        }

        .lf-section-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.2));
          border: 1px solid rgba(59,130,246,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.1rem;
          flex-shrink: 0;
        }

        .lf-section-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text);
          letter-spacing: -0.01em;
        }

        .lf-section-sub {
          font-size: 0.75rem;
          color: var(--text-dimmed);
          margin-top: 2px;
        }

        /* ── Grids ────────────────────────────────────── */
        .lf-grid-3 {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px 24px;
        }

        .lf-grid-2 {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px 24px;
        }

        .lf-field.span2 {
          grid-column: span 2;
        }

        /* ── Fields ───────────────────────────────────── */
        .lf-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 0;
        }

        .lf-label {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .lf-required { color: #f87171; font-size: 0.8rem; }

        .lf-field-error {
          font-size: 0.72rem;
          color: #f87171;
          margin-top: 2px;
        }

        /* ── Inputs ───────────────────────────────────── */
        .lf-input,
        .lf-select,
        .lf-textarea {
          width: 100%;
          background: rgba(0,0,0,0.2);
          border: 1px solid var(--border, rgba(255,255,255,0.1));
          border-radius: 10px;
          padding: 10px 14px;
          color: var(--text);
          font-size: 0.88rem;
          transition: all 0.2s ease;
          outline: none;
          font-family: inherit;
        }

        .lf-input::placeholder,
        .lf-textarea::placeholder { color: var(--text-dimmed); }

        .lf-input:focus,
        .lf-select:focus,
        .lf-textarea:focus {
          border-color: var(--primary, #3b82f6);
          background: rgba(0,0,0,0.3);
          box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
        }

        .lf-input-error {
          border-color: rgba(239,68,68,0.6) !important;
          box-shadow: 0 0 0 3px rgba(239,68,68,0.1) !important;
        }

        .lf-select option { background: var(--bg-elevated, #1e293b); color: var(--text); }

        .lf-textarea { resize: vertical; min-height: 80px; line-height: 1.55; }

        /* Light mode overrides */
        body:not(.dark) .lf-input,
        body:not(.dark) .lf-select,
        body:not(.dark) .lf-textarea {
          background: rgba(255,255,255,0.8);
          border-color: rgba(0,0,0,0.12);
          color: #0f172a;
        }
        body:not(.dark) .lf-input::placeholder,
        body:not(.dark) .lf-textarea::placeholder { color: #94a3b8; }

        /* ── Dropzones ────────────────────────────────── */
        .lf-dropzone {
          border: 2px dashed var(--border, rgba(255,255,255,0.1));
          border-radius: 14px;
          padding: 24px;
          cursor: pointer;
          transition: all 0.25s ease;
          min-height: 100px;
          display: flex;
          align-items: center;
        }

        .lf-dropzone:hover {
          border-color: var(--primary, #3b82f6);
          background: rgba(59,130,246,0.04);
        }

        .lf-dropzone-filled {
          border-style: solid;
          border-color: rgba(59,130,246,0.4);
          background: rgba(59,130,246,0.05);
        }

        .lf-dropzone-content {
          display: flex;
          align-items: center;
          gap: 14px;
          width: 100%;
        }

        .lf-dropzone-empty {
          justify-content: center;
          flex-direction: column;
          text-align: center;
          gap: 8px;
        }

        .lf-dropzone-label {
          font-size: 0.875rem;
          font-weight: 700;
          color: var(--text);
        }

        .lf-dropzone-hint {
          font-size: 0.72rem;
          color: var(--text-dimmed);
          margin-top: 3px;
        }

        .lf-file-name {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 200px;
        }

        .lf-file-meta { font-size: 0.72rem; color: var(--text-dimmed); }

        .lf-file-remove {
          margin-left: auto;
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.2);
          color: #f87171;
          border-radius: 6px;
          width: 26px;
          height: 26px;
          cursor: pointer;
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.2s ease;
        }
        .lf-file-remove:hover { background: rgba(239,68,68,0.2); }

        /* ── Form Actions ─────────────────────────────── */
        .lf-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 36px;
          background: rgba(0,0,0,0.1);
          border-top: 1px solid var(--border, rgba(255,255,255,0.07));
        }

        .lf-required-note {
          font-size: 0.78rem;
          color: var(--text-dimmed);
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .lf-action-btns {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .lf-btn-cancel {
          padding: 10px 24px;
          border-radius: 10px;
          border: 1px solid var(--border, rgba(255,255,255,0.1));
          background: transparent;
          color: var(--text-muted);
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .lf-btn-cancel:hover {
          background: rgba(255,255,255,0.05);
          border-color: var(--border-strong);
          color: var(--text);
        }

        .lf-btn-save {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 28px;
          border-radius: 10px;
          border: none;
          background: linear-gradient(135deg, #3b82f6, #6366f1);
          color: white;
          font-size: 0.9rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 6px 20px rgba(59,130,246,0.35);
        }
        .lf-btn-save:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(59,130,246,0.45);
        }
        .lf-btn-save:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .lf-btn-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: lf-spin 0.7s linear infinite;
        }

        /* ── Loader ───────────────────────────────────── */
        .lf-loader {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 16px;
          min-height: 300px;
          color: var(--text-muted);
          font-size: 0.9rem;
        }

        .lf-loader-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid var(--border);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: lf-spin 0.8s linear infinite;
        }

        @keyframes lf-spin { to { transform: rotate(360deg); } }

        /* ── Responsive ───────────────────────────────── */
        @media (max-width: 900px) {
          .lf-grid-3 {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .lf-field.span2 { grid-column: span 2; }
          .lf-form-header, .lf-section, .lf-actions {
            padding-left: 20px;
            padding-right: 20px;
          }
        }

        @media (max-width: 600px) {
          .lf-grid-3, .lf-grid-2 {
            grid-template-columns: 1fr;
          }
          .lf-field.span2 { grid-column: span 1; }
          .lf-form-header { flex-direction: column; align-items: flex-start; }
          .lf-actions { flex-direction: column-reverse; gap: 12px; align-items: stretch; }
          .lf-action-btns { flex-direction: column-reverse; }
          .lf-btn-save, .lf-btn-cancel { width: 100%; justify-content: center; }
        }
      `}</style>
    </div>
  )
}
