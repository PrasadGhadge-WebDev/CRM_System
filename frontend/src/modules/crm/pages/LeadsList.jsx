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
      .catch(() => {})

    usersApi
      .list({ limit: 'all' })
      .then((res) => {
        const list = res?.items || []
        setEmployees(list.filter((u) => (u?.role || '').toLowerCase() === 'employee'))
      })
      .catch(() => {})
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
        <PageHeader
          title="Leads"
          description="Capture, qualify, and track potential customer engagements throughout the sales lifecycle."
          backTo="/"
          actions={
            <div className="crm-flex-end crm-gap-12">
              {isAdmin && selectedLeads.length > 0 && (
                <button className="btn-premium action-secondary text-danger" onClick={onBulkDelete}>
                  <Icon name="trash" size={16} />
                  <span>Purge ({selectedLeads.length})</span>
                </button>
              )}
              <button className="btn-premium action-vibrant" onClick={() => navigate('/leads/new')}>
                <Icon name="plus" size={16} />
                <span>Add New Lead</span>
              </button>
            </div>
          }
        />

        <div className="crm-filter-panel">
          <div className="crm-filter-cell">
            <label className="crm-filter-label">Search Context</label>
            <div className="crm-search-input-wrap">
              <Icon name="search" className="search-icon" />
              <input
                type="text"
                placeholder="Name, Phone, Email..."
                value={q}
                onChange={(e) => {
                  setQ(e.target.value)
                  setPage(1)
                }}
              />
            </div>
          </div>
          <div className="crm-filter-cell">
            <label className="crm-filter-label">Pipeline Stage</label>
            <select
              className="crm-input"
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
          </div>
          {!isEmployee && (
            <div className="crm-filter-cell">
              <label className="crm-filter-label">Owner</label>
              <select
                className="crm-input"
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
            </div>
          )}
          <div className="crm-filter-cell">
            <label className="crm-filter-label">Next Engagement</label>
            <input
              className="crm-input"
              type="date"
              value={followupDate}
              onChange={(e) => {
                setFollowupDate(e.target.value)
                setPage(1)
              }}
            />
          </div>
        </div>

        {error ? <div className="alert error glass-alert">{error}</div> : null}

        {loading ? (
          <div className="leadsLoadingState">
            <div className="spinner-medium" />
            <span className="muted">Synchronizing opportunity data...</span>
          </div>
        ) : (
          <>
            <div className="crm-table-wrap shadow-soft">
              <div className="crm-table-scroll">
                <table className="crm-table">
                  <thead>
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
                      <th style={{ width: '70px' }}>PROFILE</th>
                      <th style={{ minWidth: '220px' }}>PROSPECT IDENTITY</th>
                      <th style={{ minWidth: '180px' }} className="tablet-hide">
                        CONTACT INFO
                      </th>
                      <th style={{ minWidth: '160px' }}>PIPELINE STATUS</th>
                      <th style={{ minWidth: '170px' }} className="tablet-hide">
                        OWNERSHIP
                      </th>
                      <th style={{ minWidth: '180px' }}>FOLLOW-UP</th>
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
                        const isOverdue = nextDate && nextDate < new Date().setHours(0,0,0,0)

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
                            <td className="mobile-hide">
                              <div className="tableAvatarFallback">
                                {(lead.name || 'L').charAt(0).toUpperCase()}
                              </div>
                            </td>
                            <td>
                              <div className="leadsIdentityCell">
                                <div className="leadsPrimaryText">{lead.name || '—'}</div>
                                <div className="leadsSecondaryText">{lead.company_name || 'Individual Prospect'}</div>
                              </div>
                            </td>
                            <td className="tablet-hide">
                              <div className="leadsContactCell">
                                <div className="contactMain">{lead.phone || '—'}</div>
                                <div className="contactSub">{lead.email || '—'}</div>
                              </div>
                            </td>
                            <td>
                              <span className={`crm-status-pill blue`}>
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
                                  {nextDate ? nextDate.toLocaleDateString() : 'None Scheduled'}
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
                                  className="crm-action-btn"
                                  onClick={() => openFollowup(lead)}
                                  title="Record Activity"
                                >
                                  <Icon name="bell" size={14} />
                                </button>
                                <button
                                  className="crm-action-btn"
                                  onClick={() => navigate(`/leads/${id}/edit`)}
                                  title="Edit Lead"
                                >
                                  <Icon name="edit" size={14} />
                                </button>
                                {isAdmin ? (
                                  <button
                                    className="crm-action-btn danger"
                                    onClick={() => onDelete(id)}
                                    title="Purge Lead"
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
                            <h3>No leads captured</h3>
                            <p className="muted">Refine your search or capture a new potential opportunity.</p>
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
        .tableAvatarFallback { width: 44px; height: 44px; border-radius: 12px; background: rgba(59, 130, 246, 0.1); color: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.1rem; }
        .leadsIdentityCell { display: flex; flex-direction: column; gap: 2px; }
        .leadsPrimaryText { color: white; font-size: 1rem; font-weight: 700; }
        .leadsSecondaryText { color: var(--text-dimmed); font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
        
        .leadsContactCell { display: flex; flex-direction: column; gap: 2px; }
        .contactMain { color: white; font-size: 0.9rem; font-weight: 700; }
        .contactSub { color: var(--text-muted); font-size: 0.8rem; font-weight: 500; }

        .leadsOwnerCell { display: flex; flex-direction: column; gap: 2px; }
        .ownerName { color: white; font-size: 0.9rem; font-weight: 700; }
        .ownerRole { color: var(--text-dimmed); font-size: 0.7rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }

        .leadsFollowupCell { display: flex; flex-direction: column; gap: 2px; }
        .leadsFollowupCell.is-overdue .followupDate { color: var(--danger); font-weight: 800; }
        .followupDate { color: white; font-size: 0.9rem; font-weight: 700; }
        .followupTime { color: var(--text-dimmed); font-size: 0.75rem; }

        .crm-action-group { display: flex; gap: 8px; justify-content: flex-end; }
        .crm-action-btn { width: 36px; height: 36px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-surface); color: var(--text-muted); display: flex; align-items: center; justify-content: center; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer; }
        .crm-action-btn:hover { background: var(--primary-soft); color: var(--primary); border-color: var(--primary); transform: translateY(-2px); box-shadow: 0 4px 12px var(--primary-soft); }
        .crm-action-btn.danger:hover { background: rgba(239, 68, 68, 0.1); color: var(--danger); border-color: var(--danger); box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2); }
        .crm-action-btn svg { width: 16px; height: 16px; }
      `}</style>
    </div>
  )
}
