import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
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
  actual_close_date: '',
  value: 0,
  currency: 'INR',
  stage: 'New',
  assigned_to: '',
  description: '',
  priority: 'Medium',
  notes: '',
}

export default function DealForm({ mode, dealId, onSuccess, onCancel }) {
  const { id: paramsId } = useParams()
  const [searchParams] = useSearchParams()
  const preSelectedCustomerId = searchParams.get('customer_id')
  
  const id = dealId || paramsId
  const navigate = useNavigate()
  const isEdit = mode === 'edit' || (!!id && id !== 'new')

  const [model, setModel] = useState({
    ...INITIAL_DEAL,
    customer_id: preSelectedCustomerId || ''
  })
  const [customers, setCustomers] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(isEdit && !!id)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadResources() {
      try {
        const [custRes, userRes] = await Promise.all([
          customersApi.list({ limit: 100 }),
          usersApi.list({ limit: 100 })
        ])
        setCustomers(custRes.items || [])
        setUsers(userRes.items || [])
      } catch (err) {
        toast.error('Failed to load association data')
      }
    }
    loadResources()
  }, [])

  useEffect(() => {
    if (!isEdit || !id) return
    setLoading(true)
    dealsApi.get(id)
      .then(data => {
        setModel({
          ...INITIAL_DEAL,
          ...data,
          expected_close_date: data.expected_close_date ? new Date(data.expected_close_date).toISOString().split('T')[0] : '',
          actual_close_date: data.actual_close_date ? new Date(data.actual_close_date).toISOString().split('T')[0] : '',
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
      if (!payload.actual_close_date) delete payload.actual_close_date

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

      <div className="crm-form-layout" style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '40px' }}>
        <form onSubmit={handleSubmit} className="stack gap-24">
          {/* ── CORE OPPORTUNITY ── */}
          <div className="stack gap-16">
            <div className="section-header-row">
              <div className="section-icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                <Icon name="deals" size={18} color="white" />
              </div>
              <h4 className="section-title">Core Opportunity</h4>
            </div>

            <div className="stack tiny-gap">
              <label className="text-small muted" style={{ fontWeight: 600 }}>Opportunity Name *</label>
              <input
                className="input"
                required
                value={model.name}
                onChange={(e) => setModel({ ...model, name: e.target.value })}
                placeholder="e.g. Q4 Cloud Infrastructure Upgrade"
              />
            </div>

            <div className="grid2">
              <div className="stack tiny-gap">
                <label className="text-small muted" style={{ fontWeight: 600 }}>Associated Customer *</label>
                <select
                  className="input"
                  required
                  value={model.customer_id}
                  onChange={(e) => setModel({ ...model, customer_id: e.target.value })}
                >
                  <option value="">Select Customer</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="stack tiny-gap">
                <label className="text-small muted" style={{ fontWeight: 600 }}>Financial Value (₹) *</label>
                <input
                  className="input"
                  required
                  type="number"
                  value={model.value}
                  onChange={(e) => setModel({ ...model, value: Number(e.target.value) })}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* ── PIPELINE CONFIGURATION ── */}
          <div className="stack gap-16">
            <div className="section-header-row">
              <div className="section-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)' }}>
                <Icon name="settings" size={18} color="white" />
              </div>
              <h4 className="section-title">Pipeline Configuration</h4>
            </div>

            <div className="grid3">
              <div className="stack tiny-gap">
                <label className="text-small muted" style={{ fontWeight: 600 }}>Sales Stage</label>
                <select className="input" value={model.stage} onChange={(e) => setModel({ ...model, stage: e.target.value })}>
                  {['Pending', 'New', 'Contacted', 'Negotiation', 'Won', 'Lost'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="stack tiny-gap">
                <label className="text-small muted" style={{ fontWeight: 600 }}>Priority Level</label>
                <select className="input" value={model.priority} onChange={(e) => setModel({ ...model, priority: e.target.value })}>
                  <option value="High">Critical / High</option>
                  <option value="Medium">Standard / Medium</option>
                  <option value="Low">Low Priority</option>
                </select>
              </div>
              <div className="stack tiny-gap">
                <label className="text-small muted" style={{ fontWeight: 600 }}>Portfolio Owner</label>
                <select className="input" value={model.assigned_to} onChange={(e) => setModel({ ...model, assigned_to: e.target.value })}>
                  <option value="">Unassigned</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid2">
              <div className="stack tiny-gap">
                <label className="text-small muted" style={{ fontWeight: 600 }}>Expected Close Date</label>
                <input className="input" type="date" value={model.expected_close_date} onChange={(e) => setModel({ ...model, expected_close_date: e.target.value })} />
              </div>
              <div className="stack tiny-gap">
                <label className="text-small muted" style={{ fontWeight: 600 }}>Actual Close Date</label>
                <input className="input" type="date" value={model.actual_close_date} onChange={(e) => setModel({ ...model, actual_close_date: e.target.value })} />
              </div>
            </div>
          </div>

          {/* ── INTELLIGENCE & NOTES ── */}
          <div className="stack gap-16">
            <div className="section-header-row">
              <div className="section-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                <Icon name="info" size={18} color="white" />
              </div>
              <h4 className="section-title">Opportunity Intelligence</h4>
            </div>

            <div className="stack tiny-gap">
              <label className="text-small muted" style={{ fontWeight: 600 }}>Strategic Description</label>
              <RichTextEditor
                value={model.description}
                onChange={(val) => setModel(prev => ({ ...prev, description: val }))}
                height="180px"
              />
            </div>

            <div className="stack tiny-gap">
              <label className="text-small muted" style={{ fontWeight: 600 }}>Internal Coordinator Notes</label>
              <textarea
                className="input"
                style={{ minHeight: '100px', borderRadius: '12px' }}
                placeholder="Private notes for internal follow-up..."
                value={model.notes}
                onChange={(e) => setModel({ ...model, notes: e.target.value })}
              />
            </div>
          </div>

          {/* ── ACTIONS ── */}
          <div className="row gap-16" style={{ marginTop: '20px', justifyContent: 'flex-end', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <button className="btn secondary" type="button" onClick={handleCancel} style={{ padding: '12px 24px', borderRadius: '12px' }}>Cancel</button>
            <button 
              className="btn primary" 
              type="submit" 
              disabled={saving}
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                padding: '12px 32px',
                borderRadius: '12px',
                border: 'none',
                boxShadow: '0 8px 16px rgba(59, 130, 246, 0.4)',
                fontWeight: 600
              }}
            >
              {saving ? 'Processing…' : (isEdit ? 'Update Transaction' : 'Initiate Deal')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
