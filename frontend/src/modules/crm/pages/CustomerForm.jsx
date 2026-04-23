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
  const isEdit = mode === 'edit' || (!!id && id !== 'new')

  const [model, setModel] = useState(INITIAL_CUSTOMER)
  const [loading, setLoading] = useState(isEdit && !!id)
  const [saving, setSaving] = useState(false)
  const [availableStatuses, setAvailableStatuses] = useState([])
  const [fieldErrors, setFieldErrors] = useState({})
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    async function loadData() {
      try {
        const [statRes] = await Promise.all([
          statusesApi.list('customer')
        ])
        setAvailableStatuses(statRes || [])

        if (isEdit && id) {
          setLoading(true)
          const data = await customersApi.get(id)
          setModel({ ...INITIAL_CUSTOMER, ...data })
        } else if (!customerId) {
          const defaultStat = statRes?.find(s => s.is_default)
          if (defaultStat) {
            setModel(prev => ({ ...prev, status: defaultStat.name }))
          }
        }
      } catch (err) {
        toast.error('Failed to load required data')
        if (!isEdit) navigate('/customers')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id, isEdit, navigate, customerId])

  const checkDuplicate = useCallback(async (field, value) => {
    if (!value || !value.trim()) return
    setChecking(true)
    try {
      const res = await customersApi.list({ q: value.trim(), limit: 5 })
      const items = res?.items || []
      const conflict = items.find(c => {
        const matches = field === 'email'
          ? c.email?.toLowerCase() === value.trim().toLowerCase()
          : c.phone === value.trim()
        return matches && (isEdit ? c.id !== id : true)
      })
      if (conflict) {
        setFieldErrors(prev => ({ ...prev, [field]: `Already registered to "${conflict.name}"` }))
      } else {
        setFieldErrors(prev => { const next = { ...prev }; delete next[field]; return next })
      }
    } catch {
      // silent
    } finally {
      setChecking(false)
    }
  }, [id, isEdit])

  async function onSubmit(e) {
    e.preventDefault()
    if (!model.name || !model.email || !model.phone) {
      toast.warn('Please complete all required fields')
      return
    }

    if (!/^\d{10}$/.test(model.phone.trim())) {
      setFieldErrors(prev => ({ ...prev, phone: 'Must be 10 digits' }))
      toast.warn('Invalid phone number')
      return
    }

    if (Object.keys(fieldErrors).length > 0) {
      toast.warn('Please fix validation errors')
      return
    }

    setSaving(true)
    try {
      const saved = isEdit ? await customersApi.update(id, model) : await customersApi.create(model)
      toast.success(`Customer ${isEdit ? 'updated' : 'onboarded'} successfully`)
      if (onSuccess) onSuccess(saved)
      else navigate(`/customers/${saved.id || id}`)
    } catch (err) {
      const msg = err.response?.data?.message || 'Transaction failed'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  function handleBack() {
    if (onCancel) onCancel()
    else navigate(-1)
  }

  if (loading) return <div className="crm-loader-state">Synchronizing Profile...</div>

  return (
    <div className="crm-form-page crmContent" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
      <form className="premium-form-card" onSubmit={onSubmit} noValidate>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '20px' }}>
          <button className="btn-modern-back" type="button" onClick={handleBack} style={{ background: 'rgba(255,255,255,0.03)' }}>
            <Icon name="arrowLeft" size={16} />
            <span>Back</span>
          </button>
          <h1 className="userFormTitle" style={{ margin: 0, fontSize: '1.5rem' }}>{isEdit ? 'Update Customer' : 'Onboard Client'}</h1>
        </div>

        {/* ── CORE IDENTITY ── */}
        <div className="stack gap-16">
          <div className="section-header-row">
            <div className="section-icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
              <Icon name="user" size={18} color="white" />
            </div>
            <h4 className="section-title">Core Identity</h4>
          </div>

          <div className="grid3">
            <div className="stack tiny-gap">
              <label className="text-small muted" style={{ fontWeight: 600 }}>Client Name *</label>
              <input
                className="input"
                required
                value={model.name}
                onChange={e => setModel({ ...model, name: e.target.value })}
                placeholder="Full Name / Company"
              />
            </div>
            <div className="stack tiny-gap">
              <label className="text-small muted" style={{ fontWeight: 600 }}>Primary Email *</label>
              <input
                className={`input ${fieldErrors.email ? 'error' : ''}`}
                type="email"
                required
                value={model.email}
                onChange={e => {
                  setModel({ ...model, email: e.target.value })
                  setFieldErrors(prev => { const n = { ...prev }; delete n.email; return n })
                }}
                onBlur={e => e.target.value && checkDuplicate('email', e.target.value)}
                placeholder="client@example.com"
              />
              {fieldErrors.email && <span className="text-small text-danger">{fieldErrors.email}</span>}
            </div>
            <div className="stack tiny-gap">
              <label className="text-small muted" style={{ fontWeight: 600 }}>Mobile Contact *</label>
              <input
                className={`input ${fieldErrors.phone ? 'error' : ''}`}
                required
                value={model.phone}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10)
                  setModel({ ...model, phone: val })
                  setFieldErrors(prev => { const n = { ...prev }; delete n.phone; return n })
                }}
                onBlur={e => e.target.value && checkDuplicate('phone', e.target.value)}
                placeholder="10-digit number"
                maxLength={10}
              />
              {fieldErrors.phone && <span className="text-small text-danger">{fieldErrors.phone}</span>}
            </div>
          </div>
        </div>

        {/* ── FIRMOGRAPHIC DETAILS ── */}
        <div className="stack gap-16">
          <div className="section-header-row">
            <div className="section-icon" style={{ background: 'linear-gradient(135deg, #10b981, #3b82f6)' }}>
              <Icon name="briefcase" size={18} color="white" />
            </div>
            <h4 className="section-title">Firmographic Details</h4>
          </div>

          <div className="grid2">
            <div className="stack tiny-gap">
              <label className="text-small muted" style={{ fontWeight: 600 }}>Business Sector</label>
              <input
                className="input"
                value={model.industry}
                onChange={e => setModel({ ...model, industry: e.target.value })}
                placeholder="e.g. Technology, Retail"
              />
            </div>
            <div className="stack tiny-gap">
              <label className="text-small muted" style={{ fontWeight: 600 }}>Geographic Hub</label>
              <input
                className="input"
                value={model.city}
                onChange={e => setModel({ ...model, city: e.target.value })}
                placeholder="City/Base"
              />
            </div>
            <div className="stack tiny-gap" style={{ gridColumn: '1 / -1' }}>
              <label className="text-small muted" style={{ fontWeight: 600 }}>Full Address</label>
              <input
                className="input"
                value={model.address}
                onChange={e => setModel({ ...model, address: e.target.value })}
                placeholder="Street, Area, Building"
              />
            </div>
          </div>
        </div>

        {/* ── ACCOUNT GOVERNANCE ── */}
        <div className="stack gap-16">
          <div className="section-header-row">
            <div className="section-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
              <Icon name="settings" size={18} color="white" />
            </div>
            <h4 className="section-title">Account Governance</h4>
          </div>

          <div className="grid2">
            <div className="stack tiny-gap">
              <label className="text-small muted" style={{ fontWeight: 600 }}>Operational Status</label>
              <select 
                className="input" 
                value={model.status} 
                onChange={e => setModel({ ...model, status: e.target.value })}
              >
                {availableStatuses.length > 0 ? (
                  availableStatuses.map(s => <option key={s.id} value={s.name}>{s.name}</option>)
                ) : (
                  <>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Prospect">Prospect</option>
                  </>
                )}
              </select>
            </div>

            {(user?.role === 'Admin' || user?.role === 'Manager') && (
              <div className="stack tiny-gap">
                <label className="text-small muted" style={{ fontWeight: 600 }}>Strategic Classification</label>
                <div style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '12px', display: 'flex', alignItems: 'center', height: '44px' }}>
                  <label className="row align-center gap-12 pointer no-select" style={{ fontSize: '0.9rem' }}>
                    <input
                      type="checkbox"
                      checked={model.is_vip}
                      onChange={(e) => setModel((prev) => ({ ...prev, is_vip: e.target.checked }))}
                    />
                    <span>Mark as Strategic VIP Account</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── ACTIONS ── */}
        <div className="row gap-16" style={{ marginTop: '20px', justifyContent: 'flex-end', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <button className="btn secondary" type="button" onClick={handleBack} style={{ padding: '12px 24px', borderRadius: '12px' }}>Cancel</button>
          <button 
            className="btn primary" 
            type="submit" 
            disabled={saving || checking}
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              padding: '12px 32px',
              borderRadius: '12px',
              border: 'none',
              boxShadow: '0 8px 16px rgba(59, 130, 246, 0.4)',
              fontWeight: 600
            }}
          >
            {saving ? 'Processing...' : checking ? 'Checking...' : (isEdit ? 'Update Profile' : 'Confirm Onboarding')}
          </button>
        </div>
      </form>
    </div>
  )
}
