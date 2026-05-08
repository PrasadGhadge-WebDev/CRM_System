import React from 'react'

/**
 * Enhanced Pagination Component
 * Displays page numbers, previous/next buttons, and per-page limit selector.
 * 
 * @param {Object} props
 * @param {number} props.page - Current page index (1-based)
 * @param {number|string} props.limit - Items per page
 * @param {number} props.total - Total number of items
 * @param {function} props.onPageChange - Handler for page clicks
 * @param {function} props.onLimitChange - Handler for limit changes
 */
export default function Pagination({ page: rawPage, limit: rawLimit, total: rawTotal, onPageChange, onLimitChange }) {
  const page = Number(rawPage) || 1
  const limit = rawLimit
  const total = Number(rawTotal) || 0
  const showAll = String(limit).toLowerCase() === 'all'
  const numericLimit = Number(limit) || 25
  const totalPages = showAll ? 1 : Math.ceil(total / numericLimit)
  
  if (total <= 0) return null

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = []
    const range = 2 // How many pages to show around current
    
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 || 
        i === totalPages || 
        (i >= page - range && i <= page + range)
      ) {
        pages.push(i)
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...')
      }
    }
    return pages
  }

  const pageNumbers = getPageNumbers()

  return (
    <div className="pg-wrapper">
      <div className="pg-controls">
        <button 
          className="pg-btn nav-text" 
          onClick={() => onPageChange(page - 1)}
          disabled={showAll || page <= 1}
        >
          Prev
        </button>

        <div className="pg-numbers">
          {pageNumbers.map((p, idx) => (
            <React.Fragment key={idx}>
              {p === '...' ? (
                <div className="pg-ellipsis-circle">...</div>
              ) : (
                <button
                  className={`pg-btn-circle ${p === page ? 'active' : ''}`}
                  onClick={() => onPageChange(p)}
                >
                  {String(p).padStart(2, '0')}
                </button>
              )}
            </React.Fragment>
          ))}
        </div>

        <button 
          className="pg-btn nav-text active" 
          onClick={() => onPageChange(page + 1)}
          disabled={showAll || page >= totalPages}
        >
          Next
        </button>
      </div>

      <div className="pg-meta">
        <span className="pg-info">
          Showing <b>{(page - 1) * numericLimit + 1}</b> to <b>{Math.min(page * numericLimit, total)}</b> of <b>{total}</b>
        </span>
        
        {onLimitChange && (
          <div className="pg-limit">
            <span>Show</span>
            <select 
              className="pg-select" 
              value={limit}
              onChange={(e) => {
                const val = e.target.value
                onLimitChange(val === 'all' ? 'all' : Number(val))
              }}
            >
              {[10, 25, 50, 100].map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
              <option value="all">All</option>
            </select>
          </div>
        )}
      </div>

      <style>{`
        .pg-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          margin-top: 32px;
          padding: 16px 24px;
          background: transparent;
          width: 100%;
        }

        .pg-controls {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .pg-numbers {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .nav-text {
          background: transparent;
          border: none;
          font-size: 0.9rem;
          font-weight: 700;
          color: #94a3b8;
          cursor: pointer;
          transition: color 0.2s;
          padding: 8px;
        }
        .nav-text.active:not(:disabled) {
          color: #0066ff;
        }
        .nav-text:disabled {
          color: #cbd5e1;
          cursor: not-allowed;
        }

        .pg-btn-circle {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #cbd5e1;
          background: white;
          color: #475569;
          font-size: 0.85rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .pg-btn-circle:hover:not(.active) {
          border-color: #0066ff;
          color: #0066ff;
        }

        .pg-btn-circle.active {
          background: #0066ff;
          border-color: #0066ff;
          color: white;
          box-shadow: 0 4px 12px rgba(0, 102, 255, 0.3);
        }

        .pg-ellipsis-circle {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #cbd5e1;
          color: #64748b;
          font-weight: 800;
        }

        .pg-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          font-size: 0.85rem;
          color: #64748b;
          font-weight: 600;
          padding-top: 16px;
          border-top: 1px solid var(--border-subtle);
        }

        .pg-info b { color: var(--text); }

        .pg-limit {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .pg-select {
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          color: var(--text);
          padding: 6px 12px;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          outline: none;
        }

        @media (min-width: 768px) {
          .pg-wrapper {
            flex-direction: row;
            justify-content: space-between;
          }
          .pg-meta {
            width: auto;
            border-top: none;
            padding-top: 0;
            gap: 32px;
          }
        }
      `}</style>
    </div>
  )
}
