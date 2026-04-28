import { useNavigate } from 'react-router-dom'

/**
 * DuplicateLeadModal
 * Props:
 *   duplicate  — { id, name, status, leadId, email, phone }
 *   onClose    — close modal without action
 *   onUpdate   — user chose "Update existing lead" (patch existing with new data)
 *   matchedBy  — 'email' | 'phone' | 'email & phone'
 */
export default function DuplicateLeadModal({ duplicate, onClose, onUpdate, matchedBy }) {
  const navigate = useNavigate()

  if (!duplicate) return null

  return (
    <>
      {/* Backdrop */}
      <div className="dlm-backdrop" onClick={onClose} />

      {/* Modal */}
      <div className="dlm-modal" role="dialog" aria-modal="true" aria-labelledby="dlm-title">

        {/* Header */}
        <div className="dlm-header">
          <div className="dlm-icon-wrap">
            <span className="dlm-icon">⚠️</span>
          </div>
          <div>
            <h2 className="dlm-title" id="dlm-title">Lead Already Exists</h2>
            <p className="dlm-subtitle">
              A lead matching this <strong>{matchedBy}</strong> was found in the system.
            </p>
          </div>
          <button className="dlm-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Existing Lead Card */}
        <div className="dlm-lead-card">
          <div className="dlm-lead-avatar">
            {(duplicate.name || 'L').charAt(0).toUpperCase()}
          </div>
          <div className="dlm-lead-info">
            <div className="dlm-lead-name">{duplicate.name}</div>
            <div className="dlm-lead-meta">
              {duplicate.leadId && <span className="dlm-tag">{duplicate.leadId}</span>}
              <span className={`dlm-status-badge dlm-st-${(duplicate.status || 'new').toLowerCase().replace(/\s+/g, '-')}`}>
                {duplicate.status || 'New'}
              </span>
            </div>
            {duplicate.email && <div className="dlm-lead-contact">📧 {duplicate.email}</div>}
            {duplicate.phone && <div className="dlm-lead-contact">📞 {duplicate.phone}</div>}
          </div>
        </div>

        {/* Info note */}
        <p className="dlm-note">
          To avoid duplicates, you can open the existing record or update it with any new information.
        </p>

        {/* Actions */}
        <div className="dlm-actions">
          <button
            className="dlm-btn dlm-btn-primary"
            onClick={() => navigate(`/leads/${duplicate.id}`)}
          >
            <span>🔍</span> Open Existing Lead
          </button>
          <button
            className="dlm-btn dlm-btn-secondary"
            onClick={() => { onUpdate(duplicate); onClose(); }}
          >
            <span>✏️</span> Update Existing Lead
          </button>
          <button className="dlm-btn dlm-btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </div>

      </div>

      <style>{`
        .dlm-backdrop {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px);
          z-index: 1000;
          animation: dlm-fade-in 0.2s ease;
        }

        .dlm-modal {
          position: fixed;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          z-index: 1001;
          width: min(480px, 92vw);
          background: var(--bg-surface, #1e293b);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px;
          box-shadow: 0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05);
          overflow: hidden;
          animation: dlm-slide-up 0.25s cubic-bezier(0.34,1.56,0.64,1);
        }

        .dlm-header {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 24px 24px 0;
        }

        .dlm-icon-wrap {
          width: 48px; height: 48px;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(251,191,36,0.15), rgba(245,158,11,0.1));
          border: 1px solid rgba(251,191,36,0.25);
          display: flex; align-items: center; justify-content: center;
          font-size: 1.4rem;
          flex-shrink: 0;
        }

        .dlm-title {
          font-size: 1.1rem;
          font-weight: 800;
          color: var(--text, white);
          margin: 0 0 4px;
          letter-spacing: -0.01em;
        }

        .dlm-subtitle {
          font-size: 0.8rem;
          color: var(--text-muted, #94a3b8);
          margin: 0;
          line-height: 1.5;
        }
        .dlm-subtitle strong { color: #fbbf24; }

        .dlm-close-btn {
          margin-left: auto;
          width: 28px; height: 28px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.08);
          background: transparent;
          color: var(--text-dimmed, #64748b);
          cursor: pointer;
          font-size: 0.75rem;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .dlm-close-btn:hover { background: rgba(255,255,255,0.08); color: var(--text); }

        /* Lead Card */
        .dlm-lead-card {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          margin: 20px 24px;
          padding: 16px;
          background: rgba(59,130,246,0.06);
          border: 1px solid rgba(59,130,246,0.2);
          border-radius: 14px;
        }

        .dlm-lead-avatar {
          width: 44px; height: 44px;
          border-radius: 12px;
          background: linear-gradient(135deg, #6366f1, #2563eb);
          color: var(--text);
          font-size: 1.2rem;
          font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }

        .dlm-lead-info { display: flex; flex-direction: column; gap: 6px; min-width: 0; }

        .dlm-lead-name {
          font-size: 1rem;
          font-weight: 700;
          color: var(--text);
        }

        .dlm-lead-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

        .dlm-tag {
          font-size: 0.7rem;
          font-weight: 700;
          color: #60a5fa;
          background: rgba(59,130,246,0.1);
          border: 1px solid rgba(59,130,246,0.2);
          border-radius: 6px;
          padding: 2px 8px;
          letter-spacing: 0.03em;
        }

        .dlm-status-badge {
          font-size: 0.68rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 3px 10px;
          border-radius: 20px;
          border: 1px solid transparent;
        }
        .dlm-st-new       { background: rgba(59,130,246,0.12);  color: #60a5fa;  border-color: rgba(59,130,246,0.25); }
        .dlm-st-contacted { background: rgba(16,185,129,0.12);  color: #34d399;  border-color: rgba(16,185,129,0.25); }
        .dlm-st-follow-up { background: rgba(245,158,11,0.12);  color: #fbbf24;  border-color: rgba(245,158,11,0.25); }
        .dlm-st-proposal  { background: rgba(139,92,246,0.12);  color: #a78bfa;  border-color: rgba(139,92,246,0.25); }
        .dlm-st-won       { background: rgba(16,185,129,0.15);  color: #10b981;  border-color: rgba(16,185,129,0.3); }
        .dlm-st-lost      { background: rgba(239,68,68,0.12);   color: #f87171;  border-color: rgba(239,68,68,0.25); }

        .dlm-lead-contact {
          font-size: 0.78rem;
          color: var(--text-muted, #94a3b8);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .dlm-note {
          padding: 0 24px;
          font-size: 0.78rem;
          color: var(--text-dimmed, #64748b);
          line-height: 1.6;
          margin: 0;
        }

        /* Actions */
        .dlm-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 20px 24px 24px;
        }

        .dlm-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 20px;
          border-radius: 12px;
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }

        .dlm-btn-primary {
          background: linear-gradient(135deg, #3b82f6, #6366f1);
          color: var(--text);
          box-shadow: 0 6px 20px rgba(59,130,246,0.35);
        }
        .dlm-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(59,130,246,0.45); }

        .dlm-btn-secondary {
          background: rgba(139,92,246,0.1);
          color: #a78bfa;
          border: 1px solid rgba(139,92,246,0.25);
        }
        .dlm-btn-secondary:hover { background: rgba(139,92,246,0.18); border-color: rgba(139,92,246,0.4); }

        .dlm-btn-ghost {
          background: transparent;
          color: var(--text-muted, #94a3b8);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .dlm-btn-ghost:hover { background: rgba(255,255,255,0.04); color: var(--text); }

        @keyframes dlm-fade-in   { from { opacity: 0; } to { opacity: 1; } }
        @keyframes dlm-slide-up  { from { opacity: 0; transform: translate(-50%,-48%) scale(0.96); } to { opacity: 1; transform: translate(-50%,-50%) scale(1); } }
      `}</style>
    </>
  )
}
