import React, { useState, useEffect } from 'react'
import { Icon } from '../layouts/icons'

/**
 * DebouncedSearchInput Component
 * An input field that debounces the user's typing and notifies the parent
 * only after a specified delay.
 * 
 * @param {Object} props
 * @param {string} props.value - Initial search value
 * @param {function} props.onChange - Callback fired with the debounced value
 * @param {number} props.delay - Debounce time in ms (default 500)
 * @param {string} props.placeholder - Input placeholder
 */
export default function DebouncedSearchInput({ 
  value = '', 
  onChange, 
  delay = 500, 
  placeholder = 'Search...' 
}) {
  const [localValue, setLocalValue] = useState(value)

  // Update local value if prop changes (e.g. on reset)
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  useEffect(() => {
    const handler = setTimeout(() => {
      onChange(localValue)
    }, delay)

    return () => clearTimeout(handler)
  }, [localValue, delay, onChange])

  return (
    <div className="debounced-search-wrapper">
      <Icon name="search" size={16} className="search-icon" />
      <input
        type="text"
        className="debounced-search-input"
        placeholder={placeholder}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
      />
      {localValue && (
        <button 
          className="search-clear-btn" 
          onClick={() => setLocalValue('')}
          aria-label="Clear search"
        >
          <Icon name="close" size={14} />
        </button>
      )}

      <style>{`
        .debounced-search-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
          max-width: 400px;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          color: var(--text-muted);
          pointer-events: none;
        }

        .debounced-search-input {
          width: 100%;
          padding: 10px 36px 10px 40px;
          background: var(--bg-hover);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          font-size: 0.9rem;
          color: var(--text);
          transition: all 0.2s ease;
        }

        .debounced-search-input:focus {
          outline: none;
          background: var(--bg-card);
          border-color: var(--primary-color);
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
        }

        .search-clear-btn {
          position: absolute;
          right: 12px;
          color: var(--text-muted);
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          transition: all 0.2s ease;
        }

        .search-clear-btn:hover {
          background: rgba(0,0,0,0.05);
          color: var(--text);
        }
      `}</style>
    </div>
  )
}
