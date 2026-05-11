import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { toast } from 'react-toastify'
import { 
  FiUser, 
  FiMessageSquare, 
  FiActivity, 
  FiSettings, 
  FiTag, 
  FiFlag,
  FiBriefcase,
  FiInfo
} from 'react-icons/fi'
import { supportApi } from '../../../services/workflow.js'
import { customersApi } from '../../../services/customers.js'
import { usersApi } from '../../../services/users.js'
import { attachmentsApi } from '../../../services/attachments.js'
import SearchableSelect from '../components/SearchableSelect.jsx'
import { Icon } from '../../../layouts/icons.jsx'
import { useAuth } from '../../../context/AuthContext.jsx'

import { 
  validateRequired,
  validateEmail
} from '../../../utils/formValidation.js'

export default function TicketForm({ mode, ticketId, onSuccess, onCancel }) {
  const { id: paramsId } = useParams()
  const [searchParams] = useSearchParams()
  const id = ticketId || paramsId
  const navigate = useNavigate()
  const { user } = useAuth()
  const isEdit = mode === 'edit' || (!!id && id !== 'new')
  const isCustomer = user?.role === 'Customer'
  const isHR = user?.role === 'HR'
  const isSuperUser = ['Admin', 'Manager'].includes(user?.role)
  const isAgentOrAccountant = ['Support', 'Employee', 'Accountant'].includes(user?.role) || user?.role?.toLowerCase()?.includes('agent')

  useEffect(() => {
    if (isHR) {
      toast.error('Access Denied: HR role does not have permission to manage tickets.')
      navigate('/dashboard')
    }
  }, [isHR, navigate])

  const isCustomerFieldVisible = isSuperUser || isAgentOrAccountant
  const isSystemUserFieldVisible = isSuperUser || isAgentOrAccountant
  const showAccountLinkingSection = isCustomerFieldVisible || isSystemUserFieldVisible

  const [formData, setFormData] = useState(() => {
    let initCustomer = '';
    let initUser = user?.id || '';

    if (!isEdit) {
      if (isCustomer) {
        initCustomer = user?.customer_profile_id || '';
      } else if (isHR) {
        initCustomer = null;
      }
    }

    return {
      customer_id: initCustomer,
      user_customer_id: initUser,
      subject: '',
      description: '',
      priority: 'medium',
      category: 'General',
      status: 'open',
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      assigned_to: '',
      ticket_id: '',
      attachments: [],
      tags: '',
      source: 'Portal',
      internal_notes: '',
      cc_emails: '',
      sub_category: '',
      department: 'Support',
      expected_resolution_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      customer_name_manual: '',
      customer_email_manual: '',
      customer_phone_manual: ''
    }
  })
  const [initialData, setInitialData] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const [customers, setCustomers] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(isEdit && !!id)
  const [saving, setSaving]   = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    async function loadResources() {
      try {
        const [custRes, usersRes] = await Promise.all([
          customersApi.list({ limit: 100 }),
          usersApi.list({ limit: 100 })
        ])
        setCustomers(custRes.items || [])
        setAllUsers(usersRes.items || [])
      } catch (err) {
        toast.error('Failed to load association data')
      }
    }
    if (!isCustomer) loadResources()
  }, [isCustomer])

  useEffect(() => {
    if (!isEdit || !id) return
    setLoading(true)
    supportApi.get(id)
      .then(ticket => {
        const normalized = {
          customer_id: ticket.customer_id?._id || ticket.customer_id?.id || ticket.customer_id || '',
          user_customer_id: ticket.user_customer_id?._id || ticket.user_customer_id?.id || '',
          subject: ticket.subject || '',
          description: ticket.description || '',
          priority: ticket.priority || 'medium',
          category: ticket.category || 'General',
          status: ticket.status || 'open',
          assigned_to: ticket.assigned_to?._id || ticket.assigned_to?.id || ticket.assigned_to || '',
          deadline: ticket.deadline ? new Date(ticket.deadline).toISOString().slice(0, 16) : '',
          ticket_id: ticket.ticket_id || '',
          attachments: ticket.attachments || [],
          tags: ticket.tags || '',
          source: ticket.source || 'Portal',
          internal_notes: ticket.internal_notes || '',
          cc_emails: ticket.cc_emails || '',
          sub_category: ticket.sub_category || '',
          department: ticket.department || 'Support',
          expected_resolution_date: ticket.expected_resolution_date ? new Date(ticket.expected_resolution_date).toISOString().slice(0, 16) : ''
        }
        setFormData(normalized)
        setInitialData(normalized)
      })
      .catch(() => {
        toast.error('Failed to load ticket')
        if (onCancel) onCancel(); else navigate('/tickets')
      })
      .finally(() => setLoading(false))
  }, [id, isEdit, navigate, onCancel])

  function validate() {
    const errors = {}
    
    if (!isCustomer && !formData.customer_id) errors.customer_id = 'Customer is required'
    if (!formData.assigned_to && !isCustomer) errors.assigned_to = 'Please assign this ticket to an agent'
    
    const subjectErr = validateRequired('Subject', formData.subject)
    if (subjectErr) errors.subject = subjectErr

    const descErr = validateRequired('Description', formData.description)
    if (descErr) errors.description = descErr

    if (formData.customer_email_manual) {
      const emailErr = validateEmail('Manual Email', formData.customer_email_manual)
      if (emailErr) errors.customer_email_manual = emailErr
    }

    if (formData.cc_emails) {
      const emails = formData.cc_emails.split(',').map(e => e.trim()).filter(Boolean)
      const invalidEmails = emails.filter(e => !validateEmail('Email', e) === false) 
      // Wait, validateEmail returns a string error if invalid
      const hasInvalid = emails.some(e => !!validateEmail('Email', e))
      if (hasInvalid) errors.cc_emails = 'One or more CC emails are invalid'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleFileUpload(e) {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    setUploading(true)
    try {
      const newAttachments = []
      for (const file of files) {
        const uploadFormData = new FormData()
        uploadFormData.append('file', file)
        uploadFormData.append('related_type', 'SupportTicket')
        const res = await attachmentsApi.upload(uploadFormData)
        newAttachments.push({
          name: file.name,
          url: `/uploads/${res.filename}`,
          file_type: file.type,
          uploaded_at: new Date()
        })
      }
      setFormData(prev => ({
        ...prev,
        attachments: [...prev.attachments, ...newAttachments]
      }))
      toast.success(`${files.length} files attached`)
    } catch (err) {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault()
    if (!validate()) {
      const firstError = Object.values(fieldErrors)[0] || 'Please fix validation errors'
      return toast.warn(firstError)
    }

    setSaving(true)
    try {
      const payload = { ...formData }
      if (!payload.customer_id) payload.customer_id = null
      if (!payload.user_customer_id) payload.user_customer_id = null
      if (!payload.assigned_to) payload.assigned_to = null
      if (!payload.deadline) payload.deadline = null
      delete payload.ticket_id

      if (isEdit) await supportApi.update(id, payload)
      else await supportApi.create(payload)
      toast.success(`Ticket ${isEdit ? 'updated' : 'created'}`)
      if (onSuccess) onSuccess(); else navigate('/tickets')
    } catch (err) { toast.error('Failed to save') } finally { setSaving(false) }
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

  if (loading) return <div className="p-40 text-center text-dimmed">Loading...</div>

  const modalContent = (
    <div className="crm-modal-portal-overlay">
      <div className="crm-modal-sheet animate-sheet-in" style={{ maxWidth: '900px' }}>
        <div className="crm-modal-sheet-header">
          <div className="sheet-title-area">
            <h2 className="sheet-title">{isEdit ? 'Update Ticket' : 'Raise New Ticket'}</h2>
            <p className="sheet-subtitle">{isEdit ? `Editing Ticket #${formData.ticket_id || id}` : 'Fill in the details below to create a ticket'}</p>
          </div>
          <button className="crm-btn-premium glass" onClick={() => (onCancel ? onCancel() : navigate(-1))} style={{ padding: '8px' }}>
            <Icon name="x" size={20} />
          </button>
        </div>

        <form className="crm-modal-sheet-body custom-scrollbar" onKeyDown={handleKeyDown} onSubmit={handleSubmit}>
          <div className="sheet-content-container">
            {/* 🧍 Customer Info */}
            <section className="form-sheet-section">
              <div className="form-sheet-section-header">
                <FiUser />
                <span>Customer Information</span>
              </div>
              <div className="form-sheet-grid">
                <div className="sheet-field">
                  <label>Customer Account *</label>
                  <SearchableSelect 
                    value={formData.customer_id}
                    onChange={val => setFormData({ ...formData, customer_id: val })}
                    options={[
                      { value: '', label: 'Select Customer...' },
                      ...customers.map(c => ({ value: c.id, label: c.name }))
                    ]}
                    placeholder="Search Customer..."
                    icon="user"
                  />
                  {fieldErrors.customer_id && <span className="error-text">{fieldErrors.customer_id}</span>}
                </div>
                <div className="sheet-field">
                  <label>Customer ID</label>
                  <div className="crm-input-group disabled">
                    <div className="input-icon-box"><FiTag /></div>
                    <input 
                      value={customers.find(c => c.id === formData.customer_id)?.customer_id || '—'} 
                      readOnly 
                      placeholder="Account ID"
                    />
                  </div>
                </div>
                <div className="sheet-field">
                  <label>Mobile Number</label>
                  <div className="crm-input-group disabled">
                    <div className="input-icon-box"><Icon name="phone" /></div>
                    <input 
                      value={customers.find(c => c.id === formData.customer_id)?.phone || '—'} 
                      readOnly 
                      placeholder="Contact Number"
                    />
                  </div>
                </div>
                <div className="sheet-field">
                  <label>Email Address</label>
                  <div className="crm-input-group disabled">
                    <div className="input-icon-box"><Icon name="mail" /></div>
                    <input 
                      value={customers.find(c => c.id === formData.customer_id)?.email || '—'} 
                      readOnly 
                      placeholder="Email Address"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* 🎫 Ticket Info */}
            <section className="form-sheet-section">
              <div className="form-sheet-section-header">
                <FiMessageSquare />
                <span>Ticket Details</span>
              </div>
              <div className="form-sheet-grid">
                <div className="sheet-field full-width">
                  <label>Ticket Subject *</label>
                  <div className={`crm-input-group ${fieldErrors.subject ? 'error' : ''}`}>
                    <div className="input-icon-box"><FiInfo /></div>
                    <input
                      autoFocus
                      value={formData.subject}
                      onChange={e => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="Summary of the issue"
                    />
                  </div>
                </div>
                <div className="sheet-field full-width">
                  <label>Issue Description *</label>
                  <div className={`crm-input-group ${fieldErrors.description ? 'error' : ''}`}>
                    <div className="input-icon-box" style={{ alignItems: 'flex-start', paddingTop: '12px' }}><FiMessageSquare /></div>
                    <textarea
                      style={{ minHeight: '100px' }}
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Full details of the customer request..."
                    />
                  </div>
                </div>
                <div className="sheet-field">
                  <label>Category</label>
                  <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                    <option value="Technical">Technical</option>
                    <option value="Billing">Billing</option>
                    <option value="General">General</option>
                    <option value="Complaint">Complaint</option>
                  </select>
                </div>
                <div className="sheet-field">
                  <label>Sub Category (Optional)</label>
                  <input 
                    value={formData.sub_category}
                    onChange={e => setFormData({ ...formData, sub_category: e.target.value })}
                    placeholder="e.g. Software, Hardware"
                  />
                </div>
              </div>
            </section>

            {/* ⚡ Priority Level */}
            <section className="form-sheet-section">
              <div className="form-sheet-section-header">
                <FiFlag />
                <span>Priority & Status</span>
              </div>
              <div className="form-sheet-grid">
                <div className="sheet-field">
                  <label>Priority Level</label>
                  <select value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div className="sheet-field">
                  <label>Current Status</label>
                  <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
              </div>
            </section>

            {/* 👨💼 Assignment */}
            <section className="form-sheet-section">
              <div className="form-sheet-section-header">
                <FiBriefcase />
                <span>Assignment Details</span>
              </div>
              <div className="form-sheet-grid">
                <div className="sheet-field">
                  <label>Assigned Employee *</label>
                  <select value={formData.assigned_to} onChange={e => setFormData({ ...formData, assigned_to: e.target.value })}>
                    <option value="">Select Employee...</option>
                    {allUsers.filter(u => u.role !== 'Customer').map(m => (
                      <option key={m.id || m._id} value={m.id || m._id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div className="sheet-field">
                  <label>Department</label>
                  <select value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })}>
                    <option value="Support">Support</option>
                    <option value="Sales">Sales</option>
                    <option value="Technical">Technical</option>
                  </select>
                </div>
              </div>
            </section>

            {/* 📅 Tracking */}
            <section className="form-sheet-section">
              <div className="form-sheet-section-header">
                <FiActivity />
                <span>Timeline Tracking</span>
              </div>
              <div className="form-sheet-grid">
                <div className="sheet-field">
                  <label>Expected Resolution Date</label>
                  <input 
                    type="datetime-local" 
                    value={formData.expected_resolution_date} 
                    onChange={e => setFormData({ ...formData, expected_resolution_date: e.target.value })}
                  />
                </div>
                <div className="sheet-field">
                  <label>Internal Notes (Agent Reference)</label>
                  <textarea
                    value={formData.internal_notes}
                    onChange={e => setFormData({ ...formData, internal_notes: e.target.value })}
                    placeholder="Strategy or technical notes..."
                  />
                </div>
              </div>
            </section>

            {/* 📎 Attachments */}
            <section className="form-sheet-section no-border">
              <div className="form-sheet-section-header">
                <Icon name="paperclip" />
                <span>Supporting Files</span>
              </div>
              <div className="form-sheet-grid">
                <div className="sheet-field full-width">
                  <div className="attachment-upload-box" onClick={() => fileInputRef.current?.click()}>
                    <Icon name="upload" size={24} />
                    <span>{uploading ? 'Uploading...' : 'Click to upload Screenshot or File'}</span>
                    <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} multiple />
                  </div>
                  <div className="attachment-preview-grid">
                    {formData.attachments.map((at, idx) => (
                      <div key={idx} className="attachment-chip">
                        <span>{at.name}</span>
                        <button type="button" onClick={() => setFormData(p => ({ ...p, attachments: p.attachments.filter((_, i) => i !== idx) }))}>×</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </form>

        <div className="crm-modal-sheet-footer">
          <p className="footer-hint">We will notify the team about this ticket.</p>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button className="crm-btn-premium glass" onClick={() => (onCancel ? onCancel() : navigate(-1))}>Cancel</button>
            <button className="crm-btn-premium vibrant" disabled={saving} onClick={handleSubmit}>
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Ticket'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .attachment-chip { 
          background: var(--bg-surface); 
          padding: 6px 12px; 
          border-radius: 8px; 
          font-size: 0.8rem; 
          border: 1px solid var(--border-strong); 
          display: flex; 
          align-items: center; 
          gap: 8px; 
          font-weight: 600;
        }
        .attachment-chip button { 
          border: none; 
          background: transparent; 
          color: var(--danger); 
          cursor: pointer; 
          font-size: 1.2rem;
          line-height: 1;
        }
      `}</style>
    </div>
  )

  return createPortal(modalContent, document.getElementById('modal-root-content') || document.body)
}
