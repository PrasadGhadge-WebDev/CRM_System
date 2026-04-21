import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../layouts/icons'
import { searchApi } from '../services/search'
import { useDebouncedValue } from '../utils/useDebouncedValue'

export default function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const debouncedQuery = useDebouncedValue(query, 300)
  const navigate = useNavigate()
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (debouncedQuery.length > 2) {
      setLoading(true)
      searchApi.global(debouncedQuery)
        .then(res => setResults(res))
        .catch(() => setResults(null))
        .finally(() => setLoading(false))
    } else {
      setResults(null)
    }
  }, [debouncedQuery])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleResultClick = (path) => {
    setIsOpen(false)
    setQuery('')
    navigate(path)
  }

  const hasResults = results && (results.leads?.length > 0 || results.customers?.length > 0 || results.deals?.length > 0)

  return (
    <div className="global-search-container" ref={dropdownRef}>
      <div className="topbarSearch">
        <Icon name="search" />
        <input
          placeholder="Search leads, customers, deals..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
        />
        {loading && <div className="search-spinner" />}
      </div>

      {isOpen && (query.length > 2 || loading) && (
        <div className="search-results-dropdown glass-panel shadow-vibrant">
          {loading ? (
            <div className="search-message">Searching...</div>
          ) : hasResults ? (
            <div className="search-results-content">
              {results.leads?.length > 0 && (
                <div className="result-section">
                  <div className="result-section-header">Leads</div>
                  {results.leads.map(lead => (
                    <div key={lead.id} className="result-item" onClick={() => handleResultClick(`/leads/${lead.id}`)}>
                      <div className="result-item-title">{lead.name}</div>
                      <div className="result-item-meta">{lead.email} • {lead.status}</div>
                    </div>
                  ))}
                </div>
              )}

              {results.customers?.length > 0 && (
                <div className="result-section">
                  <div className="result-section-header">Customers</div>
                  {results.customers.map(customer => (
                    <div key={customer.id} className="result-item" onClick={() => handleResultClick(`/customers/${customer.id}`)}>
                      <div className="result-item-title">{customer.name}</div>
                      <div className="result-item-meta">{customer.email} • {customer.status}</div>
                    </div>
                  ))}
                </div>
              )}

              {results.deals?.length > 0 && (
                <div className="result-section">
                  <div className="result-section-header">Deals</div>
                  {results.deals.map(deal => (
                    <div key={deal.id} className="result-item" onClick={() => handleResultClick(`/deals/${deal.id}`)}>
                      <div className="result-item-title">{deal.name}</div>
                      <div className="result-item-meta">₹{deal.value?.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="search-message">No results found for "{query}"</div>
          )}
        </div>
      )}

      <style>{`
        .global-search-container {
          position: relative;
          flex: 1;
          max-width: 500px;
        }
        .search-results-dropdown {
          position: absolute;
          top: calc(100% + 10px);
          left: 0;
          right: 0;
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          z-index: 1000;
          max-height: 480px;
          overflow-y: auto;
          animation: slideDown 0.2s ease-out;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .search-message {
          padding: 20px;
          text-align: center;
          color: var(--text-dimmed);
          font-style: italic;
        }
        .result-section {
          padding: 10px 0;
        }
        .result-section:not(:last-child) {
          border-bottom: 1px solid var(--border);
        }
        .result-section-header {
          padding: 8px 20px;
          font-size: 0.7rem;
          font-weight: 800;
          text-transform: uppercase;
          color: var(--primary);
          letter-spacing: 0.05em;
        }
        .result-item {
          padding: 12px 20px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .result-item:hover {
          background: rgba(var(--primary-rgb), 0.1);
          padding-left: 24px;
        }
        .result-item-title {
          font-weight: 700;
          color: white;
          margin-bottom: 2px;
        }
        .result-item-meta {
          font-size: 0.75rem;
          color: var(--text-dimmed);
        }
        .search-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.1);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-right: 15px;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
