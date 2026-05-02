import { Icon } from '../layouts/icons.jsx'

export default function ModernSearchBar({ value, onChange, placeholder = 'Search...', className = '' }) {
  return (
    <div className={`crm-search-bar-modern ${className}`}>
      <input
        type="text"
        placeholder={placeholder}
        className="crm-search-input"
        value={value}
        onChange={onChange}
        autoComplete="off"
      />
      <div className="search-action-icon">
        <Icon name="search" />
      </div>

      <style>{`
        .crm-search-bar-modern {
          display: flex;
          align-items: center;
          background: var(--bg-surface, #1e293b);
          border: 1px solid var(--border, rgba(255,255,255,0.05));
          border-radius: 999px; /* Pill design */
          padding: 4px 4px 4px 20px;
          height: 44px;
          width: 100%;
          max-width: 500px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05));
        }

        .crm-search-bar-modern:focus-within {
          border-color: var(--primary, #3b82f6);
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1), var(--shadow-md);
          transform: translateY(-1px);
        }

        .crm-search-input {
          flex: 1;
          background: transparent !important;
          border: none !important;
          color: var(--text, #f8fafc) !important;
          font-size: 0.95rem !important;
          font-weight: 500 !important;
          outline: none !important;
          padding: 0 !important;
          height: 100% !important;
        }

        .crm-search-input::placeholder {
          color: var(--text-dimmed, #64748b);
          opacity: 0.7;
        }

        .search-action-icon {
          width: 36px;
          height: 36px;
          background: var(--primary, #3b82f6);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .crm-search-bar-modern:hover .search-action-icon {
          transform: scale(1.05);
          filter: brightness(1.1);
        }
      `}</style>
    </div>
  )
}
