import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../../../layouts/icons.jsx'
import { customersApi } from '../../../services/customers.js'
import { usersApi } from '../../../services/users.js'
import { dealsApi } from '../../../services/deals.js'
import { toast } from 'react-toastify'

const STAGES = ['New', 'Qualified', 'Proposal Sent', 'Negotiation', 'Won', 'Lost']

export default function DealModal({ deal, isOpen, onClose, onSave, customerId }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    customer_id: customerId || '',
    value: 0,
    stage: 'New',
    assigned_to: '',
    expected_close_date: '',
    description: '',
    lost_reason: ''
  })

  const [customers, setCustomers] = useState([])
  const [employees, setEmployees] = useState([])

  useEffect(() => {
    if (isOpen) {
      loadInitialData()
      if (deal && deal.id) {
        setFormData({
          name: deal.name || '',
          customer_id: deal.customer_id?.id || deal.customer_id?._id || deal.customer_id || customerId || '',
          value: deal.value || 0,
          stage: deal.stage || 'New',
          assigned_to: deal.assigned_to?.id || deal.assigned_to?._id || deal.assigned_to || '',
          expected_close_date: deal.expected_close_date ? new Date(deal.expected_close_date).toISOString().split('T')[0] : '',
          description: deal.description || '',
          lost_reason: deal.lost_reason || ''
        })
      } else {
        setFormData({
          name: '',
          customer_id: customerId || '',
          value: 0,
          stage: 'New',
          assigned_to: '',
          expected_close_date: '',
          description: '',
          lost_reason: ''
        })
      }
    }
  }, [isOpen, deal, customerId])

  async function loadInitialData() {
    try {
      const [cRes, uRes] = await Promise.all([
        customersApi.list({ limit: 'all' }),
        usersApi.list({ limit: 'all' })
      ])
      setCustomers(cRes.items || cRes || [])
      setEmployees(uRes.items || uRes || [])
    } catch (err) {
      console.error('Failed to load selection data')
    }
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault()
    if (!formData.name || !formData.customer_id) return toast.warn('Deal Name and Customer are required')
    if (formData.value <= 0) return toast.warn('Deal Amount must be a positive number')

    setLoading(true)
    try {
      let savedDeal
      if (deal?.id) {
        savedDeal = await dealsApi.update(deal.id, formData)
        toast.success('Deal updated')
      } else {
        savedDeal = await dealsApi.create(formData)
        toast.success('Deal created')
      }
      onSave(savedDeal)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const modalContent = (
    <div className="crm-modal-portal-overlay">
      <div className="crm-modal-sheet animate-sheet-in" style={{ maxWidth: '750px' }}>
        <div className="crm-modal-sheet-header">
          <div className="sheet-title-area">
            <h2 className="sheet-title">{deal?.id ? 'Update Deal' : 'Add New Deal'}</h2>
            <p className="sheet-subtitle">{deal?.id ? `Modifying transaction for ${formData.name}` : 'Configure a new revenue opportunity'}</p>
          </div>
        </div>

        <form className="crm-modal-sheet-body custom-scrollbar" onSubmit={handleSubmit}>
          <div className="sheet-content-container">
            {/* Core Opportunity */}
            <section className="form-sheet-section">
              <div className="form-sheet-section-header">
                <Icon name="deals" />
                <span>Opportunity Configuration</span>
              </div>
              <div className="form-sheet-grid">
                <div className="sheet-field full-width">
                  <label>Opportunity Name</label>
                  <input
                    className="crm-input"
                    autoFocus
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Q4 Infrastructure Renewal"
                    required
                  />
                </div>
                <div className="sheet-field">
                  <label>Associated Customer</label>
                  <select 
                    className="crm-input"
                    value={formData.customer_id}
                    onChange={e => setFormData({ ...formData, customer_id: e.target.value })}
                    required
                    disabled={!!customerId}
                  >
                    <option value="">Select Customer...</option>
                    {customers.map(c => <option key={c.id || c._id} value={c.id || c._id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="sheet-field">
                  <label>Projected Value (₹)</label>
                  <input
                    className="crm-input"
                    type="number"
                    value={formData.value}
                    onChange={e => setFormData({ ...formData, value: Number(e.target.value) })}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </section>

            {/* Pipeline Config */}
            <section className="form-sheet-section">
              <div className="form-sheet-section-header">
                <Icon name="settings" />
                <span>Pipeline Metrics</span>
              </div>
              <div className="form-sheet-grid">
                <div className="sheet-field">
                  <label>Sales Stage</label>
                  <select 
                    className="crm-input"
                    value={formData.stage}
                    onChange={e => setFormData({ ...formData, stage: e.target.value })}
                  >
                    {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="sheet-field">
                  <label>Assigned Staff</label>
                  <select 
                    className="crm-input"
                    value={formData.assigned_to}
                    onChange={e => setFormData({ ...formData, assigned_to: e.target.value })}
                    required
                  >
                    <option value="">Select owner...</option>
                    {employees.map(u => <option key={u.id || u._id} value={u.id || u._id}>{u.name}</option>)}
                  </select>
                </div>
                <div className="sheet-field">
                  <label>Target Closure Date</label>
                  <input 
                    className="crm-input"
                    type="date" 
                    value={formData.expected_close_date} 
                    onChange={e => setFormData({ ...formData, expected_close_date: e.target.value })} 
                  />
                </div>
              </div>
            </section>

            {/* Intel */}
            <section className="form-sheet-section no-border">
              <div className="form-sheet-section-header">
                <Icon name="info" />
                <span>Strategic Context</span>
              </div>
              <div className="form-sheet-grid">
                {formData.stage === 'Lost' && (
                  <div className="sheet-field full-width">
                    <label>Reason for Loss</label>
                    <textarea 
                      className="crm-input"
                      style={{ minHeight: '80px' }}
                      placeholder="Why was the deal closed?..."
                      value={formData.lost_reason}
                      onChange={e => setFormData({ ...formData, lost_reason: e.target.value })}
                      required
                    />
                  </div>
                )}
                <div className="sheet-field full-width">
                  <label>Internal Intelligence / Notes</label>
                  <textarea 
                    className="crm-input"
                    style={{ minHeight: '120px' }}
                    placeholder="Capture any critical information about this transaction..."
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>
            </section>
          </div>
        </form>

        <div className="crm-modal-sheet-footer">
          <p className="footer-hint">All fields are securely encrypted.</p>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button className="crm-btn-premium glass" type="button" onClick={onClose}>Cancel</button>
            <button className="crm-btn-premium vibrant" type="submit" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Processing...' : deal?.id ? 'Save Changes' : 'Create Deal'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
