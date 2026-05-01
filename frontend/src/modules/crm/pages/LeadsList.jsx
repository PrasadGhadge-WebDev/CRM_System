import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import PageHeader from '../../../components/PageHeader.jsx'
import Pagination from '../../../components/Pagination.jsx'
import { Icon } from '../../../layouts/icons.jsx'
import { leadsApi } from '../../../services/leads.js'
import { statusesApi } from '../../../services/statuses.js'
import { usersApi } from '../../../services/users.js'
import { confirmToast } from '../../../utils/confirmToast.jsx'
import { useAuth } from '../../../context/AuthContext'
import { useDebouncedValue } from '../../../utils/useDebouncedValue.js'
import { useToastFeedback } from '../../../utils/useToastFeedback.js'
import FollowupModal from '../../../components/FollowupModal.jsx'

function stopRowNavigation(event) {
  event.stopPropagation()
}

export default function LeadsList() {
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const isEmployee = (currentUser?.role || '') === 'Employee'
  const isAdmin = (currentUser?.role || '') === 'Admin'
  const isAdminOrManager = isAdmin || (currentUser?.role || '') === 'Manager'

  const qParam = searchParams.get('q') || ''
  const statusParam = searchParams.get('status') || ''
  const assignedToParam = searchParams.get('assignedTo') || ''
  const followupDateParam = searchParams.get('followupDate') || ''
  const pageParam = Math.max(1, Number(searchParams.get('page') || 1) || 1)
  const rawLimitParam = (searchParams.get('limit') || '20').trim().toLowerCase()
  const limitParam =
    rawLimitParam === 'all' ? 'all' : Math.min(100, Math.max(1, Number(rawLimitParam) || 20))

  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [employees, setEmployees] = useState([])
  const [statusOptions, setStatusOptions] = useState([])

  const [q, setQ] = useState(qParam)
  const [status, setStatus] = useState(statusParam)
  const [assignedTo, setAssignedTo] = useState(assignedToParam)
  const [followupDate, setFollowupDate] = useState(followupDateParam)
  const [page, setPage] = useState(pageParam)
  const [limit, setLimit] = useState(limitParam)
  const [selectedLeads, setSelectedLeads] = useState([])

  const [isFollowupOpen, setIsFollowupOpen] = useState(false)
  const [followupLead, setFollowupLead] = useState(null)

  useToastFeedback({ error })
  const debouncedQ = useDebouncedValue(q, 250)

  useEffect(() => {
    statusesApi
      .list('lead')
      .then((res) =>
        setStatusOptions(
          (Array.isArray(res) ? res : []).map((s) => ({ value: s.name, label: s.name, color: s.color })),
        ),
      )
      .catch(() => { })

    usersApi
      .list({ limit: 'all' })
      .then((res) => {
        const list = res?.items || []
        setEmployees(list.filter((u) => (u?.role || '').toLowerCase() === 'employee'))
      })
      .catch(() => { })
  }, [])

  const desiredParams = useMemo(() => {
    const next = new URLSearchParams()
    if (debouncedQ.trim()) next.set('q', debouncedQ.trim())
    if (status.trim()) next.set('status', status.trim())
    if (assignedTo.trim()) next.set('assignedTo', assignedTo.trim())
    if (followupDate.trim()) next.set('followupDate', followupDate.trim())
    if (page > 1) next.set('page', String(page))
    if (String(limit) !== '20') next.set('limit', String(limit))
    return next
  }, [debouncedQ, status, assignedTo, followupDate, page, limit])

  useEffect(() => {
    if (desiredParams.toString() !== searchParams.toString()) {
      setSearchParams(desiredParams, { replace: true })
    }
  }, [desiredParams, searchParams, setSearchParams])

  useEffect(() => {
    let canceled = false
    setLoading(true)
    setError('')

    leadsApi
      .list({
        ...(debouncedQ.trim() ? { q: debouncedQ.trim() } : null),
        ...(status.trim() ? { status: status.trim() } : null),
        ...(assignedTo.trim() ? { assignedTo: assignedTo.trim() } : null),
        ...(followupDate.trim() ? { followupDate: followupDate.trim() } : null),
        page,
        limit,
      })
      .then((res) => {
        if (canceled) return
        setItems(res.items || [])
        setTotal(Number(res.total) || 0)
        setSelectedLeads([])
      })
      .catch((e) => {
        if (canceled) return
        setError(e.message || 'Failed to load leads')
      })
      .finally(() => {
        if (canceled) return
        setLoading(false)
      })

    return () => {
      canceled = true
    }
  }, [debouncedQ, status, assignedTo, followupDate, page, limit])

  const handleSelectAll = (checked) =>
    setSelectedLeads(checked ? items.map((lead) => String(lead.id || lead._id || '')) : [])

  const handleSelectLead = (id, checked) =>
    setSelectedLeads((prev) =>
      checked ? (prev.includes(String(id)) ? prev : [...prev, String(id)]) : prev.filter((x) => x !== String(id)),
    )

  async function onBulkDelete() {
    if (!isAdmin || selectedLeads.length === 0) return
    const confirmed = await confirmToast(`Move ${selectedLeads.length} leads to trash?`, {
      confirmLabel: 'Move to Trash',
      type: 'danger',
    })
    if (!confirmed) return

    try {
      await leadsApi.bulkRemove(selectedLeads)
      toast.success('Leads moved to trash')
      setItems((prev) => prev.filter((x) => !selectedLeads.includes(String(x.id || x._id))))
      setTotal((t) => Math.max(0, t - selectedLeads.length))
      setSelectedLeads([])
    } catch (e) {
      toast.error(e.message)
    }
  }

  async function onDelete(id) {
    if (!isAdmin) return
    const confirmed = await confirmToast('Move this lead to trash?', {
      confirmLabel: 'Move to Trash',
      type: 'danger',
    })
    if (!confirmed) return

    try {
      await leadsApi.remove(id)
      toast.success('Lead moved to trash')
      setItems((prev) => prev.filter((x) => String(x.id || x._id) !== String(id)))
      setTotal((t) => Math.max(0, t - 1))
    } catch (e) {
      toast.error(e.message)
    }
  }

  const openFollowup = (lead) => {
    setFollowupLead(lead)
    setIsFollowupOpen(true)
  }

  const handleFollowupSaved = (updatedLead) => {
    const updatedId = String(updatedLead?.id || updatedLead?._id || '')
    if (!updatedId) return
    setItems((prev) =>
      prev.map((lead) => {
        const leadId = String(lead?.id || lead?._id || '')
        if (leadId !== updatedId) return lead
        return { ...lead, ...updatedLead }
      }),
    )
  }

  const isAllSelected = items.length > 0 && selectedLeads.length === items.length
  const isSomeSelected = selectedLeads.length > 0 && selectedLeads.length < items.length

  return (
    <div className="stack">
      <section className="crm-fullscreen-shell">
        <div className="users-page-header">
          <h1 className="users-title">Leads Management</h1>
          <p className="users-subtitle">Track and optimize incoming customer opportunities</p>
        </div>

        <div className="crm-stats-bar-compact">
          <div className="stat-pill-mini">
            <span className="stat-pill-label">TOTAL LEADS</span>
            <span className="stat-pill-value total">{total}</span>
          </div>
          <div className="stat-pill-mini">
            <span className="stat-pill-label">CONVERTED</span>
            <span className="stat-pill-value active">{items.filter(l => String(l.status).toLowerCase().includes('won') || String(l.status).toLowerCase().includes('converted')).length}</span>
          </div>
          <div className="stat-pill-mini">
            <span className="stat-pill-label">LOST</span>
            <span className="stat-pill-value inactive">{items.filter(l => String(l.status).toLowerCase().includes('lost')).length}</span>
          </div>
          <div className="stat-pill-mini">
            <span className="stat-pill-label">PENDING</span>
            <span className="stat-pill-value pending">{items.filter(l => !String(l.status).toLowerCase().includes('won') && !String(l.status).toLowerCase().includes('converted') && !String(l.status).toLowerCase().includes('lost')).length}</span>
          </div>
        </div>

        <div className="unified-action-bar">
          <div className="search-filter-group">
            <div className="crm-search-input-wrap">
              <Icon name="search" className="search-icon" />
              <input
                type="text"
                placeholder="Search leads..."
                className="crm-input"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value)
                  setPage(1)
                }}
              />
            </div>

            <select
              className="crm-input filter-select"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setPage(1)
              }}
            >
              <option value="">All Statuses</option>
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {!isEmployee && (
              <select
                className="crm-input filter-select"
                value={assignedTo}
                onChange={(e) => {
                  setAssignedTo(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">All Assigned</option>
                {employees.map((emp) => (
                  <option key={emp.id || emp._id} value={emp.id || emp._id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            )}

            <button
              className="btn-premium-mini add-user-btn"
              onClick={() => navigate('/leads/new')}
            >
              <Icon name="plus" size={16} />
              <span>Add Lead</span>
            </button>

            {(q || status || assignedTo || followupDate) && (
              <button 
                className="btn-clear-filters"
                onClick={() => {
                  setQ('')
                  setStatus('')
                  setAssignedTo('')
                  setFollowupDate('')
                  setPage(1)
                }}
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {error ? <div className="alert error glass-alert">{error}</div> : null}

        {loading ? (
          <div className="leadsLoadingState">
            <div className="spinner-medium" />
            <span className="muted">Loading leads...</span>
          </div>
        ) : (
          <>
            <div className="crm-table-wrap shadow-soft" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="crm-table-scroll">
                <table className="crm-table">
                  <thead style={{ background: 'var(--bg-surface)' }}>
                    <tr>
                      {isAdminOrManager ? (
                        <th style={{ width: '50px' }}>
                          <input
                            type="checkbox"
                            checked={isAllSelected}
                            ref={(el) => {
                              if (el) el.indeterminate = isSomeSelected
                            }}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                          />
                        </th>
                      ) : null}
                      <th style={{ minWidth: '220px' }}>NAME</th>
                      <th style={{ minWidth: '180px' }} className="tablet-hide">
                        CONTACT INFO
                      </th>
                      <th style={{ width: '130px' }}>STATUS</th>
                      <th style={{ minWidth: '170px' }} className="tablet-hide">
                        ASSIGNED TO
                      </th>
                      <th style={{ minWidth: '180px' }}>NEXT FOLLOW-UP</th>
                      <th className="text-right" style={{ width: '130px' }}>
                        ACTIONS
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length > 0 ? (
                      items.map((lead) => {
                        const id = lead.id || lead._id
                        const isSelected = selectedLeads.includes(String(id))
                        const nextDate = lead.nextFollowupDate ? new Date(lead.nextFollowupDate) : null
                        const isOverdue = nextDate && nextDate < new Date().setHours(0, 0, 0, 0)

                        return (
                          <tr
                            key={String(id)}
                            className={`crm-table-row ${isSelected ? 'selected' : ''}`}
                            onClick={() => navigate(`/leads/${id}`)}
                          >
                            {isAdminOrManager ? (
                              <td onClick={stopRowNavigation}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => handleSelectLead(id, e.target.checked)}
                                />
                              </td>
                            ) : null}

                            <td>
                              <div className="leadsIdentityCell">
                                <div className="leadsPrimaryText">{lead.name || '—'}</div>
                                <div className="leadsSecondaryText">{lead.company_name || 'Personal'}</div>
                              </div>
                            </td>
                            <td className="tablet-hide">
                              <div className="leadsContactCell">
                                <div className="contactMain">{lead.phone || '—'}</div>
                                <div className="contactSub">{lead.email || '—'}</div>
                              </div>
                            </td>
                            <td>
                              <span className="crm-status-pill-modern">
                                <div className="status-dot" />
                                {lead.status || 'NEW'}
                              </span>
                            </td>
                            <td className="tablet-hide">
                              <div className="leadsOwnerCell">
                                <span className="ownerName">{lead.assignedTo?.name || 'Unassigned'}</span>
                                <span className="ownerRole">{lead.assignedTo?.role || 'System'}</span>
                              </div>
                            </td>
                            <td>
                              <div className={`leadsFollowupCell ${isOverdue ? 'is-overdue' : ''}`}>
                                <span className="followupDate">
                                  {nextDate ? nextDate.toLocaleDateString() : 'None'}
                                </span>
                                {nextDate && (
                                  <span className="followupTime">
                                    {nextDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="text-right" onClick={stopRowNavigation}>
                              <div className="crm-action-group">
                                <button
                                  className="modern-action-btn"
                                  onClick={() => openFollowup(lead)}
                                  title="Record Activity"
                                >
                                  <Icon name="bell" size={14} />
                                </button>
                                <button
                                  className="modern-action-btn"
                                  onClick={() => navigate(`/leads/${id}/edit`)}
                                  title="Edit Lead"
                                >
                                  <Icon name="edit" size={14} />
                                </button>
                                {isAdmin ? (
                                  <button
                                    className="modern-action-btn danger"
                                    onClick={() => onDelete(id)}
                                    title="Delete Lead"
                                  >
                                    <Icon name="trash" size={14} />
                                  </button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={isAdminOrManager ? 8 : 7}>
                          <div className="emptyState" style={{ padding: '80px 0' }}>
                            <h3>No leads found</h3>
                            <p className="muted">Try a different search or add a new lead.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <Pagination
              page={page}
              limit={limit}
              total={total}
              onPageChange={(p) => setPage(Math.max(1, p))}
              onLimitChange={(l) => {
                setLimit(l)
                setPage(1)
              }}
            />
          </>
        )}
      </section>

      <FollowupModal
        isOpen={isFollowupOpen}
        lead={followupLead}
        onClose={() => {
          setIsFollowupOpen(false)
          setFollowupLead(null)
        }}
        onSave={handleFollowupSaved}
      />

      <style>{`
        .tableAvatarFallback { width: 44px; height: 44px; border-radius: 14px; background: linear-gradient(135deg, var(--primary-soft), rgba(59, 130, 246, 0.2)); color: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.1rem; box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.1); }
        .leadsIdentityCell { display: flex; flex-direction: column; gap: 2px; }
        .leadsPrimaryText { color: var(--text); font-size: 0.95rem; font-weight: 700; }
        .leadsSecondaryText { color: var(--text-dimmed); font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
        
        .leadsContactCell { display: flex; flex-direction: column; gap: 2px; }
        .contactMain { color: var(--text); font-size: 0.85rem; font-weight: 700; }
        .contactSub { color: var(--text-muted); font-size: 0.75rem; font-weight: 500; }

        .leadsOwnerCell { display: flex; flex-direction: column; gap: 2px; }
        .ownerName { color: var(--text); font-size: 0.85rem; font-weight: 700; }
        .ownerRole { color: var(--text-dimmed); font-size: 0.7rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }

        .leadsFollowupCell { display: flex; flex-direction: column; gap: 2px; }
        .leadsFollowupCell.is-overdue .followupDate { color: var(--danger); font-weight: 800; }
        .followupDate { color: var(--text); font-size: 0.85rem; font-weight: 700; }
        .followupTime { color: var(--text-dimmed); font-size: 0.7rem; }

        .crm-clickable-row { cursor: pointer; transition: all 0.2s; }
        .crm-clickable-row:hover { background: var(--bg-surface) !important; }
        
        .crm-action-group { display: flex; gap: 10px; justify-content: flex-end; }
        .modern-action-btn { width: 38px; height: 38px; border-radius: 12px; border: 1px solid var(--border); background: var(--bg-surface); color: var(--text-muted); display: flex; align-items: center; justify-content: center; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer; }
        .modern-action-btn:hover { background: var(--bg-card); color: var(--primary); border-color: var(--primary); transform: translateY(-2px); box-shadow: 0 4px 12px var(--primary-soft); }
        .modern-action-btn.danger:hover { background: var(--danger-soft); color: var(--danger); border-color: var(--danger); box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15); }

        /* Glass Filter Effect */
        .modern-filter-panel { 
           background: var(--bg-card); 
           backdrop-filter: blur(10px); 
           border: 1px solid var(--border); 
           border-radius: 24px; 
           padding: 24px;
           margin-bottom: 24px;
        }

        .crm-status-pill-modern {
           padding: 6px 14px;
           border-radius: 10px;
           font-size: 0.7rem;
           font-weight: 700;
           text-transform: uppercase;
           letter-spacing: 0.05em;
           display: inline-flex;
           align-items: center;
           gap: 6px;
           background: var(--primary-soft); 
           color: var(--primary); 
           border: 1px solid var(--primary-soft);
        }
        .status-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--primary); box-shadow: 0 0 8px var(--primary); }

         .users-page-header { margin-bottom: 8px; }
         .users-title { font-size: 1.3rem; font-weight: 800; color: var(--text); margin-bottom: 2px; }
         .users-subtitle { font-size: 0.85rem; color: var(--text-dimmed); font-weight: 500; }

         .unified-action-bar { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 8px; flex-wrap: wrap; }
         .search-filter-group { display: flex; align-items: center; gap: 16px; flex: 1; justify-content: space-between; }
         .filter-select { max-width: 150px; }
         .btn-clear-filters { background: none; border: none; color: var(--primary); font-weight: 700; font-size: 0.8rem; cursor: pointer; }
         .btn-clear-filters:hover { text-decoration: underline; }

         .crm-stats-bar-compact { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 12px; justify-content: space-between; }
         .stat-pill-mini { background: var(--bg-card); border: 1px solid var(--border-strong); padding: 10px 16px; border-radius: 12px; display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 130px; box-shadow: var(--shadow-sm); }
         .stat-pill-label { font-size: 10px; font-weight: 800; color: var(--text-dimmed); text-transform: uppercase; letter-spacing: 0.05em; }
         .stat-pill-value { font-size: 20px; font-weight: 900; }
         .stat-pill-value.total { color: var(--text); }
         .stat-pill-value.active { color: var(--success); }
         .stat-pill-value.inactive { color: var(--danger); }
         .stat-pill-value.pending { color: var(--warning); }

         .crm-input { width: 100%; background: var(--bg-surface) !important; border: 1px solid var(--border-strong) !important; border-radius: 10px !important; padding: 8px 14px !important; color: var(--text) !important; font-size: 0.85rem !important; transition: all 0.2s; }
         .crm-search-input-wrap { position: relative; width: 100%; flex: 1; max-width: none; }
         .crm-search-input-wrap .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); z-index: 1; color: var(--text-dimmed); font-size: 14px; }
         .crm-search-input-wrap .crm-input { padding-left: 36px !important; }
         
         .add-user-btn { background: var(--primary) !important; color: white !important; border: none !important; border-radius: 10px !important; padding: 0 20px !important; font-weight: 700 !important; height: 38px; display: flex; align-items: center; gap: 6px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 2px 8px rgba(var(--primary-rgb), 0.2); font-size: 0.85rem; flex-shrink: 0; }
         .add-user-btn:hover { background: var(--primary-hover) !important; transform: translateY(-2px); box-shadow: 0 6px 18px rgba(var(--primary-rgb), 0.4); }

         .crm-table th { padding: 12px 16px !important; border-bottom: 2px solid var(--border-strong) !important; }
         .crm-table td { padding: 10px 16px !important; border-bottom: 1px solid var(--border-strong) !important; }
         
         @media (max-width: 1000px) {
            .crm-stats-bar-compact { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
            .stat-pill-mini { min-width: 0; padding: 10px; }
            .stat-pill-value { font-size: 1.1rem; }
            .add-user-btn { width: 100%; justify-content: center; }
         }
      `}</style>
    </div>
  )
}
