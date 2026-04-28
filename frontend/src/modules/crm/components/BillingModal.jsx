import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { Icon } from '../../../layouts/icons.jsx'
import { invoicesApi } from '../../../services/invoices.js'
import { paymentsApi } from '../../../services/payments.js'

export default function BillingModal({ isOpen, onClose, deal, onSave }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    total_amount: 0,
    paid_amount: 0,
    payment_method: 'Cash',
    payment_date: new Date().toISOString().split('T')[0],
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    gst_rate: 0,
    gst_number: '',
    notes: '',
  })

  useEffect(() => {
    if (deal) {
      setFormData(prev => ({
        ...prev,
        total_amount: deal.value || 0,
      }))
    }
  }, [deal])

  if (!isOpen || !deal) return null

  const calculateTotal = () => {
    const sub = Number(formData.total_amount) || 0
    const rate = Number(formData.gst_rate) || 0
    return sub + (sub * rate) / 100
  }

  const finalTotal = calculateTotal()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      // Step 1: Create Invoice
      const invoice = await invoicesApi.create({
        customer_id: deal.customer_id?._id || deal.customer_id,
        deal_id: deal.id || deal._id,
        subtotal: formData.total_amount,
        tax_rate: formData.gst_rate,
        total_amount: finalTotal,
        invoice_date: formData.invoice_date,
        due_date: formData.due_date,
        gst_number: formData.gst_number,
        items: [{
          description: `Product/Service for Deal: ${deal.name}`,
          quantity: 1,
          price: formData.total_amount,
          amount: formData.total_amount
        }],
        notes: formData.notes
      })

      // Step 2: Create initial payment if paid_amount > 0
      if (formData.paid_amount > 0) {
        await paymentsApi.create({
          customer_id: deal.customer_id?._id || deal.customer_id,
          deal_id: deal.id || deal._id,
          invoice_id: invoice.id || invoice._id,
          amount: formData.paid_amount,
          payment_method: formData.payment_method,
          payment_date: formData.payment_date,
          notes: 'Initial payment upon billing'
        })
      }

      toast.success('Billing initialized successfully')
      onSave?.()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initialize billing')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-shell">
        <div className="modal-header">
          <div className="modal-title">
            <Icon name="billing" />
            <h2>Initialize Billing</h2>
          </div>
          <button className="close-btn" onClick={onClose}><Icon name="close" /></button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-field full-width">
              <label>Customer Name</label>
              <input type="text" value={deal.customer_id?.name || 'N/A'} disabled />
            </div>
            
            <div className="form-field">
              <label>Bill Date</label>
              <input 
                type="date" 
                value={formData.invoice_date} 
                onChange={e => setFormData({ ...formData, invoice_date: e.target.value })} 
                required
              />
            </div>

            <div className="form-field">
              <label>Due Date</label>
              <input 
                type="date" 
                value={formData.due_date} 
                onChange={e => setFormData({ ...formData, due_date: e.target.value })} 
                required
              />
            </div>

            <div className="form-field">
              <label>Base Deal Amount (₹)</label>
              <input 
                type="number" 
                value={formData.total_amount} 
                onChange={e => setFormData({ ...formData, total_amount: Number(e.target.value) })}
                required 
              />
            </div>

            <div className="form-field">
              <label>GST Rate (%)</label>
              <input 
                type="number" 
                value={formData.gst_rate} 
                onChange={e => setFormData({ ...formData, gst_rate: Number(e.target.value) })}
                placeholder="0"
                min="0"
              />
            </div>

            <div className="form-field full-width" style={{ background: 'var(--primary-soft)', padding: '16px', borderRadius: '12px', border: '1px solid var(--primary)' }}>
               <div className="row justify-between">
                 <span className="font-bold">Final Bill Total (with GST):</span>
                 <span className="font-black text-xl text-primary">₹{finalTotal.toLocaleString()}</span>
               </div>
            </div>

            <div className="form-field">
              <label>Initial Paid Amount (₹)</label>
              <input 
                type="number" 
                value={formData.paid_amount} 
                onChange={e => setFormData({ ...formData, paid_amount: Number(e.target.value) })}
                placeholder="0"
              />
            </div>

            <div className="form-field">
              <label>Payment Method</label>
              <select 
                value={formData.payment_method} 
                onChange={e => setFormData({ ...formData, payment_method: e.target.value })}
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Card">Card</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Online">Online</option>
              </select>
            </div>

            <div className="form-field">
              <label>GST Number (Optional)</label>
              <input 
                type="text" 
                placeholder="e.g. 27AAAAA0000A1Z5"
                value={formData.gst_number} 
                onChange={e => setFormData({ ...formData, gst_number: e.target.value })} 
              />
            </div>

            <div className="form-field full-width">
              <label>Billing Notes & Terms</label>
              <textarea 
                value={formData.notes} 
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add any specific billing terms or notes..."
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-save" disabled={loading}>
              {loading ? <div className="spinner-mini" /> : <Icon name="check" />}
              <span>Generate Bill</span>
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); display: flex; align-items: flex-start; justify-content: center; z-index: 2000; padding: 60px 24px; }
        .modal-shell { width: 100%; max-width: 600px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 24px; box-shadow: var(--shadow-2xl); display: flex; flex-direction: column; animation: modal-reveal 0.4s cubic-bezier(0.16, 1, 0.3, 1); position: relative; overflow: hidden; }
        @keyframes modal-reveal { from { transform: translateY(-40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        
        .modal-header { padding: 24px 32px; border-bottom: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center; }
        .modal-title { display: flex; align-items: center; gap: 12px; }
        .modal-title h2 { margin: 0; font-size: 1.25rem; font-weight: 800; color: var(--text); }
        .modal-title svg { color: var(--primary); }
        
        .close-btn { width: 32px; height: 32px; border-radius: 8px; background: var(--bg-surface); border: 1px solid var(--border); color: var(--text-dimmed); cursor: pointer; display: flex; align-items: center; justify-content: center; }
        
        .modal-form { padding: 32px; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .full-width { grid-column: 1 / -1; }
        
        .form-field { display: flex; flex-direction: column; gap: 8px; }
        .form-field label { font-size: 0.7rem; font-weight: 800; color: var(--text-dimmed); text-transform: uppercase; letter-spacing: 0.05em; }
        .form-field input, .form-field select, .form-field textarea { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 12px; padding: 12px 16px; color: var(--text); font-size: 0.9rem; outline: none; }
        .form-field textarea { min-height: 80px; resize: none; }

        .modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 32px; padding-top: 24px; border-top: 1px solid var(--border-subtle); }
        .btn-cancel { background: transparent; border: 1px solid var(--border); color: var(--text-muted); padding: 10px 20px; border-radius: 10px; font-weight: 700; cursor: pointer; }
        .btn-save { background: var(--primary); color: white; border: none; padding: 10px 24px; border-radius: 10px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 8px; }
        .spinner-mini { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
