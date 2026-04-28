import { Icon } from '../../../layouts/icons.jsx'

export default function LeadSummaryBar({ summary = {}, loading }) {
  const stats = [
    { 
      label: 'Total Leads', 
      value: summary.total || 0, 
      icon: 'users', 
      color: 'blue',
      desc: 'Total leads captured' 
    },
    { 
      label: 'Converted', 
      value: summary.converted || 0, 
      icon: 'check', 
      color: 'green',
      desc: 'Won opportunities' 
    },
    { 
      label: 'Pending', 
      value: summary.pending || 0, 
      icon: 'activity', 
      color: 'orange',
      desc: 'Active follow-ups' 
    },
    { 
      label: 'Overdue', 
      value: summary.overdue || 0, 
      icon: 'alert', 
      color: 'red',
      desc: 'Attention needed' 
    },
  ]

  return (
    <div className="lead-summary-bar premium-glass">
      {stats.map((stat, i) => (
        <div key={i} className={`lsb-item lsb-${stat.color}`}>
          <div className="lsb-icon">
            <Icon name={stat.icon} />
          </div>
          <div className="lsb-info">
            <div className="lsb-val">
              {loading ? <span className="lsb-skeleton-text" /> : stat.value}
            </div>
            <div className="lsb-label">{stat.label}</div>
          </div>
          <div className="lsb-hint" title={stat.desc}>
            <Icon name="info" size={12} />
          </div>
        </div>
      ))}

      <style>{`
        .lead-summary-bar {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          padding: 24px;
          margin-bottom: 24px;
          border-radius: 20px;
          background: rgba(30, 41, 59, 0.4);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }

        .lsb-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.03);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        .lsb-item:hover {
          background: rgba(255, 255, 255, 0.05);
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.1);
        }

        .lsb-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          flex-shrink: 0;
        }

        .lsb-blue .lsb-icon { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
        .lsb-green .lsb-icon { background: rgba(34, 197, 94, 0.15); color: #4ade80; }
        .lsb-orange .lsb-icon { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
        .lsb-red .lsb-icon { background: rgba(239, 68, 68, 0.15); color: #f87171; }

        .lsb-info { display: flex; flex-direction: column; gap: 2px; }
        .lsb-val { font-size: 1.6rem; font-weight: 800; color: var(--text); line-height: 1; }
        .lsb-label { font-size: 0.75rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }

        .lsb-hint {
          position: absolute;
          top: 12px;
          right: 12px;
          color: rgba(255,255,255,0.1);
          cursor: help;
          transition: color 0.2s;
        }
        .lsb-item:hover .lsb-hint { color: rgba(255,255,255,0.3); }

        .lsb-skeleton-text {
          display: inline-block;
          width: 40px;
          height: 24px;
          background: rgba(255,255,255,0.05);
          border-radius: 4px;
          animation: lsb-pulse 1.5s infinite ease-in-out;
        }

        @keyframes lsb-pulse {
          0% { opacity: 0.5; }
          50% { opacity: 1; }
          100% { opacity: 0.5; }
        }

        @media (max-width: 1200px) {
          .lead-summary-bar { grid-template-columns: repeat(2, 1fr); padding: 16px; gap: 12px; }
        }
        @media (max-width: 600px) {
          .lead-summary-bar { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
