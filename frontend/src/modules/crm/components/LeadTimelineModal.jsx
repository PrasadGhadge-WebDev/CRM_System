import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../../../layouts/icons.jsx'
import { notesApi } from '../../../services/notes.js'
import { toast } from 'react-toastify'

export default function LeadTimelineModal({ 
  isOpen, 
  onClose, 
  leadId,
  leadName = "Lead",
  onAddActivity
}) {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen && leadId) {
      loadNotes()
    }
  }, [isOpen, leadId])

  const loadNotes = async () => {
    setLoading(true)
    try {
      const res = await notesApi.list({ related_to: leadId, related_type: 'Lead', limit: 100 })
      setNotes(res.items || [])
    } catch (err) {
      toast.error('Failed to load notes')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const getIcon = (type) => {
    switch(type) {
      case 'Call': return '📞'
      case 'Email': return '✉️'
      case 'Meeting': return '🤝'
      case 'WhatsApp': return '📱'
      case 'SMS': return '💬'
      default: return '📝'
    }
  }

  const modalContent = (
    <div className="crm-modal-portal-overlay" onClick={onClose}>
      <div className="crm-modal-sheet" style={{ maxWidth: '700px' }} onClick={e => e.stopPropagation()}>
        <div className="crm-modal-sheet-header">
          <div className="sheet-title-area">
            <h2 className="sheet-title">Activity Timeline</h2>
            <p className="sheet-subtitle">Historical interactions for <strong>{leadName}</strong></p>
          </div>
          <button className="crm-btn-premium glass" onClick={onClose} style={{ padding: '8px' }}>
            <Icon name="x" size={20} />
          </button>
        </div>

        <div className="crm-modal-sheet-body" style={{ padding: '0', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div className="spinner-medium" />
              <p className="muted" style={{ marginTop: '12px' }}>Loading timeline...</p>
            </div>
          ) : notes.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center' }}>
              <Icon name="info" size={40} style={{ opacity: 0.2 }} />
              <p className="muted" style={{ marginTop: '16px', fontWeight: 700 }}>No activity logged yet.</p>
            </div>
          ) : (
            <div className="timeline-container custom-scrollbar">
              {notes.map((note) => (
                <div key={note.id || note._id} className="timeline-item">
                  <div className="timeline-header">
                    <div className="timeline-badge">
                      {getIcon(note.type)}
                    </div>
                    <div className="timeline-meta">
                      <div className="timeline-type">{note.type || 'Other'}</div>
                      <div className="timeline-date">
                        {new Date(note.created_at).toLocaleString('en-IN', { 
                          day: '2-digit', 
                          month: 'short', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="timeline-content">
                    <h4 className="timeline-subject">{note.subject || 'No Subject'}</h4>
                    <p className="timeline-description">{note.note}</p>
                    <div className="timeline-footer">
                      <span className="timeline-author">
                        <Icon name="user" size={10} />
                        Added by: {note.created_by?.name || 'Admin'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="crm-modal-sheet-footer">
          <button className="crm-btn-premium glass" onClick={onClose}>Close</button>
          <button className="crm-btn-premium vibrant" onClick={() => onAddActivity?.()}>
            <Icon name="plus" size={16} />
            <span>Add Activity</span>
          </button>
        </div>

        <style>{`
          .timeline-container {
            max-height: 65vh;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 24px;
            display: flex;
            flex-direction: column;
            gap: 20px;
          }

          .timeline-item {
            position: relative;
            padding-left: 20px;
            border-left: 2px solid var(--border);
          }

          .timeline-item::before {
            content: '';
            position: absolute;
            left: -6px;
            top: 0;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: var(--primary);
            border: 2px solid var(--bg-card);
          }

          .timeline-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
          }

          .timeline-badge {
            font-size: 1.2rem;
          }

          .timeline-meta {
            display: flex;
            flex-direction: column;
          }

          .timeline-type {
            font-size: 0.75rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--primary);
          }

          .timeline-date {
            font-size: 0.7rem;
            color: var(--text-muted);
            font-weight: 600;
          }

          .timeline-content {
            background: var(--bg-surface);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 16px;
          }

          .timeline-subject {
            font-size: 0.9rem;
            font-weight: 800;
            color: var(--text);
            margin-bottom: 8px;
          }

          .timeline-description {
            font-size: 0.85rem;
            color: var(--text-muted);
            line-height: 1.5;
            margin-bottom: 12px;
          }

          .timeline-footer {
            display: flex;
            align-items: center;
            justify-content: flex-end;
          }

          .timeline-author {
            font-size: 0.7rem;
            font-weight: 700;
            color: var(--text-dimmed);
            display: flex;
            align-items: center;
            gap: 4px;
          }
        `}</style>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
