import { useState } from 'react'
import { notesApi } from '../services/notes.js'
import { Icon } from '../layouts/icons.jsx'
import { toast } from 'react-toastify'

export default function InteractionLogger({ relatedId, relatedType, onNoteAdded }) {
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!note.trim()) return

    setSaving(true)
    try {
      await notesApi.create({
        note: note.trim(),
        related_to: relatedId,
        related_type: relatedType
      })
      setNote('')
      toast.success('Interaction logged successfully')
      if (onNoteAdded) onNoteAdded()
    } catch {
      toast.error('Failed to log interaction')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="interaction-logger card glass-panel">
      <div className="p20">
        <form onSubmit={handleSubmit} className="stack gap-12">
          <div className="flex items-center gap-10">
            <Icon name="activity" className="info-text" />
            <span className="strong small caps muted">Log New Interaction</span>
          </div>
          <textarea
            className="input-premium interaction-textarea"
            placeholder="Log call feedback, meeting notes, or customer follow-up details..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            disabled={saving}
          />
          <div className="flex justify-between items-center">
            <div className="muted small font600">
               Visible to your Manager
            </div>
            <button 
              type="submit" 
              className="btn primary interaction-submit-btn" 
              disabled={saving || !note.trim()}
            >
              <Icon name="plus" />
              <span>{saving ? 'Logging...' : 'Log Interaction'}</span>
            </button>
          </div>
        </form>
      </div>
      <style>{`
        .interaction-logger { border: 1px solid var(--border); border-radius: 20px; }
        .interaction-textarea { resize: vertical; min-height: 100px; font-size: 0.95rem; line-height: 1.5; padding: 16px; background: rgba(0,0,0,0.2); }
        .interaction-textarea:focus { background: rgba(0,0,0,0.3); border-color: var(--primary); }
        .interaction-submit-btn { padding: 8px 20px; border-radius: 12px; font-weight: 700; gap: 8px; }
      `}</style>
    </div>
  )
}
