import { useState } from 'react'
import { Icon } from '../layouts/icons.jsx'

/**
 * OutcomeModal
 * Unified form to log an interaction, update status, and set next follow-up.
 */
export default function OutcomeModal({ type, currentStatus, onConfirm, onCancel }) {
  const [formData, setFormData] = useState({
    note: '',
    status: currentStatus || 'New',
    follow_up_date: '',
    logActivity: true
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onConfirm(formData)
    } finally {
      setLoading(false)
    }
  }

  const statusOptions = [
    'New',
    'Contacted',
    'Interested',
    'Not Interested',
    'Converted'
  ]

  return (
    <div className="modal-overlay animate-fade-in" onClick={onCancel}>
      <div className="modal-content premium-modal animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className={`modal-icon-shell ${type === 'call' ? 'call' : 'mail'}`}>
              <Icon name={type === 'call' ? 'phone' : 'mail'} />
            </div>
            <div>
              <h3>Log {type === 'call' ? 'Call' : 'Email'} Outcome</h3>
              <p className="modal-subtitle">Update lead status and next steps</p>
            </div>
          </div>
          <button className="close-btn" onClick={onCancel} aria-label="Close modal">
            <Icon name="close" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="premium-form-stack">
          <div className="form-group-premium">
            <label className="premium-label">Interaction Notes</label>
            <textarea
              className="premium-textarea"
              placeholder={`Summarize the ${type} (e.g., "Customer mentioned a budget constraint but liked the demo")...`}
              value={formData.note}
              onChange={e => setFormData({ ...formData, note: e.target.value })}
              required
              rows={4}
              autoFocus
            />
          </div>

          <div className="form-row-2">
            <div className="form-group-premium">
              <label className="premium-label">Update Status</label>
              <div className="select-wrapper-premium">
                <select
                  className="premium-select"
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                >
                  {statusOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <Icon name="chevron-down" className="select-icon" />
              </div>
            </div>

            <div className="form-group-premium">
              <label className="premium-label">Next Follow-up</label>
              <div className="input-with-icon-premium">
                <Icon name="bell" className="input-icon" />
                <input
                  type="date"
                  className="premium-input"
                  value={formData.follow_up_date}
                  onChange={e => setFormData({ ...formData, follow_up_date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer-premium">
            <button type="button" className="btn-premium-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn-premium-primary" disabled={loading || !formData.note.trim()}>
              {loading ? (
                <>
                  <div className="spinner-tiny" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Icon name="check" />
                  <span>Save Outcome</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .premium-modal {
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 28px;
          width: 100%;
          max-width: 580px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          overflow: hidden;
        }

        .modal-header {
          padding: 24px 32px;
          border-bottom: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          background: linear-gradient(to bottom right, rgba(255,255,255,0.03), transparent);
        }

        .modal-title-wrap {
          display: flex;
          gap: 20px;
        }

        .modal-icon-shell {
          width: 48px;
          height: 48px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.4rem;
        }

        .modal-icon-shell.call {
          background: rgba(59, 130, 246, 0.15);
          color: #3b82f6;
          border: 1px solid rgba(59, 130, 246, 0.2);
        }

        .modal-icon-shell.mail {
          background: rgba(139, 92, 246, 0.15);
          color: #8b5cf6;
          border: 1px solid rgba(139, 92, 246, 0.2);
        }

        .modal-subtitle {
          font-size: 0.85rem;
          color: var(--text-dimmed);
          margin-top: 4px;
        }

        .premium-form-stack {
          padding: 32px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .form-row-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .premium-label {
          display: block;
          font-size: 0.75rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-muted);
          margin-bottom: 10px;
        }

        .premium-textarea, .premium-input, .premium-select {
          width: 100%;
          background: rgba(0,0,0,0.2);
          border: 1px solid var(--border);
          border-radius: 14px;
          color: var(--text);
          padding: 12px 16px;
          font-size: 0.95rem;
          outline: none;
          transition: all 0.2s;
        }

        .premium-textarea:focus, .premium-input:focus, .premium-select:focus {
          border-color: var(--primary);
          background: rgba(0,0,0,0.3);
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
        }

        .input-with-icon-premium, .select-wrapper-premium {
          position: relative;
        }

        .input-icon, .select-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-dimmed);
          pointer-events: none;
        }

        .premium-input {
          padding-left: 42px;
        }

        .select-icon {
          left: auto;
          right: 14px;
        }

        .premium-select {
          appearance: none;
          padding-right: 40px;
        }

        .modal-footer-premium {
          display: flex;
          justify-content: flex-end;
          gap: 16px;
          margin-top: 12px;
        }

        .btn-premium-primary {
          background: var(--primary);
          color: white;
          border: none;
          border-radius: 14px;
          padding: 12px 24px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 10px 20px -10px var(--primary);
        }

        .btn-premium-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          filter: brightness(1.1);
        }

        .btn-premium-secondary {
          background: transparent;
          color: var(--text-dimmed);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 12px 24px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .spinner-tiny {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .close-btn {
          background: transparent;
          border: none;
          color: var(--text-dimmed);
          cursor: pointer;
          padding: 4px;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .close-btn:hover {
          background: rgba(255,255,255,0.05);
          color: white;
        }

        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
