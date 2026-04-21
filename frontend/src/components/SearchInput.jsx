import { Icon } from '../layouts/icons.jsx'

export default function SearchInput({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div className="search-wrapper">
      <div className="search-icon">
        <Icon name="search" />
      </div>
      <input
        type="text"
        className="input search-input"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
      <style>{`
        .search-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }
        .search-icon {
          position: absolute;
          left: 14px;
          color: var(--text-dimmed);
          display: flex;
          align-items: center;
          pointer-events: none;
        }
        .search-input {
          padding-left: 44px !important;
        }
      `}</style>
    </div>
  )
}
