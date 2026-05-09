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
  const [dateRangeType, setDateRangeType] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => { loadTrash() }, [dateRangeType, startDate, endDate])

  async function loadTrash() {
    try {
      setLoading(true)
      
      let sDate = startDate
      let eDate = endDate
      const now = new Date()
      now.setHours(0,0,0,0)

      if (dateRangeType === 'today') {
        sDate = now.toISOString()
        eDate = new Date(new Date().setHours(23,59,59,999)).toISOString()
      } else if (dateRangeType === 'yesterday') {
        const y = new Date(now)
        y.setDate(y.getDate() - 1)
        sDate = y.toISOString()
        const yEnd = new Date(y)
        yEnd.setHours(23,59,59,999)
        eDate = yEnd.toISOString()
      } else if (dateRangeType === 'week') {
        const w = new Date(now)
        w.setDate(w.getDate() - 7)
        sDate = w.toISOString()
      } else if (dateRangeType === 'month') {
        const m = new Date(now)
        m.setMonth(m.getMonth() - 1)
        sDate = m.toISOString()
      }

      const res = await trashApi.list({ startDate: sDate, endDate: eDate })
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
        <div className="users-page-header">
          <h1 className="users-title">Recycle Bin</h1>
          <p className="users-subtitle">Review and restore recently deleted records</p>
        </div>

        <div className="unified-action-bar" style={{ marginBottom: '20px' }}>
          <div className="search-filter-group" style={{ justifyContent: 'flex-start' }}>
            <select 
              className="crm-input filter-select date-preset-select" 
              value={dateRangeType} 
              onChange={(e) => { setDateRangeType(e.target.value) }}
            >
              <option value="all">Date: All</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>

            {dateRangeType === 'custom' && (
              <div className="flex items-center gap-4 animate-fade-in">
                <input
                  type="date"
                  className="crm-input date-mini"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <span className="muted" style={{ fontSize: '0.7rem' }}>to</span>
                <input
                  type="date"
                  className="crm-input date-mini"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            )}

            {dateRangeType !== 'all' && (
              <button 
                className="btn-premium-mini reset-btn"
                onClick={() => {
                  setDateRangeType('all'); setStartDate(''); setEndDate('');
                }}
                style={{ height: '42px', width: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                title="Reset Filters"
              >
                <Icon name="refresh" size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="crm-stats-bar-compact">
          <div className="stat-pill-mini">
            <span className="stat-pill-label">TOTAL REMOVED</span>
            <span className="stat-pill-value inactive">{items.length}</span>
          </div>
          <div className="stat-pill-mini">
            <span className="stat-pill-label">PENDING PURGE</span>
            <span className="stat-pill-value active">{items.length}</span>
          </div>
          <div className="stat-pill-mini">
            <span className="stat-pill-label">AUTO-EXPIRE</span>
            <span className="stat-pill-value total">30d</span>
          </div>
        </div>

        {error && <div className="alert error glass-alert">{error}</div>}

        {loading ? (
          <div className="trash-loading-state">
            <div className="spinner-medium" />
            <span className="muted">Loading deleted records...</span>
          </div>
        ) : (
          <div className="crm-table-wrap shadow-soft" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="crm-table-scroll">
              <table className="crm-table">
                <thead style={{ background: 'var(--bg-elevated)' }}>
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
         .users-page-header { margin-bottom: 8px; }
         .users-title { font-size: 1.3rem; font-weight: 800; color: var(--text); margin-bottom: 2px; }
         .users-subtitle { font-size: 0.85rem; color: var(--text-dimmed); font-weight: 500; }

         .crm-stats-bar-compact { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 12px; justify-content: space-between; }
         .stat-pill-mini { --stat-accent: var(--card-accent); background: color-mix(in srgb, var(--bg-card) 88%, var(--bg-surface) 12%); border: 1px solid var(--border-strong); padding: 14px 18px; border-radius: 16px; display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 130px; box-shadow: inset 4px 0 0 var(--stat-accent), 0 10px 24px rgba(var(--text-rgb), 0.06); transition: all 0.25s ease; }
         .crm-stats-bar-compact .stat-pill-mini:nth-child(1) { --stat-accent: #ef4444; }
         .crm-stats-bar-compact .stat-pill-mini:nth-child(2) { --stat-accent: #f59e0b; }
         .crm-stats-bar-compact .stat-pill-mini:nth-child(3) { --stat-accent: #8b5cf6; }
         .stat-pill-mini:hover { transform: translateY(-2px); border-color: var(--stat-accent); box-shadow: inset 4px 0 0 var(--stat-accent), 0 14px 30px color-mix(in srgb, var(--stat-accent) 20%, rgba(var(--text-rgb), 0.08)); }
         .stat-pill-label { font-size: 11px; font-weight: 800; color: var(--text-dimmed); text-transform: uppercase; letter-spacing: 0.08em; }
         .stat-pill-value { font-size: 20px; font-weight: 900; }
         .stat-pill-value.total { color: var(--text); }
         .stat-pill-value.active { color: var(--success); }
         .stat-pill-value.inactive { color: var(--danger); }
         .stat-pill-value.pending { color: var(--warning); }

         .crm-table th { padding: 12px 16px !important; border-bottom: 2px solid var(--border-strong) !important; color: var(--text-dimmed) !important; font-weight: 800 !important; font-size: 0.7rem !important; }
         .crm-table td { padding: 10px 16px !important; border-bottom: 1px solid var(--border-strong) !important; }
         
         @media (max-width: 1000px) {
            .crm-stats-bar-compact { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
            .stat-pill-mini { min-width: 0; padding: 10px; }
            .stat-pill-value { font-size: 1.1rem; }
         }

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
          background: var(--bg-hover);
          border-radius: 8px;
          font-size: 0.7rem;
          font-weight: 800;
          color: var(--text-dimmed);
          letter-spacing: 0.05em;
          text-transform: uppercase;
          border: 1px solid var(--border);
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
        .modern-action-btn:hover { background: var(--bg-elevated); color: var(--primary); border-color: var(--primary); transform: translateY(-2px); box-shadow: var(--shadow-sm); }
        .modern-action-btn.danger:hover { background: var(--bg-hover); color: var(--danger); border-color: var(--danger); box-shadow: var(--shadow-sm); }
      `}</style>
    </div>
  )
}
