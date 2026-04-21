import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../../../layouts/icons.jsx'
import { toast } from 'react-toastify'
import { leadsApi } from '../../../services/leads.js'
import StatusBadge from '../../../components/StatusBadge.jsx'
import ConfirmationModal from '../../../components/ConfirmationModal.jsx'
import FollowupModal from '../../../components/FollowupModal.jsx'

/* ─────────────────────────────────────────────
   Formatters
───────────────────────────────────────────── */
const formatDate = (val) => {
  if (!val) return '—'
  return new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
}

/* ─────────────────────────────────────────────
   LeadsTable Component
───────────────────────────────────────────── */
export default function LeadsTable({ 
  leads = [], 
  loading, 
  onRefresh,
  filters,
  onFilterChange,
  statusOptions = [],
  employeeOptions = [],
  userRole
}) {
  const navigate = useNavigate()
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isSingleDelete, setIsSingleDelete] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  const [isFollowupModalOpen, setIsFollowupModalOpen] = useState(false)
  const [followupLead, setFollowupLead] = useState(null)

  // ── Selection Logic ──
  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  const toggleAll = () => {
    if (selectedIds.length === leads.length) setSelectedIds([])
    else setSelectedIds(leads.map(l => l.id || l._id))
  }

  // ── Actions ──
  const handleDelete = (id) => {
    if (userRole !== 'Admin') return toast.error('Only Admins can delete leads')
    setDeleteId(id)
    setIsSingleDelete(true)
    setIsDeleteModalOpen(true)
  }

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return
    if (userRole !== 'Admin') return toast.error('Only Admins can delete leads')
    setIsSingleDelete(false)
    setIsDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    try {
      setBulkActionLoading(true)
      if (isSingleDelete) {
        await leadsApi.remove(deleteId)
        toast.success('Record moved to Trash successfully')
      } else {
        await leadsApi.bulkRemove(selectedIds)
        toast.success('Records moved to Trash successfully')
        setSelectedIds([])
      }
      onRefresh?.()
    } catch { 
      toast.error('Delete failed') 
    } finally { 
      setBulkActionLoading(false)
      setIsDeleteModalOpen(false)
      setIsSingleDelete(false)
      setDeleteId(null)
    }
  }

  const handleFollowUp = (lead) => {
    setFollowupLead(lead)
    setIsFollowupModalOpen(true)
  }

  const getStatusColor = (status) => {
    const s = status?.toLowerCase()
    if (s === 'new') return '#3b82f6' // Blue
    if (s === 'contacted') return '#fbbf24' // Yellow
    if (s === 'converted' || s === 'won') return '#22c55e' // Green
    return statusOptions.find(opt => opt.value === status)?.color || '#64748b'
  }

  const getFollowupDueStatus = (dateStr) => {
    if (!dateStr) return 'none'

    const due = new Date(dateStr)
    if (Number.isNaN(due.getTime())) return 'none'
    due.setHours(0, 0, 0, 0)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (due < today) return 'overdue'
    if (due >= today && due < tomorrow) return 'today'
    return 'future'
  }

  const handleBulkUpdate = async (update) => {
    try {
      setBulkActionLoading(true)
      await leadsApi.bulkUpdate(selectedIds, update)
      toast.success('Leads updated')
      setSelectedIds([])
      onRefresh?.()
    } catch { toast.error('Bulk update failed') }
    finally { setBulkActionLoading(false) }
  }

  const handleSort = (field) => {
    const order = filters.sortField === field && filters.sortOrder === 'asc' ? 'desc' : 'asc'
    onFilterChange?.({ sortField: field, sortOrder: order })
  }

  const handleQuickAction = async (id, status) => {
    try {
      await leadsApi.updateStatus(id, status)
      toast.success(`Lead marked as ${status}`)
      onRefresh?.()
    } catch {
      toast.error('Quick action failed')
    }
  }

  // ── Render Helpers ──
  const getPriorityColor = (p) => {
    if (p === 'Hot') return '#ef4444' // Red
    if (p === 'Warm') return '#f59e0b' // Orange/Amber
    return '#3b82f6' // Blue (Cold)
  }

  if (loading && leads.length === 0) {
    return (
      <div className="lt-loading-shimmer">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="lt-shimmer-row" />
        ))}
      </div>
    )
  }

  return (
    <div className="lt-wrapper">
      
      {/* ── Bulk Actions Floating Bar ── */}
      {selectedIds.length > 0 && (
        <div className="lt-bulk-bar">
          <div className="lt-bulk-info">
            <span className="lt-bulk-count">{selectedIds.length}</span>
            <span className="lt-bulk-text">records selected</span>
          </div>
          <div className="lt-bulk-btns">
            <div className="lt-bulk-group">
              <label>Set Status:</label>
              <select onChange={(e) => handleBulkUpdate({ status: e.target.value })} defaultValue="">
                <option value="" disabled>Select...</option>
                {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            {userRole !== 'Employee' && (
              <div className="lt-bulk-group">
                <label>Assign To:</label>
                <select onChange={(e) => handleBulkUpdate({ assignedTo: e.target.value })} defaultValue="">
                  <option value="" disabled>Select...</option>
                  {employeeOptions.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
            )}
            <button className="lt-bulk-del" onClick={handleBulkDelete} disabled={bulkActionLoading}>
              <Icon name="trash" size={14} /> Delete
            </button>
            <button className="lt-bulk-esc" onClick={() => setSelectedIds([])}>✕</button>
          </div>
        </div>
      )}

      {/* ── Table View (Desktop) ── */}
      <div className="lt-table-container">
        <table className="lt-table">
          <thead>
            <tr>
              <th className="lt-w-cb">
                <input type="checkbox" checked={selectedIds.length === leads.length && leads.length > 0} onChange={toggleAll} />
              </th>
              <th className="lt-sortable" onClick={() => handleSort('name')}>Lead</th>
              <th className="lt-sortable" onClick={() => handleSort('status')}>Status</th>
              <th className="lt-sortable" onClick={() => handleSort('priority')}>Priority</th>
              <th className="lt-sortable lt-hide-tablet" onClick={() => handleSort('assignedTo')}>Owner</th>
              <th className="lt-sortable lt-hide-tablet" onClick={() => handleSort('nextFollowupDate')}>Next Follow-up</th>
              <th className="lt-text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {leads.map(l => (
              <tr 
                key={l._id || l.id} 
                className={`lt-row ${selectedIds.includes(l.id || l._id) ? 'lt-row-sel' : ''}`}
                onClick={(e) => {
                  if (e.target.closest('button') || e.target.closest('input')) return
                  navigate(`/leads/${l.id || l._id}`)
                }}
              >
                <td>
                  <input 
                    type="checkbox" 
                    checked={selectedIds.includes(l.id || l._id)} 
                    onChange={(e) => { e.stopPropagation(); toggleSelect(l.id || l._id); }} 
                  />
                </td>
                <td>
                  <div className="lt-lead-cell">
                    <div className="lt-lead-av" style={{ background: `${getStatusColor(l.status)}15`, color: getStatusColor(l.status), borderColor: `${getStatusColor(l.status)}30` }}>
                      {(l.name || 'L').charAt(0).toUpperCase()}
                    </div>
                    <div className="lt-lead-info">
                      <div className="lt-lead-name">{l.name}</div>
                      <div className="lt-lead-sub">{l.phone || l.email || 'No contact info'}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <StatusBadge 
                    status={l.status} 
                    color={getStatusColor(l.status)} 
                  />
                </td>
                <td>
                  <span className="lt-priority-tag" style={{ color: getPriorityColor(l.priority), background: `${getPriorityColor(l.priority)}10`, borderColor: `${getPriorityColor(l.priority)}25` }}>
                    {l.priority || 'Warm'}
                  </span>
                </td>
                <td className="lt-hide-tablet">
                  <div className="lt-owner-cell">
                    <span className="lt-assignee">{l.assignedTo?.name || 'Unassigned'}</span>
                    <span className="lt-src-tag">{l.source || 'Direct'}</span>
                  </div>
                </td>
                <td className="lt-hide-tablet">
                  <div className={`lt-follow-status lt-fs-${getFollowupDueStatus(l.nextFollowupDate)}`}>
                    <div className="lt-fs-icon">
                      {l.followupHistory?.[0]?.followupType === 'Meeting' ? <Icon name="reports" size={12} /> : <Icon name="phone" size={12} />}
                    </div>
                    <div className="lt-fs-text">
                      <div className="lt-fs-label">
                        {getFollowupDueStatus(l.nextFollowupDate) === 'overdue' ? 'Overdue' : getFollowupDueStatus(l.nextFollowupDate) === 'today' ? 'Due Today' : 'Scheduled'}
                      </div>
                      <div className="lt-fs-date">{formatDate(l.nextFollowupDate)}</div>
                    </div>
                  </div>
                </td>
                <td className="lt-text-right">
                  <div className="lt-actions">
                    {String(l.status || '').toLowerCase() === 'new' && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleQuickAction(l.id || l._id, 'Contacted'); }} 
                        title="Mark as Contacted" 
                        className="lt-act-quick"
                      >
                        <Icon name="check" size={14} />
                      </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); navigate(`/leads/${l.id || l._id}/edit`); }} title="Edit Details" className="lt-act-edit"><Icon name="edit" size={14} /></button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleFollowUp(l); }} 
                      title="Follow-up Management" 
                      className="lt-act-call"
                      style={{ borderColor: getFollowupDueStatus(l.nextFollowupDate) === 'overdue' ? '#ef4444' : '' }}
                    >
                      <Icon name="phone" size={14} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(l.id || l._id); }} title="Delete" className="lt-act-del"><Icon name="trash" size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {leads.length === 0 && !loading && (
              <tr><td colSpan={7} className="lt-empty">No leads found matching current filters</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Card View (Mobile) ── */}
      <div className="lt-card-container">
        {leads.map(l => (
          <div key={l._id || l.id} className={`lt-card ${selectedIds.includes(l.id || l._id) ? 'lt-row-sel' : ''}`} onClick={() => navigate(`/leads/${l.id || l._id}`)}>
            <div className="lt-card-top">
              <input type="checkbox" checked={selectedIds.includes(l.id || l._id)} onChange={(e) => { e.stopPropagation(); toggleSelect(l.id || l._id); }} />
              <span className="lt-priority-tag-mini" style={{ color: getPriorityColor(l.priority) }}>● {l.priority}</span>
              <div className="lt-card-actions">
                <button onClick={(e) => { e.stopPropagation(); navigate(`/leads/${l.id || l._id}/edit`); }}><Icon name="edit" size={14} /></button>
                <button onClick={(e) => { e.stopPropagation(); handleFollowUp(l); }}><Icon name="phone" size={14} /></button>
              </div>
            </div>
            <div className="lt-card-main">
              <div className="lt-card-head">
                <div className="lt-card-av" style={{ background: getStatusColor(l.status) }}>{(l.name || 'L').charAt(0).toUpperCase()}</div>
                <div>
                  <div className="lt-card-name">{l.name}</div>
                  <div className="lt-card-sub">{l.phone || 'No phone'}</div>
                </div>
              </div>
              <div className="lt-card-row">
                <StatusBadge status={l.status} color={getStatusColor(l.status)} />
                <div className={`lt-date-mini lt-date-${getFollowupDueStatus(l.nextFollowupDate)}`}>
                  {getFollowupDueStatus(l.nextFollowupDate) === 'overdue' ? '❗ Overdue' : formatDate(l.nextFollowupDate)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Modals ── */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => { setIsDeleteModalOpen(false); setIsSingleDelete(false); }}
        onConfirm={confirmDelete}
        loading={bulkActionLoading}
        type="danger"
        title="Move to Trash"
        message={isSingleDelete 
          ? "Are you sure you want to move this lead to the trash?"
          : `Are you sure you want to move ${selectedIds.length} leads to the trash?`}
        confirmLabel="Move to Trash"
      />

      <FollowupModal
        isOpen={isFollowupModalOpen}
        onClose={() => setIsFollowupModalOpen(false)}
        lead={followupLead}
        onSave={() => {
          onRefresh?.()
        }}
      />

      <style>{`
        .lt-wrapper { position: relative; width: 100%; }

        /* Shimmer Loading */
        .lt-loading-shimmer { display: flex; flex-direction: column; gap: 10px; }
        .lt-shimmer-row { height: 60px; background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 12px; }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

        /* Bulk Bar */
        .lt-bulk-bar {
          position: sticky; top: 10px; z-index: 50; margin-bottom: 20px;
          background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(12px);
          border: 1px solid var(--primary); border-radius: 14px;
          padding: 12px 24px; display: flex; align-items: center; justify-content: space-between;
          box-shadow: 0 10px 40px rgba(0,0,0,0.5);
          animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes slideDown { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        
        .lt-bulk-info { display: flex; align-items: center; gap: 8px; }
        .lt-bulk-count { background: var(--primary); color: white; padding: 2px 10px; border-radius: 6px; font-weight: 800; font-size: 0.9rem; }
        .lt-bulk-text { font-weight: 700; font-size: 0.85rem; color: #94a3b8; }
        
        .lt-bulk-btns { display: flex; align-items: center; gap: 16px; }
        .lt-bulk-group { display: flex; align-items: center; gap: 8px; }
        .lt-bulk-group label { font-size: 0.7rem; color: #64748b; text-transform: uppercase; font-weight: 800; }
        .lt-bulk-group select { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 4px 8px; border-radius: 8px; font-size: 0.8rem; }
        
        .lt-bulk-del { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #f87171; padding: 6px 12px; border-radius: 8px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; }
        .lt-bulk-del:hover { background: #ef4444; color: white; }
        .lt-bulk-esc { background: none; border: 0; color: #64748b; font-size: 1.2rem; cursor: pointer; padding: 4px; }
        .lt-bulk-esc:hover { color: white; }

        /* Table Styles */
        .lt-table-container { 
          background: rgba(30, 41, 59, 0.4); border: 1px solid rgba(255, 255, 255, 0.05); 
          border-radius: 20px; overflow: visible; backdrop-filter: blur(10px);
        }
        .lt-table { width: 100%; border-collapse: collapse; text-align: left; }
        .lt-table th { 
          padding: 20px; 
          font-size: 0.72rem; 
          font-weight: 800; 
          text-transform: uppercase;
          color: #64748b; 
          background: rgba(255,255,255,0.01); 
          border-bottom: 2px solid rgba(255,255,255,0.05); 
          letter-spacing: 0.08em;
        }
        .lt-sortable { cursor: pointer; user-select: none; transition: 0.2s; }
        .lt-sortable:hover { color: var(--primary); }
        
        .lt-table td { padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.02); vertical-align: middle; color: #cbd5e1; font-size: 0.9rem; transition: all 0.2s; }
        .lt-row { cursor: pointer; }
        .lt-row:hover td { background: rgba(255,255,255,0.02); color: white; }
        .lt-row-sel td { background: rgba(59, 130, 246, 0.05) !important; border-top: 1px solid rgba(59, 130, 246, 0.1); border-bottom: 1px solid rgba(59, 130, 246, 0.1); }
        
        .lt-lead-cell { display: flex; align-items: center; gap: 14px; }
        .lt-lead-av { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1rem; border: 1px solid transparent; flex-shrink: 0; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .lt-lead-name { font-weight: 700; font-size: 0.95rem; color: #f8fafc; margin-bottom: 2px; }
        .lt-lead-sub { font-size: 0.72rem; color: #64748b; font-weight: 600; }
        
        .lt-priority-tag { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; padding: 4px 10px; border-radius: 6px; border: 1px solid; letter-spacing: 0.05em; }
        
        .lt-owner-cell { display: flex; flex-direction: column; gap: 4px; }
        .lt-assignee { font-weight: 700; color: #cbd5e1; font-size: 0.85rem; }
        .lt-src-tag { font-size: 0.65rem; color: #64748b; font-weight: 800; text-transform: uppercase; }

        .lt-follow-status { display: flex; align-items: center; gap: 10px; }
        .lt-fs-icon { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); color: #64748b; }
        .lt-fs-text { display: flex; flex-direction: column; }
        .lt-fs-label { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 1px; }
        .lt-fs-date { font-size: 0.82rem; font-weight: 700; color: #cbd5e1; }
        
        .lt-fs-overdue .lt-fs-icon { background: rgba(239, 68, 68, 0.1); color: #f87171; border-color: rgba(239, 68, 68, 0.2); }
        .lt-fs-overdue .lt-fs-label { color: #f87171; }
        .lt-fs-overdue .lt-fs-date { color: #fecaca; }
        
        .lt-fs-today .lt-fs-icon { background: rgba(245, 158, 11, 0.1); color: #fbbf24; border-color: rgba(245, 158, 11, 0.2); }
        .lt-fs-today .lt-fs-label { color: #fbbf24; }

        .lt-text-right { text-align: right; }
        .lt-actions { display: flex; justify-content: flex-end; gap: 10px; opacity: 0.6; transition: 0.2s; }
        .lt-row:hover .lt-actions { opacity: 1; }
        .lt-actions button { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 8px; border-radius: 10px; color: #94a3b8; cursor: pointer; transition: all 0.2s; }
        .lt-actions button:hover { transform: translateY(-2px); }
        .lt-actions button.lt-act-quick:hover { border-color: #22c55e; color: #22c55e; background: rgba(34, 197, 94, 0.1); }
        .lt-actions button.lt-act-edit:hover { border-color: #3b82f6; color: #3b82f6; background: rgba(59, 130, 246, 0.1); }
        .lt-actions button.lt-act-call:hover { border-color: #fbbf24; color: #fbbf24; background: rgba(251, 191, 36, 0.1); }
        .lt-actions button.lt-act-del:hover { border-color: #ef4444; color: #ef4444; background: rgba(239, 68, 68, 0.1); }
        
        .lt-empty { text-align: center; padding: 60px; color: #64748b; font-style: italic; font-size: 1rem; }

        /* Card View (Mobile) */
        .lt-card-container { display: none; flex-direction: column; gap: 16px; }
        .lt-card { background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(255,255,255,0.05); border-radius: 20px; padding: 20px; cursor: pointer; }
        .lt-card-top { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
        .lt-priority-tag-mini { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; }
        .lt-card-actions { margin-left: auto; display: flex; gap: 10px; }
        .lt-card-actions button { background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); padding: 8px; border-radius: 10px; color: #94a3b8; }
        .lt-card-head { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
        .lt-card-av { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 900; color: white; }
        .lt-card-name { font-weight: 800; font-size: 1.1rem; color: white; margin-bottom: 2px; }
        .lt-card-sub { font-size: 0.85rem; color: #94a3b8; }
        .lt-card-row { display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.05); }
        .lt-date-mini { font-size: 0.75rem; font-weight: 700; }
        .lt-date-overdue { color: #f87171; }

        @media (max-width: 1024px) { .lt-hide-tablet { display: none; } }
        @media (max-width: 768px) {
          .lt-table-container { display: none; }
          .lt-card-container { display: flex; }
        }
      `}</style>
    </div>
  )
}
