import React, { useEffect } from 'react'
import { Icon } from '../layouts/icons.jsx'

export default function Modal({ isOpen, onClose, children, title }) {
  // Disable body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalContent" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '20px 32px',
          borderBottom: '1px solid var(--border-color)'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>{title}</h2>
          <button 
            className="iconBtn" 
            onClick={onClose} 
            style={{ padding: '8px', borderRadius: '50%' }}
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <div className="modalBody" style={{ padding: '0 0 32px 0' }}>
          {children}
        </div>
      </div>

      <style>{`
        .modalBody .pageContainer {
           padding-top: 20px;
        }
        .modalBody .simple-form-card {
           max-width: 100%;
           border: none;
           box-shadow: none;
           padding: 0 32px;
        }
      `}</style>
    </div>
  )
}
