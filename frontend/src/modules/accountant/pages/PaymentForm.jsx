import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { paymentsApi } from '../../../services/payments'
import { invoicesApi } from '../../../services/invoices'
import { api } from '../../../services/api'
import { toast } from 'react-toastify'
import { Icon } from '../../../layouts/icons'

import { 
  validateRequired, 
  validateNonNegativeNumber 
} from '../../../utils/formValidation.js'

export default function PaymentForm({ onCancel, onSuccess }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preInvoiceId = searchParams.get('invoiceId')
  const preCustomerId = searchParams.get('customerId')
  
  const [model, setModel] = useState({
    customer_id: '',
    invoice_id: '',
    deal_id: searchParams.get('dealId') || '',
    amount: '',
    payment_method: 'Bank Transfer',
    payment_date: new Date().toISOString().split('T')[0],
    transaction_id: '',
    cheque_number: '',
    bank_name: '',
    received_by: '',
    notes: ''
  })
  
  const [customers, setCustomers] = useState([])
  const [invoices, setInvoices] = useState([])
  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    api.get('/api/customers?limit=200').then(res => {
      setCustomers(res.items || [])
      if (preCustomerId) setModel(prev => ({ ...prev, customer_id: preCustomerId }))
    }).catch(console.error)
  }, [preCustomerId])

  useEffect(() => {
    if (model.customer_id) {
      invoicesApi.list({ customer_id: model.customer_id, limit: 100 }).then(res => {
        const pending = (res.items || []).filter(i => i.status !== 'Paid' && i.status !== 'Cancelled')
        setInvoices(pending)
        if (preInvoiceId) {
          const inv = pending.find(i => i._id === preInvoiceId || i.id === preInvoiceId)
          if (inv) {
            const remaining = inv.total_amount - (inv.paid_amount || 0)
            setModel(prev => ({ ...prev, invoice_id: inv._id || inv.id, amount: remaining }))
          }
        }
      }).catch(console.error)
    } else {
      setInvoices([])
    }
  }, [model.customer_id, preInvoiceId])

  const handleInvoiceSelect = (invId) => {
    const inv = invoices.find(i => i._id === invId)
    if (inv) {
      const remaining = inv.total_amount - (inv.paid_amount || 0)
      setModel({ ...model, invoice_id: invId, amount: remaining })
    } else {
      setModel({ ...model, invoice_id: '', amount: '' })
    }
  }

  const validate = () => {
    const errors = {}
    
    const custErr = validateRequired('Customer', model.customer_id)
    if (custErr) errors.customer_id = custErr

    const amtErr = validateNonNegativeNumber('Amount', model.amount) || validateRequired('Amount', model.amount)
    if (amtErr) errors.amount = amtErr
    else if (Number(model.amount) <= 0) errors.amount = 'Amount must be greater than 0'

    const dateErr = validateRequired('Payment Date', model.payment_date)
    if (dateErr) errors.payment_date = dateErr

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    if (!validate()) {
      const firstError = Object.values(fieldErrors)[0] || 'Please fix validation errors'
      return toast.warn(firstError)
    }

    setSaving(true)
    try {
      const dataToSend = { ...model }
      if (!dataToSend.invoice_id) delete dataToSend.invoice_id
      await paymentsApi.create(dataToSend)
      toast.success('Payment added successfully')
      if (onSuccess) onSuccess(); else navigate('/payments')
    } catch (err) { toast.error('Failed to add payment') } finally { setSaving(false) }
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

  const modalContent = (
    <div className="crm-modal-portal-overlay">
      <div className="crm-modal-sheet animate-sheet-in" style={{ maxWidth: '700px' }}>
        <div className="crm-modal-sheet-header">
          <div className="sheet-title-area">
            <h2 className="sheet-title">Record Payment</h2>
            <p className="sheet-subtitle">Capture inbound revenue and reconcile against invoices</p>
          </div>
        </div>

        <form className="crm-modal-sheet-body custom-scrollbar" onKeyDown={handleKeyDown} onSubmit={handleSubmit}>
          <div className="sheet-content-container">
            {/* Account Link */}
            <section className="form-sheet-section">
              <div className="form-sheet-section-header">
                <Icon name="user" />
                <span>Accounting Context</span>
              </div>
              <div className="form-sheet-grid">
                <div className="sheet-field full-width">
                  <label>Customer Account</label>
                  <select
                    className={`crm-input ${fieldErrors.customer_id ? 'error' : ''}`}
                    autoFocus
                    value={model.customer_id}
                    onChange={e => {
                      setModel({ ...model, customer_id: e.target.value, invoice_id: '' })
                      if (fieldErrors.customer_id) setFieldErrors(prev => ({ ...prev, customer_id: '' }))
                    }}
                    required
                  >
                    <option value="">Select Customer...</option>
                    {customers.map(c => <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>)}
                  </select>
                  {fieldErrors.customer_id && <span className="error-text">{fieldErrors.customer_id}</span>}
                </div>
                <div className="sheet-field full-width">
                  <label>Link to Outstanding Bill</label>
                  <select
                    className="crm-input"
                    value={model.invoice_id}
                    onChange={e => handleInvoiceSelect(e.target.value)}
                    disabled={!model.customer_id || invoices.length === 0}
                  >
                    <option value="">No Bill Link (Unapplied Credit)</option>
                    {invoices.map(i => (
                      <option key={i._id || i.id} value={i._id || i.id}>
                        {i.invoice_number} - Pending: ₹{(i.total_amount - (i.paid_amount || 0)).toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* Transaction Data */}
            <section className="form-sheet-section">
              <div className="form-sheet-section-header">
                <Icon name="creditCard" />
                <span>Transaction details</span>
              </div>
              <div className="form-sheet-grid">
                <div className="sheet-field">
                  <label>Payment Amount (₹)</label>
                  <input
                    type="number"
                    className={`crm-input ${fieldErrors.amount ? 'error' : ''}`}
                    value={model.amount}
                    onChange={e => {
                      setModel({ ...model, amount: e.target.value })
                      if (fieldErrors.amount) setFieldErrors(prev => ({ ...prev, amount: '' }))
                    }}
                    placeholder="0.00"
                    step="0.01"
                    required
                  />
                  {fieldErrors.amount && <span className="error-text">{fieldErrors.amount}</span>}
                </div>
                <div className="sheet-field">
                  <label>Payment Date</label>
                  <input
                    type="date"
                    className={`crm-input ${fieldErrors.payment_date ? 'error' : ''}`}
                    value={model.payment_date}
                    onChange={e => {
                      setModel({ ...model, payment_date: e.target.value })
                      if (fieldErrors.payment_date) setFieldErrors(prev => ({ ...prev, payment_date: '' }))
                    }}
                    required
                  />
                  {fieldErrors.payment_date && <span className="error-text">{fieldErrors.payment_date}</span>}
                </div>
                <div className="sheet-field">
                  <label>Payment Method</label>
                  <select className="crm-input" value={model.payment_method} onChange={e => setModel({ ...model, payment_method: e.target.value })} required>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Online">Online Payment Gateway</option>
                  </select>
                </div>
                <div className="sheet-field">
                  <label>
                    {model.payment_method === 'Cheque' ? 'Cheque Number' : 
                     model.payment_method === 'Card' ? 'Card Last 4 Digits' : 
                     'Transaction ID / Ref'}
                  </label>
                  <input
                    type="text"
                    className="crm-input"
                    value={model.payment_method === 'Cheque' ? model.cheque_number : model.transaction_id}
                    onChange={e => {
                      if (model.payment_method === 'Cheque') {
                        setModel({ ...model, cheque_number: e.target.value })
                      } else {
                        setModel({ ...model, transaction_id: e.target.value })
                      }
                    }}
                    placeholder={model.payment_method === 'Cheque' ? 'XXXXXX' : 'TXN-XXXXXX'}
                  />
                </div>
                {(model.payment_method === 'Bank Transfer' || model.payment_method === 'Cheque' || model.payment_method === 'Card') && (
                  <div className="sheet-field">
                    <label>Bank Name</label>
                    <input
                      type="text"
                      className="crm-input"
                      value={model.bank_name}
                      onChange={e => setModel({ ...model, bank_name: e.target.value })}
                      placeholder="e.g. HDFC Bank"
                    />
                  </div>
                )}
              </div>
            </section>

            {/* Memo */}
            <section className="form-sheet-section no-border">
              <div className="form-sheet-section-header">
                <Icon name="info" />
                <span>Accounting Memo</span>
              </div>
              <div className="sheet-field full-width">
                <label>Internal Notes</label>
                <textarea
                  className="crm-input"
                  style={{ minHeight: '80px' }}
                  value={model.notes}
                  onChange={e => setModel({ ...model, notes: e.target.value })}
                  placeholder="Record any details for audit purposes..."
                />
              </div>
            </section>
          </div>
        </form>

        <div className="crm-modal-sheet-footer">
          <p className="footer-hint">All fields are securely encrypted.</p>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button className="crm-btn-premium glass" onClick={() => (onCancel ? onCancel() : navigate(-1))}>Cancel</button>
            <button className="crm-btn-premium vibrant" disabled={saving} onClick={handleSubmit}>
              {saving ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
