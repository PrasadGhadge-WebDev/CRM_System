import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../../../layouts/icons.jsx'

export default function LostReasonModal({ 
  isOpen, 
  onClose, 
  onConfirm 
}) {
  const [reason, setReason] = useState('Not Interested')
  const [otherReason, setOtherReason] = useState('')

  if (!isOpen) return null

  const reasons = [
    'Not Interested',
    'Price Issue',
    'Competitor',
    'No Response',
    'Other'
  ]

  const handleSubmit = (e) => {
    e.preventDefault()
    const finalReason = reason === 'Other' ? otherReason : reason
    onConfirm(finalReason)
  }

  const modalContent = (
    <div className="crm-modal-portal-overlay" onClick={onClose}>
      <div className="crm-modal-sheet" style={{ maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
        <div className="crm-modal-sheet-header">
          <div className="sheet-title-area">
            <h2 className="sheet-title">Lead Lost</h2>
            <p className="sheet-subtitle">Please select the reason for losing this lead</p>
          </div>
          <button className="crm-btn-premium glass" onClick={onClose} style={{ padding: '8px' }}>
            <Icon name="x" size={20} />
          </button>
        </div>

        <div className="crm-modal-sheet-body">
          <form className="sheet-content-container" onSubmit={handleSubmit}>
            <div className="form-sheet-grid" style={{ gridTemplateColumns: '1fr', gap: '20px' }}>
              <div className="sheet-field">
                <label>Reason for Loss</label>
                <div className="lost-reasons-grid">
                  {reasons.map(r => (
                    <label key={r} className={`lost-reason-item ${reason === r ? 'active' : ''}`}>
                      <input 
                        type="radio" 
                        name="lostReason" 
                        value={r} 
                        checked={reason === r}
                        onChange={() => setReason(r)}
                      />
                      <span>{r}</span>
                    </label>
                  ))}
                </div>
              </div>

              {reason === 'Other' && (
                <div className="sheet-field">
                  <label>Specific Reason</label>
                  <textarea 
                    className="crm-input"
                    placeholder="Enter details..."
                    value={otherReason}
                    onChange={e => setOtherReason(e.target.value)}
                    required
                    style={{ minHeight: '80px' }}
                  />
                </div>
              )}
            </div>
          </form>
        </div>

        <div className="crm-modal-sheet-footer">
          <button className="crm-btn-premium glass" onClick={onClose}>Cancel</button>
          <button className="crm-btn-premium vibrant" onClick={handleSubmit}>
            <Icon name="check" size={16} />
            <span>Confirm Lost</span>
          </button>
        </div>

        <style>{`
          .lost-reasons-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }

          .lost-reason-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 16px;
            border: 1px solid var(--border);
            border-radius: 12px;
            cursor: pointer;
            font-size: 0.85rem;
            font-weight: 700;
            transition: all 0.2s;
            background: var(--bg-surface);
          }

          .lost-reason-item:hover {
            border-color: var(--primary);
            background: var(--bg-hover);
          }

          .lost-reason-item.active {
            border-color: var(--primary);
            background: var(--primary-soft);
            color: var(--primary);
          }

          .lost-reason-item input {
            width: 16px;
            height: 16px;
            accent-color: var(--primary);
          }
        `}</style>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
