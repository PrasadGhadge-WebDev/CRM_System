import { useState } from 'react'
import { FiLock, FiEye, FiEyeOff } from 'react-icons/fi'

export default function PasswordInput({ 
  value, 
  onChange, 
  onBlur,
  placeholder = '••••••••', 
  label, 
  error,
  autoComplete = 'new-password',
  name,
  id,
  className = '',
  wrapperClass = 'sheet-field'
}) {
  const [show, setShow] = useState(false)

  return (
    <div className={wrapperClass}>
      {label && <label htmlFor={id}>{label}</label>}
      <div className={`crm-input-group ${error ? 'error' : ''} password-input-wrap ${className}`}>
        <div className="input-icon-box"><FiLock /></div>
        <input
          id={id}
          name={name}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
        />
        <button 
          type="button"
          className="password-toggle-btn"
          onClick={() => setShow(!show)}
          tabIndex="-1"
        >
          {show ? <FiEyeOff /> : <FiEye />}
        </button>
      </div>
      {error && <span className={wrapperClass === 'auth-minimal-group' ? 'auth-minimal-field-error' : 'error-text'}>{error}</span>}

      <style>{`
        .password-input-wrap {
          position: relative;
        }
        .password-toggle-btn {
          background: none;
          border: none;
          color: var(--text-dimmed);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 15px;
          height: 100%;
          transition: all 0.2s;
          z-index: 10;
        }
        .password-toggle-btn:hover {
          color: var(--primary);
        }
        .password-input-wrap input {
          flex: 1;
        }
      `}</style>
    </div>
  )
}

