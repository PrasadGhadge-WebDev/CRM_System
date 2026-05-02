import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { usersApi } from '../../../services/users.js'
import { leadSourcesApi } from '../../../services/leadSources.js'
import { customersApi } from '../../../services/customers.js'
import { Icon } from '../../../layouts/icons.jsx'
import { toast } from 'react-toastify'
import { useAuth } from '../../../context/AuthContext.jsx'
import { validateRequired } from '../../../utils/formValidation.js'

export default function LeadConversionModal({ isOpen, lead, onClose, onConverted }) {
  const { user } = useAuth()
  const [employees, setEmployees] = useState([])
  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  const [form, setForm] = useState({
    assigned_to: '',
    source: '',
    initial_note: ''
  })

  useEffect(() => {
    if (!isOpen || !lead) return
    setLoading(true)
    setFieldErrors({})
    Promise.all([
      usersApi.list({ limit: 'all' }),
      leadSourcesApi.list()
    ]).then(([uRes, sRes]) => {
      setEmployees(uRes.items || [])
      setSources(sRes || [])
      setForm({
        assigned_to: lead.assignedTo?._id || lead.assignedTo?.id || lead.assignedTo || '',
        source: lead.source || '',
        initial_note: '' // Removed default auto-filled note
      })
    }).catch(() => toast.error('Failed to load data')).finally(() => setLoading(false))
  }, [isOpen, lead])

  function validate() {
    const errors = {}
    const assignErr = validateRequired('Assigned User', form.assigned_to)
    if (assignErr) errors.assigned_to = assignErr
    const sourceErr = validateRequired('Source', form.source)
    if (sourceErr) errors.source = sourceErr
    
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault()
    if (!validate()) {
      const first = Object.values(fieldErrors)[0] || 'Please fill required fields'
      return toast.warn(first)
    }

    setSaving(true)
    try {
      const res = await customersApi.convertLead({
        lead_id: lead.id || lead._id,
        assigned_to: form.assigned_to,
        source: form.source,
        initial_note: form.initial_note
      })
      toast.success('Lead converted successfully')
      onConverted(res)
      onClose()
    } catch (err) {
      setFieldErrors(prev => ({ ...prev, _form: err.response?.data?.message || 'Could not convert lead' }))
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const modalContent = (
    <div className="crm-modal-portal-overlay">
      <div className="crm-modal-sheet" style={{ maxWidth: '600px' }}>
        <div className="crm-modal-sheet-header">
          <div className="sheet-title-area">
            <h2 className="sheet-title">Convert Lead to Customer</h2>
            <p className="sheet-subtitle">Finalize details for <strong>{lead?.name}</strong> to initiate customer profile.</p>
          </div>
        </div>

        <form className="crm-modal-sheet-body custom-scrollbar" onSubmit={handleSubmit}>
          {fieldErrors._form && (
            <div className="crm-form-error-banner" style={{ margin: '0 40px 20px', padding: '12px 20px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700 }}>
              {fieldErrors._form}
            </div>
          )}
          <div className="sheet-content-container">
            <section className="form-sheet-section no-border">
              <div className="form-sheet-section-header">
                <Icon name="userPlus" />
                <span>Account Finalization</span>
              </div>
              
              <div className="form-sheet-grid">
                <div className="sheet-field">
                  <label>Assign Account To</label>
                  <select 
                    className={`crm-input ${fieldErrors.assigned_to ? 'error' : ''}`}
                    value={form.assigned_to}
                    onChange={e => {
                      setForm({...form, assigned_to: e.target.value})
                      if (fieldErrors.assigned_to) setFieldErrors(prev => ({ ...prev, assigned_to: '' }))
                    }}
                    required
                  >
                    <option value="">Select Staff Member...</option>
                    {employees.map(u => <option key={u.id || u._id} value={u.id || u._id}>{u.name} ({u.role})</option>)}
                  </select>
                  {fieldErrors.assigned_to && <span className="error-text">{fieldErrors.assigned_to}</span>}
                </div>

                <div className="sheet-field">
                  <label>Confirmed Source</label>
                  <select 
                    className={`crm-input ${fieldErrors.source ? 'error' : ''}`}
                    value={form.source}
                    onChange={e => {
                      setForm({...form, source: e.target.value})
                      if (fieldErrors.source) setFieldErrors(prev => ({ ...prev, source: '' }))
                    }}
                    required
                  >
                    <option value="">Select origin source...</option>
                    {sources.map(s => <option key={s.id || s.name} value={s.name}>{s.name}</option>)}
                  </select>
                  {fieldErrors.source && <span className="error-text">{fieldErrors.source}</span>}
                </div>

                <div className="sheet-field full-width">
                  <label>Conversion Notes / Interaction Summary</label>
                  <textarea 
                    className="crm-input"
                    style={{ minHeight: '120px' }}
                    placeholder="Describe any initial requirements or key discussion points..."
                    value={form.initial_note}
                    onChange={e => setForm({...form, initial_note: e.target.value})}
                  />
                </div>
              </div>
            </section>
          </div>
        </form>

        <div className="crm-modal-sheet-footer">
          <p className="footer-hint">This action creates a permanent customer record.</p>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button type="button" className="crm-btn-premium glass" onClick={onClose}>Cancel</button>
            <button 
              type="submit" 
              onClick={handleSubmit}
              disabled={saving}
              className="crm-btn-premium vibrant"
            >
              {saving ? 'Converting...' : 'Confirm Conversion'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
