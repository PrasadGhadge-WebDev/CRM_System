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
          className="pg-btn nav" 
          onClick={() => onPageChange(page - 1)}
          disabled={showAll || page <= 1}
          title="Previous Page"
        >
          &larr;
        </button>

        <div className="pg-numbers">
          {pageNumbers.map((p, idx) => (
            <React.Fragment key={idx}>
              {p === '...' ? (
                <span className="pg-ellipsis">...</span>
              ) : (
                <button
                  className={`pg-btn num ${p === page ? 'active' : ''}`}
                  onClick={() => onPageChange(p)}
                >
                  {p}
                </button>
              )}
            </React.Fragment>
          ))}
        </div>

        <button 
          className="pg-btn nav" 
          onClick={() => onPageChange(page + 1)}
          disabled={showAll || page >= totalPages}
          title="Next Page"
        >
          &rarr;
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
          gap: 16px;
          margin-top: 24px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 16px;
          border: 1px solid var(--border-color);
        }

        .pg-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .pg-numbers {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .pg-btn {
          height: 36px;
          min-width: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border-color);
          background: var(--bg-card);
          color: var(--text);
          border-radius: 10px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .pg-btn:hover:not(:disabled) {
          background: var(--bg-hover);
          border-color: var(--primary-color);
          color: var(--primary-color);
        }

        .pg-btn.active {
          background: var(--primary-color);
          border-color: var(--primary-color);
          color: var(--text);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .pg-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .pg-btn.nav {
          font-size: 1.2rem;
          line-height: 1;
        }

        .pg-ellipsis {
          padding: 0 4px;
          color: var(--text-muted);
        }

        .pg-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          max-width: 500px;
          font-size: 0.85rem;
          color: var(--text-muted);
        }

        .pg-info b {
          color: var(--text);
        }

        .pg-limit {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .pg-select {
          background: var(--bg-hover);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          color: var(--text);
          padding: 2px 6px;
          font-size: 0.8rem;
          cursor: pointer;
        }

        @media (min-width: 640px) {
          .pg-wrapper {
            flex-direction: row;
            justify-content: space-between;
          }
          .pg-meta {
            width: auto;
            gap: 24px;
          }
        }
      `}</style>
    </div>
  )
}
