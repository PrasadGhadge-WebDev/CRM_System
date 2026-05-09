import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { paymentsApi } from '../../../services/payments'
import { invoicesApi } from '../../../services/invoices'
import { api } from '../../../services/api'
import { toast } from 'react-toastify'
import { Icon } from '../../../layouts/icons'
import { useAuth } from '../../../context/AuthContext'

export default function PaymentForm({ mode = 'create', onCancel, onSuccess, paymentId }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { id: paramsId } = useParams()
  const [searchParams] = useSearchParams()
  const id = paymentId || paramsId
  const isEdit = mode === 'edit'
  
  const [model, setModel] = useState({
    payment_type: 'Customer Payment',
    customer_id: searchParams.get('customer_id') || searchParams.get('customerId') || '',
    invoice_id: searchParams.get('invoice_id') || searchParams.get('invoiceId') || '',
    deal_id: searchParams.get('deal_id') || searchParams.get('dealId') || '',
    total_amount: '',
    paid_amount: '',
    pending_amount: 0,
    payment_mode: 'UPI',
    payment_date: new Date().toISOString().split('T')[0],
    transaction_id: '',
    collected_by: user?.id || '',
    user_id: '',
    vendor_name: '',
    notes: ''
  })
  
  const [customers, setCustomers] = useState([])
  const [deals, setDeals] = useState([])
  const [users, setUsers] = useState([]) 
  const [invoices, setInvoices] = useState([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [fieldErrors, setFieldErrors] = useState({})
  const [file, setFile] = useState(null)

  const isAdmin = user?.role === 'Admin'
  const isAccountant = user?.role === 'Accountant'
  const isManager = user?.role === 'Manager'
  const isHR = user?.role === 'HR'
  const isEmployee = user?.role === 'Employee'

  const normalizeId = (value) => {
    if (!value) return ''
    if (typeof value === 'object') return value._id || value.id || ''
    return value
  }

  useEffect(() => {
    if (isManager) {
      toast.error('Access Denied: Managers cannot perform direct payment entry.')
      navigate('/payments')
    }
  }, [isManager, navigate])

  useEffect(() => {
    // 1. Load context data
    api.get('/api/customers?limit=200').then(res => setCustomers(res.items || [])).catch(console.error)
    api.get('/api/users?limit=200').then(res => setUsers(res.items || [])).catch(console.error)
    api.get('/api/deals?limit=200').then(res => setDeals(res.items || [])).catch(console.error)

    // 2. Load payment data if EDIT
    if (isEdit && id) {
      setLoading(true)
      paymentsApi.get(id).then(res => {
        setModel({
          ...res,
          payment_date: res.payment_date ? new Date(res.payment_date).toISOString().split('T')[0] : '',
          customer_id: res.customer_id?._id || res.customer_id?.id || res.customer_id || '',
          invoice_id: res.invoice_id?._id || res.invoice_id?.id || res.invoice_id || '',
          user_id: res.user_id?._id || res.user_id?.id || res.user_id || '',
          collected_by: normalizeId(res.collected_by)
        })
      }).catch(err => {
        toast.error('Failed to load payment data')
        navigate('/payments')
      }).finally(() => setLoading(false))
    }
  }, [isEdit, id, navigate])

  useEffect(() => {
    if (model.customer_id && model.payment_type === 'Customer Payment') {
      const params = { customer_id: model.customer_id, limit: 100 };
      if (model.deal_id) params.deal_id = model.deal_id;
      
      invoicesApi.list(params).then(res => {
        const items = res.items || []
        const pending = items.filter(i => i.status !== 'Paid' && i.status !== 'Cancelled')
        setInvoices(pending)
        
        // Auto-select if invoice_id is in search params
        const preInvId = searchParams.get('invoice_id') || searchParams.get('invoiceId')
        if (preInvId) {
          const inv = items.find(i => i.id === preInvId || i._id === preInvId)
          if (inv) {
            const remaining = inv.total_amount - (inv.paid_amount || 0)
            setModel(prev => ({ 
              ...prev, 
              invoice_id: preInvId, 
              deal_id: normalizeId(inv.deal_id),
              total_amount: inv.total_amount, 
              paid_amount: remaining,
              status: remaining === 0 ? 'Paid' : (remaining < inv.total_amount ? 'Partial' : 'Pending')
            }))
          }
        }
      }).catch(console.error)
    } else {
      setInvoices([])
    }
  }, [model.customer_id, model.deal_id, model.payment_type, searchParams])

  // New Effect: Handle Deal ID from URL
  useEffect(() => {
    const preDealId = searchParams.get('deal_id') || searchParams.get('dealId');
    if (preDealId && deals.length > 0 && !model.deal_id) {
      const deal = deals.find(d => d.id === preDealId || d._id === preDealId);
      if (deal) {
        setModel(prev => ({
          ...prev,
          deal_id: preDealId,
          customer_id: normalizeId(deal.customer_id),
          total_amount: deal.value || prev.total_amount
        }));
      }
    }
  }, [searchParams, deals, model.deal_id])

  const handleInvoiceSelect = (invId) => {
    const inv = invoices.find(i => i._id === invId || i.id === invId)
    if (inv) {
      const remaining = inv.total_amount - (inv.paid_amount || 0)
      setModel({ 
        ...model, 
        invoice_id: invId, 
        deal_id: normalizeId(inv.deal_id),
        total_amount: inv.total_amount, 
        paid_amount: remaining, 
        pending_amount: 0,
        status: remaining === 0 ? 'Paid' : 'Partial'
      })
    } else {
      setModel({ ...model, invoice_id: '', total_amount: '', paid_amount: '', pending_amount: 0 })
    }
  }

  const validate = () => {
    const errors = {}
    
    if (['Customer Payment', 'Refund'].includes(model.payment_type) && !model.customer_id) errors.customer_id = 'Customer is required'
    if (['Salary Payment', 'Employee Reimbursement'].includes(model.payment_type) && !model.user_id) errors.user_id = 'Employee is required'
    if (model.payment_type === 'Vendor Payment' && !model.vendor_name) errors.vendor_name = 'Vendor is required'
    
    if (!model.total_amount || Number(model.total_amount) <= 0) errors.total_amount = 'Total amount is required'
    if (model.paid_amount === '' || Number(model.paid_amount) < 0) errors.paid_amount = 'Paid amount is required'
    if (Number(model.paid_amount) > Number(model.total_amount)) errors.paid_amount = 'Paid amount cannot exceed total amount'
    if (!model.payment_date) errors.payment_date = 'Payment date is required'

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    if (!validate()) return

    setSaving(true)
    try {
      const payload = {
        ...model,
        customer_id: normalizeId(model.customer_id),
        invoice_id: normalizeId(model.invoice_id),
        deal_id: normalizeId(model.deal_id),
        user_id: normalizeId(model.user_id),
        collected_by: normalizeId(model.collected_by)
      }
      if (!payload.collected_by) delete payload.collected_by
      if (!payload.customer_id) delete payload.customer_id
      if (!payload.invoice_id) delete payload.invoice_id
      if (!payload.deal_id) delete payload.deal_id
      if (!payload.user_id) delete payload.user_id

      if (isEdit) {
        await paymentsApi.update(id, payload)
        toast.success('Payment updated successfully')
      } else {
        await paymentsApi.create(payload)
        toast.success('Payment recorded successfully')
      }
      if (onSuccess) onSuccess(); else navigate('/payments')
    } catch (err) { 
      toast.error(err.response?.data?.message || `Failed to ${isEdit ? 'update' : 'record'} payment`) 
    } finally { 
      setSaving(false) 
    }
  }

  if (loading) return <div className="crm-modal-portal-overlay"><div className="spinner" /></div>

  const modalContent = (
    <div className="crm-modal-portal-overlay">
      <div className="crm-modal-sheet animate-sheet-in" style={{ maxWidth: '700px' }}>
        <div className="crm-modal-sheet-header">
          <div className="sheet-title-area">
            <h2 className="sheet-title">{isEdit ? 'Edit Payment' : 'Add Payment'}</h2>
            <p className="sheet-subtitle">
              {isEdit ? 'Update the details of this payment.' : 'Enter details of a new payment.'}
            </p>
          </div>
        </div>

        <form className="crm-modal-sheet-body custom-scrollbar" onSubmit={handleSubmit}>
          <div className="sheet-content-container">
            {/* Account Link */}
            <section className="form-sheet-section">
              <div className="form-sheet-section-header">
                <Icon name="user" />
                <span>Basic Details</span>
              </div>
              <div className="form-sheet-grid">
                <div className="sheet-field full-width">
                  <label>What is this for?</label>
                  <select 
                    className="crm-input" 
                    value={model.payment_type} 
                    onChange={e => setModel({ ...model, payment_type: e.target.value, customer_id: '', user_id: '', vendor_name: '' })}
                  >
                    {isAdmin || isAccountant ? (
                      <>
                        <option value="Customer Payment">Customer Payment</option>
                        <option value="Vendor Payment">Vendor Payment</option>
                        <option value="Employee Reimbursement">Employee Reimbursement</option>
                        <option value="Salary Payment">Salary Payment</option>
                        <option value="Refund">Refund to Customer</option>
                      </>
                    ) : isHR ? (
                      <>
                        <option value="Salary Payment">Salary Payment</option>
                        <option value="Employee Reimbursement">Employee Reimbursement</option>
                      </>
                    ) : isEmployee ? (
                      <option value="Employee Reimbursement">Reimbursement Request</option>
                    ) : null}
                  </select>
                </div>

                {['Customer Payment', 'Refund'].includes(model.payment_type) && (
                  <div className="sheet-field full-width">
                    <label>Who is the customer?</label>
                    <select
                      className={`crm-input ${fieldErrors.customer_id ? 'error' : ''}`}
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
                )}

                {model.payment_type === 'Customer Payment' && (
                  <div className="sheet-field full-width">
                    <label>Connect to a bill (optional)</label>
                    <select
                      className="crm-input"
                      value={model.invoice_id}
                      onChange={e => handleInvoiceSelect(e.target.value)}
                      disabled={!model.customer_id}
                    >
                      <option value="">{invoices.length > 0 ? 'Select an outstanding invoice...' : 'No pending invoices found'}</option>
                      {invoices.map(i => (
                        <option key={i._id || i.id} value={i._id || i.id}>
                          {i.invoice_number} - {i.deal_id?.name || 'No Deal'} (Pending: ₹{(i.total_amount - (i.paid_amount || 0)).toFixed(2)})
                        </option>
                      ))}
                    </select>
                    {invoices.length === 0 && model.customer_id && (
                      <p className="field-hint" style={{ color: 'var(--primary)', fontSize: '0.7rem', marginTop: '4px' }}>
                        * Only unpaid/partial invoices are shown here.
                      </p>
                    )}
                  </div>
                )}

                {['Salary Payment', 'Employee Reimbursement'].includes(model.payment_type) && (
                  <div className="sheet-field full-width">
                    <label>Which staff member?</label>
                    <select
                      className={`crm-input ${fieldErrors.user_id ? 'error' : ''}`}
                      value={model.user_id}
                      onChange={e => setModel({ ...model, user_id: e.target.value })}
                      required
                    >
                      <option value="">Select Employee...</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                    </select>
                    {fieldErrors.user_id && <span className="error-text">{fieldErrors.user_id}</span>}
                  </div>
                )}

                {model.payment_type === 'Vendor Payment' && (
                  <div className="sheet-field full-width">
                    <label>Vendor Name</label>
                    <input
                      type="text"
                      className={`crm-input ${fieldErrors.vendor_name ? 'error' : ''}`}
                      value={model.vendor_name}
                      onChange={e => setModel({ ...model, vendor_name: e.target.value })}
                      placeholder="Enter company/vendor name..."
                      required
                    />
                    {fieldErrors.vendor_name && <span className="error-text">{fieldErrors.vendor_name}</span>}
                  </div>
                )}
              </div>
            </section>

            {/* Transaction Data */}
            <section className="form-sheet-section">
              <div className="form-sheet-section-header">
                <Icon name="creditCard" />
                <span>💰 Payment Details</span>
              </div>
              <div className="form-sheet-grid">
                {model.payment_type === 'Customer Payment' && (
                  <div className="sheet-field full-width">
                    <label>Deal / Project Name</label>
                    <select
                      className="crm-input"
                      value={model.deal_id}
                      onChange={e => setModel({ ...model, deal_id: e.target.value })}
                      disabled={!model.customer_id}
                    >
                      <option value="">Select Deal...</option>
                      {deals.filter(d => normalizeId(d.customer_id) === normalizeId(model.customer_id)).map(d => (
                        <option key={d.id} value={d.id}>{d.name} (Val: ₹{d.value})</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="sheet-field">
                  <label>Total Amount (₹)</label>
                  <input
                    type="number"
                    className={`crm-input ${fieldErrors.total_amount ? 'error' : ''}`}
                    value={model.total_amount}
                    readOnly={!!model.invoice_id}
                    style={model.invoice_id ? { background: 'var(--bg-surface)', fontWeight: 700, opacity: 0.8 } : {}}
                    onChange={e => {
                      const val = e.target.value;
                      setModel(prev => ({ 
                        ...prev, 
                        total_amount: val,
                        pending_amount: Math.max(0, Number(val) - Number(prev.paid_amount))
                      }))
                    }}
                    placeholder="0.00"
                    required
                  />
                  {model.invoice_id && <p className="field-hint" style={{ fontSize: '0.65rem', color: 'var(--primary)', marginTop: '2px' }}>* Amount locked to selected bill</p>}
                </div>
                <div className="sheet-field">
                  <label>Paid Amount (₹)</label>
                  <input
                    type="number"
                    className={`crm-input ${fieldErrors.paid_amount ? 'error' : ''}`}
                    value={model.paid_amount}
                    onChange={e => {
                      const val = e.target.value;
                      const total = Number(model.total_amount) || 0;
                      const paid = Number(val) || 0;
                      let status = 'Pending';
                      if (paid >= total && total > 0) status = 'Paid';
                      else if (paid > 0) status = 'Partial';

                      setModel(prev => ({ 
                        ...prev, 
                        paid_amount: val,
                        pending_amount: Math.max(0, total - paid),
                        status: status
                      }))
                    }}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="sheet-field">
                  <label>Pending Amount (₹)</label>
                  <input
                    type="number"
                    className="crm-input"
                    value={model.pending_amount}
                    disabled
                    style={{ background: 'var(--bg-surface)', fontWeight: 800, color: model.pending_amount > 0 ? 'var(--danger)' : 'var(--success)' }}
                  />
                </div>
              </div>
            </section>

            <section className="form-sheet-section">
              <div className="form-sheet-section-header">
                <Icon name="activity" />
                <span>💳 Payment Info</span>
              </div>
              <div className="form-sheet-grid">
                <div className="sheet-field">
                  <label>Payment Method</label>
                  <select className="crm-input" value={model.payment_mode} onChange={e => setModel({ ...model, payment_mode: e.target.value })} required>
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
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
              </div>
            </section>

            <section className="form-sheet-section">
              <div className="form-sheet-section-header">
                <Icon name="info" />
                <span>📊 Status</span>
              </div>
              <div className="form-sheet-grid">
                <div className="sheet-field full-width">
                  <label>Current Status</label>
                  <select 
                    className="crm-input" 
                    value={model.status} 
                    onChange={e => setModel({ ...model, status: e.target.value })}
                    style={{ fontWeight: 800, color: model.status === 'Paid' ? 'var(--success)' : model.status === 'Partial' ? 'var(--warning)' : 'var(--danger)' }}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Partial">Partial</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Memo */}
            <section className="form-sheet-section no-border">
              <div className="form-sheet-section-header">
                <Icon name="notes" />
                <span>📝 Extra</span>
              </div>
              <div className="sheet-field full-width">
                <label>Notes</label>
                <textarea
                  className="crm-input"
                  style={{ minHeight: '80px' }}
                  value={model.notes}
                  onChange={e => setModel({ ...model, notes: e.target.value })}
                  placeholder="Record any details for audit purposes..."
                />
              </div>
              <div className="sheet-field full-width">
                <label>Attachment (Screenshot/Receipt)</label>
                <div className="file-upload-zone">
                  <input 
                    type="file" 
                    onChange={e => setFile(e.target.files[0])} 
                    className="crm-input" 
                    style={{ border: '2px dashed var(--border)', padding: '20px', textAlign: 'center' }}
                  />
                  {file && <div className="text-xs muted mt-8">Selected: {file.name}</div>}
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
              {saving ? 'Processing...' : isEdit ? 'Update Payment' : 'Record Payment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
