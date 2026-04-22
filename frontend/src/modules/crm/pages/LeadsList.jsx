import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import PageHeader from '../../../components/PageHeader.jsx'
import Pagination from '../../../components/Pagination.jsx'
import SearchInput from '../../../components/SearchInput.jsx'
import StatusBadge from '../../../components/StatusBadge.jsx'
import { Icon } from '../../../layouts/icons.jsx'
import { leadsApi } from '../../../services/leads.js'
import { statusesApi } from '../../../services/statuses.js'
import { usersApi } from '../../../services/users.js'
import { confirmToast } from '../../../utils/confirmToast.jsx'
import { useAuth } from '../../../context/AuthContext'
import { useDebouncedValue } from '../../../utils/useDebouncedValue.js'
import { useToastFeedback } from '../../../utils/useToastFeedback.js'
import QuickLeadFollowupModal from '../components/QuickLeadFollowupModal.jsx'
import '../../../styles/leadsList.css'

function stopRowNavigation(event) {
  event.stopPropagation()
}

function formatShortDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' })
}

function getFollowupBucket(value) {
  if (!value) return 'none'
  const due = new Date(value)
  if (Number.isNaN(due.getTime())) return 'none'

  const dueDay = new Date(due)
  dueDay.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (dueDay < today) return 'overdue'
  if (dueDay.getTime() === today.getTime()) return 'today'
  return 'future'
}

function toDateInput(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().split('T')[0]
}

export default function LeadsList() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const isEmployee = (user?.role || '') === 'Employee'
  const isAdmin = (user?.role || '') === 'Admin'

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

  useEffect(() => setQ(qParam), [qParam])
  useEffect(() => setStatus(statusParam), [statusParam])
  useEffect(() => setAssignedTo(assignedToParam), [assignedToParam])
  useEffect(() => setFollowupDate(followupDateParam), [followupDateParam])
  useEffect(() => setPage(pageParam), [pageParam])
  useEffect(() => setLimit(limitParam), [limitParam])

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

  const statusColorByName = useMemo(() => {
    const map = new Map()
    statusOptions.forEach((opt) => {
      if (opt?.value) map.set(String(opt.value).toLowerCase(), opt.color || '')
    })
    return map
  }, [statusOptions])

  const desiredParams = useMemo(() => {
    const next = new URLSearchParams()
    const trimmedQ = debouncedQ.trim()
    if (trimmedQ) next.set('q', trimmedQ)
    if (status.trim()) next.set('status', status.trim())
    if (assignedTo.trim()) next.set('assignedTo', assignedTo.trim())
    if (followupDate.trim()) next.set('followupDate', followupDate.trim())
    if (page > 1) next.set('page', String(page))
    if (String(limit) !== '20') next.set('limit', String(limit))
    return next
  }, [debouncedQ, status, assignedTo, followupDate, page, limit])

  useEffect(() => {
    if (desiredParams.toString() === searchParams.toString()) return
    setSearchParams(desiredParams, { replace: true })
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

  const isAllSelected = items.length > 0 && selectedLeads.length === items.length
  const isSomeSelected = selectedLeads.length > 0 && selectedLeads.length < items.length

  const handleSelectAll = (checked) => {
    if (!checked) {
      setSelectedLeads([])
      return
    }
    setSelectedLeads(items.map((lead) => String(lead.id || lead._id || '')))
  }

  const handleSelectLead = (leadId, checked) => {
    const id = String(leadId || '')
    if (!id) return
    if (checked) setSelectedLeads((prev) => (prev.includes(id) ? prev : [...prev, id]))
    else setSelectedLeads((prev) => prev.filter((x) => x !== id))
  }

  async function onBulkDelete() {
    if (!isAdmin) return toast.error('Only Admins can delete leads')
    if (selectedLeads.length === 0) return

    const confirmed = await confirmToast(`Are you sure you want to move ${selectedLeads.length} lead(s) to trash?`, {
      confirmLabel: 'Move to Trash',
      type: 'danger',
    })
    if (!confirmed) return

    try {
      await leadsApi.bulkRemove(selectedLeads)
      toast.success(`${selectedLeads.length} lead(s) moved to trash`)
      setItems((prev) => prev.filter((x) => !selectedLeads.includes(String(x.id || x._id || ''))))
      setTotal((t) => Math.max(0, (Number(t) || 0) - selectedLeads.length))
      setSelectedLeads([])
    } catch (e) {
      setError(e.message || 'Bulk delete failed')
    }
  }

  async function onDelete(id) {
    if (!isAdmin) return toast.error('Only Admins can delete leads')

    const confirmed = await confirmToast('Are you sure you want to move this lead to trash?', {
      confirmLabel: 'Move to Trash',
      type: 'danger',
    })
    if (!confirmed) return

    try {
      await leadsApi.remove(id)
      toast.success('Lead moved to trash')
      setItems((prev) => prev.filter((x) => String(x.id || x._id) !== String(id)))
      setTotal((t) => Math.max(0, (Number(t) || 0) - 1))
    } catch (e) {
      setError(e.message || 'Delete failed')
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
        const incomingAssignedTo = updatedLead?.assignedTo
        const mergedAssignedTo =
          incomingAssignedTo && typeof incomingAssignedTo === 'object' ? incomingAssignedTo : lead?.assignedTo
        return { ...lead, ...updatedLead, assignedTo: mergedAssignedTo }
      }),
    )
  }

  return (
    <div className="stack leadsListPage">
      <PageHeader
        title="Leads"
        backTo="/"
        actions={
          <div className="leadsHeaderActions">
            {isAdmin && selectedLeads.length > 0 && (
              <button className="btn danger" onClick={onBulkDelete} title="Delete selected leads">
                Delete Selected ({selectedLeads.length})
              </button>
            )}
            <button className="btn primary" onClick={() => navigate('/leads/new')} title="Add Lead">
              Add Lead
            </button>
          </div>
        }
      />

      <div className="muted">
        Showing {items.length} of {total} leads
      </div>

      <div className="filters leadsFilters">
        <SearchInput
          placeholder="Search name/phone/email..."
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setPage(1)
          }}
        />
        <select
          className="input"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(1)
          }}
        >
          <option value="">All Status</option>
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {!isEmployee ? (
          <select
            className="input"
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
        ) : null}
        <input
          className="input"
          type="date"
          value={followupDate}
          onChange={(e) => {
            setFollowupDate(e.target.value)
            setPage(1)
          }}
          title="Next Follow-up"
        />
      </div>

      {error ? <div className="alert error">{error}</div> : null}

      {loading ? (
        <div className="muted">Loading...</div>
      ) : (
        <>
          <div className="tableWrap leadsTableWrap">
            <div className="leadsTableScroll">
              <table className="table">
                <thead>
                  <tr>
                    {isAdmin ? (
                      <th style={{ width: '40px' }}>
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = isSomeSelected
                          }}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          title="Select all"
                        />
                      </th>
                    ) : null}
                    <th style={{ minWidth: '150px' }}>Name</th>
                    <th style={{ minWidth: '120px' }}>Phone</th>
                    <th style={{ minWidth: '200px' }} className="tablet-hide">
                      Email
                    </th>
                    <th style={{ minWidth: '140px' }}>Status</th>
                    <th style={{ minWidth: '170px' }} className="tablet-hide">
                      Assigned User
                    </th>
                    <th style={{ minWidth: '180px' }}>Next Follow-up</th>
                  <th className="leadsActionsCol">
                    Actions
                  </th>
                  </tr>
                </thead>
                <tbody>
                {items.length > 0 ? (
                  items.map((lead) => {
                    const id = lead.id || lead._id
                    const followupBucket = getFollowupBucket(lead.nextFollowupDate)
                    const statusColor = statusColorByName.get(String(lead.status || '').toLowerCase()) || ''
                    const isRowSelected = selectedLeads.includes(String(id))

                    return (
                      <tr
                        key={String(id)}
                        className="tableRowLink"
                        onClick={() => {
                          navigate(`/leads/${id}`)
                        }}
                      >
                        {isAdmin ? (
                          <td>
                            <input
                              type="checkbox"
                              checked={isRowSelected}
                              onChange={(e) => {
                                stopRowNavigation(e)
                                handleSelectLead(id, e.target.checked)
                              }}
                              title="Select lead"
                            />
                          </td>
                        ) : null}
                        <td>
                          <Link to={`/leads/${id}`} className="tableLink" onClick={(e) => stopRowNavigation(e)}>
                            {lead.name || '—'}
                          </Link>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.95rem' }}>{lead.phone || '—'}</div>
                        </td>
                        <td className="tablet-hide">
                          <div style={{ fontSize: '0.95rem', fontWeight: 500 }}>{lead.email || '—'}</div>
                        </td>
                        <td>
                          {lead.status ? (
                            <StatusBadge status={lead.status} color={statusColor || lead.statusColor} />
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="tablet-hide">
                          <div style={{ fontSize: '0.95rem' }}>{lead.assignedTo?.name || '—'}</div>
                        </td>
                        <td>
                          {lead.nextFollowupDate ? (
                            followupBucket === 'overdue' ? (
                              <div className="badge-modern danger">
                                <span className="badge-dot"></span>
                                Overdue • {formatShortDate(lead.nextFollowupDate)}
                              </div>
                            ) : followupBucket === 'today' ? (
                              <div className="badge-modern warning">
                                <span className="badge-dot"></span>
                                Today • {formatShortDate(lead.nextFollowupDate)}
                              </div>
                            ) : (
                              <div style={{ fontWeight: 600 }}>{formatShortDate(lead.nextFollowupDate)}</div>
                            )
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                        <td className="leadsActionsCol">
                          <div className="leadsActions">
                            <button
                              className="iconBtn followup"
                              type="button"
                              onClick={(e) => {
                                stopRowNavigation(e)
                                openFollowup(lead)
                              }}
                              title="Follow-up"
                              aria-label="Follow-up"
                            >
                              <Icon name="bell" />
                            </button>
                            <button
                              className="iconBtn"
                              type="button"
                              onClick={(e) => {
                                stopRowNavigation(e)
                                navigate(`/leads/${id}/edit`)
                              }}
                              title="Edit"
                              aria-label="Edit lead"
                            >
                              <Icon name="edit" />
                            </button>
                            {isAdmin ? (
                              <button
                                className="iconBtn text-danger"
                                type="button"
                                onClick={(e) => {
                                  stopRowNavigation(e)
                                  onDelete(id)
                                }}
                                title="Delete"
                                aria-label="Delete lead"
                              >
                                <Icon name="trash" />
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={isAdmin ? 8 : 7}>
                      <div className="emptyState">
                        <div className="emptyStateTitle">No leads found</div>
                        <div className="emptyStateText">
                          Try adjusting filters or add a new lead to start tracking follow-ups.
                        </div>
                        <button className="btn primary" onClick={() => navigate('/leads/new')}>
                          + New Lead
                        </button>
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

      <QuickLeadFollowupModal
        isOpen={isFollowupOpen}
        lead={followupLead}
        initialLastContactDate={toDateInput(new Date())}
        onClose={() => {
          setIsFollowupOpen(false)
          setFollowupLead(null)
        }}
        onSaved={handleFollowupSaved}
      />
    </div>
  )
}
