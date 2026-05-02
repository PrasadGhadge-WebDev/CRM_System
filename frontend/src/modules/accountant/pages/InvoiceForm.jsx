import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { invoicesApi } from '../../../services/invoices'
import { attachmentsApi } from '../../../services/attachments'
import { api, API_BASE_URL } from '../../../services/api'
import { toast } from 'react-toastify'
import { Icon } from '../../../layouts/icons'
import { validateRequired } from '../../../utils/formValidation.js'

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
    company_info: {
      name: 'DIVINE TECHNOLOGIES',
      address: 'Office No. 101, Pune, India - 411001',
      phone: '020-1234567',
      logo: '/CRM_Logo.png',
      bank_name: 'HDFC Bank',
      account_number: '123456789',
      ifsc_code: 'HDFC0001234',
      upi_id: 'madhe@hdfcbank'
    },
    notes: '',
    terms_and_conditions: '',
    status: 'Unpaid'
  })
  const [initialModel, setInitialModel] = useState(null)
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(mode === 'edit')
  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    api.get('/api/customers?limit=100').then(res => setCustomers(res.items || [])).catch(console.error)
    if (mode === 'edit' && id) {
      invoicesApi.get(id).then(res => {
        if (res) {
          const normalized = { 
            ...res, 
            customer_id: res.customer_id?._id || res.customer_id || '', 
            deal_id: res.deal_id?._id || res.deal_id || '',
            company_id: res.company_id?._id || res.company_id || '',
            invoice_date: res.invoice_date ? res.invoice_date.split('T')[0] : '',
            due_date: res.due_date ? res.due_date.split('T')[0] : '' 
          }
          setModel(normalized)
          setInitialModel(normalized)
        }
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
  const taxRate = Math.min(Number(model.tax_rate) || 0, 18)
  const taxAmount = (subtotal * taxRate) / 100
  const total = subtotal + taxAmount - (Number(model.discount) || 0)

  const validate = () => {
    const errors = {}
    
    const custErr = validateRequired('Customer', model.customer_id)
    if (custErr) errors.customer_id = custErr

    const dateErr = validateRequired('Invoice Date', model.invoice_date)
    if (dateErr) errors.invoice_date = dateErr

    const dueErr = validateRequired('Due Date', model.due_date)
    if (dueErr) errors.due_date = dueErr

    // Validate items
    const itemErrors = []
    model.items.forEach((item, idx) => {
      if (!item.description.trim()) {
        itemErrors[idx] = { description: 'Required' }
        errors.items = 'Please check line items'
      }
    })
    
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
      // Ensure we send clean data
      // Deep normalize IDs to ensure no objects are sent
      const payload = { 
        ...model, 
        customer_id: typeof model.customer_id === 'object' ? model.customer_id?._id : model.customer_id,
        deal_id: typeof model.deal_id === 'object' ? model.deal_id?._id : model.deal_id,
        company_id: typeof model.company_id === 'object' ? model.company_id?._id : model.company_id,
        subtotal, 
        tax_amount: taxAmount, 
        tax_rate: taxRate,
        total_amount: total 
      }
      
      if (mode === 'create') {
        await invoicesApi.create(payload)
      } else {
        await invoicesApi.update(id, payload)
      }
      
      toast.success(`Invoice ${mode === 'create' ? 'created' : 'updated'}`)
      if (onSuccess) onSuccess()
      else navigate('/invoices')
    } catch (err) { 
      console.error('Invoice Save Error:', err)
      toast.error(err.message || 'Failed to save invoice') 
    } finally { 
      setSaving(false) 
    }
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)
    formData.append('related_type', 'System')
    // No related_to for global logo upload

    setSaving(true)
    try {
      const res = await attachmentsApi.upload(formData)
      if (res && res.path) {
        // Handle cross-platform paths and absolute URL conversion
        const cleanPath = res.path.replace(/\\/g, '/')
        const fullPath = API_BASE_URL ? `${API_BASE_URL}/${cleanPath}` : `/${cleanPath}`
        
        setModel(prev => ({
          ...prev,
          company_info: { ...prev.company_info, logo: fullPath }
        }))
        toast.success('Logo uploaded successfully')
      }
    } catch (err) {
      toast.error('Failed to upload logo')
    } finally {
      setSaving(false)
    }
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

  const modalContent = (
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
                  <select 
                    className={`crm-input ${fieldErrors.customer_id ? 'error' : ''}`} 
                    value={model.customer_id} 
                    onChange={e => {
                      setModel({ ...model, customer_id: e.target.value })
                      if (fieldErrors.customer_id) setFieldErrors(prev => ({ ...prev, customer_id: '' }))
                    }} 
                    required
                  >
                    <option value="">Select Customer Account...</option>
                    {customers.map(c => <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>)}
                  </select>
                  {fieldErrors.customer_id && <span className="error-text">{fieldErrors.customer_id}</span>}
                </div>
                <div className="sheet-field">
                  <label>Billing Date</label>
                  <input 
                    type="date" 
                    className={`crm-input ${fieldErrors.invoice_date ? 'error' : ''}`} 
                    value={model.invoice_date} 
                    onChange={e => {
                      setModel({ ...model, invoice_date: e.target.value })
                      if (fieldErrors.invoice_date) setFieldErrors(prev => ({ ...prev, invoice_date: '' }))
                    }} 
                    required 
                  />
                  {fieldErrors.invoice_date && <span className="error-text">{fieldErrors.invoice_date}</span>}
                </div>
                <div className="sheet-field">
                  <label>Due Date</label>
                  <input 
                    type="date" 
                    className={`crm-input ${fieldErrors.due_date ? 'error' : ''}`} 
                    value={model.due_date} 
                    onChange={e => {
                      setModel({ ...model, due_date: e.target.value })
                      if (fieldErrors.due_date) setFieldErrors(prev => ({ ...prev, due_date: '' }))
                    }} 
                    required 
                  />
                  {fieldErrors.due_date && <span className="error-text">{fieldErrors.due_date}</span>}
                </div>
                <div className="sheet-field">
                  <label>GST / Tax Number</label>
                  <input className="crm-input" value={model.gst_number} onChange={e => setModel({ ...model, gst_number: e.target.value })} placeholder="e.g. 27AAAAA0000A1Z5" />
                </div>
              </div>
            </section>

            {/* Branding & Company Info */}
            <section className="form-sheet-section">
              <div className="form-sheet-section-header">
                <Icon name="user" />
                <span>Company & Branding</span>
              </div>
              <div className="form-sheet-grid">
                <div className="sheet-field">
                  <label>Company Name</label>
                  <input className="crm-input" value={model.company_info?.name || ''} onChange={e => setModel({ ...model, company_info: { ...model.company_info, name: e.target.value } })} />
                </div>
                <div className="sheet-field">
                  <label>Company Logo</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '100px', height: '40px', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-surface)' }}>
                      {model.company_info?.logo ? (
                        <img src={model.company_info.logo} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                      ) : (
                        <span style={{ fontSize: '10px', color: 'var(--text-dimmed)' }}>No Logo</span>
                      )}
                    </div>
                    <label className="crm-btn-premium glass" style={{ margin: 0, padding: '8px 12px', fontSize: '12px', cursor: 'pointer' }}>
                       <Icon name="plus" size={12} />
                       <span>Upload Logo</span>
                       <input type="file" style={{ display: 'none' }} accept="image/*" onChange={handleLogoUpload} />
                    </label>
                  </div>
                </div>
                <div className="sheet-field">
                  <label>Company Phone</label>
                  <input className="crm-input" value={model.company_info?.phone || ''} onChange={e => setModel({ ...model, company_info: { ...model.company_info, phone: e.target.value } })} />
                </div>
                <div className="sheet-field">
                  <label>Company Address</label>
                  <input className="crm-input" value={model.company_info?.address || ''} onChange={e => setModel({ ...model, company_info: { ...model.company_info, address: e.target.value } })} />
                </div>
              </div>
            </section>

            {/* Bank Details */}
            <section className="form-sheet-section">
              <div className="form-sheet-section-header">
                <Icon name="billing" />
                <span>Bank & Payment Details</span>
              </div>
              <div className="form-sheet-grid">
                <div className="sheet-field">
                  <label>Bank Name</label>
                  <input className="crm-input" value={model.company_info?.bank_name || ''} onChange={e => setModel({ ...model, company_info: { ...model.company_info, bank_name: e.target.value } })} />
                </div>
                <div className="sheet-field">
                  <label>Account Number</label>
                  <input className="crm-input" value={model.company_info?.account_number || ''} onChange={e => setModel({ ...model, company_info: { ...model.company_info, account_number: e.target.value } })} />
                </div>
                <div className="sheet-field">
                  <label>IFSC Code</label>
                  <input className="crm-input" value={model.company_info?.ifsc_code || ''} onChange={e => setModel({ ...model, company_info: { ...model.company_info, ifsc_code: e.target.value } })} />
                </div>
                <div className="sheet-field">
                  <label>UPI ID</label>
                  <input className="crm-input" value={model.company_info?.upi_id || ''} onChange={e => setModel({ ...model, company_info: { ...model.company_info, upi_id: e.target.value } })} />
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
              <button type="button" className="crm-btn-premium glass" onClick={addItem} style={{ padding: '10px 20px' }}>
                <Icon name="plus" size={14} /> 
                <span>Add Line Item</span>
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
                      <div style={{ position: 'relative', width: '120px' }}>
                        <input type="number" className="crm-input" style={{ width: '100%', textAlign: 'right' }} value={model.discount} onChange={e => setModel({ ...model, discount: e.target.value })} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-dimmed)' }}>Tax (%) <small>(Max 18%)</small></span>
                      <div style={{ position: 'relative', width: '80px' }}>
                        <input 
                          type="number" 
                          className="crm-input" 
                          style={{ width: '100%', textAlign: 'right', paddingRight: '25px' }} 
                          value={model.tax_rate} 
                          onChange={e => setModel({ ...model, tax_rate: Math.min(e.target.value, 18) })} 
                          max="18"
                        />
                        <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', fontWeight: 700, color: 'var(--text-dimmed)' }}>%</span>
                      </div>
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
          <p className="footer-hint">All fields are securely encrypted.</p>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button className="crm-btn-premium glass" onClick={() => (onCancel ? onCancel() : navigate(-1))}>Cancel</button>
            <button className="crm-btn-premium vibrant" disabled={saving} onClick={handleSubmit}>
              {saving ? 'Processing...' : (mode === 'create' ? 'Generate Invoice' : 'Commit Changes')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
