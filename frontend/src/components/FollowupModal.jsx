import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { leadsApi } from '../services/leads.js'
import { Icon } from '../layouts/icons.jsx'

/**
 * Unified Follow-Up Management Modal
 * Handles creating/updating follow-ups with production-grade logic.
 */
export default function FollowupModal({ isOpen, onClose, lead, onSave }) {
  const [form, setForm] = useState({
    mode: 'Call',
    status: 'planned',
    nextFollowupDate: '',
    nextFollowupTime: '10:00',
    note: '',
    requestId: ''
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && lead) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const dateStr = tomorrow.toISOString().split('T')[0]
      
      setForm({
        mode: 'Call',
        status: 'planned',
        nextFollowupDate: dateStr,
        nextFollowupTime: '10:00',
        note: '',
        requestId: crypto.randomUUID?.() || Math.random().toString(36).substring(2, 15)
      })
    }
  }, [isOpen, lead])

  const setQuickDate = (type) => {
    const now = new Date()
    let target = new Date()

    if (type === 'tomorrow') {
      target.setDate(now.getDate() + 1)
      target.setHours(10, 0, 0, 0)
    } else if (type === 'next-week') {
      target.setDate(now.getDate() + 7)
      target.setHours(10, 0, 0, 0)
    } else if (type === '1h') {
      target.setHours(now.getHours() + 1)
    }

    setForm(prev => ({
      ...prev,
      nextFollowupDate: target.toISOString().split('T')[0],
      nextFollowupTime: target.toTimeString().substring(0, 5)
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validation
    if (form.status === 'planned' && (!form.nextFollowupDate || !form.nextFollowupTime)) {
      toast.error('Schedule date and time are required for planned follow-ups')
      return
    }

    setLoading(true)
    try {
      // Create UTC ISO string from local date and time
      const scheduledAt = new Date(`${form.nextFollowupDate}T${form.nextFollowupTime}`).toISOString()
      const leadId = lead.id || lead._id
      
      await leadsApi.updateFollowup(leadId, {
        mode: form.mode,
        status: form.status,
        nextFollowupDate: scheduledAt,
        note: form.note,
        requestId: form.requestId
      })

      toast.success('Follow-up updated successfully')
      onSave?.()
      onClose()
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Failed to save follow-up'
      toast.error(msg)
      // Regenerate requestId on failure to allow retry if it was a 409
      if (error.response?.status === 409) {
        setForm(prev => ({ ...prev, requestId: crypto.randomUUID?.() || Math.random().toString(36).substring(2, 15) }))
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !lead) return null

  const modes = [
    { label: 'Call', icon: 'phone', color: '#10b981' },
    { label: 'Meeting', icon: 'users', color: '#3b82f6' },
    { label: 'Email', icon: 'mail', color: '#f59e0b' },
    { label: 'Task', icon: 'check', color: '#8b5cf6' }
  ]

  const statusOptions = [
    { value: 'planned', label: 'Planned', color: '#fbbf24' },
    { value: 'completed', label: 'Completed', color: '#10b981' },
    { value: 'skipped', label: 'Skipped', color: '#94a3b8' }
  ]

  return (
    <div className="fu-modal-overlay" onClick={onClose}>
      <div className="fu-modal-card premium-glass" onClick={(e) => e.stopPropagation()}>
        <header className="fu-modal-header">
          <div className="fu-header-left">
            <div className="fu-id-pill">Unified Workflow</div>
            <h3>Follow-up Management</h3>
            <p className="fu-lead-name">Relating to: <strong>{lead.name}</strong></p>
          </div>
          <button className="fu-close-btn" onClick={onClose}><Icon name="plus" style={{ transform: 'rotate(45deg)' }} /></button>
        </header>

        <form onSubmit={handleSubmit} className="fu-form">
          {/* Mode Selection */}
          <div className="fu-section">
            <label className="fu-label">Communication Mode</label>
            <div className="fu-mode-grid">
              {modes.map(m => (
                <button
                  key={m.label}
                  type="button"
                  className={`fu-mode-btn ${form.mode === m.label ? 'active' : ''}`}
                  onClick={() => setForm(prev => ({ ...prev, mode: m.label }))}
                  style={{ '--active-color': m.color }}
                >
                  <Icon name={m.icon} />
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="fu-row-split">
            {/* Status Selection */}
            <div className="fu-section flex-1">
              <label className="fu-label">Current Status</label>
              <select 
                className="fu-select"
                value={form.status}
                onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))}
              >
                {statusOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Last Contact (Read Only) */}
            <div className="fu-section flex-1">
              <label className="fu-label">Last Interaction</label>
              <div className="fu-read-only-box">
                {lead.lastContactDate ? new Date(lead.lastContactDate).toLocaleDateString() : 'Never'}
              </div>
            </div>
          </div>

          {/* DateTime Selection */}
          {form.status === 'planned' && (
            <div className="fu-section fu-date-section animate-slide-down">
              <label className="fu-label">Schedule Next Step *</label>
              <div className="fu-datetime-row">
                <div className="fu-input-icon-box">
                  <Icon name="calendar" size={16} />
                  <input 
                    type="date"
                    className="fu-input"
                    value={form.nextFollowupDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setForm(prev => ({ ...prev, nextFollowupDate: e.target.value }))}
                    required
                  />
                </div>
                <div className="fu-input-icon-box">
                  <Icon name="activity" size={16} />
                  <input 
                    type="time" 
                    className="fu-input"
                    value={form.nextFollowupTime}
                    onChange={(e) => setForm(prev => ({ ...prev, nextFollowupTime: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="fu-quick-dates">
                <button type="button" onClick={() => setQuickDate('tomorrow')}>Tomorrow 10AM</button>
                <button type="button" onClick={() => setQuickDate('next-week')}>Next Week</button>
                <button type="button" onClick={() => setQuickDate('1h')}>In 1 Hour</button>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="fu-section">
            <label className="fu-label">{form.status === 'planned' ? 'Planned Discussion' : 'Outcome Notes'}</label>
            <div className="fu-textarea-box">
              <Icon name="edit" size={16} className="mt-4" />
              <textarea 
                value={form.note}
                onChange={(e) => setForm(prev => ({ ...prev, note: e.target.value }))}
                placeholder="Briefly describe the action or outcome..."
                rows={3}
              />
            </div>
          </div>

          {/* Actions */}
          <footer className="fu-modal-footer">
            <div className="fu-disclaimer">
              {form.status === 'planned' && <Icon name="reports" size={12} />}
              {form.status === 'planned' && <span>Will replace existing planned items</span>}
            </div>
            <div className="fu-btn-group">
              <button type="button" className="fu-btn secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="fu-btn primary" disabled={loading}>
                {loading ? 'Processing...' : 'Save Interaction'}
              </button>
            </div>
          </footer>
        </form>

        <style>{`
          .fu-modal-overlay {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(2, 6, 23, 0.7); backdrop-filter: blur(8px);
            z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px;
          }
          .fu-modal-card {
            width: 100%; max-width: 580px; border-radius: 24px; overflow: hidden;
            box-shadow: 0 25px 70px rgba(0,0,0,0.5);
            animation: fu-modal-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          }
          @keyframes fu-modal-pop { 0% { opacity: 0; transform: scale(0.9) translateY(20px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }

          .premium-glass {
            background: linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98));
            border: 1px solid rgba(255, 255, 255, 0.08);
          }

          .fu-modal-header { padding: 32px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: flex-start; }
          .fu-id-pill { display: inline-block; padding: 4px 10px; background: rgba(59, 130, 246, 0.1); color: #60a5fa; font-size: 0.65rem; font-weight: 800; border-radius: 6px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em; }
          .fu-modal-header h3 { margin: 0; font-size: 1.5rem; font-weight: 900; color: #f8fafc; }
          .fu-lead-name { margin: 6px 0 0; color: #94a3b8; font-size: 0.9rem; }
          .fu-lead-name strong { color: #f8fafc; }
          .fu-close-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; width: 36px; height: 36px; color: #94a3b8; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
          .fu-close-btn:hover { background: #ef4444; color: white; border-color: #ef4444; }

          .fu-form { padding: 32px; display: flex; flex-direction: column; gap: 24px; }
          .fu-label { font-size: 0.72rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; display: block; margin-bottom: 10px; }
          
          .fu-mode-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
          .fu-mode-btn {
            background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05);
            border-radius: 16px; padding: 12px; color: #94a3b8; cursor: pointer;
            display: flex; flex-direction: column; align-items: center; gap: 8px; transition: all 0.2s;
          }
          .fu-mode-btn span { font-size: 0.75rem; font-weight: 700; }
          .fu-mode-btn.active { 
            background: rgba(255, 255, 255, 0.05); 
            border-color: var(--active-color); 
            color: var(--active-color);
            box-shadow: 0 0 15px color-mix(in srgb, var(--active-color), transparent 80%);
          }
          
          .fu-row-split { display: flex; gap: 20px; }
          .flex-1 { flex: 1; }
          
          .fu-select, .fu-read-only-box, .fu-input {
            background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.08);
            border-radius: 14px; padding: 12px 16px; color: #f8fafc; font-size: 0.9rem; font-weight: 600; width: 100%;
          }
          .fu-read-only-box { background: rgba(0,0,0,0.1); color: #64748b; }
          .fu-select option { background: #1e293b; color: white; }

          .fu-datetime-row { display: flex; gap: 12px; }
          .fu-input-icon-box { position: relative; flex: 1; }
          .fu-input-icon-box svg { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #64748b; }
          .fu-input-icon-box input { padding-left: 40px; }

          .fu-quick-dates { display: flex; gap: 10px; margin-top: 12px; }
          .fu-quick-dates button { 
            font-size: 0.7rem; font-weight: 700; color: #3b82f6; 
            background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.15);
            padding: 6px 12px; border-radius: 8px; cursor: pointer; transition: 0.2s;
          }
          .fu-quick-dates button:hover { background: #3b82f6; color: white; }

          .fu-textarea-box { 
            background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.08);
            border-radius: 16px; padding: 12px 16px; display: flex; gap: 12px;
          }
          .fu-textarea-box textarea { background: transparent; border: 0; color: white; width: 100%; font-size: 0.9rem; resize: none; outline: none; }
          .mt-4 { margin-top: 4px; }

          .fu-modal-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 10px; }
          .fu-disclaimer { display: flex; align-items: center; gap: 6px; color: #f59e0b; font-size: 0.7rem; font-weight: 600; }
          .fu-btn-group { display: flex; gap: 12px; }
          .fu-btn { padding: 12px 24px; border-radius: 12px; font-weight: 700; font-size: 0.9rem; cursor: pointer; transition: 0.2s; }
          .fu-btn.secondary { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #cbd5e1; }
          .fu-btn.secondary:hover { background: rgba(255,255,255,0.1); }
          .fu-btn.primary { background: linear-gradient(135deg, #3b82f6, #6366f1); border: 0; color: white; box-shadow: 0 4px 15px rgba(59,130,246,0.3); }
          .fu-btn.primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(59,130,246,0.4); }
          .fu-btn.primary:disabled { opacity: 0.6; cursor: not-allowed; }

          .animate-slide-down { animation: slideDown 0.3s ease-out; }
          @keyframes slideDown { 0% { opacity: 0; transform: translateY(-10px); } 100% { opacity: 1; transform: translateY(0); } }
        `}</style>
      </div>
    </div>
  )
}
