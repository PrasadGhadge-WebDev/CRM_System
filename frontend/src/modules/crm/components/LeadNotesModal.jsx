import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../../../layouts/icons.jsx'
import SearchableSelect from './SearchableSelect.jsx'

export default function LeadNotesModal({ 
  isOpen, 
  onClose, 
  onSave,
  leadName = "Lead"
}) {
  const [form, setForm] = useState({
    type: 'Call',
    subject: '',
    description: '',
    attachment: null,
    followupRequired: false,
    followupDate: ''
  })

  if (!isOpen) return null

  const noteTypes = [
    { value: 'Call', label: '📞 Call' },
    { value: 'Email', label: '✉️ Email' },
    { value: 'Meeting', label: '🤝 Meeting' },
    { value: 'WhatsApp', label: '📱 WhatsApp' },
    { value: 'SMS', label: '💬 SMS' },
    { value: 'Other', label: '📝 Other' }
  ]

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.subject || !form.description) return
    onSave(form)
  }

  const modalContent = (
    <div className="crm-modal-portal-overlay" onClick={onClose}>
      <div className="crm-modal-sheet" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
        <div className="crm-modal-sheet-header">
          <div className="sheet-title-area">
            <h2 className="sheet-title">Add Note & Activity</h2>
            <p className="sheet-subtitle">Log interaction for <strong>{leadName}</strong></p>
          </div>
          <button className="crm-btn-premium glass" onClick={onClose} style={{ padding: '8px' }}>
            <Icon name="x" size={20} />
          </button>
        </div>

        <div className="crm-modal-sheet-body">
          <form className="sheet-content-container" onSubmit={handleSubmit}>
            <section className="form-sheet-section no-border">
              <div className="form-sheet-grid">
                <div className="sheet-field">
                  <label>Note Type</label>
                  <SearchableSelect 
                    value={form.type}
                    onChange={val => setForm(f => ({ ...f, type: val }))}
                    options={noteTypes}
                    placeholder="Select Type"
                    icon="activity"
                  />
                </div>

                <div className="sheet-field">
                  <label>Subject *</label>
                  <input 
                    className="crm-input"
                    placeholder="Interaction subject"
                    value={form.subject}
                    onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    required
                  />
                </div>

                <div className="sheet-field full-width">
                  <label>Description *</label>
                  <textarea 
                    className="crm-input"
                    placeholder="Enter detailed activity description..."
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    required
                    style={{ minHeight: '120px' }}
                  />
                </div>

                <div className="sheet-field">
                  <label>Attachment (Max 5MB)</label>
                  <input 
                    type="file"
                    className="crm-input"
                    style={{ padding: '8px' }}
                    onChange={e => setForm(f => ({ ...f, attachment: e.target.files[0] }))}
                  />
                </div>

                <div className="sheet-field" style={{ display: 'flex', alignItems: 'center', gap: '12px', alignSelf: 'center' }}>
                  <label className="crm-checkbox-container" style={{ margin: 0, padding: 0 }}>
                    <input 
                      type="checkbox" 
                      checked={form.followupRequired}
                      onChange={e => setForm(f => ({ ...f, followupRequired: e.target.checked }))}
                    />
                    <span className="checkbox-label" style={{ fontSize: '0.85rem', fontWeight: 700 }}>Follow-up Required</span>
                  </label>
                </div>

                {form.followupRequired && (
                  <div className="sheet-field">
                    <label>Next Follow-up Date</label>
                    <input 
                      type="date"
                      className="crm-input"
                      value={form.followupDate}
                      onChange={e => setForm(f => ({ ...f, followupDate: e.target.value }))}
                      required={form.followupRequired}
                    />
                  </div>
                )}
              </div>
            </section>
          </form>
        </div>

        <div className="crm-modal-sheet-footer">
          <button className="crm-btn-premium glass" onClick={onClose}>Cancel</button>
          <button className="crm-btn-premium vibrant" onClick={handleSubmit}>
            <Icon name="check" size={16} />
            <span>Save Note</span>
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
