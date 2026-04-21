import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { supportApi } from '../../../services/workflow.js'
import { customersApi } from '../../../services/customers.js'
import { usersApi } from '../../../services/users.js'
import PageHeader from '../../../components/PageHeader.jsx'
import { Icon } from '../../../layouts/icons.jsx'
import RichTextEditor from '../../../components/RichTextEditor.jsx'

export default function TicketForm({ mode, ticketId, onSuccess, onCancel }) {
  const { id: paramsId } = useParams()
  const [searchParams] = useSearchParams()
  const id = ticketId || paramsId
  const navigate = useNavigate()
  const isEdit = mode === 'edit' || (!!id && id !== 'new')

  const [formData, setFormData] = useState({
    customer_id: searchParams.get('customer_id') || '',
    subject: '',
    description: '',
    priority: 'medium',
    category: 'General',
    assigned_to: '',
  })

  const [customers, setCustomers] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [loading, setLoading] = useState(isEdit && !!id)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadResources() {
      try {
        const [custRes, teamRes] = await Promise.all([
          customersApi.list({ limit: 100 }),
          usersApi.list({ limit: 100 })
        ])
        setCustomers(custRes.items || [])
        setTeamMembers(teamRes.items || [])
      } catch (err) {
        toast.error('Failed to load association data')
      }
    }
    loadResources()
  }, [])

  useEffect(() => {
    if (!isEdit || !id) return
    setLoading(true)
    supportApi.get(id)
      .then(ticket => {
        setFormData({
          customer_id: ticket.customer_id?._id || ticket.customer_id?.id || ticket.customer_id || '',
          subject: ticket.subject || '',
          description: ticket.description || '',
          priority: ticket.priority || 'medium',
          category: ticket.category || 'General',
          assigned_to: ticket.assigned_to?._id || ticket.assigned_to?.id || ticket.assigned_to || '',
        })
      })
      .catch(() => {
        toast.error('Failed to load ticket')
        if (onCancel) onCancel()
        else navigate('/tickets')
      })
      .finally(() => setLoading(false))
  }, [id, isEdit, navigate, onCancel])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!formData.customer_id || !formData.subject) {
      toast.warn('Key details missing')
      return
    }

    setSaving(true)
    try {
      if (isEdit) {
        await supportApi.update(id, formData)
        toast.success('Ticket updated')
      } else {
        await supportApi.create(formData)
        toast.success('Ticket created')
      }
      if (onSuccess) onSuccess()
      else navigate('/tickets')
    } catch (err) {
      toast.error('Update failed')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    if (onCancel) onCancel()
    else navigate(-1)
  }

  if (loading) return <div className="crm-loader-state">Retrieving Case File...</div>

  return (
    <div className="crm-form-page crmContent">
      <PageHeader title={isEdit ? 'Update Ticket' : 'Support Intake'} backTo="/tickets" />

      <div className="crm-form-layout" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '40px' }}>
        <form className="card stack" onSubmit={handleSubmit}>
          <div className="grid3">
            <div className="stack tiny-gap">
              <label className="text-small muted" style={{ fontWeight: 600 }}>Customer Account *</label>
              <select
                className="input"
                required
                value={formData.customer_id}
                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
              >
                <option value="">Select Account...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="stack tiny-gap" style={{ gridColumn: 'span 2' }}>
              <label className="text-small muted" style={{ fontWeight: 600 }}>Issue Subject *</label>
              <input
                className="input"
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Brief summary of the issue"
              />
            </div>
          </div>

          <div className="border-bottom" style={{ margin: '12px 0', borderColor: 'var(--border)' }}></div>

          <div className="grid3">
            <div className="stack tiny-gap">
              <label className="text-small muted" style={{ fontWeight: 600 }}>Severity Level</label>
              <select className="input" value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="stack tiny-gap">
              <label className="text-small muted" style={{ fontWeight: 600 }}>Support Category</label>
              <select className="input" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                <option value="General">General Inquiry</option>
                <option value="Technical">Technical Issue</option>
                <option value="Billing">Billing/Payments</option>
                <option value="Feature">Feature Request</option>
              </select>
            </div>
            <div className="stack tiny-gap">
              <label className="text-small muted" style={{ fontWeight: 600 }}>Service Agent</label>
              <select className="input" value={formData.assigned_to} onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}>
                <option value="">Unassigned</option>
                {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>

          <div className="border-bottom" style={{ margin: '12px 0', borderColor: 'var(--border)' }}></div>

          <div className="stack tiny-gap">
            <label className="text-small muted" style={{ fontWeight: 600 }}>Detailed Investigation Notes</label>
            <RichTextEditor
              value={formData.description}
              onChange={(val) => setFormData(prev => ({ ...prev, description: val }))}
              height="200px"
            />
          </div>

          <div className="tableActions" style={{ marginTop: '24px' }}>
            <button className="btn secondary" type="button" onClick={handleCancel}>
              Dismiss
            </button>
            <button className="btn primary" type="submit" disabled={saving}>
              {saving ? 'Processing...' : (isEdit ? 'Update Ticket' : 'Open Ticket')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
