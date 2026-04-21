import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Icon } from '../../../layouts/icons.jsx'
import { useAuth } from '../../../context/AuthContext'
import { leadsApi } from '../../../services/leads.js'
import { activitiesApi } from '../../../services/activities.js'
import { workflowApi } from '../../../services/workflow.js'
import StatusBadge from '../../../components/StatusBadge.jsx'
import ConfirmationModal from '../../../components/ConfirmationModal.jsx'
import FollowupModal from '../../../components/FollowupModal.jsx'

/* ─────────────────────────────────────────────
   Helpers & Constants
 ───────────────────────────────────────────── */
const PAGE_SIZE = 8

function formatCurrency(val, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(val || 0)
}

function formatDate(val, long = false) {
  if (!val) return '—'
  return new Date(val).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: long ? 'long' : 'short',
    year: long ? 'numeric' : '2-digit',
  })
}

/**
 * Enhanced Countdown Timer Helper
 */
function getCountdown(date) {
  if (!date) return null
  const target = new Date(date)
  const now = new Date()
  const diffMs = target - now
  const isOverdue = diffMs < 0
  const absDiff = Math.abs(diffMs)

  const days = Math.floor(absDiff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const mins = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60))

  if (isOverdue) {
    return days > 0 ? `Overdue by ${days}d` : hours > 0 ? `Overdue by ${hours}h` : `Overdue by ${mins}m`
  }
  return days > 0 ? `Due in ${days}d` : hours > 0 ? `Due in ${hours}h` : `Due in ${mins}m`
}

/* ─────────────────────────────────────────────
   Main Component
 ───────────────────────────────────────────── */
export default function LeadDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  // ── State ──
  const [lead, setLead] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isExporting, setIsExporting] = useState(false)
 
  const [activities, setActivities] = useState([])
  const [_leadNotes, setLeadNotes] = useState([])
  const [nextAction, setNextAction] = useState(null)
  const [isFUModalOpen, setIsFUModalOpen] = useState(false)
  const [_isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Filters & Pagination
  const [tlFilterType, setTlFilterType] = useState('all')
  const [tlPage, setTlPage] = useState(1)

  // ── Data Fetching ──
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await leadsApi.get(id)
      setLead(res)
    } catch (e) {
      setError(e.message || 'Lead not found')
    } finally {
      setLoading(false)
    }
  }, [id])

  const loadActivities = useCallback(async () => {
    try {
      const res = await activitiesApi.list({ related_to: id, limit: 100, sortField: 'created_at', sortOrder: 'desc' })
      setActivities(res.items || [])
    } catch { setActivities([]) }
  }, [id])

  const loadNextAction = useCallback(async () => {
    try {
      const res = await activitiesApi.list({
        related_to: id,
        status: 'planned',
        limit: 1,
        sortField: 'due_date',
        sortOrder: 'asc'
      })
      setNextAction(res.items?.[0] || null)
    } catch { setNextAction(null) }
  }, [id])

  const loadNotes = useCallback(async () => {
    try {
      const res = await leadsApi.listNotes(id)
      setLeadNotes(res.items || [])
    } catch { setLeadNotes([]) }
  }, [id])

  useEffect(() => {
    loadData()
    loadNextAction()
  }, [loadData, loadNextAction])

  useEffect(() => {
    if (!lead) return
    const isOwner = lead.assignedTo?.id === user.id || lead.assignedTo?._id === user.id
    const canViewOps = user.role === 'Admin' || user.role === 'Manager' || isOwner
    if (canViewOps) {
      loadActivities()
      loadNotes()
    }
  }, [lead, loadActivities, loadNotes, user.id, user.role])

  // ── Logic ──
  const isOwner = lead?.assignedTo?.id === user.id || lead?.assignedTo?._id === user.id
  const canEdit = user.role === 'Admin' || user.role === 'Manager' || isOwner
  const canDelete = user.role === 'Admin'

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename
    document.body.appendChild(a)
    a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const handleExport = async () => {
    try {
      setIsExporting(true)
      const blob = await leadsApi.exportExcel({ id })
      downloadBlob(blob, `lead-${lead?.leadId || id}.xlsx`)
      toast.success('Exported successfully')
    } catch { toast.error('Export failed') }
    finally { setIsExporting(false) }
  }

  const handleDelete = () => {
    setIsDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    try {
      setIsDeleting(true)
      await leadsApi.remove(id)
      toast.success('Lead moved to trash')
      navigate('/leads')
    } catch {
      toast.error('Failed to delete lead')
    } finally {
      setIsDeleting(false)
      setIsDeleteModalOpen(false)
    }
  }

  const handleStatusChange = async (newVal) => {
    try {
      await leadsApi.update(id, { status: newVal })
      toast.success('Status synced')
      loadData()
    } catch { toast.error('Failed to update status') }
  }

  const _handleMarkComplete = async (act) => {
    try {
      await activitiesApi.update(act.id, { status: 'completed' })
      toast.success('Action completed')
      loadNextAction(); loadActivities()
    } catch { toast.error('Error') }
  }

  // ── Filtering ──
  const filteredActivities = activities.filter(a => tlFilterType === 'all' || a.activity_type === tlFilterType)
  const pageCount = Math.ceil(filteredActivities.length / PAGE_SIZE)
  const pagedActivities = filteredActivities.slice((tlPage - 1) * PAGE_SIZE, tlPage * PAGE_SIZE)

  if (loading) return (
    <div className="center padding40 stack gap-20">
      <div className="spinner-medium" />
      <span className="muted">Loading lead detail...</span>
    </div>
  )

  if (error) return (
    <div className="center padding40 stack gap-20">
      <div className="alert error">{error}</div>
      <button className="btn-v2 secondary" onClick={() => navigate('/leads')}>Back to list</button>
    </div>
  )

  return (
    <div className="ld-premium-page">
      {/* ── Top Navigation Bar ── */}
      <header className="ld-topbar">
        <div className="ld-topbar-left">
          <button className="ld-btn-back" onClick={() => navigate('/leads')}>
            <Icon name="arrowLeft" />
            <span>ALL LEADS</span>
          </button>
          <div className="ld-v-divider" />
          <div className="ld-breadcrumb">
            <span className="muted">Module</span> / <span>Lead Detail</span>
          </div>
        </div>

        <div className="ld-topbar-right">
          <button className="ld-btn secondary" onClick={handleExport} disabled={isExporting}>
            <Icon name="reports" size={16} />
            {isExporting ? 'Exporting...' : 'Export Excel'}
          </button>
          {canEdit && (
            <Link to={`/leads/${id}/edit`} className="ld-btn secondary">
              <Icon name="edit" size={16} /> Edit
            </Link>
          )}
          {canDelete && (
            <button className="ld-btn danger" onClick={handleDelete}>
              <Icon name="trash" size={16} />
            </button>
          )}
        </div>
      </header>

      {/* ── Main Layout ── */}
      <main className="ld-content">

        {/* Profile Header Card */}
        <section className="ld-hero-card">
          <div className="ld-hero-main">
            <div className="ld-avatar">{(lead?.name || 'L').charAt(0).toUpperCase()}</div>
            <div className="ld-hero-text">
              <div className="ld-id-badge">{lead?.leadId}</div>
              <h1 className="ld-name">{lead?.name}</h1>
              <div className="ld-subtitle">
                {lead?.company || 'Individual Lead'} • <StatusBadge status={lead?.source} color="#6366f1" />
              </div>
            </div>
          </div>

          <div className="ld-hero-stats">
            <div className="ld-stat-group">
              <label>Status</label>
              <select
                className={`ld-status-select st-${lead?.status?.toLowerCase().replace(' ', '-')}`}
                value={lead?.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={!canEdit}
              >
                <option value="New">🌱 New</option>
                <option value="Contacted">📞 Contacted</option>
                <option value="Qualified">✅ Qualified</option>
                <option value="Negotiation">🤝 Negotiation</option>
                <option value="Won">🏆 Won</option>
                <option value="Lost">❌ Lost</option>
              </select>
            </div>
            <div className="ld-v-divider" />
            <div className="ld-stat-group">
              <label>Deal Value</label>
              <span className="ld-value-text">{formatCurrency(lead?.dealAmount)}</span>
            </div>
          </div>
        </section>

        {/* Info Grid */}
        <div className="ld-grid">

          {/* Left Column: Core Data */}
          <div className="ld-col-left">

            {/* Contact Panel */}
            <div className="ld-panel">
              <div className="ld-panel-header">
                <Icon name="mail" /> <h3>Contact Details</h3>
              </div>
              <div className="ld-panel-body">
                <div className="ld-info-row">
                  <span className="ld-info-label">Email</span>
                  <span className="ld-info-val">{lead?.email || '—'}</span>
                </div>
                <div className="ld-info-row">
                  <span className="ld-info-label">Phone</span>
                  <span className="ld-info-val">{lead?.phone || '—'}</span>
                </div>
                <div className="ld-info-row">
                  <span className="ld-info-label">Location</span>
                  <span className="ld-info-val">
                    {lead?.city ? `${lead.city}${lead.state ? `, ${lead.state}` : ''}` : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Insights Panel */}
            <div className="ld-panel mt-20">
              <div className="ld-panel-header">
                <Icon name="activity" /> <h3>Lead Insights</h3>
              </div>
              <div className="ld-panel-body">
                <div className="ld-info-row">
                  <span className="ld-info-label">Assigned To</span>
                  <span className="ld-info-val">{lead?.assignedTo?.name || 'Unassigned'}</span>
                </div>
                <div className="ld-info-row">
                  <span className="ld-info-label">Created At</span>
                  <span className="ld-info-val">{formatDate(lead?.created_at, true)}</span>
                </div>
                <div className="ld-info-row">
                  <span className="ld-info-label">Source</span>
                  <span className="ld-info-val"><span className="tag-s">{lead?.source}</span></span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Actions & Progress */}
          <div className="ld-col-right">

            {/* 🎯 "Next Step" Card - Production Grade */}
            <div className={`ld-focus-card ${nextAction ? 'active' : 'empty'} ${nextAction && new Date(nextAction.due_date) < new Date() ? 'overdue' : ''}`}>
              <div className="ld-focus-header">
                <div className="ld-focus-title">
                  <span className="ld-focus-dot" /> NEXT STEP
                </div>
                {nextAction && <span className="ld-countdown-pill">{getCountdown(nextAction.due_date)}</span>}
              </div>

              <div className="fu-focus-body">
                {nextAction ? (
                  <>
                    <div className="fu-focus-main">
                      <div className="fu-focus-icon">
                        {nextAction.follow_up_mode === 'Call' && '📞'}
                        {nextAction.follow_up_mode === 'Meeting' && '👥'}
                        {nextAction.follow_up_mode === 'Email' && '✉️'}
                        {(!nextAction.follow_up_mode || nextAction.follow_up_mode === 'Task') && '✔️'}
                      </div>
                      <div className="fu-focus-content">
                        <h4>{nextAction.follow_up_mode || 'Follow-up'}</h4>
                        <p>{new Date(nextAction.due_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                        <div className="fu-focus-note">{nextAction.description || 'Action required'}</div>
                      </div>
                    </div>
                    <div className="fu-focus-actions">
                      <button className="fu-btn-action primary" onClick={() => setIsFUModalOpen(true)}>Mark Done</button>
                      <button className="fu-btn-action secondary" onClick={() => setIsFUModalOpen(true)}>Reschedule</button>
                    </div>
                  </>
                ) : (
                  <div className="fu-focus-empty">
                    <p>No upcoming follow-up scheduled.</p>
                    <button className="ld-btn primary" onClick={() => setIsFUModalOpen(true)}>
                      Schedule Now
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="ld-panel mt-20">
              <div className="ld-panel-header">
                <Icon name="check" /> <h3>Quick Operations</h3>
              </div>
              <div className="ld-panel-body grid-2">
                <button className="ld-op-btn" onClick={() => setIsTaskModalOpen(true)}>
                  <span className="op-ico">📅</span>
                  <span>Add Task</span>
                </button>
                <button
                  className="ld-op-btn"
                  onClick={() => navigate(`/leads/${id}/edit`)}
                >
                  <span className="op-ico">📝</span>
                  <span>Update Info</span>
                </button>
                {!lead?.convertedCustomerId && (
                  <button
                    className="ld-op-btn full"
                    onClick={async () => {
                      try {
                        await workflowApi.convertToCustomer(id, 'lead', { ...lead })
                        toast.success('Marked as Customer')
                        loadData()
                      } catch { toast.error('Conversion failed') }
                    }}
                  >
                    <span className="op-ico">👤</span>
                    <span>Convert to Customer</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* History / Timeline Section */}
        <section className="ld-tabs-section mt-32">
          <div className="ld-tabs-header">
            <div className="ld-tab active">Activity Timeline</div>

          </div>

          <div className="ld-tab-content">
            {/* Timeline Filter */}
            <div className="ld-tl-filters">
              <div className="ld-filter-pill-row">
                {['all', 'call', 'email', 'meeting', 'task'].map(t => (
                  <button
                    key={t}
                    className={`ld-filter-pill ${tlFilterType === t ? 'active' : ''}`}
                    onClick={() => { setTlFilterType(t); setTlPage(1); }}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Timeline Table */}
            <div className="ld-table-wrapper">
              <table className="ld-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Activity</th>
                    <th>Result / Note</th>
                    <th>Agent</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedActivities.map(a => (
                    <tr key={a.id}>
                      <td className="w-120">{formatDate(a.created_at)}</td>
                      <td className="w-120"><span className={`act-tag ${a.activity_type}`}>{a.activity_type}</span></td>
                      <td><div className="ld-cell-desc">{a.description}</div></td>
                      <td className="w-150">{a.assignedTo?.name || 'System'}</td>
                      <td className="w-120"><span className={`pill-s ${a.status}`}>{a.status}</span></td>
                    </tr>
                  ))}
                  {filteredActivities.length === 0 && (
                    <tr><td colSpan={5} className="ld-empty-row">No matching records found</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer / Pagination */}
            <footer className="ld-table-footer">
              <div className="muted">{filteredActivities.length} total activities</div>
              <div className="ld-pagination">
                <button disabled={tlPage === 1} onClick={() => setTlPage(p => p - 1)}>Prev</button>
                <span>Page {tlPage} of {pageCount || 1}</span>
                <button disabled={tlPage === pageCount || pageCount === 0} onClick={() => setTlPage(p => p + 1)}>Next</button>
              </div>
            </footer>
          </div>
        </section>

      </main>

      {/* ── Modals ── */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        loading={isDeleting}
        type="danger"
        title="Delete Lead"
        message={`Are you sure you want to move "${lead?.name}" to the trash?`}
        confirmLabel="Move to Trash"
      />

      <FollowupModal
        isOpen={isFUModalOpen}
        onClose={() => setIsFUModalOpen(false)}
        lead={lead}
        onSave={() => {
          loadData()
          loadNextAction()
          loadActivities()
        }}
      />

      {/* ── Scoped Styles ── */}
      <style>{`
        .ld-premium-page { background: #0f172a; color: #f8fafc; min-height: 100vh; padding-bottom: 60px; }
        .ld-topbar { height: 72px; display: flex; align-items: center; justify-content: space-between; padding: 0 40px; background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(255, 255, 255, 0.05); position: sticky; top: 0; z-index: 100; }
        .ld-topbar-left { display: flex; align-items: center; gap: 20px; }
        .ld-btn-back { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); padding: 8px 16px; border-radius: 10px; color: #94a3b8; font-weight: 700; cursor: pointer; border: 1px solid rgba(255, 255, 255, 0.08); }
        .ld-hero-card { background: linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.7)); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 24px; padding: 32px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .ld-hero-main { display: flex; align-items: center; gap: 24px; }
        .ld-avatar { width: 80px; height: 80px; border-radius: 20px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: 900; }
        .ld-grid { display: grid; grid-template-columns: 1fr 400px; gap: 24px; }
        .ld-panel { background: rgba(30, 41, 59, 0.4); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 20px; }
        .ld-panel-header { padding: 16px 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.05); display: flex; align-items: center; gap: 12px; }
        .ld-panel-header h3 { font-size: 0.85rem; font-weight: 800; color: #cbd5e1; margin: 0; }
        .ld-info-row { display: flex; justify-content: space-between; padding: 12px 20px; border-bottom: 1px solid rgba(255,255,255,0.03); }
        .ld-info-label { font-size: 0.8rem; color: #64748b; }
        .ld-info-val { font-weight: 700; font-size: 0.9rem; }
        
        /* 🎯 Next Step Card Styles */
        .ld-focus-card { border-radius: 24px; padding: 28px; border: 1px solid rgba(255,255,255,0.05); position: relative; transition: 0.3s; }
        .ld-focus-card.active { background: linear-gradient(135deg, #1e293b, #0f172a); border-color: rgba(59, 130, 246, 0.3); }
        .ld-focus-card.overdue { border-color: rgba(239, 68, 68, 0.4); background: linear-gradient(135deg, #2d161a, #0f172a); }
        .ld-focus-header { display: flex; justify-content: space-between; margin-bottom: 24px; }
        .ld-focus-title { font-weight: 800; font-size: 0.7rem; color: #94a3b8; letter-spacing: 0.1em; display: flex; align-items: center; gap: 10px; }
        .ld-focus-dot { width: 8px; height: 8px; border-radius: 50%; background: #3b82f6; box-shadow: 0 0 10px #3b82f6; }
        .ld-focus-card.overdue .ld-focus-dot { background: #ef4444; box-shadow: 0 0 10px #ef4444; }
        .ld-countdown-pill { background: rgba(59, 130, 246, 0.1); color: #60a5fa; padding: 4px 12px; border-radius: 20px; font-size: 0.7rem; font-weight: 800; }
        .ld-focus-card.overdue .ld-countdown-pill { background: rgba(239, 68, 68, 0.1); color: #f87171; }
        .fu-focus-main { display: flex; gap: 20px; margin-bottom: 28px; }
        .fu-focus-icon { font-size: 2.2rem; }
        .fu-focus-content h4 { margin: 0 0 4px; font-size: 1.2rem; font-weight: 800; }
        .fu-focus-content p { margin: 0; font-size: 0.85rem; color: #94a3b8; }
        .fu-focus-note { margin-top: 12px; font-size: 0.85rem; color: #64748b; font-style: italic; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .fu-focus-actions { display: flex; gap: 12px; }
        .fu-btn-action { flex: 1; padding: 12px; border-radius: 12px; font-weight: 700; font-size: 0.8rem; cursor: pointer; transition: 0.2s; }
        .fu-btn-action.primary { background: #3b82f6; color: white; border: none; }
        .fu-btn-action.secondary { background: rgba(255,255,255,0.05); color: #cbd5e1; border: 1px solid rgba(255,255,255,0.1); }
        .fu-focus-empty { text-align: center; padding: 20px 0; color: #64748b; }
        
        .ld-mode-cell { display: flex; align-items: center; gap: 10px; font-weight: 600; }
        .pill-s { font-size: 0.6rem; padding: 2px 10px; border-radius: 50px; font-weight: 800; text-transform: uppercase; }
        .pill-s.completed { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
        .pill-s.planned { background: rgba(251, 191, 36, 0.1); color: #fbbf24; }
        .pill-s.skipped { background: rgba(148, 163, 184, 0.1); color: #94a3b8; }
        
        .ld-status-select { appearance: none; background: #1e293b; color: #fff; padding: 8px 16px; border-radius: 10px; font-weight: 700; border: 1px solid rgba(255,255,255,0.1); cursor: pointer; }
        .center { display: flex; align-items: center; justify-content: center; height: 300px; width: 100%; flex-direction: column; gap: 20px; }
        .mt-20 { margin-top: 20px; }
        .mt-32 { margin-top: 32px; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 20px; }
        .ld-op-btn { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 16px; display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer; }
        .ld-op-btn span { font-size: 0.8rem; font-weight: 700; color: #94a3b8; }
        .ld-table-wrapper { background: rgba(30, 41, 59, 0.2); border-radius: 20px; overflow: hidden; }
        .ld-table { width: 100%; border-collapse: collapse; }
        .ld-table th { text-align: left; padding: 16px 20px; background: rgba(0,0,0,0.1); color: #64748b; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; }
        .ld-table td { padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.02); }
        .spinner-medium { width: 50px; height: 50px; border: 5px solid rgba(255,255,255,0.1); border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 1100px) {
          .ld-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
