import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { paymentsApi } from '../../../services/payments'
import { invoicesApi } from '../../../services/invoices'
import { api } from '../../../services/api'
import { toast } from 'react-toastify'
import { Icon } from '../../../layouts/icons'

export default function PaymentForm({ onCancel, onSuccess }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preInvoiceId = searchParams.get('invoiceId')
  const preCustomerId = searchParams.get('customerId')
  
  const [model, setModel] = useState({
    customer_id: '',
    invoice_id: '',
    amount: '',
    payment_method: 'Bank Transfer',
    payment_date: new Date().toISOString().split('T')[0],
    transaction_id: '',
    notes: ''
  })
  
  const [customers, setCustomers] = useState([])
  const [invoices, setInvoices] = useState([])
  const [saving, setSaving] = useState(false)

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

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    if (!model.customer_id || !model.amount) return toast.warn('Customer and Amount are required')

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

  return (
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
                    className="crm-input"
                    autoFocus
                    value={model.customer_id}
                    onChange={e => setModel({ ...model, customer_id: e.target.value, invoice_id: '' })}
                    required
                  >
                    <option value="">Select Customer...</option>
                    {customers.map(c => <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>)}
                  </select>
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
                    className="crm-input"
                    value={model.amount}
                    onChange={e => setModel({ ...model, amount: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                    required
                  />
                </div>
                <div className="sheet-field">
                  <label>Payment Date</label>
                  <input
                    type="date"
                    className="crm-input"
                    value={model.payment_date}
                    onChange={e => setModel({ ...model, payment_date: e.target.value })}
                    required
                  />
                </div>
                <div className="sheet-field">
                  <label>Payment Method</label>
                  <select className="crm-input" value={model.payment_method} onChange={e => setModel({ ...model, payment_method: e.target.value })} required>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="UPI">UPI / Net Banking</option>
                    <option value="Card">Card Payment</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
                <div className="sheet-field">
                  <label>Transaction ID / Ref</label>
                  <input
                    type="text"
                    className="crm-input"
                    value={model.transaction_id}
                    onChange={e => setModel({ ...model, transaction_id: e.target.value })}
                    placeholder="TXN-XXXXXX"
                  />
                </div>
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
          <p className="footer-hint">Payments are recorded in the ledger immediately.</p>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button className="btn-premium secondary" onClick={() => (onCancel ? onCancel() : navigate(-1))}>Cancel</button>
            <button className="btn-premium action-vibrant" disabled={saving} onClick={handleSubmit}>
              {saving ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
