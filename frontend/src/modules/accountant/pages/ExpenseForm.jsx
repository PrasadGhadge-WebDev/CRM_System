import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { expensesApi } from '../../../services/expenses'
import { toast } from 'react-toastify'
import { Icon } from '../../../layouts/icons'
import { createPortal } from 'react-dom'
import { useAuth } from '../../../context/AuthContext'
import { api } from '../../../services/api'

export default function ExpenseForm({ mode = 'create', expenseId = null, onSuccess = null, onClose = null }) {
  const { id: routeId } = useParams()
  const id = expenseId || routeId
  const navigate = useNavigate()
  const { user } = useAuth()
  const isEdit = mode === 'edit'
  
  const [model, setModel] = useState({
    title: '',
    category: 'Rent',
    amount: '',
    tax_amount: '',
    date: new Date().toISOString().split('T')[0],
    vendor_name: '',
    payment_method: 'UPI',
    paid_by: '',
    note: ''
  })
  
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [file, setFile] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const usersRes = await api.get('/api/users?limit=200')
        setUsers(usersRes.items || [])

        if (isEdit && id) {
          const res = await expensesApi.get(id)
          if (res) {
            setModel({
              ...res,
              date: res.date ? res.date.split('T')[0] : '',
              paid_by: res.paid_by?._id || res.paid_by || ''
            })
          }
        } else {
          setModel(prev => ({ ...prev, paid_by: user?.id || '' }))
        }
      } catch (err) {
        toast.error('Failed to prepare form')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id, mode, user])

  const validate = () => {
    const errors = {}
    if (!model.title) errors.title = 'Title is required'
    if (!model.amount || Number(model.amount) <= 0) errors.amount = 'Valid amount is required'
    if (!model.category) errors.category = 'Category is required'
    if (!model.date) errors.date = 'Date is required'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    if (!validate()) return

    setSaving(true)
    try {
      const formData = new FormData()
      Object.keys(model).forEach(key => {
        formData.append(key, model[key])
      })
      if (file) formData.append('receipt', file)

      if (!isEdit) {
        await expensesApi.create(formData)
        toast.success('Expense recorded successfully')
      } else {
        await expensesApi.update(id, formData)
        toast.success('Expense updated successfully')
      }
      
      if (onSuccess) onSuccess()
      else if (onClose) onClose()
      else navigate('/expenses')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record expense')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return null

  const modalContent = (
    <div className="crm-modal-portal-overlay">
      <div className="crm-modal-sheet animate-sheet-in" style={{ maxWidth: '700px' }}>
        <div className="crm-modal-sheet-header">
          <div className="sheet-title-area">
            <h2 className="sheet-title">{isEdit ? 'Edit Expense' : 'Add Expense'}</h2>
            <p className="sheet-subtitle">
              {isEdit ? 'Update the details of this expenditure.' : 'Enter details of a new expense.'}
            </p>
          </div>
        </div>

        <form className="crm-modal-sheet-body custom-scrollbar" onSubmit={handleSubmit}>
          <div className="sheet-content-container">
            {/* Basic Details */}
            <section className="form-sheet-section">
              <div className="form-sheet-section-header">
                <Icon name="reports" />
                <span>BASIC DETAILS</span>
              </div>
              <div className="form-sheet-grid">
                {isEdit && model.custom_id && (
                  <div className="sheet-field full-width">
                    <label>EXPENSE ID</label>
                    <input type="text" className="crm-input" value={model.custom_id} disabled style={{ background: 'var(--bg-surface)', fontWeight: 800 }} />
                  </div>
                )}
                <div className="sheet-field full-width">
                  <label>EXPENSE TITLE</label>
                  <input
                    type="text"
                    className={`crm-input ${fieldErrors.title ? 'error' : ''}`}
                    value={model.title}
                    onChange={(e) => setModel({ ...model, title: e.target.value })}
                    placeholder="e.g. Office Internet Bill - Oct"
                    required
                  />
                  {fieldErrors.title && <span className="error-text">{fieldErrors.title}</span>}
                </div>

                <div className="sheet-field">
                  <label>CATEGORY</label>
                  <select
                    className="crm-input"
                    value={model.category}
                    onChange={(e) => setModel({ ...model, category: e.target.value })}
                    required
                  >
                    <option value="Rent">Rent 🏢</option>
                    <option value="Salary">Salary 👨‍💼</option>
                    <option value="Software">Software 💻</option>
                    <option value="Marketing">Marketing 📢</option>
                    <option value="Travel">Travel 🚗</option>
                    <option value="Office Supplies">Office Supplies 📎</option>
                    <option value="Utilities">Utilities ⚡</option>
                    <option value="Internet">Internet 🌐</option>
                    <option value="Medical">Medical 🏥</option>
                    <option value="Wellness">Wellness 🧘</option>
                    <option value="Other">Other 📦</option>
                  </select>
                </div>

                <div className="sheet-field">
                  <label>DATE</label>
                  <input
                    type="date"
                    className="crm-input"
                    value={model.date}
                    onChange={(e) => setModel({ ...model, date: e.target.value })}
                    required
                  />
                </div>
              </div>
            </section>

            {/* Financial Details */}
            <section className="form-sheet-section">
              <div className="form-sheet-section-header">
                <Icon name="creditCard" />
                <span>FINANCIAL DETAILS</span>
              </div>
              <div className="form-sheet-grid">
                <div className="sheet-field">
                  <label>AMOUNT (₹)</label>
                  <input
                    type="number"
                    className={`crm-input ${fieldErrors.amount ? 'error' : ''}`}
                    value={model.amount}
                    onChange={(e) => setModel({ ...model, amount: e.target.value })}
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    required
                  />
                  {fieldErrors.amount && <span className="error-text">{fieldErrors.amount}</span>}
                </div>

                <div className="sheet-field">
                  <label>TAX AMOUNT (₹)</label>
                  <input
                    type="number"
                    className="crm-input"
                    value={model.tax_amount}
                    onChange={(e) => setModel({ ...model, tax_amount: e.target.value })}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>

                <div className="sheet-field">
                  <label>VENDOR NAME</label>
                  <input
                    type="text"
                    className="crm-input"
                    value={model.vendor_name}
                    onChange={(e) => setModel({ ...model, vendor_name: e.target.value })}
                    placeholder="Company/Supplier Name"
                  />
                </div>

                <div className="sheet-field">
                  <label>PAYMENT METHOD</label>
                  <select
                    className="crm-input"
                    value={model.payment_method}
                    onChange={(e) => setModel({ ...model, payment_method: e.target.value })}
                  >
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Card">Card</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {(user.role === 'Admin' || user.role === 'Accountant') && (
                  <div className="sheet-field full-width">
                    <label>TRANSACTION ID / REF</label>
                    <input
                      type="text"
                      className="crm-input"
                      value={model.transaction_id || ''}
                      onChange={(e) => setModel({ ...model, transaction_id: e.target.value })}
                      placeholder="TXN-XXXXXXXXX"
                    />
                  </div>
                )}

                <div className="sheet-field full-width">
                  <label>PAID BY</label>
                  <select
                    className="crm-input"
                    value={model.paid_by}
                    onChange={(e) => setModel({ ...model, paid_by: e.target.value })}
                  >
                    <option value="">Select User...</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                  </select>
                </div>
              </div>
            </section>

            {/* Attachments & Notes */}
            <section className="form-sheet-section no-border">
              <div className="form-sheet-section-header">
                <Icon name="notes" />
                <span>NOTES & ATTACHMENTS</span>
              </div>
              <div className="sheet-field full-width">
                <label>EXPENSE NOTES</label>
                <textarea
                  className="crm-input"
                  style={{ minHeight: '80px' }}
                  value={model.note}
                  onChange={(e) => setModel({ ...model, note: e.target.value })}
                  placeholder="Record any details for audit purposes..."
                />
              </div>
              <div className="sheet-field full-width">
                <label>RECEIPT (IMAGE/PDF)</label>
                <div className="file-upload-zone">
                  <input 
                    type="file" 
                    onChange={e => setFile(e.target.files[0])} 
                    className="crm-input" 
                    style={{ border: '2px dashed var(--border)', padding: '20px', textAlign: 'center' }}
                    accept="image/*,application/pdf"
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
            <button className="crm-btn-premium glass" onClick={onClose || (() => navigate(-1))}>Cancel</button>
            <button className="crm-btn-premium vibrant" disabled={saving} onClick={handleSubmit}>
              {saving ? 'Processing...' : isEdit ? 'Update Expense' : 'Record Expense'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
