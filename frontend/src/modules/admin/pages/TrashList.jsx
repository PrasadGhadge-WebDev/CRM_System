import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import PageHeader from '../../../components/PageHeader.jsx'
import { trashApi } from '../../../services/trash.js'
import { Icon } from '../../../layouts/icons.jsx'
import { confirmToast } from '../../../utils/confirmToast.jsx'
import { useAuth } from '../../../context/AuthContext'
import { ROLE_GROUPS, hasRequiredRole } from '../../../utils/accessControl'

export default function TrashList() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadTrash()
  }, [])

  async function loadTrash() {
    try {
      setLoading(true)
      const res = await trashApi.list()
      setItems(res.items || [])
    } catch (e) {
      setError(e.message || 'Failed to load trash')
    } finally {
      setLoading(false)
    }
  }

  async function onRestore(item) {
    const confirmed = await confirmToast(`Restore "${item.title}"?`, {
      confirmLabel: 'Restore Now',
    })
    if (!confirmed) return

    try {
      await trashApi.restore(item.id)
      toast.success('Record restored successfully')
      setItems((prev) => prev.filter((x) => x.id !== item.id))
    } catch (e) {
      toast.error(e.message || 'Restore failed')
    }
  }

  async function onPermanentDelete(item) {
    const confirmed = await confirmToast(`Permanently delete "${item.title}"? This action cannot be undone.`, {
      confirmLabel: 'Delete Forever',
      type: 'danger',
    })
    if (!confirmed) return

    try {
      await trashApi.remove(item.id)
      toast.success('Record permanently removed')
      setItems((prev) => prev.filter((x) => x.id !== item.id))
    } catch (e) {
      toast.error(e.message || 'Delete failed')
    }
  }

  const isAdminOrManager = hasRequiredRole(user?.role, ROLE_GROUPS.admins)

  return (
    <div className="trash-module stack">
      <PageHeader title="Trash Management" subtitle="View and restore soft-deleted records" />

      {error ? <div className="alert error">{error}</div> : null}

      <div className="tm-container premium-glass">
        {loading ? (
          <div className="tm-loading">
            <div className="spinner"></div>
            <span>Loading trash records...</span>
          </div>
        ) : (
          <div className="tableWrap">
            <table className="tm-table">
              <thead>
                <tr>
                  <th>NAME / TITLE</th>
                  <th>TYPE</th>
                  <th className="mobile-hide">DELETED BY</th>
                  <th className="tablet-hide">DELETED DATE</th>
                  <th className="text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {items.length ? (
                  items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="tm-title">{item.title}</div>
                      </td>
                      <td>
                        <div className={`tm-badge ${item.entity_type}`}>
                          {item.entity_type.replace('-', ' ')}
                        </div>
                      </td>
                      <td className="mobile-hide">
                        <div className="tm-user">
                          <div className="tm-avatar">{item.deleted_by?.name?.charAt(0) || 'S'}</div>
                          <span>{item.deleted_by?.name || 'System'}</span>
                        </div>
                      </td>
                      <td className="tablet-hide">
                        <div className="tm-date">
                          {new Date(item.deleted_at).toLocaleDateString()}
                          <span className="tm-time">{new Date(item.deleted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>
                      <td className="text-right">
                        <div className="tm-actions">
                          <button
                            className="tm-btn restore"
                            onClick={() => onRestore(item)}
                            title="Restore Record"
                          >
                            <span className="tm-emoji">♻️</span>
                            <span className="hide-mobile">Restore</span>
                          </button>
                          {isAdminOrManager && (
                            <button
                              className="tm-btn delete"
                              onClick={() => onPermanentDelete(item)}
                              title="Delete Permanently"
                            >
                              <span className="tm-emoji">❌</span>
                              <span className="hide-mobile">Delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5">
                      <div className="tm-empty">
                        <Icon name="trash" size={48} />
                        <h3>Trash is empty</h3>
                        <p>Soft-deleted records will appear here for 30 days before being archived.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        .trash-module { padding: 20px 40px; }
        .premium-glass { 
          background: rgba(30, 41, 59, 0.4); 
          backdrop-filter: blur(12px); 
          border: 1px solid rgba(255,255,255,0.05); 
          border-radius: 16px;
          overflow: hidden;
        }
        
        .tm-table { width: 100%; border-collapse: collapse; }
        .tm-table th { padding: 20px; font-size: 0.82rem; font-weight: 800; text-transform: uppercase; color: #94a3b8; background: rgba(255,255,255,0.015); border-bottom: 2px solid rgba(255,255,255,0.05); letter-spacing: 0.05em; }
        .tm-table td { padding: 18px 20px; border-bottom: 1px solid rgba(255,255,255,0.02); vertical-align: middle; color: #cbd5e1; }
        
        .tm-title { font-weight: 700; color: #f8fafc; font-size: 0.95rem; }
        
        .tm-badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; }
        .tm-badge.lead { background: rgba(59, 130, 246, 0.1); color: #60a5fa; }
        .tm-badge.customer { background: rgba(34, 197, 94, 0.1); color: #4ade80; }
        .tm-badge.deal { background: rgba(168, 85, 247, 0.1); color: #c084fc; }
        
        .tm-user { display: flex; align-items: center; gap: 10px; }
        .tm-avatar { width: 24px; height: 24px; background: rgba(255,255,255,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 800; color: #94a3b8; }
        
        .tm-date { display: flex; flex-direction: column; font-size: 0.85rem; }
        .tm-time { font-size: 0.75rem; color: #64748b; }
        
        .tm-actions { display: flex; gap: 10px; justify-content: flex-end; }
        .tm-btn { border: 0; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: 0.2s; font-weight: 700; }
        .tm-btn.restore { background: rgba(59, 130, 246, 0.1); color: #60a5fa; padding: 8px 16px; }
        .tm-btn.restore:hover { background: #3b82f6; color: white; }
        .tm-btn.delete { background: rgba(239, 68, 68, 0.1); color: #f87171; padding: 8px; }
        .tm-btn.delete:hover { background: #ef4444; color: white; }
        
        .tm-empty { padding: 60px; text-align: center; color: #64748b; }
        .tm-empty h3 { color: #94a3b8; margin: 16px 0 8px; }
        .tm-empty p { font-size: 0.9rem; }
        
        .tm-loading { padding: 40px; text-align: center; color: #94a3b8; display: flex; flex-direction: column; align-items: center; gap: 12px; }
      `}</style>
    </div>
  )
}
