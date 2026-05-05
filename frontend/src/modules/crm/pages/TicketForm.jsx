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
  validateRequired 
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
      status: 'new',
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      assigned_to: '',
      ticket_id: '',
      attachments: []
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
          status: ticket.status || 'new',
          assigned_to: ticket.assigned_to?._id || ticket.assigned_to?.id || ticket.assigned_to || '',
          deadline: ticket.deadline ? new Date(ticket.deadline).toISOString().split('T')[0] : '',
          ticket_id: ticket.ticket_id || '',
          attachments: ticket.attachments || []
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
    
    const subjectErr = validateRequired('Subject', formData.subject)
    if (subjectErr) errors.subject = subjectErr

    const descErr = validateRequired('Description', formData.description)
    if (descErr) errors.description = descErr

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    const uploadFormData = new FormData()
    uploadFormData.append('file', file)
    uploadFormData.append('related_type', 'SupportTicket')

    try {
      const res = await attachmentsApi.upload(uploadFormData)
      const newAttachment = {
        name: file.name,
        url: `/uploads/${res.filename}`,
        file_type: file.type,
        uploaded_at: new Date()
      }
      setFormData(prev => ({
        ...prev,
        attachments: [...prev.attachments, newAttachment]
      }))
      toast.success('Screenshot attached')
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

    if (isEdit && initialData) {
      const isChanged = Object.keys(initialData).some(key => formData[key] !== initialData[key])
      if (!isChanged) {
        return toast.info('No changes detected')
      }
    }

    setSaving(true)
    try {
      const payload = { ...formData }
      if (!payload.customer_id) payload.customer_id = null
      if (!payload.user_customer_id) payload.user_customer_id = null
      if (!payload.assigned_to) payload.assigned_to = null
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

  if (loading) return <div className="p-40 text-center text-dimmed">Loading ticket details...</div>

  const modalContent = (
    <div className="crm-modal-portal-overlay">
      <div className="crm-modal-sheet animate-sheet-in">
        <div className="crm-modal-sheet-header">
          <div className="sheet-title-area">
            <h2 className="sheet-title">{isEdit ? 'Update Ticket' : 'Raise New Ticket'}</h2>
            <p className="sheet-subtitle">{isEdit ? `Refining Ticket #${formData.ticket_id || id}` : 'Submit a support request'}</p>
          </div>
        </div>

        <form className="crm-modal-sheet-body custom-scrollbar" onKeyDown={handleKeyDown} onSubmit={handleSubmit}>
          <div className="sheet-content-container">
            {/* Account Linking */}
            {showAccountLinkingSection && (
              <section className="form-sheet-section">
                <div className="form-sheet-section-header">
                  <FiUser />
                  <span>Account Linking</span>
                </div>
                <div className="form-sheet-grid">
                  {isCustomerFieldVisible && (
                    <div className="sheet-field">
                      <label>Customer Account</label>
                      <SearchableSelect 
                        value={formData.customer_id}
                        onChange={val => setFormData({ ...formData, customer_id: val })}
                        options={[
                          { value: '', label: 'None / Internal Only' },
                          ...customers.map(c => ({ value: c.id, label: c.name }))
                        ]}
                        placeholder="Select Customer..."
                        icon="user"
                      />
                    </div>
                  )}
                  {isSystemUserFieldVisible && (
                    <div className="sheet-field">
                      <label>System User</label>
                      <SearchableSelect 
                        value={formData.user_customer_id}
                        onChange={val => setFormData({ ...formData, user_customer_id: val })}
                        options={[
                          { value: '', label: 'Select User...' },
                          ...allUsers.map(u => ({ value: u.id, label: `${u.name} (${u.role})` }))
                        ]}
                        placeholder="Select System User..."
                        icon="user"
                        disabled={!isSuperUser}
                      />
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Ticket Details */}
            <section className="form-sheet-section">
              <div className="form-sheet-section-header">
                <FiMessageSquare />
                <span>Ticket Intelligence</span>
              </div>
              <div className="form-sheet-grid">
                <div className="sheet-field full-width">
                  <label>Subject</label>
                  <div className={`crm-input-group ${fieldErrors.subject ? 'error' : ''}`}>
                    <div className="input-icon-box"><FiInfo /></div>
                    <input
                      autoFocus
                      value={formData.subject}
                      onChange={e => {
                        setFormData({ ...formData, subject: e.target.value })
                        if (fieldErrors.subject) setFieldErrors(prev => ({ ...prev, subject: '' }))
                      }}
                      placeholder="Brief summary of the issue"
                    />
                  </div>
                  {fieldErrors.subject && <span className="error-text">{fieldErrors.subject}</span>}
                </div>
                <div className="sheet-field full-width">
                  <label>Detailed Description</label>
                  <div className={`crm-input-group ${fieldErrors.description ? 'error' : ''}`}>
                    <div className="input-icon-box" style={{ alignItems: 'flex-start', paddingTop: '12px' }}><FiMessageSquare /></div>
                    <textarea
                      style={{ minHeight: '120px' }}
                      value={formData.description}
                      onChange={e => {
                        setFormData({ ...formData, description: e.target.value })
                        if (fieldErrors.description) setFieldErrors(prev => ({ ...prev, description: '' }))
                      }}
                      placeholder="Provide as much detail as possible..."
                    />
                  </div>
                  {fieldErrors.description && <span className="error-text">{fieldErrors.description}</span>}
                </div>
              </div>
            </section>

            {/* Configuration */}
            <section className="form-sheet-section no-border">
              <div className="form-sheet-section-header">
                <FiSettings />
                <span>Classification & Assignment</span>
              </div>
              <div className="form-sheet-grid">
                <div className="sheet-field">
                  <label>Priority</label>
                  <SearchableSelect 
                    value={formData.priority}
                    onChange={val => setFormData({ ...formData, priority: val })}
                    options={[
                      { value: 'low', label: 'Low' },
                      { value: 'medium', label: 'Medium' },
                      { value: 'high', label: 'High' },
                      { value: 'urgent', label: 'Urgent' }
                    ]}
                    placeholder="Select Priority"
                    icon="flag"
                  />
                </div>
                <div className="sheet-field">
                  <label>Category</label>
                  <SearchableSelect 
                    value={formData.category}
                    onChange={val => setFormData({ ...formData, category: val })}
                    options={[
                      { value: 'General', label: 'General Inquiry' },
                      { value: 'Technical', label: 'Technical Issue' },
                      { value: 'Billing', label: 'Billing/Payments' },
                      { value: 'Bug', label: 'Software Bug' },
                      { value: 'Feature', label: 'Feature Request' }
                    ]}
                    placeholder="Select Category"
                    icon="tag"
                  />
                </div>
                {isEdit && (
                  <div className="sheet-field">
                    <label>Status</label>
                    <SearchableSelect 
                      value={formData.status}
                      onChange={val => setFormData({ ...formData, status: val })}
                      options={[
                        { value: 'new', label: 'New' },
                        { value: 'in-progress', label: 'In Progress' },
                        { value: 'resolved', label: 'Resolved' },
                        { value: 'closed', label: 'Closed' }
                      ]}
                      placeholder="Select Status"
                      icon="activity"
                    />
                  </div>
                )}
                <div className="sheet-field">
                  <label>Deadline</label>
                  <div className="crm-input-group">
                    <div className="input-icon-box"><FiActivity /></div>
                    <input 
                      type="date" 
                      value={formData.deadline} 
                      onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                    />
                  </div>
                </div>

                {!isCustomer && (
                  <div className="sheet-field">
                    <label>Assign Ticket</label>
                    <div className="crm-input-group">
                      <div className="input-icon-box"><FiBriefcase /></div>
                      <select value={formData.assigned_to} onChange={e => setFormData({ ...formData, assigned_to: e.target.value })}>
                        <option value="">Not Assigned</option>
                        {allUsers.filter(u => u.role !== 'Customer').map(m => (
                          <option key={m.id || m._id} value={m.id || m._id}>{m.name} ({m.role})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div className="sheet-field full-width">
                  <label>Screenshot Attachment</label>
                  <div className="crm-input-group" style={{ cursor: 'pointer', background: 'var(--bg-surface)' }} onClick={() => fileInputRef.current?.click()}>
                    <div className="input-icon-box"><Icon name="paperclip" /></div>
                    <div style={{ padding: '12px', color: 'var(--text-dimmed)', fontSize: '0.9rem' }}>
                      {uploading ? 'Uploading...' : formData.attachments.length > 0 ? `${formData.attachments.length} files attached` : 'Click to attach screenshot...'}
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      style={{ display: 'none' }} 
                      onChange={handleFileUpload}
                      accept="image/*"
                    />
                  </div>
                  {formData.attachments.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                      {formData.attachments.map((at, idx) => (
                        <div key={idx} style={{ background: 'var(--bg-surface)', padding: '4px 12px', borderRadius: '4px', fontSize: '0.8rem', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{at.name}</span>
                          <button type="button" style={{ border: 'none', background: 'transparent', color: 'var(--danger)', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setFormData(prev => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== idx) })) }}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
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
              {saving ? 'Processing...' : isEdit ? 'Save Changes' : 'Create Ticket'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.getElementById('modal-root-content') || document.body)
}
