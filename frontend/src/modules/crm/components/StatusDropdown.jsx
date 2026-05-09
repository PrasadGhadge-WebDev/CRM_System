import React, { useState, useRef, useEffect } from 'react'
import { Icon } from '../../../layouts/icons.jsx'

/**
 * StatusDropdown - A premium status selector for CRM list views
 * 
 * @param {string} status - Current status value
 * @param {Array} options - List of options [{ name: 'Open', color: '#3b82f6' }] or strings
 * @param {function} onChange - Callback when status changes
 * @param {boolean} disabled - Whether the dropdown is interactive
 * @param {string} className - Optional extra classes
 */
export default function StatusDropdown({ 
  status, 
  options = [], 
  onChange, 
  disabled = false,
  className = '',
  bypassRules = false
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleToggle = (e) => {
    e.stopPropagation()
    if (!disabled) setIsOpen(!isOpen)
  }

  const handleSelect = (e, opt) => {
    e.stopPropagation()
    const newValue = typeof opt === 'object' ? opt.name : opt
    if (newValue !== status) {
      onChange(newValue)
    }
    setIsOpen(false)
  }

  // Transition Rules (Merged for Leads and Support)
  const transitionRules = {
    // Leads
    'New': ['Contacted', 'Lost', 'Junk'],
    'Contacted': ['Follow-up', 'Qualified', 'Lost', 'Junk'],
    'Follow-up': ['Qualified', 'Contacted', 'Lost', 'Junk'],
    'Qualified': ['Converted', 'Lost'],
    
    // Support (Case-insensitive support)
    'open': ['assigned', 'in-progress', 'resolved', 'closed'],
    'assigned': ['in-progress', 'waiting', 'resolved', 'closed'],
    'in-progress': ['waiting', 'resolved', 'closed'],
    'waiting': ['in-progress', 'resolved', 'closed'],
    'resolved': ['in-progress', 'closed'],
    'closed': ['open'], // Re-open if needed by Admin
    
    'Open': ['Assigned', 'In Progress', 'Resolved', 'Closed'],
    'Assigned': ['In Progress', 'Waiting', 'Resolved', 'Closed'],
    'In Progress': ['Waiting', 'Resolved', 'Closed'],
    'Waiting': ['In Progress', 'Resolved', 'Closed'],
    'Resolved': ['In Progress', 'Closed'],
    'Closed': ['Open'],

    // Deals Pipeline
    'Qualification': ['Proposal', 'Negotiation', 'Won', 'Lost'],
    'Proposal': ['Negotiation', 'Won', 'Lost'],
    'Negotiation': ['Won', 'Lost'],
    'Won': ['Negotiation', 'Lost'],
    'Lost': ['New', 'Qualification', 'Proposal', 'Negotiation', 'Won']
  }

  const isTerminal = status === 'Lost' || status === 'Converted' || status === 'Junk' || status === 'closed' || status === 'Closed'
  const isActuallyDisabled = disabled || (isTerminal && !bypassRules)

  // Normalize options to objects
  const normalizedOptions = options.map(opt => {
    if (typeof opt === 'string') return { name: opt, color: 'var(--primary)' }
    return opt
  })

  // Filter options based on transition rules (Admins can bypass)
  const currentRules = transitionRules[status] || []
  const availableOptions = (disabled === 'admin' || bypassRules || currentRules.length === 0)
    ? normalizedOptions
    : normalizedOptions.filter(opt => 
        currentRules.includes(opt.name) || opt.name === status
      )

  // Find color for current status
  const currentOpt = normalizedOptions.find(o => o.name === status) || { name: status || 'NEW', color: 'var(--primary)' }
  
  const [searchTerm, setSearchTerm] = useState('')
  const searchInputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('')
      setTimeout(() => searchInputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const filteredOptions = availableOptions.filter(opt => 
    opt.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const statusSlug = (status || 'new').toLowerCase().replace(/\s+/g, '')

  return (
    <div 
      className={`status-dropdown-container ${className} ${isActuallyDisabled ? 'disabled' : ''}`} 
      ref={containerRef}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      <button 
        type="button"
        className={`crm-status-pill-modern status-${statusSlug} ${isOpen ? 'active' : ''}`}
        onClick={handleToggle}
        disabled={isActuallyDisabled}
        title={isActuallyDisabled ? 'Status (Locked)' : 'Change Status'}
        style={{ 
          cursor: disabled ? 'default' : 'pointer',
          userSelect: 'none',
          gap: '8px',
          width: '100%',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="status-dot" style={{ backgroundColor: currentOpt.color }} />
          <span>{status || 'NEW'}</span>
        </div>
        {!disabled && <Icon name="chevron-down" size={10} style={{ opacity: 0.5, transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none' }} />}
      </button>

      {isOpen && (
        <div className="status-dropdown-menu shadow-lg">
          <div className="dropdown-search-wrap">
            <input 
              ref={searchInputRef}
              type="text" 
              className="dropdown-search-input" 
              placeholder="Search status..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
            <Icon name="search" size={12} className="search-icon" />
          </div>

          <div className="dropdown-options-scroll custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <div 
                  key={opt.name} 
                  className={`status-dropdown-item ${opt.name === status ? 'selected' : ''}`}
                  onClick={(e) => handleSelect(e, opt)}
                >
                  <div className="status-dot-mini" style={{ backgroundColor: opt.color }} />
                  <span>{opt.name}</span>
                  {opt.name === status && <Icon name="check" size={12} className="check-icon" />}
                </div>
              ))
            ) : (
              <div className="dropdown-no-results">No status found</div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .dropdown-search-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border-bottom: 1px solid var(--border-subtle);
          margin-bottom: 4px;
        }

        .dropdown-search-wrap .search-icon {
          color: #94a3b8;
        }

        .dropdown-search-input {
          border: none;
          background: none;
          outline: none;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text);
          width: 100%;
        }

        .dropdown-options-scroll {
          max-height: 250px;
          overflow-y: auto;
        }

        .dropdown-no-results {
          padding: 16px;
          text-align: center;
          font-size: 0.75rem;
          color: #94a3b8;
          font-weight: 600;
        }
        .crm-status-pill-modern {
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: 50px;
          padding: 4px 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.65rem;
          font-weight: 800;
          color: var(--text-dimmed);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          backdrop-filter: blur(8px);
        }

        .crm-status-pill-modern:hover:not(:disabled) {
          background: var(--bg-card);
          border-color: var(--primary);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
        }

        .status-dropdown-menu {
          position: absolute;
          top: calc(100% + 8px);
          left: 50%;
          transform: translateX(-50%);
          background: var(--bg-card);
          border: 1px solid var(--border-strong);
          border-radius: 16px;
          min-width: 180px;
          z-index: 1000;
          padding: 8px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          animation: statusDropdownFadeIn 0.2s ease-out;
          backdrop-filter: blur(20px);
        }

        @keyframes statusDropdownFadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        .status-dropdown-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: 10px;
          cursor: pointer;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text);
          transition: all 0.2s;
          white-space: nowrap;
        }

        .status-dropdown-item:hover {
          background: var(--bg-hover);
          color: var(--primary);
        }

        .status-dropdown-item.selected {
          background: var(--primary-soft);
          color: var(--primary);
        }

        .status-dot-mini {
          width: 7px;
          height: 7px;
          border-radius: 50%;
        }

        .check-icon {
          margin-left: auto;
          color: var(--primary);
        }

        .disabled .crm-status-pill-modern {
          opacity: 0.8;
          cursor: default;
        }
      `}</style>
    </div>
  )
}
