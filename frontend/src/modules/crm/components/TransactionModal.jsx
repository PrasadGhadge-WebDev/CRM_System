import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { Icon } from '../../../layouts/icons.jsx'
import { paymentsApi } from '../../../services/payments.js'

export default function TransactionModal({ isOpen, onClose, invoice, deal, onSave }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    amount: 0,
    payment_method: 'Cash',
    transaction_id: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  })

  useEffect(() => {
    if (invoice) {
      const remaining = invoice.total_amount - invoice.paid_amount
      setFormData(prev => ({
        ...prev,
        amount: remaining > 0 ? remaining : 0,
      }))
    }
  }, [invoice])

  if (!isOpen || !invoice) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (formData.amount <= 0) return toast.warn('Please enter a valid amount')

    setLoading(true)
    try {
      await paymentsApi.create({
        customer_id: invoice.customer_id?._id || invoice.customer_id,
        deal_id: deal?.id || deal?._id,
        invoice_id: invoice.id || invoice._id,
        amount: formData.amount,
        payment_method: formData.payment_method,
        transaction_id: formData.transaction_id,
        payment_date: formData.payment_date,
        notes: formData.notes || 'Partial payment received'
      })

      toast.success('Payment recorded successfully')
      onSave?.()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-shell">
        <div className="modal-header">
          <div className="modal-title">
            <Icon name="activity" />
            <h2>Receive Payment</h2>
          </div>
          <button className="close-btn" onClick={onClose}><Icon name="close" /></button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-field full-width">
              <label>Bill Number</label>
              <input type="text" value={invoice.invoice_number} disabled />
            </div>
            
            <div className="form-field">
              <label>Amount to Receive (₹)</label>
              <input 
                type="number" 
                value={formData.amount} 
                onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                required 
                autoFocus
              />
              <span style={{ fontSize: '0.65rem', color: 'var(--text-dimmed)', marginTop: '4px' }}>
                Remaining Balance: ₹{(invoice.total_amount - invoice.paid_amount).toLocaleString()}
              </span>
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
              </select>
            </div>

            <div className="form-field">
              <label>Transaction ID / Ref</label>
              <input 
                type="text" 
                value={formData.transaction_id} 
                onChange={e => setFormData({ ...formData, transaction_id: e.target.value })}
                placeholder="e.g. TXN12345"
              />
            </div>

            <div className="form-field">
              <label>Payment Date</label>
              <input 
                type="date" 
                value={formData.payment_date} 
                onChange={e => setFormData({ ...formData, payment_date: e.target.value })} 
              />
            </div>

            <div className="form-field full-width">
              <label>Notes</label>
              <textarea 
                value={formData.notes} 
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Reference notes..."
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-save" disabled={loading}>
              {loading ? <div className="spinner-mini" /> : <Icon name="check" />}
              <span>Receive Payment</span>
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); display: flex; align-items: flex-start; justify-content: center; z-index: 2000; padding: 60px 24px; }
        .modal-shell { width: 100%; max-width: 540px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 24px; box-shadow: var(--shadow-2xl); display: flex; flex-direction: column; animation: modal-reveal 0.4s cubic-bezier(0.16, 1, 0.3, 1); position: relative; overflow: hidden; }
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
