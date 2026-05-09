import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { toast } from 'react-toastify'
import { 
  FiUser, 
  FiCalendar, 
  FiBriefcase, 
  FiActivity, 
  FiFlag, 
  FiInfo,
  FiTarget,
  FiCreditCard,
  FiTag,
  FiPhone,
  FiMail
} from 'react-icons/fi'
import { dealsApi } from '../../../services/deals.js'
import { customersApi } from '../../../services/customers.js'
import { usersApi } from '../../../services/users.js'
import { Icon } from '../../../layouts/icons.jsx'
import RichTextEditor from '../../../components/RichTextEditor.jsx'
import { useAuth } from '../../../context/AuthContext.jsx'

const INITIAL_DEAL = {
  name: '',
  customer_id: '',
  expected_close_date: '',
  next_followup_date: '',
  value: 0,
  currency: 'INR',
  stage: 'New Deal',
  status: 'Open',
  assigned_to: '',
  description: '',
  product_service: '',
  quantity: 1,
  price: 0,
  discount_percent: 0,
  notes: '',
  lost_reason: '',
  priority: 'Medium',
  contact_number: '',
  company_name: '',
  email: ''
}

export default function DealForm({ mode, dealId, onSuccess, onCancel }) {
  const { id: paramsId } = useParams()
  const [searchParams] = useSearchParams()
  const preSelectedCustomerId = searchParams.get('customer_id')
  
  const id = dealId || paramsId
  const navigate = useNavigate()
  const isEdit = mode === 'edit' || (!!id && id !== 'new')

  const { user: currentUser } = useAuth()
  const isEmployee = (currentUser?.role || '') === 'Employee'
  const isAdmin = (currentUser?.role || '') === 'Admin'
  const canAssign = ['Admin', 'Manager', 'Accountant'].includes(currentUser?.role)

  const [model, setModel] = useState({
    ...INITIAL_DEAL,
    customer_id: preSelectedCustomerId || '',
    assigned_to: (currentUser?.role === 'Employee' && !isEdit) ? (currentUser.id || currentUser._id) : ''
  })
  const [initialModel, setInitialModel] = useState(null)
  const [customers, setCustomers] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(isEdit && !!id)
  const [saving, setSaving] = useState(false)

  // Auto-calculate Deal Value
  useEffect(() => {
    const baseValue = (model.price || 0) * (model.quantity || 1)
    const discountAmount = baseValue * ((model.discount_percent || 0) / 100)
    const finalValue = Math.max(0, baseValue - discountAmount)
    if (!isEmployee && model.value !== finalValue) {
      setModel(prev => ({ ...prev, value: finalValue }))
    }
  }, [model.price, model.quantity, model.discount_percent, isEmployee])

  useEffect(() => {
    async function loadResources() {
      try {
        const [custRes, userRes] = await Promise.all([
          customersApi.list({ limit: 100 }),
          usersApi.list({ limit: 100 })
        ])
        setCustomers(custRes.items || [])
        setUsers((userRes.items || []).filter(u => u.role !== 'HR'))
      } catch (err) {
        toast.error('Failed to load association data')
      }
    }
    loadResources()
  }, [])

  useEffect(() => {
    if (!isEdit || !id) return
    setLoading(true)
    dealsApi.get(id)
      .then(data => {
        const normalized = {
          ...INITIAL_DEAL,
          ...data,
          expected_close_date: data.expected_close_date ? new Date(data.expected_close_date).toISOString().split('T')[0] : '',
          next_followup_date: data.next_followup_date ? new Date(data.next_followup_date).toISOString().split('T')[0] : '',
          customer_id: data.customer_id?._id || data.customer_id?.id || data.customer_id || '',
          assigned_to: data.assigned_to?._id || data.assigned_to?.id || data.assigned_to || '',
          contact_number: data.customer_id?.phone || '',
          company_name: data.customer_id?.company || '',
          email: data.customer_id?.email || '',
          priority: data.priority || 'Medium'
        }
        setModel(normalized)
        setInitialModel(normalized)
      })
      .catch(() => {
        toast.error('Failed to load deal')
        if (onCancel) onCancel(); else navigate('/deals')
      })
      .finally(() => setLoading(false))
  }, [id, isEdit, navigate, onCancel])

  async function handleSubmit(e) {
    if (e) e.preventDefault()
    if (!model.name || !model.customer_id) return toast.warn('Opportunity Name and Customer are required')

    if (isEdit && initialModel) {
      const isChanged = Object.keys(INITIAL_DEAL).some(key => model[key] !== initialModel[key])
      if (!isChanged) {
        return toast.info('No changes detected')
      }
    }

    setSaving(true)
    try {
      const payload = { ...model }
      if (!payload.assigned_to) delete payload.assigned_to
      if (!payload.expected_close_date) delete payload.expected_close_date
      if (!payload.next_followup_date) delete payload.next_followup_date

      const saved = isEdit ? await dealsApi.update(id, payload) : await dealsApi.create(payload)
      toast.success(`Deal ${isEdit ? 'updated' : 'created'}`)
      if (onSuccess) onSuccess(saved); else navigate(`/deals/${saved.id || id}`)
    } catch (err) { toast.error('Failed to save deal') } finally { setSaving(false) }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      const form = e.target.form
      if (!form || e.target.tagName === 'TEXTAREA' || e.target.type === 'submit' || e.target.closest('.ql-editor')) return
      e.preventDefault()
      const index = Array.from(form.elements).indexOf(e.target)
      const nextElement = form.elements[index + 1]
      if (nextElement && nextElement.tagName !== 'BUTTON') nextElement.focus()
      else handleSubmit(e)
    }
  }

  if (loading) return <div className="p-40 text-center text-dimmed">Loading...</div>

  const modalContent = (
    <div className="crm-modal-portal-overlay">
      <div className="crm-modal-sheet animate-sheet-in">
        <div className="crm-modal-sheet-header">
          <div className="sheet-title-area">
            <h2 className="sheet-title">{isEdit ? 'Edit Deal' : 'Add New Deal'}</h2>
            <p className="sheet-subtitle">{isEdit ? `Editing deal: ${model.name}` : 'Enter the details for your new deal'}</p>
          </div>
        </div>

        <form className="crm-modal-sheet-body custom-scrollbar" onKeyDown={handleKeyDown} onSubmit={handleSubmit}>
          <div className="sheet-content-container">
            {/* Basic Info */}
            <section className="form-sheet-section">
              <div className="form-sheet-section-header">
                <FiTarget />
                <span>Basic Details</span>
              </div>
              <div className="form-sheet-grid">
                <div className="sheet-field full-width">
                  <label>Deal Name</label>
                  <div className="crm-input-group">
                    <div className="input-icon-box"><FiTag /></div>
                    <input
                      autoFocus
                      value={model.name}
                      onChange={e => setModel({ ...model, name: e.target.value })}
                      placeholder="e.g. Website Development – ABC Company"
                    />
                  </div>
                </div>
                <div className="sheet-field">
                  <label>Customer Name</label>
                  <div className="crm-input-group">
                    <div className="input-icon-box"><FiUser /></div>
                    <select 
                      value={model.customer_id} 
                      onChange={e => {
                        const custId = e.target.value;
                        const selectedCust = customers.find(c => String(c.id || c._id) === String(custId));
                        const updates = { 
                          customer_id: custId,
                          contact_number: selectedCust?.phone || '',
                          company_name: selectedCust?.company || '',
                          email: selectedCust?.email || ''
                        };
                        
                        // Auto-fill logic: Get owner from customer/lead
                        if (selectedCust && selectedCust.assigned_to && !isEmployee) {
                          updates.assigned_to = selectedCust.assigned_to._id || selectedCust.assigned_to;
                        }
                        
                        setModel({ ...model, ...updates });
                      }}
                    >
                      <option value="">Select Customer</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="sheet-field">
                  <label>Deal Value (₹)</label>
                  <div className={`crm-input-group ${isEmployee ? '' : 'disabled'}`}>
                    <div className="input-icon-box"><FiCreditCard /></div>
                    <input
                      type="number"
                      value={model.value}
                      readOnly={!isEmployee}
                      onChange={e => isEmployee && setModel({ ...model, value: Number(e.target.value) })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
               
              {isEmployee && model.customer_id && (
                <div className="form-sheet-grid" style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                  <div className="sheet-field">
                    <label>Company Name</label>
                    <div className="crm-input-group disabled">
                      <div className="input-icon-box"><FiBriefcase /></div>
                      <input value={model.company_name} readOnly />
                    </div>
                  </div>
                  <div className="sheet-field">
                    <label>Contact Number</label>
                    <div className="crm-input-group disabled">
                      <div className="input-icon-box"><FiPhone /></div>
                      <input value={model.contact_number} readOnly />
                    </div>
                  </div>
                  <div className="sheet-field">
                    <label>Email Address</label>
                    <div className="crm-input-group disabled">
                      <div className="input-icon-box"><FiMail /></div>
                      <input value={model.email} readOnly />
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="form-sheet-section">
              <div className="form-sheet-section-header">
                <FiActivity />
                <span>Stage & Progress</span>
              </div>
              <div className="form-sheet-grid">
                <div className="sheet-field">
                  <label>Deal Stage</label>
                  <div className="crm-input-group">
                    <div className="input-icon-box"><FiActivity /></div>
                    <select 
                      value={model.stage} 
                      onChange={e => {
                        const newStage = e.target.value;
                        const updates = { stage: newStage };
                        if (newStage === 'Lost') {
                          updates.status = 'Closed';
                        } else if (newStage !== 'Won') {
                          updates.status = 'Open';
                        }
                        setModel({ ...model, ...updates });
                      }}
                    >
                      {['New Deal', 'Proposal Sent', 'Negotiation', 'Follow-up', 'Won', 'Lost'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="sheet-field">
                  <label>Deal Status (Open/Closed)</label>
                  <div className="crm-input-group">
                    <div className="input-icon-box"><FiFlag /></div>
                    <select value={model.status} onChange={e => setModel({ ...model, status: e.target.value })}>
                      <option value="Open">Open</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>
                </div>
                {!isEmployee && (
                  <div className="sheet-field">
                    <label>Assigned To</label>
                    <div className="crm-input-group">
                      <div className="input-icon-box"><FiBriefcase /></div>
                      <select 
                        value={model.assigned_to} 
                        onChange={e => setModel({ ...model, assigned_to: e.target.value })}
                        disabled={!canAssign}
                        style={!canAssign ? { opacity: 0.7, cursor: 'not-allowed', background: 'var(--bg-surface)' } : {}}
                      >
                        <option value="">Unassigned</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    </div>
                  </div>
                )}
                <div className="sheet-field">
                  <label>Expected Date to Close</label>
                  <div className="crm-input-group">
                    <div className="input-icon-box"><FiCalendar /></div>
                    <input type="date" value={model.expected_close_date} onChange={e => setModel({ ...model, expected_close_date: e.target.value })} />
                  </div>
                </div>
                <div className="sheet-field">
                  <label>Priority</label>
                  <div className="crm-input-group">
                    <div className="input-icon-box"><FiFlag /></div>
                    <select value={model.priority} onChange={e => setModel({ ...model, priority: e.target.value })}>
                      <option value="High">🔴 High</option>
                      <option value="Medium">🟡 Medium</option>
                      <option value="Low">🟢 Low</option>
                    </select>
                  </div>
                </div>
              </div>
            </section>

            {!isEmployee && (
              <section className="form-sheet-section">
                <div className="form-sheet-section-header">
                  <FiBriefcase />
                  <span>What are you selling?</span>
                </div>
                <div className="form-sheet-grid">
                  <div className="sheet-field full-width">
                    <label>Product / Service</label>
                    <div className="crm-input-group">
                      <div className="input-icon-box"><FiBriefcase /></div>
                      <input
                        value={model.product_service}
                        onChange={e => setModel({ ...model, product_service: e.target.value })}
                        placeholder="What are we selling?"
                      />
                    </div>
                  </div>
                  <div className="sheet-field">
                    <label>Item Price (₹)</label>
                    <div className="crm-input-group">
                      <div className="input-icon-box"><FiCreditCard /></div>
                      <input
                        type="number"
                        value={model.price}
                        onChange={e => setModel({ ...model, price: Number(e.target.value) })}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="sheet-field">
                    <label>Quantity</label>
                    <div className="crm-input-group">
                      <div className="input-icon-box"><FiTarget /></div>
                      <input
                        type="number"
                        value={model.quantity}
                        onChange={e => setModel({ ...model, quantity: Number(e.target.value) })}
                        placeholder="1"
                      />
                    </div>
                  </div>
                  <div className="sheet-field">
                    <label>Discount (%)</label>
                    <div className="crm-input-group">
                      <div className="input-icon-box"><FiTarget /></div>
                      <input
                        type="number"
                        value={model.discount_percent}
                        onChange={e => setModel({ ...model, discount_percent: Number(e.target.value) })}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              </section>
            )}

            <section className="form-sheet-section no-border">
              <div className="form-sheet-section-header">
                <FiInfo />
                <span>Next Step & Notes</span>
              </div>
              <div className="form-sheet-grid">
                <div className="sheet-field">
                  <label>Next Follow-up Date</label>
                  <div className="crm-input-group">
                    <div className="input-icon-box"><FiCalendar /></div>
                    <input type="date" value={model.next_followup_date} onChange={e => setModel({ ...model, next_followup_date: e.target.value })} />
                  </div>
                </div>
                {model.stage === 'Lost' && (
                  <div className="sheet-field full-width">
                    <label>Reason for Loss</label>
                    <div className="crm-input-group">
                      <div className="input-icon-box"><FiInfo /></div>
                      <textarea
                        value={model.lost_reason}
                        onChange={e => setModel({ ...model, lost_reason: e.target.value })}
                        placeholder="Why was the deal lost?"
                        style={{ minHeight: '80px', padding: '12px' }}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="sheet-field full-width" style={{ marginTop: '24px' }}>
                <label>Description / Public Details</label>
                <div style={{ marginTop: '8px' }}>
                  <RichTextEditor
                    value={model.description}
                    onChange={val => setModel(prev => ({ ...prev, description: val }))}
                    height="150px"
                  />
                </div>
              </div>

              <div className="sheet-field full-width" style={{ marginTop: '24px' }}>
                <label>Internal Notes (Private)</label>
                <div className="crm-input-group" style={{ marginTop: '8px' }}>
                  <textarea
                    value={model.notes}
                    onChange={e => setModel({ ...model, notes: e.target.value })}
                    placeholder="Internal details not visible to customers..."
                    style={{ minHeight: '100px', width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}
                  />
                </div>
              </div>
            </section>
          </div>
        </form>

        <div className="crm-modal-sheet-footer">
          <p className="footer-hint">Your data is safe and secure.</p>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button className="crm-btn-premium glass" onClick={() => (onCancel ? onCancel() : navigate(-1))}>Cancel</button>
            <button className="crm-btn-premium vibrant" disabled={saving} onClick={handleSubmit}>
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Deal'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.getElementById('modal-root-content') || document.body)
}
