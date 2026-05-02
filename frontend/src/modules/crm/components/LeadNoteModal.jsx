import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../../../layouts/icons.jsx'
import { leadsApi } from '../../../services/leads.js'
import { toast } from 'react-toastify'

export default function LeadNoteModal({ isOpen, lead, onClose, onSaved }) {
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) setContent('')
  }, [isOpen])

  async function handleSubmit(e) {
    if (e) e.preventDefault()
    if (!content.trim()) return toast.warn('Note content cannot be empty')

    setSaving(true)
    try {
      await leadsApi.addNote(lead.id || lead._id, { content: content.trim() })
      toast.success('Note added successfully')
      onSaved()
      onClose()
    } catch (err) {
      toast.error('Failed to add note')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const modalContent = (
    <div className="crm-modal-portal-overlay">
      <div className="crm-modal-sheet" style={{ maxWidth: '500px' }}>
        <div className="crm-modal-sheet-header">
          <div className="sheet-title-area">
            <h2 className="sheet-title">Add Note</h2>
            <p className="sheet-subtitle">Log an internal note for <strong>{lead?.name}</strong></p>
          </div>
        </div>

        <form className="crm-modal-sheet-body" onSubmit={handleSubmit}>
          <div className="sheet-content-container">
            <textarea
              className="crm-input"
              style={{ minHeight: '150px', width: '100%' }}
              placeholder="Type your follow-up note here..."
              value={content}
              onChange={e => setContent(e.target.value)}
              autoFocus
            />
          </div>
        </form>

        <div className="crm-modal-sheet-footer">
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', width: '100%' }}>
            <button type="button" className="crm-btn-premium glass" onClick={onClose}>Cancel</button>
            <button 
              type="submit" 
              className="crm-btn-premium vibrant" 
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Note'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
