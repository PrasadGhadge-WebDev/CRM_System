import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { invoicesApi } from '../../../services/invoices'
import { api } from '../../../services/api'
import { toast } from 'react-toastify'
import { Icon } from '../../../layouts/icons'

export default function InvoiceForm({ mode = 'create' }) {
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
    // Load customers for dropdown
    api.get('/api/customers?limit=100').then(res => {
      setCustomers(res.items || [])
    }).catch(err => {
      console.error('Failed to load customers', err)
    })

    if (mode === 'edit' && id) {
      invoicesApi.get(id).then(res => {
        if (res) {
          setModel({
            ...res,
            customer_id: res.customer_id?._id || res.customer_id || '',
            due_date: res.due_date ? res.due_date.split('T')[0] : ''
          })
        }
      }).catch(err => {
        toast.error('Failed to load invoice')
        console.error(err)
      }).finally(() => setLoading(false))
    }
  }, [id, mode])

  const handleItemChange = (index, field, value) => {
    const newItems = [...model.items]
    newItems[index][field] = value
    
    if (field === 'quantity' || field === 'price') {
      newItems[index].amount = Number(newItems[index].quantity || 0) * Number(newItems[index].price || 0)
    }
    
    setModel({ ...model, items: newItems })
  }

  const addItem = () => {
    setModel({
      ...model,
      items: [...model.items, { description: '', quantity: 1, price: 0, amount: 0 }]
    })
  }

  const removeItem = (index) => {
    if (model.items.length <= 1) return
    const newItems = [...model.items]
    newItems.splice(index, 1)
    setModel({ ...model, items: newItems })
  }

  const calculateSubtotal = () => {
    return model.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  }

  const subtotal = calculateSubtotal()
  const taxAmount = (subtotal * (Number(model.tax_rate) || 0)) / 100
  const total = subtotal + taxAmount

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!model.customer_id) {
      toast.error('Please select a customer')
      return
    }

    setSaving(true)
    try {
      const payload = { ...model, subtotal, tax_amount: taxAmount, total_amount: total }
      if (mode === 'create') {
        await invoicesApi.create(payload)
        toast.success('Invoice created successfully')
      } else {
        await invoicesApi.update(id, payload)
        toast.success('Invoice updated successfully')
      }
      navigate('/invoices')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save invoice')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 muted">Loading...</div>

  return (
    <div className="invoice-form-page stack gap-24">
      <header className="page-header row align-center justify-between">
        <div className="row align-center gap-16">
          <button className="btn small" onClick={() => navigate(-1)}>
            <Icon name="arrowLeft" size={16} /> Back
          </button>
          <h1 className="text-2xl font-bold">{mode === 'create' ? 'Create Invoice' : `Edit Invoice ${model.invoice_number || ''}`}</h1>
        </div>
        {mode === 'edit' && (
          <button className="btn" onClick={() => window.print()}>
            <Icon name="reports" size={16} /> Print / PDF
          </button>
        )}
      </header>

      <form className="card stack gap-24" onSubmit={handleSubmit}>
        <div className="grid2">
          <div className="stack tiny-gap">
            <label>Customer *</label>
            <select
              className="input"
              value={model.customer_id}
              onChange={(e) => setModel({ ...model, customer_id: e.target.value })}
              required
            >
              <option value="">Select Customer...</option>
              {customers.map(c => (
                <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="stack tiny-gap">
            <label>Bill Date *</label>
            <input
              type="date"
              className="input"
              value={model.invoice_date}
              onChange={(e) => setModel({ ...model, invoice_date: e.target.value })}
              required
            />
          </div>
          <div className="stack tiny-gap">
            <label>Due Date *</label>
            <input
              type="date"
              className="input"
              value={model.due_date}
              onChange={(e) => setModel({ ...model, due_date: e.target.value })}
              required
            />
          </div>
          <div className="stack tiny-gap">
            <label>GST Number (Optional)</label>
            <input
              type="text"
              className="input"
              value={model.gst_number}
              onChange={(e) => setModel({ ...model, gst_number: e.target.value })}
              placeholder="e.g. 27AAAAA0000A1Z5"
            />
          </div>
        </div>

        {mode === 'edit' && (
          <div className="grid2">
            <div className="stack tiny-gap">
              <label>Status</label>
              <select
                className="input"
                value={model.status}
                onChange={(e) => setModel({ ...model, status: e.target.value })}
              >
                <option value="Unpaid">Unpaid</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Paid">Paid</option>
                <option value="Overdue">Overdue</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div className="stack tiny-gap">
              <label>Invoice Number</label>
              <input type="text" className="input" value={model.invoice_number || ''} disabled />
            </div>
          </div>
        )}

        <hr />

        <div className="items-section stack gap-16">
          <div className="row align-center justify-between">
            <h3 className="text-lg font-bold">Item Details</h3>
          </div>
          
          <table className="table">
            <thead>
              <tr>
                <th>Description</th>
                <th style={{ width: '100px' }}>Quantity</th>
                <th style={{ width: '150px' }}>Price</th>
                <th style={{ width: '150px' }}>Amount</th>
                <th style={{ width: '50px' }}></th>
              </tr>
            </thead>
            <tbody>
              {model.items.map((item, idx) => (
                <tr key={idx}>
                  <td>
                    <input
                      type="text"
                      className="input"
                      value={item.description}
                      onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                      placeholder="Item description"
                      required
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="input"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      min="1"
                      required
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="input"
                      value={item.price}
                      onChange={(e) => handleItemChange(idx, 'price', e.target.value)}
                      min="0"
                      step="0.01"
                      required
                    />
                  </td>
                  <td>
                    <div className="p-8 font-mono">₹{item.amount.toFixed(2)}</div>
                  </td>
                  <td>
                    <button type="button" className="iconBtn text-danger" onClick={() => removeItem(idx)} disabled={model.items.length <= 1}>
                      <Icon name="trash" size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="btn small self-start" onClick={addItem}>
            <Icon name="plus" size={14} /> Add Item
          </button>
        </div>

        <hr />

        <div className="totals-section row justify-between">
          <div className="notes-box stack gap-16" style={{ width: '50%' }}>
            <div className="stack tiny-gap">
              <label>Billing Notes (Internal)</label>
              <textarea
                className="input"
                value={model.notes}
                onChange={(e) => setModel({ ...model, notes: e.target.value })}
                rows={2}
                placeholder="Internal notes for this bill..."
              />
            </div>
            <div className="stack tiny-gap">
              <label>Terms & Conditions (Visible on Bill)</label>
              <textarea
                className="input"
                value={model.terms_and_conditions}
                onChange={(e) => setModel({ ...model, terms_and_conditions: e.target.value })}
                rows={3}
                placeholder="Payment terms, bank details, etc."
              />
            </div>
          </div>
          <div className="summary-box stack gap-8" style={{ width: '300px' }}>
            <div className="row justify-between">
              <span className="muted">Total before tax:</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="row justify-between align-center">
              <span className="muted">Discount Amount:</span>
              <input
                type="number"
                className="input"
                style={{ width: '100px', textAlign: 'right' }}
                value={model.discount}
                onChange={(e) => setModel({ ...model, discount: e.target.value })}
                min="0"
                step="0.01"
              />
            </div>
            <div className="row justify-between align-center">
               <span className="muted">Tax %:</span>
              <input
                type="number"
                className="input"
                style={{ width: '80px', textAlign: 'right' }}
                value={model.tax_rate}
                onChange={(e) => setModel({ ...model, tax_rate: e.target.value })}
                min="0"
                step="0.1"
              />
            </div>
            <div className="row justify-between">
              <span className="muted">Tax Amount:</span>
               <span>₹{taxAmount.toFixed(2)}</span>
            </div>
            <hr />
            <div className="row justify-between font-bold text-lg">
              <span>Total:</span>
               <span>₹{(subtotal + taxAmount - (Number(model.discount) || 0)).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="form-actions mt-16 row justify-end gap-16">
          <button type="button" className="btn" onClick={() => navigate('/invoices')} disabled={saving}>Cancel</button>
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? 'Saving...' : (mode === 'create' ? 'Create Invoice' : 'Save Changes')}
          </button>
        </div>
      </form>
    </div>
  )
}
