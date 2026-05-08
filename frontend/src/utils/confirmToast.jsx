import { toast } from 'react-toastify'
import { Icon } from '../layouts/icons.jsx'

export function confirmToast(message, options = {}) {
  const {
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    type = 'default',
    autoClose = false,
    closeOnClick = false,
    draggable = false,
  } = options

  return new Promise((resolve) => {
    let settled = false
    let toastId

    const finish = (value) => {
      if (settled) return
      settled = true
      toast.dismiss(toastId)
      resolve(value)
    }

    toastId = toast(
      ({ closeToast }) => (
        <div className="premium-confirm-toast">
          <div className="confirm-header">
            <div className={`confirm-icon-box ${type === 'primary' ? 'default' : type}`}>
              <Icon name={type === 'danger' ? 'trash' : 'alert'} size={20} />
            </div>
            <div className="confirm-content">
              <h4 className="confirm-title">
                {type === 'danger' ? 'Confirm Action' : 'Are you sure?'}
              </h4>
              <p className="confirm-message">{message}</p>
            </div>
          </div>
          
          <div className="confirm-actions">
            <button
              className="confirm-btn cancel"
              type="button"
              onClick={() => {
                finish(false)
                closeToast?.()
              }}
            >
              {cancelLabel}
            </button>
            <button
              className={`confirm-btn action ${type === 'primary' ? 'default' : type}`}
              type="button"
              onClick={() => {
                finish(true)
                closeToast?.()
              }}
            >
              {confirmLabel}
            </button>
          </div>

          <style>{`
            .premium-confirm-toast {
              padding: 12px;
              display: flex;
              flex-direction: column;
              gap: 16px;
              font-family: 'Manrope', sans-serif;
            }
            .confirm-header {
              display: flex;
              gap: 14px;
              align-items: flex-start;
            }
            .confirm-icon-box {
              width: 40px;
              height: 40px;
              border-radius: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
            }
            .confirm-icon-box.default {
              background: var(--primary-soft);
              color: var(--primary);
            }
            .confirm-icon-box.danger {
              background: rgba(239, 68, 68, 0.1);
              color: var(--danger);
            }
            .confirm-content {
              flex: 1;
            }
            .confirm-title {
              margin: 0 0 4px 0;
              font-size: 15px;
              font-weight: 800;
              color: var(--text);
              letter-spacing: -0.01em;
            }
            .confirm-message {
              margin: 0;
              font-size: 13px;
              line-height: 1.5;
              color: var(--text-muted);
              font-weight: 500;
            }
            .confirm-actions {
              display: flex;
              gap: 10px;
              justify-content: flex-end;
            }
            .confirm-btn {
              padding: 8px 16px;
              border-radius: 10px;
              font-size: 13px;
              font-weight: 700;
              cursor: pointer;
              transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
              border: 1px solid transparent;
            }
            .confirm-btn.cancel {
              background: var(--bg-surface);
              color: var(--text-muted);
              border-color: var(--border-subtle);
            }
            .confirm-btn.cancel:hover {
              background: var(--bg-hover);
              color: var(--text);
              border-color: var(--border);
              transform: translateY(-1px);
            }
            .confirm-btn.action.default {
              background: var(--primary);
              color: white;
            }
            .confirm-btn.action.default:hover {
              background: var(--primary-hover);
              box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.3);
              transform: translateY(-1px);
            }
            .confirm-btn.action.danger {
              background: var(--danger);
              color: white;
            }
            .confirm-btn.action.danger:hover {
              background: #dc2626;
              box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
              transform: translateY(-1px);
            }
            .confirm-btn:active {
              transform: translateY(0);
            }
          `}</style>
        </div>
      ),
      {
        autoClose,
        closeButton: false,
        closeOnClick,
        draggable,
        hideProgressBar: true,
        className: 'confirmToastShell',
        bodyClassName: 'confirmToastBody',
        style: {
          background: 'var(--bg-elevated)',
          color: 'var(--text)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-xl)',
          padding: '0',
          overflow: 'hidden',
          backdropFilter: 'blur(10px)',
        },
        onClose: () => {
          if (!settled) {
            settled = true
            resolve(false)
          }
        },
      },
    )
  })
}
