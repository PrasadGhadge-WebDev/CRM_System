import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { invoicesApi } from '../../../services/invoices'
import { api } from '../../../services/api'
import { toast } from 'react-toastify'
import { Icon } from '../../../layouts/icons'

export default function InvoiceForm({ mode = 'create', onCancel, onSuccess }) {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [model, setModel] = useState({
    customer_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: [{ description: '', quantity: 1, price: 0, amount: 0 }],
    tax_rate: 0,
    discount: 0,
    gst_number: '',
    notes: '',
    terms_and_conditions: '',
    status: 'Unpaid'
  })
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(mode === 'edit')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/api/customers?limit=100').then(res => setCustomers(res.items || [])).catch(console.error)
    if (mode === 'edit' && id) {
      invoicesApi.get(id).then(res => {
        if (res) setModel({ ...res, customer_id: res.customer_id?._id || res.customer_id || '', due_date: res.due_date ? res.due_date.split('T')[0] : '' })
      }).catch(() => toast.error('Failed to load invoice')).finally(() => setLoading(false))
    }
  }, [id, mode])

  const handleItemChange = (index, field, value) => {
    const newItems = [...model.items]
    newItems[index][field] = value
    if (field === 'quantity' || field === 'price') newItems[index].amount = Number(newItems[index].quantity || 0) * Number(newItems[index].price || 0)
    setModel({ ...model, items: newItems })
  }

  const addItem = () => setModel({ ...model, items: [...model.items, { description: '', quantity: 1, price: 0, amount: 0 }] })
  const removeItem = (index) => { if (model.items.length <= 1) return; const newItems = [...model.items]; newItems.splice(index, 1); setModel({ ...model, items: newItems }) }

  const subtotal = model.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  const taxAmount = (subtotal * (Number(model.tax_rate) || 0)) / 100
  const total = subtotal + taxAmount - (Number(model.discount) || 0)

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    if (!model.customer_id) return toast.warn('Please select a customer')
    setSaving(true)
    try {
      const payload = { ...model, subtotal, tax_amount: taxAmount, total_amount: total }
      if (mode === 'create') await invoicesApi.create(payload); else await invoicesApi.update(id, payload)
      toast.success(`Invoice ${mode === 'create' ? 'created' : 'updated'}`)
      if (onSuccess) onSuccess(); else navigate('/invoices')
    } catch (err) { toast.error('Failed to save invoice') } finally { setSaving(false) }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      const form = e.target.form
      if (!form || e.target.tagName === 'TEXTAREA' || e.target.type === 'submit') return
      e.preventDefault()
      const index = Array.from(form.elements).indexOf(e.target)
      const nextElement = form.elements[index + 1]
      if (nextElement && nextElement.tagName !== 'BUTTON' && !nextElement.classList.contains('crm-input')) nextElement.focus()
    }
  }

  if (loading) return <div className="p-40 text-center text-dimmed">Preparing financial document...</div>

  return (
    <div className="crm-modal-portal-overlay">
      <div className="crm-modal-sheet animate-sheet-in" style={{ maxWidth: '1100px' }}>
        <div className="crm-modal-sheet-header">
          <div className="sheet-title-area">
            <h2 className="sheet-title">{mode === 'create' ? 'Generate Invoice' : `Edit Invoice ${model.invoice_number || ''}`}</h2>
            <p className="sheet-subtitle">{mode === 'create' ? 'Draft a new billing document for your customer' : 'Modify existing billing information'}</p>
          </div>
        </div>

        <form className="crm-modal-sheet-body custom-scrollbar" onKeyDown={handleKeyDown} onSubmit={handleSubmit}>
          <div className="sheet-content-container">
            {/* Header Details */}
            <section className="form-sheet-section">
              <div className="form-sheet-section-header">
                <Icon name="reports" />
                <span>Document Information</span>
              </div>
              <div className="form-sheet-grid">
                <div className="sheet-field">
                  <label>Customer Account</label>
                  <select className="crm-input" value={model.customer_id} onChange={e => setModel({ ...model, customer_id: e.target.value })} required>
                    <option value="">Select Customer Account...</option>
                    {customers.map(c => <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="sheet-field">
                  <label>Billing Date</label>
                  <input type="date" className="crm-input" value={model.invoice_date} onChange={e => setModel({ ...model, invoice_date: e.target.value })} required />
                </div>
                <div className="sheet-field">
                  <label>Due Date</label>
                  <input type="date" className="crm-input" value={model.due_date} onChange={e => setModel({ ...model, due_date: e.target.value })} required />
                </div>
                <div className="sheet-field">
                  <label>GST / Tax Number</label>
                  <input className="crm-input" value={model.gst_number} onChange={e => setModel({ ...model, gst_number: e.target.value })} placeholder="e.g. 27AAAAA0000A1Z5" />
                </div>
              </div>
            </section>

            {/* Line Items */}
            <section className="form-sheet-section">
              <div className="form-sheet-section-header">
                <Icon name="activity" />
                <span>Line Items</span>
              </div>
              <div style={{ overflowX: 'auto', marginBottom: '24px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid rgba(0,0,0,0.1)' }}>
                      <th style={{ textAlign: 'left', padding: '12px 0', fontSize: '0.75rem', color: 'var(--text-dimmed)' }}>DESCRIPTION</th>
                      <th style={{ textAlign: 'center', padding: '12px 0', fontSize: '0.75rem', color: 'var(--text-dimmed)', width: '100px' }}>QTY</th>
                      <th style={{ textAlign: 'right', padding: '12px 0', fontSize: '0.75rem', color: 'var(--text-dimmed)', width: '150px' }}>PRICE (₹)</th>
                      <th style={{ textAlign: 'right', padding: '12px 0', fontSize: '0.75rem', color: 'var(--text-dimmed)', width: '150px' }}>AMOUNT</th>
                      <th style={{ width: '50px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {model.items.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                        <td style={{ padding: '16px 8px 16px 0' }}>
                          <input className="crm-input" value={item.description} onChange={e => handleItemChange(idx, 'description', e.target.value)} placeholder="Service or product description" required />
                        </td>
                        <td style={{ padding: '16px 8px' }}>
                          <input type="number" className="crm-input" style={{ textAlign: 'center' }} value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', e.target.value)} min="1" required />
                        </td>
                        <td style={{ padding: '16px 8px' }}>
                          <input type="number" className="crm-input" style={{ textAlign: 'right' }} value={item.price} onChange={e => handleItemChange(idx, 'price', e.target.value)} min="0" step="0.01" required />
                        </td>
                        <td style={{ padding: '16px 8px', textAlign: 'right', fontWeight: '800', color: 'var(--text)' }}>
                          ₹{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '16px 0 16px 8px', textAlign: 'center' }}>
                          <button type="button" onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '8px' }}>
                            <Icon name="trash" size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" className="btn-premium secondary" onClick={addItem} style={{ padding: '10px 20px' }}>
                <Icon name="plus" size={14} /> Add Line Item
              </button>
            </section>

            {/* Totals & Notes */}
            <section className="form-sheet-section no-border">
              <div className="form-sheet-grid">
                <div className="sheet-field full-width">
                  <label>Legal Terms & Notes</label>
                  <textarea className="crm-input" style={{ minHeight: '100px' }} value={model.terms_and_conditions} onChange={e => setModel({ ...model, terms_and_conditions: e.target.value })} placeholder="Bank details, payment terms, or custom notes..." />
                </div>
                <div style={{ gridColumn: '2', background: 'var(--bg-surface)', padding: '32px', borderRadius: '24px', border: '2px solid rgba(0,0,0,0.1)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-dimmed)' }}>
                      <span>Subtotal</span>
                      <span>₹{subtotal.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-dimmed)' }}>Discount (₹)</span>
                      <input type="number" className="crm-input" style={{ width: '120px', textAlign: 'right' }} value={model.discount} onChange={e => setModel({ ...model, discount: e.target.value })} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-dimmed)' }}>Tax (%)</span>
                      <input type="number" className="crm-input" style={{ width: '80px', textAlign: 'right' }} value={model.tax_rate} onChange={e => setModel({ ...model, tax_rate: e.target.value })} />
                    </div>
                    <div style={{ height: '2px', background: 'rgba(0,0,0,0.1)', margin: '8px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.4rem', fontWeight: '900', color: 'var(--text)' }}>
                      <span>Total</span>
                      <span>₹{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </form>

        <div className="crm-modal-sheet-footer">
          <p className="footer-hint">Invoices are generated as legally-compliant PDF documents.</p>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button className="btn-premium secondary" onClick={() => (onCancel ? onCancel() : navigate(-1))}>Cancel</button>
            <button className="btn-premium action-vibrant" disabled={saving} onClick={handleSubmit}>
              {saving ? 'Processing...' : (mode === 'create' ? 'Generate Invoice' : 'Commit Changes')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
