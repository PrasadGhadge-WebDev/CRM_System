import React, { useState } from 'react'
import { Icon } from '../layouts/icons.jsx'

export default function ConvertDealModal({ lead, onConfirm, onCancel }) {
  const [model, setModel] = useState({
    name: `Deal for ${lead?.name || 'Prospect'}`,
    value: 0,
    currency: 'INR',
    expected_close_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onConfirm(model)
  }

  return (
    <div className="lead-modal-overlay">
      <div className="lead-modal-content crmContent animate-zoom-in">
        <div className="modal-header-premium">
          <div className="modal-header-text">
            <span className="crm-form-kicker modal-kicker">Workflow Stage</span>
            <h2>Convert to Opportunity</h2>
            <p>Move <strong>{lead?.name}</strong> into the deal pipeline with the same premium form styling used across CRM screens.</p>
          </div>
          <button className="modal-close-btn" onClick={onCancel} type="button" aria-label="Close modal">
            <Icon name="close" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body-premium crm-form">
          <div className="crm-form-grid-2 modal-form-grid">
            <div className="crm-field full-width">
              <label>Deal Title</label>
              <div className="crm-input-shell">
                <Icon name="edit" />
                <input
                  className="crm-input"
                  required
                  value={model.name}
                  onChange={e => setModel({ ...model, name: e.target.value })}
                  placeholder="e.g. Annual Subscription Deal"
                />
              </div>
            </div>

            <div className="crm-field">
              <label>Initial Deal Value</label>
              <div className="crm-financial-input">
                <select
                  className="crm-financial-select"
                  value={model.currency}
                  onChange={e => setModel({ ...model, currency: e.target.value })}
                >
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                </select>
                <input
                  className="crm-input no-icon"
                  type="number"
                  min="0"
                  required
                  value={model.value}
                  onChange={e => setModel({ ...model, value: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="crm-field">
              <label>Expected Close</label>
              <div className="crm-input-shell">
                <Icon name="bell" />
                <input
                  className="crm-input"
                  type="date"
                  required
                  value={model.expected_close_date}
                  onChange={e => setModel({ ...model, expected_close_date: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="crm-form-actions">
            <button className="btn secondary" type="button" onClick={onCancel}>
              Cancel
            </button>
            <button className="btn primary" type="submit">
              Confirm Conversion
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .lead-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(8px);
          z-index: 2000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .lead-modal-content {
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          width: 100%;
          max-width: 720px;
          overflow: hidden;
          box-shadow: var(--shadow-2xl);
        }

        .modal-header-premium {
          padding: 28px 28px 20px;
          background: rgba(255, 255, 255, 0.03);
          border-bottom: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }

        .modal-header-premium h2 {
          margin: 0 0 10px;
          font-size: 1.45rem;
          color: var(--text);
        }

        .modal-header-premium p {
          margin: 0;
          color: var(--text-muted);
          line-height: 1.55;
          max-width: 54ch;
        }

        .modal-kicker {
          margin-bottom: 10px;
        }

        .modal-body-premium {
          padding: 28px;
          gap: 24px;
        }

        .modal-form-grid {
          gap: 20px;
        }

        .modal-close-btn {
          background: transparent;
          border: none;
          color: var(--text-dimmed);
          cursor: pointer;
          transition: all 0.2s;
          padding: 4px;
        }

        .modal-close-btn:hover {
          color: var(--text);
          transform: rotate(90deg);
        }

        .animate-zoom-in {
          animation: modalZoomIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes modalZoomIn {
          from { opacity: 0; transform: scale(0.9) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        @media (max-width: 768px) {
          .lead-modal-content {
            max-width: 100%;
          }

          .modal-header-premium,
          .modal-body-premium {
            padding: 20px;
          }
        }
      `}</style>
    </div>
  )
}
