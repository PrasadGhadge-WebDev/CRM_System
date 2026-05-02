import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../../../layouts/icons.jsx'

export default function DeleteConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Delete Lead",
  message = "Are you sure you want to delete this lead?",
  isAdmin = false 
}) {
  const [deleteType, setDeleteType] = useState('soft') // 'soft' or 'hard'

  if (!isOpen) return null

  return createPortal(
    <div className="crm-modal-portal-overlay" style={{ zindex: 1000001 }} onClick={onClose}>
      <div className="crm-modal-sheet" style={{ maxWidth: '480px', borderRadius: '32px' }} onClick={e => e.stopPropagation()}>
        <div className="crm-modal-sheet-header" style={{ padding: '24px 32px' }}>
          <div className="sheet-title-area">
            <h2 className="sheet-title" style={{ color: '#ef4444' }}>{title}</h2>
            <p className="sheet-subtitle">{message}</p>
          </div>
          <button className="crm-btn-premium glass" onClick={onClose} style={{ padding: '8px' }}>
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="crm-modal-sheet-body" style={{ background: 'white' }}>
          <div className="sheet-content-container" style={{ padding: '24px 32px' }}>
            <div className="delete-options-group">
              <label className={`delete-option-card ${deleteType === 'soft' ? 'active' : ''}`}>
                <input 
                  type="radio" 
                  name="deleteType" 
                  value="soft" 
                  checked={deleteType === 'soft'} 
                  onChange={() => setDeleteType('soft')}
                />
                <div className="option-icon trash">
                  <Icon name="trash" size={20} />
                </div>
                <div className="option-info">
                  <span className="option-title">Move to Trash</span>
                  <span className="option-desc">Can be recovered within 30 days</span>
                </div>
                <div className="check-mark">
                   <Icon name="check" size={14} />
                </div>
              </label>

              {isAdmin && (
                <label className={`delete-option-card hard ${deleteType === 'hard' ? 'active' : ''}`}>
                  <input 
                    type="radio" 
                    name="deleteType" 
                    value="hard" 
                    checked={deleteType === 'hard'} 
                    onChange={() => setDeleteType('hard')}
                  />
                  <div className="option-icon alert">
                    <Icon name="alert-triangle" size={20} />
                  </div>
                  <div className="option-info">
                    <span className="option-title">Permanently Delete</span>
                    <span className="option-desc">Irreversible. Data will be lost forever</span>
                  </div>
                  <div className="check-mark">
                     <Icon name="check" size={14} />
                  </div>
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="crm-modal-sheet-footer" style={{ padding: '20px 32px' }}>
           <button className="crm-btn-premium glass" onClick={onClose} style={{ flex: 1 }}>
             Cancel
           </button>
           <button 
             className={`crm-btn-premium vibrant ${deleteType === 'hard' ? 'danger' : ''}`} 
             style={{ flex: 1, background: deleteType === 'hard' ? '#ef4444' : '#64748b' }}
             onClick={() => onConfirm(deleteType === 'hard')}
           >
             {deleteType === 'hard' ? 'Delete Permanently' : 'Move to Trash'}
           </button>
        </div>
      </div>

      <style>{`
        .delete-options-group { display: flex; flex-direction: column; gap: 12px; }
        .delete-option-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          border: 2px solid #f1f5f9;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }
        .delete-option-card input { display: none; }
        .delete-option-card:hover { border-color: #e2e8f0; background: #f8fafc; }
        .delete-option-card.active { border-color: #64748b; background: #f8fafc; }
        .delete-option-card.hard.active { border-color: #ef4444; background: #fff1f2; }

        .option-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .option-icon.trash { background: #f1f5f9; color: #64748b; }
        .option-icon.alert { background: #fee2e2; color: #ef4444; }

        .option-info { display: flex; flex-direction: column; gap: 2px; flex: 1; }
        .option-title { font-size: 0.95rem; font-weight: 800; color: #1e293b; }
        .option-desc { font-size: 0.75rem; color: #64748b; font-weight: 500; }

        .check-mark {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #64748b;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transform: scale(0.5);
          transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .delete-option-card.active .check-mark { opacity: 1; transform: scale(1); }
        .delete-option-card.hard.active .check-mark { background: #ef4444; }

        .crm-btn-premium.danger:hover { background: #dc2626 !important; transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(239, 68, 68, 0.3); }
      `}</style>
    </div>,
    document.body
  )
}
