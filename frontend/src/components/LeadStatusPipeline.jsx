import { PIPELINE_STAGES, getPipelineIndex, normalizeStatus } from '../utils/leadStatusFlow.js'

const STAGE_META = {
  'New':           { color: '#6366f1', bg: 'rgba(99,102,241,0.15)',   icon: '🌱' },
  'Contacted':     { color: '#3b82f6', bg: 'rgba(59,130,246,0.15)',   icon: '📞' },
  'Follow-up':     { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)',   icon: '🔁' },
  'Proposal Sent': { color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)',   icon: '📋' },
  'Won':           { color: '#10b981', bg: 'rgba(16,185,129,0.15)',   icon: '🏆' },
}

/**
 * LeadStatusPipeline
 * A horizontal pipeline stepper showing the 5-stage funnel.
 * Clicking an allowed next stage triggers `onRequestChange(stage)`.
 *
 * Props:
 *   currentStatus  — string (lead's current status)
 *   allowedNext    — string[] (from getAllowedTransitions)
 *   isLost         — bool (if lead is already Lost)
 *   onLostClick    — () => void (for Lost button)
 *   onRequestChange— (stage: string) => void
 */
export default function LeadStatusPipeline({
  currentStatus,
  allowedNext = [],
  isLost = false,
  onLostClick,
  onRequestChange,
  compact = false,
}) {
  const currentIdx = getPipelineIndex(currentStatus)
  const norm       = normalizeStatus(currentStatus)

  return (
    <div className={`lsp-root ${compact ? 'lsp-compact' : ''} ${isLost ? 'lsp-is-lost' : ''}`}>
      {/* Pipeline stages */}
      <div className="lsp-track">
        {PIPELINE_STAGES.map((stage, idx) => {
          const meta = STAGE_META[stage] || { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', icon: '⚠️' }
          const isActive   = normalizeStatus(stage) === norm
          const isPast     = idx < currentIdx
          const isFuture   = idx > currentIdx
          const canClick   = allowedNext.map(normalizeStatus).includes(normalizeStatus(stage)) && !isLost
          const isNext     = idx === currentIdx + 1

          return (
            <div key={stage} className="lsp-step-wrap">
              {/* Connector line (before each step except first) */}
              {idx > 0 && (
                <div
                  className="lsp-connector"
                  style={{
                    background: isPast || isActive
                      ? `linear-gradient(90deg, ${STAGE_META[PIPELINE_STAGES[idx - 1]].color}, ${meta.color})`
                      : undefined,
                    opacity: isPast || isActive ? 1 : 0.2,
                  }}
                />
              )}

              <button
                type="button"
                className={`lsp-step ${isActive ? 'lsp-active' : ''} ${isPast ? 'lsp-past' : ''} ${isFuture ? 'lsp-future' : ''} ${canClick ? 'lsp-clickable' : ''} ${isNext && canClick ? 'lsp-next-glow' : ''}`}
                style={{
                  '--stage-color': meta.color,
                  '--stage-bg':    meta.bg,
                }}
                title={canClick ? `Move to ${stage}` : stage}
                onClick={() => canClick && onRequestChange?.(stage)}
                disabled={!canClick || isLost}
              >
                <span className="lsp-icon">{meta.icon}</span>
                <span className="lsp-label">{stage}</span>
                {isActive && !isLost && <span className="lsp-active-dot" />}
                {isPast && <span className="lsp-check">✓</span>}
              </button>
            </div>
          )
        })}
      </div>

      {/* Lost button */}
      {!isTerminal(norm) && onLostClick && (
        <button
          type="button"
          className={`lsp-lost-btn ${isLost ? 'lsp-lost-active' : ''}`}
          title={isLost ? 'Lead is Lost' : 'Mark as Lost (requires reason)'}
          onClick={isLost ? undefined : onLostClick}
          disabled={isLost}
        >
          <span>💀</span>
          <span>{isLost ? 'Lost' : 'Mark Lost'}</span>
        </button>
      )}

      {/* Lost state banner */}
      {isLost && (
        <div className="lsp-lost-banner">
          <span>💀</span>
          <span>This lead is marked as <strong>Lost</strong></span>
        </div>
      )}

      <style>{`
        .lsp-root {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          padding: 16px 0;
        }

        .lsp-track {
          display: flex;
          align-items: center;
          flex: 1;
          min-width: 0;
          gap: 0;
        }

        .lsp-step-wrap {
          display: flex;
          align-items: center;
          flex: 1;
          min-width: 0;
        }

        .lsp-connector {
          flex: 1;
          height: 2px;
          background: rgba(255,255,255,0.1);
          min-width: 8px;
        }

        .lsp-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 10px 14px;
          border-radius: 14px;
          border: 1.5px solid transparent;
          background: transparent;
          cursor: default;
          transition: all 0.2s ease;
          position: relative;
          flex-shrink: 0;
          min-width: 80px;
        }

        .lsp-step.lsp-past {
          border-color: rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          opacity: 0.7;
        }

        .lsp-step.lsp-active {
          border-color: var(--stage-color);
          background: var(--stage-bg);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--stage-color) 20%, transparent);
        }

        .lsp-step.lsp-future {
          opacity: 0.35;
          border-color: rgba(255,255,255,0.06);
        }

        .lsp-step.lsp-clickable {
          cursor: pointer;
          border-color: rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.04);
          opacity: 0.8;
        }

        .lsp-step.lsp-clickable:hover {
          border-color: var(--stage-color);
          background: var(--stage-bg);
          opacity: 1;
          transform: translateY(-2px);
        }

        .lsp-step.lsp-next-glow {
          border-color: var(--stage-color);
          background: var(--stage-bg);
          opacity: 0.9;
          animation: lsp-pulse 2s ease-in-out infinite;
        }

        @keyframes lsp-pulse {
          0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--stage-color) 30%, transparent); }
          50%       { box-shadow: 0 0 0 6px color-mix(in srgb, var(--stage-color) 0%, transparent); }
        }

        .lsp-icon { font-size: 1.1rem; line-height: 1; }
        .lsp-label { font-size: 0.7rem; font-weight: 700; color: var(--text-muted); white-space: nowrap; text-transform: uppercase; letter-spacing: 0.04em; }
        .lsp-active .lsp-label { color: var(--stage-color); }

        .lsp-active-dot {
          position: absolute;
          bottom: -5px;
          left: 50%;
          transform: translateX(-50%);
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
          box-shadow: 0 0 6px currentColor;
        }

        .lsp-check {
          position: absolute;
          top: 4px;
          right: 4px;
          font-size: 0.6rem;
          color: #10b981;
          font-weight: 800;
        }

        /* Lost button */
        .lsp-lost-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 10px;
          border: 1.5px dashed rgba(239,68,68,0.35);
          background: rgba(239,68,68,0.06);
          color: rgba(248,113,113,0.8);
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }
        .lsp-lost-btn:hover:not(:disabled) {
          border-color: rgba(239,68,68,0.6);
          background: rgba(239,68,68,0.12);
          color: #f87171;
          transform: translateY(-1px);
        }
        .lsp-lost-btn:disabled { cursor: default; }

        .lsp-lost-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.25);
          border-radius: 10px;
          color: #f87171;
          font-size: 0.82rem;
          font-weight: 600;
        }

        /* Compact variant */
        .lsp-compact .lsp-step { min-width: 60px; padding: 7px 10px; }
        .lsp-compact .lsp-icon { font-size: 0.9rem; }
        .lsp-compact .lsp-label { font-size: 0.62rem; }

        /* Responsive */
        @media (max-width: 700px) {
          .lsp-track { flex-wrap: nowrap; overflow-x: auto; gap: 4px; }
          .lsp-connector { min-width: 4px; }
          .lsp-step { min-width: 64px; padding: 8px 6px; }
          .lsp-label { font-size: 0.6rem; }
        }
      `}</style>
    </div>
  )
}

function isTerminal(norm) {
  return norm === 'won' || norm === 'lost'
}
