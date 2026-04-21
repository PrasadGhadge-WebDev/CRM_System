import { toast } from 'react-toastify'

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
        <div className="confirmToast">
          <div className="confirmToastMessage">{message}</div>
          <div className="confirmToastActions">
            <button
              className="btn small"
              type="button"
              onClick={() => {
                finish(false)
                closeToast?.()
              }}
            >
              {cancelLabel}
            </button>
            <button
              className={`btn small ${type === 'danger' ? 'danger' : 'primary'}`}
              type="button"
              onClick={() => {
                finish(true)
                closeToast?.()
              }}
            >
              {confirmLabel}
            </button>
          </div>
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
