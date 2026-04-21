import { useState, useRef, useEffect } from 'react'
import { Icon } from '../layouts/icons.jsx'

export default function SearchableSelect({ 
  options = [], 
  value, 
  onChange, 
  placeholder = 'Select option...', 
  icon = 'search',
  required = false
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef(null)

  const selectedOption = options.find(o => String(o.value) === String(value))
  const displayLabel = selectedOption ? selectedOption.label : ''

  const filteredOptions = options.filter(o => 
    String(o.label).toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelect(option) {
    onChange({ target: { value: option.value } })
    setIsOpen(false)
    setSearch('')
  }

  return (
    <div className="searchable-select-container" ref={containerRef}>
      <div 
        className={`select-trigger-premium ${isOpen ? 'active' : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <Icon name={icon} className="trigger-icon" />
        <span className={`trigger-text ${!displayLabel ? 'placeholder' : ''}`}>
          {displayLabel || placeholder}
        </span>
        <Icon name="chevronDown" className={`chevron ${isOpen ? 'rotate' : ''}`} />
      </div>

      {isOpen && (
        <div className="select-dropdown-premium animate-fade-in">
          <div className="search-box-premium">
            <Icon name="search" />
            <input 
              autoFocus
              className="dropdown-search-input"
              placeholder="Start typing to filter..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="options-list-premium">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <div 
                  key={opt.value} 
                  className={`option-item-premium ${String(opt.value) === String(value) ? 'selected' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSelect(opt)
                  }}
                >
                  {opt.label}
                  {String(opt.value) === String(value) && <Icon name="check" className="check-icon" />}
                </div>
              ))
            ) : (
              <div className="no-options-premium">No results found</div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .searchable-select-container {
          position: relative;
          width: 100%;
        }

        .select-trigger-premium {
          display: flex;
          align-items: center;
          background: rgba(0, 0, 0, 0.15);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 12px 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          gap: 12px;
        }

        .select-trigger-premium:hover, .select-trigger-premium.active {
          border-color: var(--primary);
          background: rgba(0, 0, 0, 0.25);
          box-shadow: 0 0 0 4px var(--primary-soft);
        }

        .trigger-icon {
          color: var(--text-dimmed);
          width: 18px;
          height: 18px;
          flex-shrink: 0;
        }

        .trigger-text {
          flex: 1;
          font-size: 0.95rem;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .trigger-text.placeholder {
          color: var(--text-dimmed);
          opacity: 0.7;
        }

        .chevron {
          width: 14px;
          height: 14px;
          color: var(--text-dimmed);
          transition: transform 0.3s ease;
        }

        .chevron.rotate {
          transform: rotate(180deg);
        }

        .select-dropdown-premium {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-xl);
          z-index: 1000;
          overflow: hidden;
        }

        .animate-fade-in {
          animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .search-box-premium {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border);
          background: rgba(0,0,0,0.1);
        }

        .search-box-premium svg {
          width: 16px;
          height: 16px;
          color: var(--text-dimmed);
        }

        .dropdown-search-input {
          background: transparent;
          border: none;
          color: var(--text);
          font-size: 0.9rem;
          width: 100%;
          outline: none;
        }

        .options-list-premium {
          max-height: 250px;
          overflow-y: auto;
          padding: 6px;
        }

        .option-item-premium {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.95rem;
          color: var(--text);
          transition: all 0.15s ease;
          margin-bottom: 2px;
        }

        .option-item-premium:hover {
          background: var(--primary-soft);
          color: var(--primary);
        }

        .option-item-premium.selected {
          background: var(--primary);
          color: white;
        }

        .check-icon {
          width: 14px;
          height: 14px;
        }

        .no-options-premium {
          padding: 20px;
          text-align: center;
          font-size: 0.85rem;
          color: var(--text-dimmed);
        }

        /* Scrollbar styling */
        .options-list-premium::-webkit-scrollbar { width: 5px; }
        .options-list-premium::-webkit-scrollbar-track { background: transparent; }
        .options-list-premium::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
      `}</style>
    </div>
  )
}
