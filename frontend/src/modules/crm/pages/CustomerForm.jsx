import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { customersApi } from '../../../services/customers.js'
import { statusesApi } from '../../../services/statuses.js'
import { useAuth } from '../../../context/AuthContext.jsx'
import { Icon } from '../../../layouts/icons.jsx'

const INITIAL_CUSTOMER = {
  name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  zip_code: '',
  country: 'India',
  industry: 'Technology',
  is_vip: false,
  status: 'active',
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
          setModel({ ...INITIAL_CUSTOMER, ...data })
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

  async function handleSubmit(e) {
    if (e) e.preventDefault()
    if (isReadOnly) return
    if (!model.name || !model.email || !model.phone) return toast.warn('Please fill required fields')
    if (Object.keys(fieldErrors).length > 0) return toast.warn('Please fix validation errors')

    setSaving(true)
    try {
      const saved = isEdit ? await customersApi.update(id, model) : await customersApi.create(model)
      toast.success(`Customer ${isEdit ? 'updated' : 'created'}`)
      if (onSuccess) onSuccess(saved); else navigate(`/customers/${saved.id || id}`)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save') } finally { setSaving(false) }
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

  if (loading) return <div className="p-40 text-center text-dimmed">Loading customer details...</div>

  return (
    <div className="crm-modal-portal-overlay">
      <div className="crm-modal-sheet animate-sheet-in">
        <div className="crm-modal-sheet-header">
          <div className="sheet-title-area">
            <h2 className="sheet-title">{isEdit ? 'Update Customer' : 'Add New Customer'}</h2>
            <p className="sheet-subtitle">{isEdit ? `Editing record for ${model.name}` : 'Onboard a new institutional client'}</p>
          </div>
        </div>

        <form className="crm-modal-sheet-body custom-scrollbar" onKeyDown={handleKeyDown} onSubmit={handleSubmit}>
          <div className="sheet-content-container">
            {/* Core Identity */}
            <section className="form-sheet-section">
              <div className="form-sheet-section-header">
                <Icon name="user" />
                <span>Core Identity</span>
              </div>
              <div className="form-sheet-grid">
                <div className="sheet-field full-width">
                  <label>Full Entity Name / Organization</label>
                  <input 
                    className="crm-input" 
                    autoFocus 
                    value={model.name} 
                    onChange={e => setModel({ ...model, name: e.target.value })} 
                    placeholder="e.g. Acme Corporation" 
                  />
                </div>
                <div className="sheet-field">
                  <label>Primary Email</label>
                  <input 
                    className="crm-input" 
                    type="email" 
                    value={model.email} 
                    onBlur={e => checkDuplicate('email', e.target.value)} 
                    onChange={e => setModel({ ...model, email: e.target.value })} 
                    placeholder="contact@entity.com" 
                  />
                  {fieldErrors.email && <span className="error-text">{fieldErrors.email}</span>}
                </div>
                <div className="sheet-field">
                  <label>Secure Phone</label>
                  <input 
                    className="crm-input" 
                    value={model.phone} 
                    onBlur={e => checkDuplicate('phone', e.target.value)} 
                    onChange={e => setModel({ ...model, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} 
                    placeholder="10-digit number" 
                  />
                  {fieldErrors.phone && <span className="error-text">{fieldErrors.phone}</span>}
                </div>
              </div>
            </section>

            {/* Firmographic Info */}
            <section className="form-sheet-section">
              <div className="form-sheet-section-header">
                <Icon name="briefcase" />
                <span>Firmographic Details</span>
              </div>
              <div className="form-sheet-grid">
                <div className="sheet-field">
                  <label>Business Sector</label>
                  <input 
                    className="crm-input" 
                    value={model.industry} 
                    onChange={e => setModel({ ...model, industry: e.target.value })} 
                    placeholder="e.g. Technology, Finance" 
                  />
                </div>
                <div className="sheet-field">
                  <label>Geographic Hub (City)</label>
                  <input 
                    className="crm-input" 
                    value={model.city} 
                    onChange={e => setModel({ ...model, city: e.target.value })} 
                    placeholder="e.g. Mumbai" 
                  />
                </div>
                <div className="sheet-field full-width">
                  <label>Registered Office Address</label>
                  <input 
                    className="crm-input" 
                    value={model.address} 
                    onChange={e => setModel({ ...model, address: e.target.value })} 
                    placeholder="Complete street address" 
                  />
                </div>
              </div>
            </section>

            {/* Account Governance */}
            <section className="form-sheet-section no-border">
              <div className="form-sheet-section-header">
                <Icon name="shield" />
                <span>Account Governance</span>
              </div>
              <div className="form-sheet-grid">
                <div className="sheet-field">
                  <label>Operational Status</label>
                  <select className="crm-input" value={model.status} onChange={e => setModel({ ...model, status: e.target.value })}>
                    {availableStatuses.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    {!availableStatuses.length && <option value="active">Active</option>}
                  </select>
                </div>
                <div className="sheet-field">
                  <label>Strategic Tier</label>
                  <div style={{ 
                    padding: '12px 16px', 
                    background: 'var(--bg-surface)', 
                    borderRadius: '12px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    border: '2px solid rgba(0,0,0,0.1)' 
                  }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.85rem', margin: 0, textTransform: 'none' }}>
                      <input type="checkbox" checked={model.is_vip} onChange={e => setModel({ ...model, is_vip: e.target.checked })} />
                      <span>Elevate to VIP Account</span>
                    </label>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </form>

        <div className="crm-modal-sheet-footer">
          <p className="footer-hint">All institutional records are encrypted and audit-logged.</p>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button className="btn-premium secondary" onClick={() => (onCancel ? onCancel() : navigate(-1))}>Cancel</button>
            <button className="btn-premium action-vibrant" disabled={saving || checking} onClick={handleSubmit}>
              {saving ? 'Processing...' : isEdit ? 'Save Changes' : 'Create Customer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
