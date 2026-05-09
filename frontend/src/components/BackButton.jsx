import { useNavigate } from 'react-router-dom'
import { Icon } from '../layouts/icons'

/**
 * Premium Glassmorphism Back Button
 * Modern, consistent design for high-density administrative views.
 */
export default function BackButton({ to = '/payments', text = 'Back to Payments' }) {
  const navigate = useNavigate()

  return (
    <button 
      onClick={() => navigate(to)}
      className="back-btn-premium"
    >
      <div className="back-btn-icon-wrap">
        <Icon name="chevronLeft" size={16} />
      </div>
      <span className="back-btn-text">{text}</span>

      <style>{`
        .back-btn-premium {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          padding: 8px 18px 8px 10px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 100px;
          color: var(--text);
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
          box-shadow: var(--shadow-sm);
          position: relative;
          overflow: hidden;
        }

        .back-btn-premium:hover {
          transform: translateX(-4px);
          border-color: var(--primary);
          background: var(--bg-elevated);
          box-shadow: var(--shadow-md), 0 0 15px var(--primary-soft);
        }

        .back-btn-premium:active {
          transform: scale(0.96);
        }

        .back-btn-icon-wrap {
          width: 32px;
          height: 32px;
          background: var(--bg-surface);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          transition: all 0.3s ease;
        }

        .back-btn-premium:hover .back-btn-icon-wrap {
          background: var(--primary);
          color: white;
          transform: rotate(-10deg);
        }

        .back-btn-text {
          font-size: 0.88rem;
          font-weight: 800;
          letter-spacing: -0.01em;
        }

        @media print {
          .back-btn-premium { display: none !important; }
        }
      `}</style>
    </button>
  )
}
