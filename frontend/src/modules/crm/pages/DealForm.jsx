import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { dealsApi } from '../../../services/deals.js'
import { customersApi } from '../../../services/customers.js'
import { usersApi } from '../../../services/users.js'
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
        if (onCancel) onCancel(); else navigate('/deals')
      })
      .finally(() => setLoading(false))
  }, [id, isEdit, navigate, onCancel])

  async function handleSubmit(e) {
    if (e) e.preventDefault()
    if (!model.name || !model.customer_id) return toast.warn('Opportunity Name and Customer are required')

    setSaving(true)
    try {
      const payload = { ...model }
      if (!payload.assigned_to) delete payload.assigned_to
      if (!payload.expected_close_date) delete payload.expected_close_date
      if (!payload.actual_close_date) delete payload.actual_close_date

      const saved = isEdit ? await dealsApi.update(id, payload) : await dealsApi.create(payload)
      toast.success(`Deal ${isEdit ? 'updated' : 'created'}`)
      if (onSuccess) onSuccess(saved); else navigate(`/deals/${saved.id || id}`)
    } catch (err) { toast.error('Failed to save deal') } finally { setSaving(false) }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      const form = e.target.form
      if (!form || e.target.tagName === 'TEXTAREA' || e.target.type === 'submit' || e.target.closest('.ql-editor')) return
      e.preventDefault()
      const index = Array.from(form.elements).indexOf(e.target)
      const nextElement = form.elements[index + 1]
      if (nextElement && nextElement.tagName !== 'BUTTON') nextElement.focus()
      else handleSubmit(e)
    }
  }

  if (loading) return <div className="p-40 text-center text-dimmed">Analyzing opportunity data...</div>

  return (
    <div className="crm-modal-portal-overlay">
      <div className="crm-modal-sheet animate-sheet-in">
        <div className="crm-modal-sheet-header">
          <div className="sheet-title-area">
            <h2 className="sheet-title">{isEdit ? 'Update Deal' : 'Initialize Deal'}</h2>
            <p className="sheet-subtitle">{isEdit ? `Editing transaction for ${model.name}` : 'Configure a new revenue opportunity'}</p>
          </div>
        </div>

        <form className="crm-modal-sheet-body custom-scrollbar" onKeyDown={handleKeyDown} onSubmit={handleSubmit}>
          <div className="sheet-content-container">
            {/* Core Opportunity */}
            <section className="form-sheet-section">
              <div className="form-sheet-section-header">
                <Icon name="deals" />
                <span>Core Opportunity</span>
              </div>
              <div className="form-sheet-grid">
                <div className="sheet-field full-width">
                  <label>Opportunity Name</label>
                  <input
                    className="crm-input"
                    autoFocus
                    value={model.name}
                    onChange={e => setModel({ ...model, name: e.target.value })}
                    placeholder="e.g. Q4 Server Expansion"
                  />
                </div>
                <div className="sheet-field">
                  <label>Associated Customer</label>
                  <select className="crm-input" value={model.customer_id} onChange={e => setModel({ ...model, customer_id: e.target.value })}>
                    <option value="">Select Customer</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="sheet-field">
                  <label>Financial Value (₹)</label>
                  <input
                    className="crm-input"
                    type="number"
                    value={model.value}
                    onChange={e => setModel({ ...model, value: Number(e.target.value) })}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </section>

            {/* Pipeline Config */}
            <section className="form-sheet-section">
              <div className="form-sheet-section-header">
                <Icon name="settings" />
                <span>Pipeline Configuration</span>
              </div>
              <div className="form-sheet-grid">
                <div className="sheet-field">
                  <label>Sales Stage</label>
                  <select className="crm-input" value={model.stage} onChange={e => setModel({ ...model, stage: e.target.value })}>
                    {['Pending', 'New', 'Contacted', 'Negotiation', 'Won', 'Lost'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="sheet-field">
                  <label>Priority Level</label>
                  <select className="crm-input" value={model.priority} onChange={e => setModel({ ...model, priority: e.target.value })}>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div className="sheet-field">
                  <label>Expected Close Date</label>
                  <input className="crm-input" type="date" value={model.expected_close_date} onChange={e => setModel({ ...model, expected_close_date: e.target.value })} />
                </div>
                <div className="sheet-field">
                  <label>Portfolio Owner</label>
                  <select className="crm-input" value={model.assigned_to} onChange={e => setModel({ ...model, assigned_to: e.target.value })}>
                    <option value="">Unassigned</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>
            </section>

            {/* Intelligence */}
            <section className="form-sheet-section no-border">
              <div className="form-sheet-section-header">
                <Icon name="info" />
                <span>Opportunity Intelligence</span>
              </div>
              <div className="sheet-field full-width">
                <label>Strategic Description</label>
                <div style={{ marginTop: '8px' }}>
                  <RichTextEditor
                    value={model.description}
                    onChange={val => setModel(prev => ({ ...prev, description: val }))}
                    height="200px"
                  />
                </div>
              </div>
            </section>
          </div>
        </form>

        <div className="crm-modal-sheet-footer">
          <p className="footer-hint">Financial projections are calculated in real-time.</p>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button className="btn-premium secondary" onClick={() => (onCancel ? onCancel() : navigate(-1))}>Cancel</button>
            <button className="btn-premium action-vibrant" disabled={saving} onClick={handleSubmit}>
              {saving ? 'Processing...' : isEdit ? 'Save Changes' : 'Create Deal'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
