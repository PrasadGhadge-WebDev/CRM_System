import React from 'react'
import Modal from './Modal.jsx'
import { Icon } from '../layouts/icons.jsx'

/**
 * ConfirmationModal Component
 * A standardized modal for confirming destructive or significant actions.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {function} props.onClose - Function to call on cancel/close
 * @param {function} props.onConfirm - Function to call on confirmation
 * @param {string} props.title - Modal title
 * @param {string} props.message - Descriptive message
 * @param {string} props.type - 'danger' | 'warning' | 'primary'
 * @param {string} props.confirmLabel - Label for the confirm button
 * @param {boolean} props.loading - Loading state for the confirm button
 */
export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  type = 'primary',
  confirmLabel = 'Confirm',
  loading = false
}) {
  const isDanger = type === 'danger'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="conf-modal-content">
        <div className={`conf-modal-icon ${type}`}>
          <Icon name={isDanger ? 'trash' : 'alertCircle'} size={32} />
        </div>
        
        <p className="conf-modal-msg">{message}</p>
        
        <div className="conf-modal-actions row reverse">
          <button 
            className={`btn ${isDanger ? 'danger' : 'primary'}`} 
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
          <button 
            className="btn secondary" 
            disabled={loading}
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>

      <style>{`
        .conf-modal-content {
          padding: 10px 32px 0;
          text-align: center;
        }
        
        .conf-modal-icon {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
        }
        
        .conf-modal-icon.danger {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }
        
        .conf-modal-icon.primary {
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
        }
        
        .conf-modal-icon.warning {
          background: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
        }
        
        .conf-modal-msg {
          color: var(--text-muted);
          font-size: 0.95rem;
          line-height: 1.6;
          margin-bottom: 30px;
        }
        
        .conf-modal-actions {
          gap: 12px;
          justify-content: center;
        }
        
        .conf-modal-actions.reverse {
          flex-direction: row-reverse;
        }
      `}</style>
    </Modal>
  )
}
