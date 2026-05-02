import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../../../layouts/icons.jsx'
import SearchableSelect from './SearchableSelect.jsx'

export default function LeadAssignModal({ 
  isOpen, 
  onClose, 
  onAssign, 
  employees = [], 
  selectedCount = 0 
}) {
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [reason, setReason] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!selectedEmployee) return
    onAssign(selectedEmployee, reason)
  }

  const modalContent = (
    <div className="crm-modal-portal-overlay" onClick={onClose}>
      <div className="crm-modal-sheet" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
        <div className="crm-modal-sheet-header">
          <div className="sheet-title-area">
            <h2 className="sheet-title">Assign / Reassign Leads</h2>
            <p className="sheet-subtitle">Moving {selectedCount} selected leads to a new owner</p>
          </div>
          <button className="crm-btn-premium glass" onClick={onClose} style={{ padding: '8px' }}>
            <Icon name="x" size={20} />
          </button>
        </div>

        <div className="crm-modal-sheet-body">
          <form className="sheet-content-container" onSubmit={handleSubmit}>
            <section className="form-sheet-section no-border">
              <div className="form-sheet-section-header">
                <Icon name="user" />
                <span>Assignment Settings</span>
              </div>

              <div className="form-sheet-grid" style={{ gridTemplateColumns: '1fr' }}>
                <div className="sheet-field">
                  <label>New Employee *</label>
                  <SearchableSelect
                    value={selectedEmployee}
                    onChange={setSelectedEmployee}
                    options={employees.map(emp => ({ value: emp.id || emp._id, label: `${emp.name} (${emp.role})` }))}
                    placeholder="Select Employee"
                    icon="user"
                  />
                </div>

                <div className="sheet-field full-width">
                  <label>Reason for Reassign (Optional)</label>
                  <textarea 
                    className="crm-input" 
                    style={{ minHeight: '120px' }}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Provide context for this reassignment..."
                  ></textarea>
                </div>
              </div>
            </section>
          </form>
        </div>

        <div className="crm-modal-sheet-footer">
          <p className="footer-hint">Notifications will be sent to the new owner.</p>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button type="button" className="crm-btn-premium glass" onClick={onClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="crm-btn-premium vibrant" 
              disabled={!selectedEmployee}
              onClick={handleSubmit}
            >
              <Icon name="check" size={16} />
              <span>Assign Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
