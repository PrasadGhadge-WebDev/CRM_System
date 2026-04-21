import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { customersApi } from '../../../services/customers.js'
import { statusesApi } from '../../../services/statuses.js'
import { useAuth } from '../../../context/AuthContext.jsx'
import PageHeader from '../../../components/PageHeader.jsx'
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
          // New customer, set default status
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
  }, [id, isEdit, navigate, onCancel, customerId])

  // Real-time duplicate check for email/phone using the search (q) endpoint
  const checkDuplicate = useCallback(async (field, value) => {
    if (!value || !value.trim()) return
    setChecking(true)
    try {
      const res = await customersApi.list({ q: value.trim(), limit: 5 })
      const items = res?.items || []
      // Exact match check on the specific field
      const conflict = items.find(c => {
        const matches = field === 'email'
          ? c.email?.toLowerCase() === value.trim().toLowerCase()
          : c.phone === value.trim()
        // In edit mode, ignore matching against the current record
        return matches && (isEdit ? c.id !== id : true)
      })
      if (conflict) {
        setFieldErrors(prev => ({ ...prev, [field]: `This ${field} is already registered to "${conflict.name}"` }))
      } else {
        setFieldErrors(prev => { const next = { ...prev }; delete next[field]; return next })
      }
    } catch {
      // silent — backend will catch it on submit
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

    // Phone format validation: must be exactly 10 digits
    if (!/^\d{10}$/.test(model.phone.trim())) {
      setFieldErrors(prev => ({ ...prev, phone: 'Phone number must be exactly 10 digits' }))
      toast.warn('Please enter a valid 10-digit phone number')
      return
    }

    // Block submit if there are known field conflicts
    if (Object.keys(fieldErrors).length > 0) {
      toast.warn('Please fix the highlighted errors before submitting')
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
      // Highlight the specific conflicting field if backend tells us
      if (msg.toLowerCase().includes('email')) {
        setFieldErrors(prev => ({ ...prev, email: msg }))
      } else if (msg.toLowerCase().includes('phone')) {
        setFieldErrors(prev => ({ ...prev, phone: msg }))
      }
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    if (onCancel) onCancel()
    else navigate(-1)
  }

  if (loading) return <div className="crm-loader-state">Synchronizing Profile...</div>

  return (
    <div className="crm-form-page crmContent">
      <PageHeader title={isEdit ? 'Update Customer' : 'Onboard Client'} backTo="/customers" />

      <div className="crm-form-layout" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '40px' }}>
        <form className="card stack" onSubmit={onSubmit}>
          <div className="grid3">
            <div className="stack tiny-gap">
              <label className="text-small muted" style={{ fontWeight: 600 }}>Name *</label>
              <input
                className="input"
                required
                value={model.name}
                onChange={e => setModel({ ...model, name: e.target.value })}
                placeholder="Client Name"
              />
            </div>
            <div className="stack tiny-gap">
              <label className="text-small muted" style={{ fontWeight: 600 }}>Primary Email *</label>
              <input
                className={`input ${fieldErrors.email ? 'input-error' : ''}`}
                type="email"
                required
                value={model.email}
                onChange={e => {
                  const val = e.target.value
                  setModel({ ...model, email: val })
                  setFieldErrors(prev => { const n = { ...prev }; delete n.email; return n })
                }}
                onBlur={e => e.target.value && checkDuplicate('email', e.target.value)}
                placeholder="client@example.com"
              />
              {fieldErrors.email && (
                <span className="field-error-msg">⚠ {fieldErrors.email}</span>
              )}
            </div>
            <div className="stack tiny-gap">
              <label className="text-small muted" style={{ fontWeight: 600 }}>Mobile Contact *</label>
              <input
                className={`input ${fieldErrors.phone ? 'input-error' : ''}`}
                required
                value={model.phone}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10)
                  setModel({ ...model, phone: val })
                  setFieldErrors(prev => { const n = { ...prev }; delete n.phone; return n })
                }}
                onBlur={e => e.target.value && checkDuplicate('phone', e.target.value)}
                maxLength={10}
                placeholder="10-digit number"
              />
              {fieldErrors.phone && (
                <span className="field-error-msg">⚠ {fieldErrors.phone}</span>
              )}
            </div>
          </div>

          <div className="border-bottom" style={{ margin: '12px 0', borderColor: 'var(--border)' }}></div>

          <div className="grid2">
            <div className="stack tiny-gap">
              <label className="text-small muted" style={{ fontWeight: 600 }}>Business Sector</label>
              <input
                className="input"
                value={model.industry}
                onChange={e => setModel({ ...model, industry: e.target.value })}
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
              <label className="text-small muted" style={{ fontWeight: 600 }}>Office Address</label>
              <input
                className="input"
                value={model.address}
                onChange={e => setModel({ ...model, address: e.target.value })}
              />
            </div>
            <div className="stack tiny-gap">
              <label className="text-small muted" style={{ fontWeight: 600 }}>Account Status</label>
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
          </div>

          {(user?.role === 'Admin' || user?.role === 'Manager') && (
            <>
              <div className="border-bottom" style={{ margin: '12px 0', borderColor: 'var(--border)' }}></div>
              <div className="stack tiny-gap">
                <label className="text-small muted" style={{ fontWeight: 600 }}>Strategic Classification</label>
                <div style={{ padding: '12px 16px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <label className="row align-center gap-12 pointer">
                    <input
                      type="checkbox"
                      checked={model.is_vip}
                      onChange={(e) => setModel((prev) => ({ ...prev, is_vip: e.target.checked }))}
                    />
                    <span style={{ fontSize: '0.9rem', color: 'var(--text)' }}>
                      Strategic VIP Account
                    </span>
                  </label>
                </div>
              </div>
            </>
          )}

          <div className="tableActions" style={{ marginTop: '24px' }}>
            <button className="btn secondary" type="button" onClick={handleCancel}>
              Cancel
            </button>
            <button className="btn primary" type="submit" disabled={saving || checking}>
              {saving ? 'Processing...' : checking ? 'Checking...' : (isEdit ? 'Update Profile' : 'Confirm Onboarding')}
            </button>
          </div>
        </form>

        <style>{`
          .input-error { border-color: var(--danger, #ef4444) !important; box-shadow: 0 0 0 3px rgba(239,68,68,0.15) !important; }
          .field-error-msg { display: block; font-size: 0.73rem; color: var(--danger, #ef4444); font-weight: 600; margin-top: 4px; animation: fadeInDown 0.2s ease; }
          @keyframes fadeInDown { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
      </div>
    </div>
  )
}
