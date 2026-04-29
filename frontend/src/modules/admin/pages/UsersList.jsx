import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import PageHeader from '../../../components/PageHeader.jsx'
import Pagination from '../../../components/Pagination.jsx'
import LottieLoader from '../../../components/LottieLoader.jsx'
import LottieEmpty from '../../../components/LottieEmpty.jsx'
import { Icon } from '../../../layouts/icons.jsx'
import { usersApi } from '../../../services/users.js'
import { rolesApi } from '../../../services/roles.js'
import { confirmToast } from '../../../utils/confirmToast.jsx'
import { useAuth } from '../../../context/AuthContext'
import { useDebouncedValue } from '../../../utils/useDebouncedValue.js'
import { useToastFeedback } from '../../../utils/useToastFeedback.js'
import UserForm from './UserForm.jsx'

function stopRowNavigation(event) {
  event.stopPropagation()
}

export default function UsersList() {
  const navigate = useNavigate()
  const { user: currentUser, logout } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const isAdmin = currentUser?.role === 'Admin'
  const isAdminOrManager = isAdmin || currentUser?.role === 'Manager'

  const qParam = searchParams.get('q') || ''
  const statusParam = searchParams.get('status') || ''
  const roleParam = searchParams.get('role') || ''
  const pageParam = Math.max(1, Number(searchParams.get('page') || 1) || 1)
  const limitParam =
    (searchParams.get('limit') || '20').trim().toLowerCase() === 'all'
      ? 'all'
      : Math.min(100, Math.max(1, Number(searchParams.get('limit') || 20) || 20))

  const isHR = currentUser?.role === 'HR'
  const initialRole = isHR ? 'Employee' : roleParam
  const [items, setItems] = useState([])
  const [availableRoles, setAvailableRoles] = useState([])
  const [q, setQ] = useState(qParam)
  const [status, setStatus] = useState(statusParam)
  const [role, setRole] = useState(initialRole)
  const [page, setPage] = useState(pageParam)
  const [limit, setLimit] = useState(limitParam)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedUsers, setSelectedUsers] = useState([])
  const [formModal, setFormModal] = useState({ open: false, mode: 'create', userId: null })

  const closeFormModal = () => {
    const newParams = new URLSearchParams(searchParams)
    newParams.delete('add')
    newParams.delete('edit')
    setSearchParams(newParams)
  }

  useEffect(() => {
    const add = searchParams.get('add')
    const edit = searchParams.get('edit')
    if (add === 'true') {
      setFormModal({ open: true, mode: 'create', userId: null })
    } else if (edit) {
      setFormModal({ open: true, mode: 'edit', userId: edit })
    } else {
      setFormModal({ open: false, mode: 'create', userId: null })
    }
  }, [searchParams])

  useToastFeedback({ error })
  const debouncedQ = useDebouncedValue(q, 500)

  useEffect(() => {
    rolesApi.list().then((res) => setAvailableRoles(Array.isArray(res) ? res : [])).catch(() => { })
  }, [])

  const desiredParams = useMemo(() => {
    const next = new URLSearchParams()
    if (debouncedQ.trim()) next.set('q', debouncedQ.trim())
    if (status.trim()) next.set('status', status.trim())
    if (role.trim()) next.set('role', role.trim())
    if (page > 1) next.set('page', String(page))
    if (String(limit) !== '20') next.set('limit', String(limit))

    // Preserve modal state
    const add = searchParams.get('add')
    const edit = searchParams.get('edit')
    if (add) next.set('add', add)
    if (edit) next.set('edit', edit)

    return next
  }, [debouncedQ, status, role, page, limit, searchParams])

  useEffect(() => {
    if (desiredParams.toString() !== searchParams.toString()) {
      setSearchParams(desiredParams, { replace: true })
    }
  }, [desiredParams, searchParams, setSearchParams])

  useEffect(() => {
    let canceled = false
    setLoading(true)
    setError('')

    usersApi
      .list({
        ...(debouncedQ.trim() ? { q: debouncedQ.trim() } : null),
        ...(status.trim() ? { status: status.trim() } : null),
        ...(role.trim() ? { role: role.trim() } : null),
        ...(isAdmin ? { all: true } : null),
        page,
        limit,
      })
      .then((res) => {
        if (canceled) return
        setItems(res.items || [])
        setTotal(Number(res.total) || 0)
        setSelectedUsers([])
      })
      .catch((e) => {
        if (canceled) return
        setError(e.message || 'Failed to load users')
      })
      .finally(() => {
        if (canceled) return
        setLoading(false)
      })

    return () => { canceled = true }
  }, [debouncedQ, status, role, page, limit, isAdmin])

  const refreshList = () => {
    setLoading(true)
    usersApi.list({
      ...(debouncedQ.trim() ? { q: debouncedQ.trim() } : null),
      ...(status.trim() ? { status: status.trim() } : null),
      ...(role.trim() ? { role: role.trim() } : null),
      ...(isAdmin ? { all: true } : null),
      page,
      limit
    }).then(res => {
      setItems(res.items || [])
      setTotal(Number(res.total) || 0)
    }).finally(() => setLoading(false))
  }

  const handleSelectAll = (checked) =>
    setSelectedUsers(checked ? items.map((u) => String(u.id || u._id || '')) : [])

  const handleSelectUser = (id, checked) =>
    setSelectedUsers((prev) =>
      checked ? (prev.includes(String(id)) ? prev : [...prev, String(id)]) : prev.filter((x) => x !== String(id)),
    )

  async function onBulkDelete() {
    if (!isAdmin || selectedUsers.length === 0) return
    const confirmed = await confirmToast(`Move ${selectedUsers.length} users to trash?`, {
      confirmLabel: 'Move to Trash',
      type: 'danger',
    })
    if (!confirmed) return

    try {
      await Promise.all(selectedUsers.map((id) => usersApi.remove(id)))
      toast.success('Users moved to trash')

      const currentId = String(currentUser?.id || currentUser?._id || '')
      if (selectedUsers.includes(currentId)) {
        await logout()
        navigate('/login')
        return
      }

      setItems((prev) => prev.filter((u) => !selectedUsers.includes(String(u.id || u._id))))
      setTotal((t) => Math.max(0, t - selectedUsers.length))
      setSelectedUsers([])
    } catch (e) {
      toast.error(e.message)
    }
  }

  async function onDelete(id) {
    if (!isAdmin) return
    const confirmed = await confirmToast('Move this user to trash?', {
      confirmLabel: 'Move to Trash',
      type: 'danger',
    })
    if (!confirmed) return

    const isSelf = String(id) === String(currentUser?.id || currentUser?._id || '')

    try {
      await usersApi.remove(id)
      toast.success('User moved to trash')
      if (isSelf) {
        await logout()
        navigate('/login')
        return
      }
      setItems((prev) => prev.filter((x) => String(x.id || x._id) !== String(id)))
      setTotal((t) => Math.max(0, t - 1))
    } catch (e) {
      toast.error(e.message)
    }
  }

  const isAllSelected = items.length > 0 && selectedUsers.length === items.length
  const isSomeSelected = selectedUsers.length > 0 && selectedUsers.length < items.length

  return (
    <div className="stack">
      <section className="crm-fullscreen-shell">
        <div className="users-page-header">
          <h1 className="users-title">Users Management</h1>
          <p className="users-subtitle">Overview of team access and identity control</p>
        </div>

        <div className="crm-stats-bar-compact">
          <div className="stat-pill-mini">
            <span className="stat-pill-label">TOTAL</span>
            <span className="stat-pill-value total">{total}</span>
          </div>
          <div className="stat-pill-mini">
            <span className="stat-pill-label">ACTIVE</span>
            <span className="stat-pill-value active">{items.filter(u => u.status === 'active').length}</span>
          </div>
          <div className="stat-pill-mini">
            <span className="stat-pill-label">INACTIVE</span>
            <span className="stat-pill-value inactive">{items.filter(u => u.status === 'inactive').length}</span>
          </div>
          <div className="stat-pill-mini">
            <span className="stat-pill-label">PENDING</span>
            <span className="stat-pill-value pending">{items.filter(u => u.status === 'pending').length}</span>
          </div>
        </div>

        <div className="unified-action-bar">
          <button
            className="btn-premium-mini add-user-btn"
            onClick={() => {
              const next = new URLSearchParams(searchParams)
              next.set('add', 'true')
              setSearchParams(next)
            }}
          >
            <Icon name="plus" size={16} />
            <span>Add New User</span>
          </button>

          <div className="search-filter-group">
            <div className="crm-search-input-wrap">
              <Icon name="search" className="search-icon" />
              <input
                type="text"
                placeholder="Search users..."
                className="crm-input"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value)
                  setPage(1)
                }}
              />
            </div>

            {!isHR && (
              <select
                className="crm-input filter-select"
                value={role}
                onChange={(e) => {
                  setRole(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">All Roles</option>
                {availableRoles.map((r) => {
                  const count = items.filter(u => u.role === r.name).length
                  return (
                    <option key={r.id || r._id} value={r.name}>
                      {r.name} {count > 0 ? `(${count})` : ''}
                    </option>
                  )
                })}
              </select>
            )}

            <select
              className="crm-input filter-select"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setPage(1)
              }}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
            </select>

            {(q || role || status) && (
              <button 
                className="btn-clear-filters"
                onClick={() => {
                  setQ('')
                  setRole('')
                  setStatus('')
                  setPage(1)
                }}
              >
                Clear Filters
              </button>
            )}

            {isAdmin && selectedUsers.length > 0 && (
              <div className="bulk-actions-group">
                <button className="btn-bulk action-danger" onClick={onBulkDelete}>
                  <Icon name="trash" size={14} />
                  <span>Delete ({selectedUsers.length})</span>
                </button>
                <button className="btn-bulk action-secondary" title="Change status for selected">
                  <Icon name="refresh" size={14} />
                  <span>Update Status</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {error ? <div className="alert error glass-alert">{error}</div> : null}

        {loading ? (
          <LottieLoader message="Fetching team members..." />
        ) : (
          <>
            {items.length === 0 ? (
              <LottieEmpty 
                message="No users found" 
                description="We couldn't find any users matching your current filters. Try resetting or adjusting your search." 
              />
            ) : (
              <>
                <div className="crm-table-wrap shadow-soft" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <div className="crm-table-scroll">
                    <table className="crm-table">
                      <thead style={{ background: 'var(--bg-elevated)' }}>
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
                          <th style={{ minWidth: '220px' }}>IDENTITY & ACCESS</th>
                          <th style={{ minWidth: '220px' }} className="tablet-hide">
                            EMAIL ADDRESS
                          </th>
                          <th style={{ minWidth: '160px' }}>STATUS</th>
                          <th style={{ minWidth: '170px' }} className="tablet-hide">
                            JOINED DATE
                          </th>
                          <th className="text-right" style={{ width: '130px' }}>
                            ACTIONS
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((user) => {
                          const id = user.id || user._id
                          const isSelected = selectedUsers.includes(String(id))

                          return (
                            <tr
                              key={String(id)}
                              className={`crm-table-row ${isSelected ? 'selected' : ''}`}
                              onClick={() => navigate(`/users/${id}`)}
                              style={{ borderBottom: '1px solid var(--border)' }}
                            >
                              {isAdminOrManager ? (
                                <td onClick={stopRowNavigation}>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => handleSelectUser(id, e.target.checked)}
                                  />
                                </td>
                              ) : null}
                              <td className="mobile-hide">
                                {user.profile_photo ? (
                                  <img className="users-avatar-img" src={user.profile_photo} alt={user.name} />
                                ) : (
                                  <div className="tableAvatarFallback">
                                    {(user.name || user.username || user.email || 'U').charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </td>
                              <td>
                                <div className="usersIdentityCell">
                                  <div className="usersPrimaryText">{user.name || user.username || '—'}</div>
                                  <span className={`user-role-badge ${user.role?.toUpperCase()}`}>
                                    {user.role || 'Personnel'}
                                  </span>
                                </div>
                              </td>
                              <td className="tablet-hide">
                                <div className="usersEmailText">{user.email || '—'}</div>
                              </td>
                              <td>
                                <span className={`crm-status-pill-modern ${user.status === 'active' ? 'status-active' : user.status === 'pending' ? 'status-pending' : 'status-inactive'}`}>
                                  <div className="status-dot" />
                                  {user.status || 'PENDING'}
                                </span>
                              </td>
                              <td className="tablet-hide">
                                <div className="usersDateCell">
                                  <span className="usersDateMain">
                                    {new Date(user.joining_date || user.created_at || Date.now()).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                    })}
                                  </span>
                                </div>
                              </td>
                              <td className="text-right" onClick={stopRowNavigation}>
                                <div className="crm-action-group">
                                  <button
                                    className="modern-action-btn"
                                    onClick={() => {
                                      const next = new URLSearchParams(searchParams)
                                      next.set('edit', String(id))
                                      setSearchParams(next)
                                    }}
                                    title="Edit Identity"
                                  >
                                    <Icon name="edit" size={14} />
                                  </button>
                                  {isAdmin ? (
                                    <button
                                      className="modern-action-btn danger"
                                      onClick={() => onDelete(id)}
                                      title="Delete Record"
                                    >
                                      <Icon name="trash" size={14} />
                                    </button>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
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
          </>
        )}
      </section>

      <style>{`
         .crm-table th {
            padding: 18px 24px !important;
            font-size: 0.7rem !important;
            font-weight: 800 !important;
            color: var(--primary) !important;
            letter-spacing: 0.1em !important;
            text-transform: uppercase !important;
            border-bottom: 2px solid var(--border) !important;
            opacity: 0.9;
         }

         .crm-table-row { transition: background 0.2s ease, transform 0.1s ease; cursor: pointer; border-bottom: 1px solid var(--border) !important; }
         .crm-table-row:hover { background: var(--bg-hover) !important; }
         .crm-table-row td { padding: 16px 24px !important; }
         
         .tableAvatarFallback { 
            width: 44px; 
            height: 44px; 
            border-radius: 50%; 
            color: white; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            font-weight: 800; 
            font-size: 1.1rem; 
            text-shadow: 0 1px 2px rgba(0,0,0,0.1);
         }
         /* Dynamic background colors for initials */
         .crm-table-row:nth-child(3n+1) .tableAvatarFallback { background: #3b82f6; } /* Blue */
         .crm-table-row:nth-child(3n+2) .tableAvatarFallback { background: #10b981; } /* Green */
         .crm-table-row:nth-child(3n+3) .tableAvatarFallback { background: #8b5cf6; } /* Purple */
         
         .users-avatar-img { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; box-shadow: var(--shadow-sm); }
         
         .usersIdentityCell { display: flex; flex-direction: column; gap: 4px; }
         .usersPrimaryText { color: var(--text); font-size: 0.95rem; font-weight: 700; }
         
         .user-role-badge { 
            padding: 2px 10px; 
            border-radius: 6px; 
            font-size: 10px; 
            font-weight: 800; 
            text-transform: uppercase; 
            width: fit-content;
            color: white;
         }
         .user-role-badge.HR { background: #7C3AED; }
         .user-role-badge.EMPLOYEE { background: #3B82F6; }
         .user-role-badge.ADMIN { background: #ef4444; }
         .user-role-badge.MANAGER { background: #f59e0b; }
         
         .crm-action-group { display: flex; gap: 12px; justify-content: flex-end; }
         .modern-action-btn { width: 36px; height: 36px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-dimmed); display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; cursor: pointer; }
         .modern-action-btn:hover { color: var(--primary); border-color: var(--primary); transform: translateY(-1px); }
         .modern-action-btn.danger:hover { background: var(--bg-hover); color: var(--danger); border-color: var(--danger); }
         .users-page-header { margin-bottom: 24px; }
         .users-title { font-size: 1.5rem; font-weight: 800; color: var(--text); margin-bottom: 4px; }
         .users-subtitle { font-size: 0.9rem; color: var(--text-dimmed); font-weight: 500; }

         .unified-action-bar { 
            display: flex; 
            align-items: center; 
            justify-content: space-between; 
            gap: 20px; 
            margin-bottom: 24px; 
            flex-wrap: wrap;
         }
         .search-filter-group { 
            display: flex; 
            align-items: center; 
            gap: 12px; 
            flex: 1; 
            justify-content: flex-end; 
         }
         .filter-select { max-width: 160px; }
         
         .btn-clear-filters { 
            background: none; 
            border: none; 
            color: var(--primary); 
            font-weight: 700; 
            font-size: 0.85rem; 
            cursor: pointer; 
            padding: 4px 8px; 
            transition: all 0.2s; 
         }
         .btn-clear-filters:hover { text-decoration: underline; color: var(--primary-hover); }

         .crm-stats-bar-compact { display: flex; flex-wrap: wrap; gap: 20px; align-items: center; margin-bottom: 32px; }
         .stat-pill-mini { background: var(--bg-card); border: 1px solid var(--border); padding: 16px 24px; border-radius: 16px; display: flex; flex-direction: column; gap: 4px; min-width: 160px; box-shadow: var(--shadow-sm); }
         .stat-pill-label { font-size: 11px; font-weight: 800; color: var(--text-dimmed); text-transform: uppercase; letter-spacing: 0.05em; }
         .stat-pill-value { font-size: 24px; font-weight: 900; }
         .stat-pill-value.total { color: var(--text); }
         .stat-pill-value.active { color: var(--success); }
         .stat-pill-value.inactive { color: var(--text-dimmed); }
         .stat-pill-value.pending { color: var(--warning); }

         .crm-table-wrap { border-radius: 20px; overflow: hidden; }

         .crm-input { width: 100%; background: var(--bg-surface) !important; border: 1px solid var(--border-strong) !important; border-radius: 12px !important; padding: 10px 16px !important; color: var(--text) !important; font-size: 0.9rem !important; transition: all 0.2s; }
         .crm-search-input-wrap { position: relative; width: 100%; max-width: 300px; }
         .crm-search-input-wrap .search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); z-index: 1; color: var(--text-dimmed); }
         .crm-search-input-wrap .crm-input { padding-left: 40px !important; }
         
         .add-user-btn { background: var(--primary) !important; color: white !important; border: none !important; border-radius: 12px !important; padding: 10px 20px !important; font-weight: 700 !important; height: 42px; display: flex; align-items: center; gap: 8px; }
         .add-user-btn:hover { background: var(--primary-hover) !important; transform: translateY(-1px); }

         .bulk-actions-group { display: flex; gap: 8px; align-items: center; padding-left: 12px; border-left: 2px solid var(--border); margin-left: 8px; }
         .btn-bulk { background: var(--bg-card); border: 1px solid var(--border); padding: 8px 14px; border-radius: 10px; font-size: 0.8rem; font-weight: 700; display: flex; align-items: center; gap: 6px; cursor: pointer; transition: all 0.2s; color: var(--text-muted); }
         .btn-bulk:hover { border-color: var(--primary); color: var(--primary); }
         .btn-bulk.action-danger { color: var(--danger); }
         .btn-bulk.action-danger:hover { background: var(--bg-hover); border-color: var(--danger); }

         @media (max-width: 1100px) {
            .unified-action-bar { flex-direction: column; align-items: stretch; }
            .search-filter-group { flex-wrap: wrap; justify-content: flex-start; }
            .crm-search-input-wrap { max-width: none; flex: 1 1 100%; }
            .filter-select { flex: 1; max-width: none; }
         }

         @media (max-width: 600px) {
            .crm-stats-bar-compact { 
               display: grid; 
               grid-template-columns: 1fr 1fr; 
               gap: 12px; 
            }
            .stat-pill-mini { min-width: 0; padding: 12px; }
            .stat-pill-value { font-size: 1.2rem; }
            .stat-pill-label { font-size: 10px; }
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
            gap: 8px;
         }
         .status-dot { width: 8px; height: 8px; border-radius: 50%; }
         .status-active { background: var(--bg-hover); color: var(--success); border: 1px solid var(--border); }
         .status-active .status-dot { background: var(--success); }
         .status-pending { background: var(--bg-hover); color: var(--warning); border: 1px solid var(--border); }
         .status-pending .status-dot { background: var(--warning); }
         .status-inactive { background: var(--bg-hover); color: var(--text-dimmed); border: 1px solid var(--border); }
         .status-inactive .status-dot { background: var(--text-dimmed); }

         @media (max-width: 900px) {
            .modern-filter-panel { flex-direction: column; align-items: stretch; }
         }
       `}</style>

      {formModal.open && (
        <UserForm
          mode={formModal.mode}
          userId={formModal.userId}
          onCancel={closeFormModal}
          onSuccess={() => {
            closeFormModal()
            refreshList()
          }}
        />
      )}
    </div>
  )
}
