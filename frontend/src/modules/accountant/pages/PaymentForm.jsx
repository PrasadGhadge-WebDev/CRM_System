import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { paymentsApi } from '../../../services/payments'
import { invoicesApi } from '../../../services/invoices'
import { api } from '../../../services/api'
import { toast } from 'react-toastify'
import { Icon } from '../../../layouts/icons'

export default function PaymentForm() {
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
    // Load active customers
    api.get('/api/customers?limit=200').then(res => {
      setCustomers(res.items || [])
      if (preCustomerId) {
        setModel(prev => ({ ...prev, customer_id: preCustomerId }))
      }
    }).catch(console.error)
  }, [preCustomerId])

  useEffect(() => {
    if (model.customer_id) {
      // Load unpaid invoices for this customer
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
    e.preventDefault()
    if (!model.customer_id || !model.amount) {
      toast.error('Customer and Amount are required')
      return
    }

    setSaving(true)
    try {
      // Clean up empty IDs before sending
      const dataToSend = { ...model }
      if (!dataToSend.invoice_id) delete dataToSend.invoice_id
      if (!dataToSend.deal_id) delete dataToSend.deal_id // Just in case it's added later

      await paymentsApi.create(dataToSend)
      toast.success('Payment added successfully')
      navigate('/payments')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add payment')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="payment-form-page stack gap-24">
      <header className="page-header">
        <button className="btn small" onClick={() => navigate(-1)}>
          <Icon name="arrowLeft" size={16} /> Back
        </button>
        <h1 className="text-2xl font-bold mt-16">Add Payment</h1>
      </header>

      <form className="card stack gap-24" onSubmit={handleSubmit} style={{ maxWidth: '600px' }}>
        <div className="stack tiny-gap">
          <label>Customer *</label>
          <select
            className="input"
            value={model.customer_id}
            onChange={(e) => setModel({ ...model, customer_id: e.target.value, invoice_id: '' })}
            required
          >
            <option value="">Select Customer...</option>
            {customers.map(c => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="stack tiny-gap">
          <label>Link to Bill (Optional)</label>
          <select
            className="input"
            value={model.invoice_id}
            onChange={(e) => handleInvoiceSelect(e.target.value)}
            disabled={!model.customer_id || invoices.length === 0}
          >
            <option value="">None (Unapplied Payment)</option>
            {invoices.map(i => (
              <option key={i._id} value={i._id}>
                {i.invoice_number} - Remaining: ₹{(i.total_amount - (i.paid_amount || 0)).toFixed(2)}
              </option>
            ))}
          </select>
          {model.customer_id && invoices.length === 0 && (
             <small className="muted">No pending bills for this customer.</small>
          )}
        </div>

        <div className="grid2">
          <div className="stack tiny-gap">
            <label>Amount (₹) *</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '10px', color: '#888' }}>₹</span>
              <input
                type="number"
                className="input"
                style={{ paddingLeft: '28px' }}
                value={model.amount}
                onChange={(e) => setModel({ ...model, amount: e.target.value })}
                min="0.01"
                step="0.01"
                required
              />
            </div>
          </div>
          <div className="stack tiny-gap">
            <label>Payment Date *</label>
            <input
              type="date"
              className="input"
              value={model.payment_date}
              onChange={(e) => setModel({ ...model, payment_date: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="grid2">
          <div className="stack tiny-gap">
            <label>Payment Method *</label>
            <select
              className="input"
              value={model.payment_method}
              onChange={(e) => setModel({ ...model, payment_method: e.target.value })}
              required
            >
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="UPI">UPI / PhonePe / GPay</option>
              <option value="Card">Credit/Debit Card</option>
              <option value="Cash">Cash</option>
              <option value="Online">Online Gateway</option>
              <option value="Cheque">Cheque</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="stack tiny-gap">
            <label>Reference Number</label>
            <input
              type="text"
              className="input"
              value={model.transaction_id}
              onChange={(e) => setModel({ ...model, transaction_id: e.target.value })}
              placeholder="e.g., TXN-12345"
            />
          </div>
        </div>

        <div className="stack tiny-gap">
          <label>Notes</label>
          <textarea
            className="input"
            value={model.notes}
            onChange={(e) => setModel({ ...model, notes: e.target.value })}
            rows={3}
            placeholder="Internal notes about this payment"
          />
        </div>

        <div className="form-actions mt-16 row justify-end gap-16">
          <button type="button" className="btn" onClick={() => navigate(-1)} disabled={saving}>Cancel</button>
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? 'Adding...' : 'Add Payment'}
          </button>
        </div>
      </form>
    </div>
  )
}
