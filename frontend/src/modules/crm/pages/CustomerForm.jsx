import { useEffect, useState, useCallback } from 'react'
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
  
  const isAdmin = user?.role === 'Admin'
  const isManager = user?.role === 'Manager'
  const isAccountant = user?.role === 'Accountant'
  const isHR = user?.role === 'HR'
  
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
      if (conflict) setFieldErrors(prev => ({ ...prev, [field]: `Assigned to "${conflict.name}"` }))
      else setFieldErrors(prev => { const next = { ...prev }; delete next[field]; return next })
    } catch { } finally { setChecking(false) }
  }, [id, isEdit])

  async function onSubmit(e) {
    e.preventDefault()
    if (isReadOnly) return
    if (!model.name || !model.email || !model.phone) return toast.warn('All required identifiers needed')
    if (!/^\d{10}$/.test(model.phone.trim())) return setFieldErrors(prev => ({ ...prev, phone: '10 digits required' }))
    if (Object.keys(fieldErrors).length > 0) return toast.warn('Resolve validation conflicts')

    setSaving(true)
    try {
      const saved = isEdit ? await customersApi.update(id, model) : await customersApi.create(model)
      toast.success(`Client ${isEdit ? 'updated' : 'onboarded'}`)
      if (onSuccess) onSuccess(saved); else navigate(`/customers/${saved.id || id}`)
    } catch (err) { toast.error(err.response?.data?.message || 'Transaction error') } finally { setSaving(false) }
  }

  return (
    <div className="crm-form-page crmContent page-enter">
      <div className="lead-form-page">
        <header className="leadsHeader">
          <div>
            <h1 className="leadsTitle">{isEdit ? 'Refine Client Intel' : 'Onboard New Entity'}</h1>
            <p className="leadsDescription">Manage institutional metadata, firmographic details, and account governance.</p>
          </div>
          <div className="leadsHeaderActions">
            <button className="btn-premium secondary" onClick={() => (onCancel ? onCancel() : navigate(-1))}>
              <Icon name="close" />
              <span>Cancel</span>
            </button>
            <button className="btn-premium action-vibrant" onClick={onSubmit} disabled={saving || checking}>
              <Icon name={saving ? 'spinner' : 'check'} className={saving ? 'spinner' : ''} />
              <span>{saving ? 'Processing...' : isEdit ? 'Commit Profile' : 'Authorize Entity'}</span>
            </button>
          </div>
        </header>

        <div className="intelligence-form-grid">
          <div className="intel-form-card glass-panel">
            <div className="card-header-premium">
              <Icon name="user" />
              <h3>Core Identity</h3>
            </div>
            <div className="card-body-premium">
              <div className="grid-2">
                <div className="intel-field-group span-2">
                  <label className="intel-label">Full Entity Name / Organization</label>
                  <input className="input-premium" value={model.name} onChange={e => setModel({ ...model, name: e.target.value })} placeholder="e.g. Acme Corporation" autoFocus />
                </div>
                <div className="intel-field-group">
                  <label className="intel-label">Primary Email</label>
                  <input className="input-premium" type="email" value={model.email} onBlur={e => checkDuplicate('email', e.target.value)} onChange={e => setModel({ ...model, email: e.target.value })} placeholder="contact@entity.com" />
                  {fieldErrors.email && <span className="intel-error-msg">{fieldErrors.email}</span>}
                </div>
                <div className="intel-field-group">
                  <label className="intel-label">Secure Phone</label>
                  <input className="input-premium" value={model.phone} onBlur={e => checkDuplicate('phone', e.target.value)} onChange={e => setModel({ ...model, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} placeholder="10-digit number" />
                  {fieldErrors.phone && <span className="intel-error-msg">{fieldErrors.phone}</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="intel-form-card glass-panel">
            <div className="card-header-premium">
              <Icon name="briefcase" />
              <h3>Firmographic Metadata</h3>
            </div>
            <div className="card-body-premium">
              <div className="grid-2">
                <div className="intel-field-group">
                  <label className="intel-label">Business Sector</label>
                  <input className="input-premium" value={model.industry} onChange={e => setModel({ ...model, industry: e.target.value })} placeholder="e.g. Technology, Finance" />
                </div>
                <div className="intel-field-group">
                  <label className="intel-label">Geographic Hub (City)</label>
                  <input className="input-premium" value={model.city} onChange={e => setModel({ ...model, city: e.target.value })} placeholder="e.g. Mumbai" />
                </div>
                <div className="intel-field-group span-2">
                  <label className="intel-label">Registered Office Address</label>
                  <input className="input-premium" value={model.address} onChange={e => setModel({ ...model, address: e.target.value })} placeholder="Complete street address" />
                </div>
              </div>
            </div>
          </div>

          <div className="intel-form-card glass-panel">
            <div className="card-header-premium">
              <Icon name="settings" />
              <h3>Account Governance</h3>
            </div>
            <div className="card-body-premium">
              <div className="grid-2">
                <div className="intel-field-group">
                  <label className="intel-label">Operational Status</label>
                  <select className="input-premium" value={model.status} onChange={e => setModel({ ...model, status: e.target.value })}>
                    {availableStatuses.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    {!availableStatuses.length && <option value="Active">Active</option>}
                  </select>
                </div>
                <div className="intel-field-group">
                  <label className="intel-label">Strategic Tier</label>
                  <div style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', display: 'flex', alignItems: 'center', height: '48px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input type="checkbox" checked={model.is_vip} onChange={e => setModel({ ...model, is_vip: e.target.checked })} />
                      <span>Elevate to VIP Account</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="form-action-footer">
          <button className="btn-premium action-secondary" type="button" onClick={() => (onCancel ? onCancel() : navigate(-1))}>Cancel</button>
          <button className="btn-premium action-vibrant" onClick={onSubmit} disabled={saving || checking}>
            {saving ? 'Processing Intel...' : isEdit ? 'Commit Record' : 'Finalize Authorization'}
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
        .span-2 { grid-column: span 2; }
        .intel-field-group { display: flex; flex-direction: column; gap: 8px; }
        .intel-label { font-size: 0.65rem; font-weight: 900; color: var(--text-dimmed); text-transform: uppercase; letter-spacing: 0.08em; }
        .intel-error-msg { font-size: 0.7rem; color: #ef4444; margin-top: 4px; font-weight: 600; }
        .form-action-footer { display: flex; align-items: center; justify-content: flex-end; gap: 16px; margin-top: 32px; padding: 24px; background: rgba(15, 23, 42, 0.4); border-radius: 24px; border: 1px solid rgba(255,255,255,0.05); }
        @media (max-width: 768px) { .grid-2 { grid-template-columns: 1fr; } .span-2 { grid-column: span 1; } }
      `}</style>
    </div>
  )
}
