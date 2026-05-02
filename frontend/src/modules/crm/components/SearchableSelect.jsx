import React, { useState, useRef, useEffect } from 'react'
import { Icon } from '../../../layouts/icons.jsx'

/**
 * SearchableSelect - A premium searchable select component for filters
 */
export default function SearchableSelect({ 
  value, 
  options = [], 
  onChange, 
  placeholder = "Select option",
  icon = "filter",
  className = "",
  style = {},
  error = false
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef(null)
  const searchInputRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      setSearchTerm('')
      setTimeout(() => searchInputRef.current?.focus(), 100)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const filteredOptions = options.filter(opt => {
    const label = typeof opt === 'object' ? opt.label : opt
    return label.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const currentLabel = options.find(opt => {
    const val = typeof opt === 'object' ? opt.value : opt
    return val === value
  })
  const displayLabel = currentLabel ? (typeof currentLabel === 'object' ? currentLabel.label : currentLabel) : placeholder

  return (
    <div className={`searchable-select-container ${className}`} ref={containerRef} style={style}>
      <div 
        className={`searchable-select-trigger ${isOpen ? 'active' : ''} ${error ? 'error' : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <Icon name={icon} size={14} className="trigger-icon" />
        <span className="trigger-text">{displayLabel}</span>
        <Icon name="chevron-down" size={12} className={`chevron ${isOpen ? 'rotate' : ''}`} />
      </div>

      {isOpen && (
        <div className="searchable-select-dropdown shadow-lg">
          <div className="search-box">
            <input 
              ref={searchInputRef}
              type="text" 
              placeholder="Search..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
            <Icon name="search" size={12} className="search-icon" />
          </div>

          <div className="options-list custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, idx) => {
                const optValue = typeof opt === 'object' ? opt.value : opt
                const optLabel = typeof opt === 'object' ? opt.label : opt
                const isSelected = optValue === value

                return (
                  <div 
                    key={`${optValue}-${idx}`}
                    className={`option-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      onChange(optValue)
                      setIsOpen(false)
                    }}
                  >
                    <span>{optLabel}</span>
                    {isSelected && <Icon name="check" size={12} className="check-icon" />}
                  </div>
                )
              })
            ) : (
              <div className="no-results">No matches found</div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .searchable-select-container {
          position: relative;
          min-width: 160px;
        }

        .searchable-select-trigger {
          height: 42px;
          padding: 0 16px;
          background: var(--bg-card, white);
          border: 1px solid var(--border);
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          transition: all 0.2s;
          user-select: none;
        }

        .searchable-select-trigger:hover {
          border-color: var(--primary);
          background: #f8fafc;
        }

        .searchable-select-trigger.active {
          border-color: var(--primary);
          box-shadow: 0 0 0 4px rgba(var(--primary-rgb), 0.1);
        }

        .searchable-select-trigger.error {
          border-color: #ef4444;
        }

        .searchable-select-trigger.error.active {
          box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.1);
        }

        .trigger-icon { color: #64748b; }
        .trigger-text { 
          font-size: 0.85rem; 
          font-weight: 700; 
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
        }
        .chevron { color: #94a3b8; transition: transform 0.2s; }
        .chevron.rotate { transform: rotate(180deg); }

        .searchable-select-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          background: var(--bg-card, white);
          border: 1px solid var(--border);
          border-radius: 16px;
          z-index: 1000;
          padding: 8px;
          min-width: 200px;
          animation: dropdownSlideIn 0.2s cubic-bezier(0, 0, 0.2, 1);
        }

        @keyframes dropdownSlideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          background: var(--bg-surface, #f8fafc);
          border-radius: 10px;
          margin-bottom: 8px;
          border: 1px solid var(--border-subtle);
        }

        .search-box input {
          border: none;
          background: none;
          outline: none;
          font-size: 0.8rem;
          font-weight: 600;
          color: #1e293b;
          width: 100%;
        }

        .options-list {
          max-height: 250px;
          overflow-y: auto;
          padding-right: 4px;
        }

        .option-item {
          padding: 10px 12px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          font-size: 0.8rem;
          font-weight: 600;
          color: #475569;
          transition: all 0.2s;
        }

        .option-item:hover {
          background: #f1f5f9;
          color: var(--primary);
        }

        .option-item.selected {
          background: var(--primary-soft);
          color: var(--primary);
        }

        .option-item span {
          color: var(--text);
        }

        .no-results {
          padding: 20px;
          text-align: center;
          font-size: 0.8rem;
          color: #94a3b8;
          font-weight: 600;
        }
      `}</style>
    </div>
  )
}
