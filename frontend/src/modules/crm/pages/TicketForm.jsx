import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { supportApi } from '../../../services/workflow.js'
import { customersApi } from '../../../services/customers.js'
import { usersApi } from '../../../services/users.js'
import PageHeader from '../../../components/PageHeader.jsx'
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
  const canManage = user?.role === 'Admin' || user?.role === 'Manager'

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
    if (!isCustomer) {
      loadResources()
    }
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
        if (onCancel) onCancel()
        else navigate('/tickets')
      })
      .finally(() => setLoading(false))
  }, [id, isEdit, navigate, onCancel])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!formData.subject || !formData.description) {
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
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="center padding60"><div className="loader-premium" /></div>

  return (
    <div className="crm-form-page ticket-form-immersive">
      <PageHeader title={isEdit ? 'Edit Ticket' : 'Create Support Ticket'} backTo="/tickets" />

      <div className="form-container-glass">
        <form className="glass-card stack gap-32" onSubmit={handleSubmit}>
          
          {!isCustomer && (
            <section className="form-section">
               <div className="section-header">
                 <Icon name="user" />
                 <span>Link Customer</span>
               </div>
               <div className="grid-2">
                  <div className="intel-field">
                    <label>Customer Account</label>
                    <select
                      className="select-premium"
                      value={formData.customer_id}
                      onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                    >
                      <option value="">None / System User Only</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.company})</option>)}
                    </select>
                  </div>
                  <div className="intel-field">
                    <label>System User</label>
                    <select
                      className="select-premium"
                      value={formData.user_customer_id}
                      onChange={(e) => setFormData({ ...formData, user_customer_id: e.target.value })}
                    >
                      <option value="">Select System User...</option>
                      {allUsers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                    </select>
                  </div>
               </div>
            </section>
          )}

          <section className="form-section">
             <div className="section-header">
               <Icon name="activity" />
               <span>Ticket Details</span>
             </div>
             <div className="stack gap-20">
                <div className="intel-field">
                  <label>Subject</label>
                  <input
                    className="input-premium"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="What is the problem?..."
                  />
                </div>
                <div className="intel-field">
                  <label>Description</label>
                  <textarea
                    className="textarea-premium"
                    required
                    style={{ minHeight: '150px' }}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Explain the issue in detail..."
                  />
                </div>
             </div>
          </section>

          <section className="form-section">
             <div className="section-header">
               <Icon name="dashboard" />
               <span>Settings</span>
             </div>
             <div className="grid-3">
                <div className="intel-field">
                  <label>Priority</label>
                  <select className="select-premium" value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="intel-field">
                  <label>Category</label>
                  <select className="select-premium" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                    <option value="General">General Inquiry</option>
                    <option value="Technical">Technical Issue</option>
                    <option value="Billing">Billing/Payments</option>
                    <option value="Bug">Software Bug</option>
                    <option value="Feature">Feature Request</option>
                  </select>
                </div>
                {!isCustomer && (
                  <div className="intel-field">
                    <label>Assign To</label>
                    <select className="select-premium" value={formData.assigned_to} onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}>
                      <option value="">Not Assigned</option>
                      {allUsers.filter(u => u.role !== 'Customer').map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                      ))}
                    </select>
                  </div>
                )}
             </div>
          </section>

          <div className="form-footer flex gap-16 justify-end">
            <button className="btn-premium action-secondary" type="button" onClick={() => navigate(-1)}>
              Cancel
            </button>
            <button className="btn-premium action-vibrant" type="submit" disabled={saving}>
              <Icon name={isEdit ? 'activity' : 'plus'} />
              <span>{saving ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Support Ticket')}</span>
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .ticket-form-immersive { padding-bottom: 60px; }
        .form-container-glass { max-width: 900px; margin: 0 auto; margin-top: 32px; }
        .glass-card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 32px; padding: 40px; box-shadow: var(--shadow-2xl); position: relative; overflow: hidden; }
        .glass-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: var(--grad-primary); }
        
        .form-section { border-bottom: 1px solid var(--border); padding-bottom: 32px; }
        .form-section:last-of-type { border-bottom: none; }
        .section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; }
        .section-header span { font-size: 0.85rem; font-weight: 800; text-transform: uppercase; color: var(--text-dimmed); letter-spacing: 0.1em; }
        .section-header svg { color: var(--primary); }
        
        .intel-field label { display: block; font-size: 0.72rem; font-weight: 800; color: var(--text-dimmed); text-transform: uppercase; margin-bottom: 10px; letter-spacing: 0.05em; }
        .input-premium, .select-premium, .textarea-premium { width: 100%; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border); border-radius: 12px; color: white; padding: 14px 18px; font-size: 1rem; outline: none; transition: all 0.2s; }
        .input-premium:focus, .select-premium:focus, .textarea-premium:focus { border-color: var(--primary); background: rgba(255, 255, 255, 0.05); box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); }
        
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; }
        @media (max-width: 768px) { .grid-2, .grid-3 { grid-template-columns: 1fr; } }
        
        .form-footer { margin-top: 16px; border-top: 1px solid var(--border); padding-top: 32px; }
        .loader-premium { width: 40px; height: 40px; border: 4px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
