import { useState } from 'react'

/**
 * LostReasonModal
 * Shows when a Manager/Admin marks a lead as "Lost".
 * Requires a reason before confirming.
 *
 * Props:
 *   onConfirm(reason: string) — called with the entered reason
 *   onCancel()
 */
export default function LostReasonModal({ onConfirm, onCancel }) {
  const [reason, setReason] = useState('')
  const [error,  setError]  = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!reason.trim()) {
      setError('Please provide a reason for marking this lead as Lost.')
      return
    }
    onConfirm(reason.trim())
  }

  return (
    <div className="lrm-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="lrm-modal" role="dialog" aria-modal="true" aria-labelledby="lrm-title">
        <div className="lrm-header">
          <div className="lrm-icon">💀</div>
          <div>
            <h2 id="lrm-title" className="lrm-title">Mark Lead as Lost</h2>
            <p className="lrm-subtitle">Please provide a reason. This helps improve future outreach.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="lrm-body">
          <label className="lrm-label" htmlFor="lrm-reason">
            Reason for Loss <span style={{ color: '#f87171' }}>*</span>
          </label>
          <textarea
            id="lrm-reason"
            className={`lrm-textarea ${error ? 'lrm-error-field' : ''}`}
            rows={4}
            value={reason}
            onChange={e => { setReason(e.target.value); setError('') }}
            placeholder="e.g. Budget constraints, chose a competitor, not responding..."
            autoFocus
          />
          {error && <span className="lrm-error">{error}</span>}

          {/* Quick reason chips */}
          <div className="lrm-chips">
            {['Budget constraints','Chose competitor','No response','Wrong target','Timeline mismatch','Requirement changed'].map(r => (
              <button
                key={r}
                type="button"
                className={`lrm-chip ${reason === r ? 'lrm-chip-active' : ''}`}
                onClick={() => { setReason(r); setError('') }}
              >
                {r}
              </button>
            ))}
          </div>
        </form>

        <div className="lrm-footer">
          <button type="button" className="lrm-btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="lrm-btn-confirm"
            onClick={handleSubmit}
            disabled={!reason.trim()}
          >
            💀 Confirm Lost
          </button>
        </div>
      </div>

      <style>{`
        .lrm-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(0,0,0,0.65);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          animation: lrm-fade 0.2s ease;
        }

        @keyframes lrm-fade { from { opacity: 0 } to { opacity: 1 } }

        .lrm-modal {
          background: var(--bg-elevated, #1e293b);
          border: 1px solid rgba(239,68,68,0.3);
          border-radius: 20px;
          width: 100%;
          max-width: 520px;
          box-shadow: 0 24px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(239,68,68,0.1);
          animation: lrm-slide 0.25s ease;
          overflow: hidden;
        }

        @keyframes lrm-slide { from { transform: translateY(16px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }

        .lrm-header {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 24px 28px 16px;
          border-bottom: 1px solid rgba(239,68,68,0.12);
          background: rgba(239,68,68,0.05);
        }

        .lrm-icon {
          font-size: 2rem;
          line-height: 1;
          flex-shrink: 0;
        }

        .lrm-title {
          font-size: 1.1rem;
          font-weight: 800;
          color: var(--text);
          margin: 0 0 4px;
        }

        .lrm-subtitle {
          font-size: 0.82rem;
          color: var(--text-dimmed);
          margin: 0;
        }

        .lrm-body {
          padding: 20px 28px;
        }

        .lrm-label {
          display: block;
          font-size: 0.77rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-bottom: 8px;
        }

        .lrm-textarea {
          width: 100%;
          background: rgba(0,0,0,0.2);
          border: 1px solid var(--border, rgba(255,255,255,0.1));
          border-radius: 10px;
          padding: 12px 14px;
          color: var(--text);
          font-size: 0.88rem;
          font-family: inherit;
          resize: vertical;
          outline: none;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }
        .lrm-textarea:focus {
          border-color: rgba(239,68,68,0.5);
          box-shadow: 0 0 0 3px rgba(239,68,68,0.1);
        }
        .lrm-error-field {
          border-color: rgba(239,68,68,0.6) !important;
        }

        .lrm-error {
          display: block;
          font-size: 0.75rem;
          color: #f87171;
          margin-top: 6px;
        }

        .lrm-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 14px;
        }

        .lrm-chip {
          padding: 5px 12px;
          border-radius: 8px;
          border: 1px solid var(--border, rgba(255,255,255,0.1));
          background: rgba(255,255,255,0.04);
          color: var(--text-muted);
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .lrm-chip:hover {
          border-color: rgba(239,68,68,0.4);
          background: rgba(239,68,68,0.08);
          color: #f87171;
        }
        .lrm-chip-active {
          border-color: rgba(239,68,68,0.5) !important;
          background: rgba(239,68,68,0.12) !important;
          color: #f87171 !important;
        }

        .lrm-footer {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 10px;
          padding: 16px 28px 20px;
          border-top: 1px solid rgba(255,255,255,0.06);
        }

        .lrm-btn-cancel {
          padding: 9px 20px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--text-muted);
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .lrm-btn-cancel:hover { background: rgba(255,255,255,0.05); color: var(--text); }

        .lrm-btn-confirm {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 9px 22px;
          border-radius: 10px;
          border: none;
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          color: white;
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 14px rgba(220,38,38,0.35);
        }
        .lrm-btn-confirm:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(220,38,38,0.45);
        }
        .lrm-btn-confirm:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        /* Light mode */
        body:not(.dark) .lrm-modal {
          background: #fff;
          border-color: rgba(239,68,68,0.25);
        }
        body:not(.dark) .lrm-textarea {
          background: rgba(0,0,0,0.04);
          color: #0f172a;
          border-color: rgba(0,0,0,0.12);
        }
      `}</style>
    </div>
  )
}
