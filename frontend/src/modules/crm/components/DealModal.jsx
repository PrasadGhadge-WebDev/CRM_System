import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../../../layouts/icons.jsx'
import { customersApi } from '../../../services/customers.js'
import { usersApi } from '../../../services/users.js'
import { dealsApi } from '../../../services/deals.js'
import { toast } from 'react-toastify'
import SearchableSelect from './SearchableSelect.jsx'
import RichTextEditor from '../../../components/RichTextEditor.jsx'
import { useAuth } from '../../../context/AuthContext'

import { 
  validateRequired, 
  validateNonNegativeNumber 
} from '../../../utils/formValidation.js'

const STAGES = ['New', 'Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost']

export default function DealModal({ deal, isOpen, onClose, onSave, customerId }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    customer_id: customerId || '',
    value: 0,
    currency: 'INR',
    stage: 'New',
    status: 'Open',
    assigned_to: '',
    expected_close_date: '',
    next_followup_date: '',
    description: '',
    product_service: '',
    quantity: 1,
    price: 0,
    discount_percent: 0,
    notes: '',
    lost_reason: ''
  })

  const [customers, setCustomers] = useState([])
  const [employees, setEmployees] = useState([])
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    async function init() {
      if (!isOpen) return
      
      setLoading(true)
      setFieldErrors({})
      await loadInitialData()

      try {
        let fullDeal = deal
        // If we only have an ID, fetch the full record
        if (deal?.id && !deal.name) {
          fullDeal = await dealsApi.get(deal.id)
        }

        if (fullDeal && fullDeal.id) {
          setFormData({
            name: fullDeal.name || '',
            customer_id: fullDeal.customer_id?.id || fullDeal.customer_id?._id || fullDeal.customer_id || customerId || '',
            value: fullDeal.value || 0,
            currency: fullDeal.currency || 'INR',
            stage: fullDeal.stage || 'New',
            status: fullDeal.status || 'Open',
            assigned_to: fullDeal.assigned_to?.id || fullDeal.assigned_to?._id || fullDeal.assigned_to || '',
            expected_close_date: fullDeal.expected_close_date ? new Date(fullDeal.expected_close_date).toISOString().split('T')[0] : '',
            next_followup_date: fullDeal.next_followup_date ? new Date(fullDeal.next_followup_date).toISOString().split('T')[0] : '',
            description: fullDeal.description || '',
            product_service: fullDeal.product_service || '',
            quantity: fullDeal.quantity || 1,
            price: fullDeal.price || 0,
            discount_percent: fullDeal.discount_percent || 0,
            notes: fullDeal.notes || '',
            lost_reason: fullDeal.lost_reason || ''
          })
        } else {
          setFormData({
            name: '',
            customer_id: customerId || '',
            value: 0,
            currency: 'INR',
            stage: 'New',
            status: 'Open',
            assigned_to: '',
            expected_close_date: '',
            next_followup_date: '',
            description: '',
            product_service: '',
            quantity: 1,
            price: 0,
            discount_percent: 0,
            notes: '',
            lost_reason: ''
          })
        }
      } catch (err) {
        toast.error('Failed to load deal intelligence')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [isOpen, deal, customerId])

  // Auto-calculate Deal Value
  useEffect(() => {
    const baseValue = (formData.price || 0) * (formData.quantity || 1)
    const discountAmount = baseValue * ((formData.discount_percent || 0) / 100)
    const finalValue = Math.max(0, baseValue - discountAmount)
    if (formData.value !== finalValue) {
      setFormData(prev => ({ ...prev, value: finalValue }))
    }
  }, [formData.price, formData.quantity, formData.discount_percent])

  async function loadInitialData() {
    try {
      const [cRes, uRes] = await Promise.all([
        customersApi.list({ limit: 'all' }),
        usersApi.list({ limit: 'all' })
      ])
      setCustomers(cRes.items || cRes || [])
      setEmployees((uRes.items || uRes || []).filter(u => u.role !== 'HR'))
    } catch (err) {
      console.error('Failed to load selection data')
    }
  }

  function validate() {
    const errors = {}
    
    const nameErr = validateRequired('Opportunity Name', formData.name)
    if (nameErr) errors.name = nameErr

    const custErr = validateRequired('Customer', formData.customer_id)
    if (custErr) errors.customer_id = custErr

    const valErr = validateNonNegativeNumber('Value', formData.value)
    if (valErr) errors.value = valErr
    else if (Number(formData.value) <= 0) errors.value = 'Value must be greater than 0'

    const ownerErr = validateRequired('Assigned Staff', formData.assigned_to)
    if (ownerErr) errors.assigned_to = ownerErr

    if (formData.stage === 'Lost') {
      const lostErr = validateRequired('Reason for Loss', formData.lost_reason)
      if (lostErr) errors.lost_reason = lostErr
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault()
    if (!validate()) {
      const firstError = Object.values(fieldErrors)[0] || 'Please fix validation errors'
      return toast.warn(firstError)
    }

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
            <p className="sheet-subtitle">{deal?.id ? `Updating deal for ${formData.name}` : 'Create a new deal'}</p>
          </div>
        </div>

        <form className="crm-modal-sheet-body custom-scrollbar" onSubmit={handleSubmit}>
          <div className="sheet-content-container">
            {/* Core Opportunity */}
            <section className="form-sheet-section">
              <div className="form-sheet-section-header">
                <Icon name="deals" />
                <span>Deal Information</span>
              </div>
              <div className="form-sheet-grid">
                <div className="sheet-field full-width">
                  <label>Deal Name</label>
                  <input
                    className={`crm-input ${fieldErrors.name ? 'error' : ''}`}
                    autoFocus
                    value={formData.name}
                    onChange={e => {
                      setFormData({ ...formData, name: e.target.value })
                      if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: '' }))
                    }}
                    placeholder="e.g. Q4 Infrastructure Renewal"
                    required
                  />
                  {fieldErrors.name && <span className="error-text">{fieldErrors.name}</span>}
                </div>
                <div className="sheet-field">
                  <label>Associated Customer</label>
                  <SearchableSelect
                    value={formData.customer_id}
                    onChange={val => {
                      const selectedCust = customers.find(c => String(c.id || c._id) === String(val));
                      const updates = { customer_id: val };
                      
                      // Auto-fill logic: Get owner from customer/lead
                      if (selectedCust && selectedCust.assigned_to) {
                        updates.assigned_to = selectedCust.assigned_to._id || selectedCust.assigned_to;
                      }

                      setFormData({ ...formData, ...updates });
                      if (fieldErrors.customer_id) setFieldErrors(prev => ({ ...prev, customer_id: '' }));
                    }}
                    options={customers.map(c => ({ value: c.id || c._id, label: c.name }))}
                    placeholder="Select Customer..."
                    icon="user"
                    disabled={!!customerId}
                    error={!!fieldErrors.customer_id}
                  />
                  {fieldErrors.customer_id && <span className="error-text">{fieldErrors.customer_id}</span>}
                </div>
                <div className="sheet-field">
                  <label>Amount (₹)</label>
                  <input
                    className={`crm-input ${fieldErrors.value ? 'error' : ''}`}
                    type="number"
                    value={formData.value}
                    onChange={e => {
                      setFormData({ ...formData, value: Number(e.target.value) })
                      if (fieldErrors.value) setFieldErrors(prev => ({ ...prev, value: '' }))
                    }}
                    placeholder="0.00"
                  />
                  {fieldErrors.value && <span className="error-text">{fieldErrors.value}</span>}
                </div>
              </div>
            </section>

            {/* Pipeline Config */}
            <section className="form-sheet-section">
              <div className="form-sheet-section-header">
                <Icon name="settings" />
                <span>Deal Status</span>
              </div>
              <div className="form-sheet-grid">
                <div className="sheet-field">
                  <label>Current Stage</label>
                  <SearchableSelect
                    value={formData.stage}
                    onChange={val => {
                      const updates = { stage: val };
                      if (val === 'Lost') {
                        updates.status = 'Closed';
                      } else if (val !== 'Won') {
                        updates.status = 'Open';
                      }
                      setFormData({ ...formData, ...updates });
                    }}
                    options={STAGES.map(s => ({ value: s, label: s }))}
                    icon="activity"
                  />
                </div>
                <div className="sheet-field">
                  <label>Deal Status</label>
                  <SearchableSelect
                    value={formData.status}
                    onChange={val => setFormData({ ...formData, status: val })}
                    options={[{ value: 'Open', label: 'Open' }, { value: 'Closed', label: 'Closed' }]}
                    icon="flag"
                  />
                </div>
                {formData.stage === 'Lost' && (
                  <div className="sheet-field full-width">
                    <label>Reason for Loss</label>
                    <textarea
                      className="crm-input"
                      value={formData.lost_reason}
                      onChange={e => setFormData({ ...formData, lost_reason: e.target.value })}
                      placeholder="Why was the deal lost?"
                      style={{ minHeight: '80px', padding: '12px', marginTop: '8px' }}
                    />
                  </div>
                )}
                <div className="sheet-field">
                  <label>Assigned Staff</label>
                  <SearchableSelect
                    value={formData.assigned_to}
                    onChange={val => {
                      setFormData({ ...formData, assigned_to: val })
                      if (fieldErrors.assigned_to) setFieldErrors(prev => ({ ...prev, assigned_to: '' }))
                    }}
                    options={employees.map(u => ({ value: u.id || u._id, label: u.name }))}
                    placeholder="Select owner..."
                    icon="user"
                    disabled={!['Admin', 'Manager', 'Employee', 'Accountant'].includes(user?.role)}
                    error={!!fieldErrors.assigned_to}
                  />
                  {fieldErrors.assigned_to && <span className="error-text">{fieldErrors.assigned_to}</span>}
                </div>
                <div className="sheet-field">
                  <label>Expected Closing Date</label>
                  <input 
                    className="crm-input"
                    type="date" 
                    value={formData.expected_close_date} 
                    onChange={e => setFormData({ ...formData, expected_close_date: e.target.value })} 
                  />
                </div>
                <div className="sheet-field">
                  <label>Next Follow-up Date</label>
                  <input 
                    className="crm-input"
                    type="date" 
                    value={formData.next_followup_date} 
                    onChange={e => setFormData({ ...formData, next_followup_date: e.target.value })} 
                  />
                </div>
                <div className="sheet-field">
                  <label>Total Value (Calculated)</label>
                  <input
                    className="crm-input"
                    type="number"
                    value={formData.value}
                    readOnly
                    style={{ background: 'var(--bg-surface)', fontWeight: 700 }}
                  />
                </div>
              </div>
            </section>

            {/* Product Info */}
            <section className="form-sheet-section">
              <div className="form-sheet-section-header">
                <Icon name="briefcase" />
                <span>Product / Service Details</span>
              </div>
              <div className="form-sheet-grid">
                <div className="sheet-field full-width">
                  <label>Product / Service Name</label>
                  <input
                    className="crm-input"
                    value={formData.product_service}
                    onChange={e => setFormData({ ...formData, product_service: e.target.value })}
                    placeholder="What are we selling?"
                  />
                </div>
                <div className="sheet-field">
                  <label>Unit Price (₹)</label>
                  <input
                    className="crm-input"
                    type="number"
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                    placeholder="0.00"
                  />
                </div>
                <div className="sheet-field">
                  <label>Quantity</label>
                  <input
                    className="crm-input"
                    type="number"
                    value={formData.quantity}
                    onChange={e => setFormData({ ...formData, quantity: Number(e.target.value) })}
                    placeholder="1"
                  />
                </div>
                <div className="sheet-field">
                  <label>Discount (%)</label>
                  <input
                    className="crm-input"
                    type="number"
                    value={formData.discount_percent}
                    onChange={e => setFormData({ ...formData, discount_percent: Number(e.target.value) })}
                    placeholder="0"
                  />
                </div>
              </div>
            </section>

            {/* Intel */}
            <section className="form-sheet-section no-border">
              <div className="form-sheet-section-header">
                <Icon name="info" />
                <span>More Details</span>
              </div>
              <div className="form-sheet-grid">
                {formData.stage === 'Lost' && (
                  <div className="sheet-field full-width">
                    <label>Reason for Loss</label>
                    <textarea 
                      className={`crm-input ${fieldErrors.lost_reason ? 'error' : ''}`}
                      style={{ minHeight: '80px' }}
                      placeholder="Why was the deal closed?..."
                      value={formData.lost_reason}
                      onChange={e => {
                        setFormData({ ...formData, lost_reason: e.target.value })
                        if (fieldErrors.lost_reason) setFieldErrors(prev => ({ ...prev, lost_reason: '' }))
                      }}
                      required
                    />
                    {fieldErrors.lost_reason && <span className="error-text">{fieldErrors.lost_reason}</span>}
                  </div>
                )}
                <div className="sheet-field full-width">
                  <label>Description / Public Details</label>
                  <div style={{ marginTop: '8px' }}>
                    <RichTextEditor 
                      value={formData.description}
                      onChange={val => setFormData({ ...formData, description: val })}
                      height="150px"
                    />
                  </div>
                </div>
                <div className="sheet-field full-width" style={{ marginTop: '24px' }}>
                  <label>Internal Notes (Private)</label>
                  <textarea 
                    className="crm-input"
                    style={{ minHeight: '80px' }}
                    placeholder="Internal details not visible to customers..."
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
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
