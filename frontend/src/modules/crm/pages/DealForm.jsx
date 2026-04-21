import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { dealsApi } from '../../../services/deals.js'
import { customersApi } from '../../../services/customers.js'
import { usersApi } from '../../../services/users.js'
import { statusesApi } from '../../../services/statuses.js'
import PageHeader from '../../../components/PageHeader.jsx'
import { Icon } from '../../../layouts/icons.jsx'
import RichTextEditor from '../../../components/RichTextEditor.jsx'

const INITIAL_DEAL = {
  name: '',
  customer_id: '',
  expected_close_date: '',
  value: 0,
  currency: 'INR',
  status: 'New',
  assigned_to: '',
  description: '',
}

export default function DealForm({ mode, dealId, onSuccess, onCancel }) {
  const { id: paramsId } = useParams()
  const id = dealId || paramsId
  const navigate = useNavigate()
  const isEdit = mode === 'edit' || (!!id && id !== 'new')

  const [model, setModel] = useState(INITIAL_DEAL)
  const [customers, setCustomers] = useState([])
  const [users, setUsers] = useState([])
  const [availableStatuses, setAvailableStatuses] = useState([])
  const [loading, setLoading] = useState(isEdit && !!id)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadResources() {
      try {
        const [custRes, userRes, statRes] = await Promise.all([
          customersApi.list({ limit: 100 }),
          usersApi.list({ limit: 100 }),
          statusesApi.list('deal')
        ])
        setCustomers(custRes.items || [])
        setUsers(userRes.items || [])
        setAvailableStatuses(statRes || [])

        // Default status
        if (!isEdit && !dealId) {
          const defaultStat = statRes?.find(s => s.is_default)
          if (defaultStat) {
            setModel(prev => ({ ...prev, status: defaultStat.name }))
          }
        }
      } catch (err) {
        toast.error('Failed to load association data')
      }
    }
    loadResources()
  }, [isEdit, dealId])

  useEffect(() => {
    if (!isEdit || !id) return
    setLoading(true)
    dealsApi.get(id)
      .then(data => {
        setModel({
          ...INITIAL_DEAL,
          ...data,
          expected_close_date: data.expected_close_date ? new Date(data.expected_close_date).toISOString().split('T')[0] : '',
          customer_id: data.customer_id?._id || data.customer_id?.id || data.customer_id || '',
          assigned_to: data.assigned_to?._id || data.assigned_to?.id || data.assigned_to || '',
        })
      })
      .catch(() => {
        toast.error('Failed to load deal')
        if (onCancel) onCancel()
        else navigate('/deals')
      })
      .finally(() => setLoading(false))
  }, [id, isEdit, navigate, onCancel])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!model.name || !model.customer_id) {
      toast.warn('Key details missing')
      return
    }

    setSaving(true)
    try {
      const payload = { ...model }
      if (!payload.assigned_to) delete payload.assigned_to
      if (!payload.expected_close_date) delete payload.expected_close_date

      const saved = isEdit ? await dealsApi.update(id, payload) : await dealsApi.create(payload)
      toast.success(`Deal ${isEdit ? 'updated' : 'created'} successfully`)
      if (onSuccess) onSuccess(saved)
      else navigate(`/deals/${saved.id || id}`)
    } catch (err) {
      toast.error('Operation failed')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    if (onCancel) onCancel()
    else navigate(-1)
  }

  if (loading) return <div className="crm-loader-state">Analyzing Opportunity...</div>

  return (
    <div className="crm-form-page crmContent">
      <PageHeader title={isEdit ? 'Update Deal' : 'Initialize Transaction'} backTo="/deals" />

      <div className="crm-form-layout" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '40px' }}>
        <form className="card stack" onSubmit={handleSubmit}>
          <div className="grid2">
            <div className="stack tiny-gap">
              <label className="text-small muted" style={{ fontWeight: 600 }}>Title *</label>
              <input
                className="input"
                required
                value={model.name}
                onChange={(e) => setModel({ ...model, name: e.target.value })}
              />
            </div>
            <div className="stack tiny-gap">
              <label className="text-small muted" style={{ fontWeight: 600 }}>Customer Account *</label>
              <select
                className="input"
                required
                value={model.customer_id}
                onChange={(e) => setModel({ ...model, customer_id: e.target.value })}
              >
                <option value="">Select Account...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="border-bottom" style={{ margin: '12px 0', borderColor: 'var(--border)' }}></div>

          <div className="grid3">
            <div className="stack tiny-gap">
              <label className="text-small muted" style={{ fontWeight: 600 }}>Target Closure</label>
              <input
                className="input"
                type="date"
                value={model.expected_close_date}
                onChange={(e) => setModel({ ...model, expected_close_date: e.target.value })}
              />
            </div>
            <div className="stack tiny-gap">
              <label className="text-small muted" style={{ fontWeight: 600 }}>Sales Stage</label>
              <select className="input" value={model.status} onChange={(e) => setModel({ ...model, status: e.target.value })}>
                {availableStatuses.length > 0 ? (
                  availableStatuses.map(s => <option key={s.id} value={s.name}>{s.name}</option>)
                ) : (
                  ['New', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'].map(s => <option key={s} value={s}>{s}</option>)
                )}
              </select>
            </div>
            <div className="stack tiny-gap">
              <label className="text-small muted" style={{ fontWeight: 600 }}>Valuation</label>
              <div className="row tiny-gap">
                <select className="input" style={{ width: '90px' }} value={model.currency} onChange={(e) => setModel({ ...model, currency: e.target.value })}>
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                </select>
                <input
                  className="input"
                  style={{ flex: 1 }}
                  type="number"
                  value={model.value}
                  onChange={(e) => setModel({ ...model, value: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <div className="border-bottom" style={{ margin: '12px 0', borderColor: 'var(--border)' }}></div>

          <div className="grid2">
            <div className="stack tiny-gap">
              <label className="text-small muted" style={{ fontWeight: 600 }}>Deal Owner</label>
              <select
                className="input"
                value={model.assigned_to}
                onChange={(e) => setModel({ ...model, assigned_to: e.target.value })}
              >
                <option value="">Unassigned</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div className="stack tiny-gap" style={{ gridColumn: '1 / -1' }}>
              <label className="text-small muted" style={{ fontWeight: 600 }}>Scope Description</label>
              <RichTextEditor
                value={model.description}
                onChange={(val) => setModel(prev => ({ ...prev, description: val }))}
                height="150px"
              />
            </div>
          </div>

          <div className="tableActions" style={{ marginTop: '24px' }}>
            <button className="btn secondary" type="button" onClick={handleCancel}>
              Cancel
            </button>
            <button className="btn primary" type="submit" disabled={saving}>
              {saving ? 'Processing...' : (isEdit ? 'Update Deal' : 'Save Details')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
