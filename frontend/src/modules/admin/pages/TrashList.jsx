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

  useEffect(() => { loadTrash() }, [])

  async function loadTrash() {
    try {
      setLoading(true)
      const res = await trashApi.list()
      setItems(res.items || [])
    } catch (e) { setError(e.message || 'Failed to load trash') } finally { setLoading(false) }
  }

  async function onRestore(item) {
    const confirmed = await confirmToast(`Restore "${item.title}"?`, { confirmLabel: 'Restore Now' })
    if (!confirmed) return
    try {
      await trashApi.restore(item.id); toast.success('Record restored successfully')
      setItems(prev => prev.filter(x => x.id !== item.id))
    } catch (e) { toast.error(e.message || 'Restoration failed') }
  }

  async function onPermanentDelete(item) {
    const confirmed = await confirmToast(`Permanently delete "${item.title}"? This cannot be undone.`, { confirmLabel: 'Delete Forever', type: 'danger' })
    if (!confirmed) return
    try {
      await trashApi.remove(item.id); toast.success('Record deleted forever')
      setItems(prev => prev.filter(x => x.id !== item.id))
    } catch (e) { toast.error(e.message || 'Deletion failed') }
  }

  const isAdminOrManager = hasRequiredRole(user?.role, ROLE_GROUPS.admins)

  return (
    <div className="stack">
      <section className="crm-fullscreen-shell">
        <PageHeader 
          title="Trash" 
          description="View and restore recently deleted records from your CRM." 
          backTo="/"
        />

        {error && <div className="alert error glass-alert">{error}</div>}

        {loading ? (
          <div className="trash-loading-state">
            <div className="spinner-medium" />
            <span className="muted">Loading deleted records...</span>
          </div>
        ) : (
          <div className="crm-table-wrap shadow-soft" style={{ background: 'white', border: '1px solid #eef2f6' }}>
            <div className="crm-table-scroll">
              <table className="crm-table">
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    <th style={{ width: '35%' }}>NAME / IDENTITY</th>
                    <th style={{ width: '15%' }}>TYPE</th>
                    <th style={{ width: '20%' }} className="tablet-hide">REMOVED BY</th>
                    <th style={{ width: '20%' }} className="tablet-hide">DATE REMOVED</th>
                    <th className="text-right" style={{ width: '10%' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length > 0 ? (
                    items.map((item) => (
                      <tr key={item.id} className="crm-table-row">
                        <td>
                          <div className="trash-identity">
                            <div className="trash-title">{item.title}</div>
                            <div className="trash-id">{item.id}</div>
                          </div>
                        </td>
                        <td>
                          <span className="trash-type-badge">
                            {item.entity_type.replace('-', ' ')}
                          </span>
                        </td>
                        <td className="tablet-hide">
                          <div className="trash-user">
                            <div className="user-avatar-mini">
                              {(item.deleted_by?.name || 'S').charAt(0).toUpperCase()}
                            </div>
                            <span>{item.deleted_by?.name || 'System'}</span>
                          </div>
                        </td>
                        <td className="tablet-hide">
                          <div className="trash-timestamp">
                            <span className="timestamp-date">{new Date(item.deleted_at).toLocaleDateString()}</span>
                            <span className="timestamp-time">{new Date(item.deleted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </td>
                        <td className="text-right">
                          <div className="crm-action-group">
                            <button className="modern-action-btn" onClick={() => onRestore(item)} title="Restore">
                               <Icon name="check" size={14} />
                            </button>
                            {isAdminOrManager && (
                              <button className="modern-action-btn danger" onClick={() => onPermanentDelete(item)} title="Delete Forever">
                                <Icon name="trash" size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5">
                        <div className="emptyState" style={{ padding: '100px 0', textAlign: 'center' }}>
                          <Icon name="trash" size={48} style={{ opacity: 0.1, marginBottom: '16px' }} />
                          <h3>Trash is empty</h3>
                          <p className="muted">Deleted records will appear here for 30 days before being removed forever.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <style>{`
        .trash-loading-state {
          background: rgba(255,255,255,0.01);
          border: 1px dashed var(--border-subtle);
          border-radius: 32px;
          min-height: 400px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 20px;
        }

        .trash-identity { display: flex; flex-direction: column; gap: 2px; }
        .trash-title { color: var(--text); font-weight: 700; font-size: 0.95rem; }
        .trash-id { color: var(--text-dimmed); font-size: 0.7rem; font-family: monospace; text-transform: uppercase; }

        .trash-type-badge {
          padding: 4px 10px;
          background: #f1f5f9;
          border-radius: 8px;
          font-size: 0.7rem;
          font-weight: 800;
          color: #475569;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .trash-user { display: flex; align-items: center; gap: 10px; color: var(--text); font-weight: 600; font-size: 0.85rem; }
        .user-avatar-mini {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          background: var(--primary-soft);
          color: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          font-weight: 800;
        }

        .trash-timestamp { display: flex; flex-direction: column; gap: 2px; }
        .timestamp-date { color: var(--text); font-size: 0.85rem; font-weight: 700; }
        .timestamp-time { color: var(--text-dimmed); font-size: 0.7rem; }

        .modern-action-btn { 
          width: 38px; 
          height: 38px; 
          border-radius: 12px; 
          border: 1px solid var(--border-subtle); 
          background: var(--bg-surface); 
          color: var(--text-muted); 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); 
          cursor: pointer; 
        }
        .modern-action-btn:hover { background: white; color: var(--primary); border-color: var(--primary); transform: translateY(-2px); box-shadow: 0 4px 12px var(--primary-soft); }
        .modern-action-btn.danger:hover { background: #fff1f2; color: var(--danger); border-color: var(--danger); box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15); }
      `}</style>
    </div>
  )
}

