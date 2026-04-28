import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { supportApi } from '../../../services/workflow.js'
import { customersApi } from '../../../services/customers.js'
import { usersApi } from '../../../services/users.js'
import { Icon } from '../../../layouts/icons.jsx'
import { useAuth } from '../../../context/AuthContext.jsx'

export default function TicketForm({ mode, ticketId, onSuccess, onCancel }) {
  const { id: paramsId } = useParams()
  const [searchParams] = useSearchParams()
  const id = ticketId || paramsId
  const navigate = useNavigate()
  const { user } = useAuth()
  const isEdit = mode === 'edit' || (!!id && id !== 'new')
  const isCustomer = user?.role === 'Customer'

  const [formData, setFormData] = useState({
    customer_id: searchParams.get('customer_id') || '',
    user_customer_id: '',
    subject: '',
    description: '',
    priority: 'medium',
    category: 'General',
    assigned_to: '',
  })

  const [customers, setCustomers] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(isEdit && !!id)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadResources() {
      try {
        const [custRes, usersRes] = await Promise.all([
          customersApi.list({ limit: 100 }),
          usersApi.list({ limit: 100 })
        ])
        setCustomers(custRes.items || [])
        setAllUsers(usersRes.items || [])
      } catch (err) {
        toast.error('Failed to load association data')
      }
    }
    if (!isCustomer) loadResources()
  }, [isCustomer])

  useEffect(() => {
    if (!isEdit || !id) return
    setLoading(true)
    supportApi.get(id)
      .then(ticket => {
        setFormData({
          customer_id: ticket.customer_id?._id || ticket.customer_id?.id || ticket.customer_id || '',
          user_customer_id: ticket.user_customer_id?._id || ticket.user_customer_id?.id || '',
          subject: ticket.subject || '',
          description: ticket.description || '',
          priority: ticket.priority || 'medium',
          category: ticket.category || 'General',
          assigned_to: ticket.assigned_to?._id || ticket.assigned_to?.id || ticket.assigned_to || '',
        })
      })
      .catch(() => {
        toast.error('Failed to load ticket')
        if (onCancel) onCancel(); else navigate('/tickets')
      })
      .finally(() => setLoading(false))
  }, [id, isEdit, navigate, onCancel])

  async function handleSubmit(e) {
    if (e) e.preventDefault()
    if (!formData.subject || !formData.description) return toast.warn('Subject and Description are required')

    setSaving(true)
    try {
      if (isEdit) await supportApi.update(id, formData)
      else await supportApi.create(formData)
      toast.success(`Ticket ${isEdit ? 'updated' : 'created'}`)
      if (onSuccess) onSuccess(); else navigate('/tickets')
    } catch (err) { toast.error('Failed to save') } finally { setSaving(false) }
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

  if (loading) return <div className="p-40 text-center text-dimmed">Loading ticket details...</div>

  return (
    <div className="crm-modal-portal-overlay">
      <div className="crm-modal-sheet animate-sheet-in">
        <div className="crm-modal-sheet-header">
          <div className="sheet-title-area">
            <h2 className="sheet-title">{isEdit ? 'Edit Support Ticket' : 'Raise New Ticket'}</h2>
            <p className="sheet-subtitle">{isEdit ? `Refining ticket ID: ${id}` : 'Submit a support request to the helpdesk'}</p>
          </div>
        </div>

        <form className="crm-modal-sheet-body custom-scrollbar" onKeyDown={handleKeyDown} onSubmit={handleSubmit}>
          <div className="sheet-content-container">
            {/* Account Linking */}
            {!isCustomer && (
              <section className="form-sheet-section">
                <div className="form-sheet-section-header">
                  <Icon name="user" />
                  <span>Account Linking</span>
                </div>
                <div className="form-sheet-grid">
                  <div className="sheet-field">
                    <label>Customer Account</label>
                    <select className="crm-input" value={formData.customer_id} onChange={e => setFormData({ ...formData, customer_id: e.target.value })}>
                      <option value="">None / Internal Only</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="sheet-field">
                    <label>System User</label>
                    <select className="crm-input" value={formData.user_customer_id} onChange={e => setFormData({ ...formData, user_customer_id: e.target.value })}>
                      <option value="">Select User...</option>
                      {allUsers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                    </select>
                  </div>
                </div>
              </section>
            )}

            {/* Ticket Details */}
            <section className="form-sheet-section">
              <div className="form-sheet-section-header">
                <Icon name="activity" />
                <span>Ticket Intelligence</span>
              </div>
              <div className="form-sheet-grid">
                <div className="sheet-field full-width">
                  <label>Subject</label>
                  <input
                    className="crm-input"
                    autoFocus
                    value={formData.subject}
                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Brief summary of the issue"
                  />
                </div>
                <div className="sheet-field full-width">
                  <label>Detailed Description</label>
                  <textarea
                    className="crm-input"
                    style={{ minHeight: '120px' }}
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Provide as much detail as possible..."
                  />
                </div>
              </div>
            </section>

            {/* Configuration */}
            <section className="form-sheet-section no-border">
              <div className="form-sheet-section-header">
                <Icon name="settings" />
                <span>Classification & Assignment</span>
              </div>
              <div className="form-sheet-grid">
                <div className="sheet-field">
                  <label>Priority</label>
                  <select className="crm-input" value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="sheet-field">
                  <label>Category</label>
                  <select className="crm-input" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                    <option value="General">General Inquiry</option>
                    <option value="Technical">Technical Issue</option>
                    <option value="Billing">Billing/Payments</option>
                    <option value="Bug">Software Bug</option>
                    <option value="Feature">Feature Request</option>
                  </select>
                </div>
                {!isCustomer && (
                  <div className="sheet-field">
                    <label>Assign To</label>
                    <select className="crm-input" value={formData.assigned_to} onChange={e => setFormData({ ...formData, assigned_to: e.target.value })}>
                      <option value="">Not Assigned</option>
                      {allUsers.filter(u => u.role !== 'Customer').map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </section>
          </div>
        </form>

        <div className="crm-modal-sheet-footer">
          <p className="footer-hint">Our support team will review this ticket within 24 hours.</p>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button className="btn-premium secondary" onClick={() => (onCancel ? onCancel() : navigate(-1))}>Cancel</button>
            <button className="btn-premium action-vibrant" disabled={saving} onClick={handleSubmit}>
              {saving ? 'Processing...' : isEdit ? 'Save Changes' : 'Create Ticket'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
