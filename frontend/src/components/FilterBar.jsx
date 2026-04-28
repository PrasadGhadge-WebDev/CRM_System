import { useState, useEffect } from 'react'
import { Icon } from '../layouts/icons.jsx'
import SearchableSelect from './SearchableSelect.jsx'

export default function FilterBar({
  onFilterChange,
  filters = {},
  options = {},
  sortFields = [],
  resetSort = { field: 'created_at', order: 'desc' },
  currentSort = { field: 'created_at', order: 'desc' },
  hideReset = false,
}) {
  // Local draft state — only committed on "Apply"
  const [draft, setDraft] = useState({ ...filters })

  // Keep draft in sync if parent resets filters externally
  useEffect(() => {
    setDraft({ ...filters })
  }, [filters.status, filters.source, filters.assignedTo, filters.startDate, filters.endDate, filters.followUpStatus, filters.priority])

  const handleDraftChange = (name, value) => {
    setDraft(prev => ({ ...prev, [name]: value }))
  }

  const handleApply = () => {
    onFilterChange({ ...filters, ...draft, page: 1 })
  }

  const handleReset = () => {
    const nextFilters = {}
    Object.entries(filters).forEach(([key, value]) => {
      if (key === 'page') { nextFilters[key] = 1; return }
      if (key === 'limit') { nextFilters[key] = value || 20; return }
      if (key === 'sortField') { nextFilters[key] = resetSort.field; return }
      if (key === 'sortOrder') { nextFilters[key] = resetSort.order; return }
      nextFilters[key] = typeof value === 'number' ? 0 : ''
    })
    setDraft(nextFilters)
    onFilterChange(nextFilters)
  }

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (!value || value === 'all') return false
    return !['page', 'limit', 'sortField', 'sortOrder', 'q', 'view'].includes(key)
  }).length

  const humanizeLabel = (value) =>
    String(value || '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase())

  const normalizeFieldConfig = (key, config) => {
    if (Array.isArray(config)) {
      return { fieldLabel: humanizeLabel(key), fieldType: 'select', fieldOpts: config }
    }
    if (config && typeof config === 'object') {
      const optionsArray = Array.isArray(config.options) ? config.options : []
      return {
        fieldLabel: String(config.label || humanizeLabel(key)),
        fieldType: String(config.type || (optionsArray.length ? 'select' : 'text')),
        fieldOpts: optionsArray,
      }
    }
    return { fieldLabel: humanizeLabel(key), fieldType: 'text', fieldOpts: [] }
  }

  const buildSelectOptions = (fieldLabel, fieldOpts) => {
    const allLabel = `All ${String(fieldLabel || '').replace(/\s+/g, ' ').trim() || 'Options'}`
    return [
      { value: '', label: allLabel },
      ...(fieldOpts || []).map((opt) => ({ value: String(opt.value), label: String(opt.label) })),
    ]
  }

  const entries = Object.entries(options)

  return (
    <div className="filterBar-v2">
      <div className="filterBar-v2-grid">
        {entries.map(([key, config]) => {
          const { fieldLabel, fieldType, fieldOpts } = normalizeFieldConfig(key, config)
          const safePlural = (str) => {
            const s = String(str || '').toLowerCase()
            if (s === 'status') return 'Statuses'
            if (s === 'assigned to') return 'Assigned To'
            return str + 's'
          }

          return (
            <div key={key} className="filterBar-v2-field">
              <label className="filterBar-v2-label">{fieldLabel}</label>
              {fieldType === 'select' ? (
                <SearchableSelect
                  options={buildSelectOptions(fieldLabel, fieldOpts)}
                  value={draft[key] || ''}
                  onChange={(e) => handleDraftChange(key, e.target.value)}
                  placeholder={`All ${safePlural(fieldLabel)}`}
                  icon="search"
                />
              ) : (
                <input
                  type={fieldType}
                  className="filterBar-v2-input"
                  value={draft[key] || ''}
                  onChange={(e) => handleDraftChange(key, e.target.value)}
                />
              )}
            </div>
          )
        })}
      </div>

      <div className="filterBar-v2-actions">
        {!hideReset && (
          <button className="filterBar-v2-reset" onClick={handleReset} title="Clear all filters">
            <Icon name="trash" />
            <span>Reset</span>
          </button>
        )}
        <button className="filterBar-v2-apply" onClick={handleApply}>
          {activeFilterCount > 0 && (
            <span className="filterBar-v2-badge">{activeFilterCount}</span>
          )}
          <Icon name="search" />
          <span>Apply Filters</span>
        </button>
      </div>

      <style>{`
        .filterBar-v2 {
          margin-top: 16px;
        }

        .filterBar-v2-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 14px;
          margin-bottom: 14px;
        }

        .filterBar-v2-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 0;
        }

        .filterBar-v2-label {
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          white-space: nowrap;
        }

        .filterBar-v2-input {
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 8px 12px;
          color: var(--text);
          font-size: 0.85rem;
          transition: all 0.2s ease;
          outline: none;
          width: 100%;
        }

        .filterBar-v2-input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px var(--primary-soft);
        }

        .filterBar-v2-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          padding-top: 10px;
          border-top: 1px solid var(--border);
        }

        .filterBar-v2-reset {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text-muted);
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .filterBar-v2-reset:hover {
          background: rgba(239, 68, 68, 0.08);
          color: var(--danger);
          border-color: var(--danger);
        }

        .filterBar-v2-reset svg {
          width: 14px;
          height: 14px;
        }

        .filterBar-v2-apply {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 20px;
          background: var(--primary);
          border: none;
          color: var(--text);
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 700;
          transition: all 0.2s ease;
          position: relative;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .filterBar-v2-apply:hover {
          background: var(--primary-hover);
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
        }

        .filterBar-v2-apply svg {
          width: 14px;
          height: 14px;
        }

        .filterBar-v2-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: white;
          color: var(--primary);
          border-radius: 999px;
          font-size: 0.7rem;
          font-weight: 800;
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
        }

        .filterBar-v2 .select-trigger-premium {
          min-height: 38px;
          border-radius: 8px;
          padding: 8px 12px;
          background: var(--bg-elevated);
        }

        .filterBar-v2 .select-dropdown-premium {
          min-width: 200px;
        }

        .filterBar-v2 .trigger-text {
          font-size: 0.85rem;
        }

        @media (max-width: 1024px) {
          .filterBar-v2-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 768px) {
          .filterBar-v2-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 480px) {
          .filterBar-v2-grid {
            grid-template-columns: 1fr;
          }
          .filterBar-v2-actions {
            flex-direction: column;
            align-items: stretch;
          }
        }

        /* Keep old classes for other usages */
        .filterBar.compact-row {
          margin-bottom: 24px;
          background: transparent;
          padding: 10px 0;
          border-radius: 0;
          border: none;
        }
        .filter-horizontal-grid {
          display: flex;
          align-items: flex-end;
          flex-wrap: wrap;
          gap: 20px;
        }
        .filter-field-inline {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
          min-width: 140px;
        }
        .filter-field-inline label {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        .input-sleek-small {
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 8px 12px;
          color: var(--text);
          font-size: 0.85rem;
          transition: all 0.2s ease;
          outline: none;
        }
        .input-sleek-small:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px var(--primary-soft);
        }
        .btn-reset-minimal {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          height: 38px;
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text-muted);
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 600;
          transition: all 0.2s ease;
        }
        .btn-reset-minimal:hover {
          background: var(--danger-soft);
          color: var(--danger);
          border-color: var(--danger);
        }
        .btn-reset-minimal svg { width: 14px; height: 14px; }
        .filter-field-inline .select-trigger-premium {
          min-height: 38px;
          border-radius: 8px;
          padding: 8px 12px;
          background: var(--bg-surface);
        }
        .filter-field-inline .select-dropdown-premium { min-width: 220px; }
        .filter-field-inline .trigger-text { font-size: 0.85rem; }
        .capitalize { text-transform: capitalize; }
      `}</style>
    </div>
  )
}
