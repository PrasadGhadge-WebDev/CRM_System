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
    } catch (e) { setError(e.message || 'Synchronization failed') } finally { setLoading(false) }
  }

  async function onRestore(item) {
    const confirmed = await confirmToast(`Reconstitute "${item.title}"?`, { confirmLabel: 'Authorize Restore' })
    if (!confirmed) return
    try {
      await trashApi.restore(item.id); toast.success('Record reconstituted successfully')
      setItems(prev => prev.filter(x => x.id !== item.id))
    } catch (e) { toast.error(e.message || 'Reconstitution failed') }
  }

  async function onPermanentDelete(item) {
    const confirmed = await confirmToast(`Permanently purge "${item.title}"? This action is IRREVERSIBLE.`, { confirmLabel: 'Authorize Purge', type: 'danger' })
    if (!confirmed) return
    try {
      await trashApi.remove(item.id); toast.success('Record purged from existence')
      setItems(prev => prev.filter(x => x.id !== item.id))
    } catch (e) { toast.error(e.message || 'Purge failed') }
  }

  const isAdminOrManager = hasRequiredRole(user?.role, ROLE_GROUPS.admins)

  return (
    <div className="stack">
      <section className="crm-fullscreen-shell">
        <PageHeader 
          title="Recycle Bin Intelligence" 
          description="Audit and recover soft-deleted records across the entire institutional ecosystem." 
          backTo="/"
        />

        {error && <div className="alert error glass-alert">{error}</div>}

        {loading ? (
          <div className="leadsLoadingState" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border-subtle)', borderRadius: '32px', minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
            <div className="spinner-medium" />
            <span className="muted">Synchronizing Recycle Bin...</span>
          </div>
        ) : (
          <div className="crm-table-wrap shadow-soft">
            <div className="crm-table-scroll">
              <table className="crm-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: '220px' }}>NAME / IDENTITY</th>
                    <th style={{ width: '150px' }}>ENTITY TYPE</th>
                    <th style={{ width: '180px' }} className="tablet-hide">REMOVED BY</th>
                    <th style={{ width: '180px' }} className="tablet-hide">REMOVAL TIMESTAMP</th>
                    <th className="text-right" style={{ width: '240px' }}>OPS</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length > 0 ? (
                    items.map((item) => (
                      <tr key={item.id} className="crm-table-row">
                        <td>
                          <div className="stack gap-4">
                            <div className="font-bold" style={{ color: 'var(--text)' }}>{item.title}</div>
                            <div className="text-xs muted font-mono uppercase">{item.id}</div>
                          </div>
                        </td>
                        <td>
                          <span className="crm-status-pill info">
                            {item.entity_type.replace('-', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="tablet-hide">
                          <div className="crm-user-mention">
                            <div className="crm-user-dot" />
                            <span>{item.deleted_by?.name || 'System Authority'}</span>
                          </div>
                        </td>
                        <td className="tablet-hide">
                          <div className="stack gap-2">
                            <span className="font-numeric" style={{ color: 'var(--text)', fontWeight: 700 }}>{new Date(item.deleted_at).toLocaleDateString()}</span>
                            <span className="text-xs muted">{new Date(item.deleted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </td>
                        <td className="text-right">
                          <div className="crm-action-group">
                            <button className="btn-premium action-vibrant" onClick={() => onRestore(item)} title="Restore" style={{ padding: '8px 16px', borderRadius: '10px' }}>
                               <Icon name="check" size={14} />
                               <span>Restore</span>
                            </button>
                            {isAdminOrManager && (
                              <button className="crm-action-btn danger" onClick={() => onPermanentDelete(item)} title="Purge Permanently">
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
                        <div className="emptyState" style={{ padding: '80px 0', textAlign: 'center' }}>
                          <h3>Recycle bin is empty</h3>
                          <p className="muted">Soft-deleted intelligence will be available here for recovery.</p>
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
    </div>
  )
}
