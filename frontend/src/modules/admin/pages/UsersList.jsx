import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import PageHeader from '../../../components/PageHeader.jsx'
import Pagination from '../../../components/Pagination.jsx'
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
  const debouncedQ = useDebouncedValue(q, 250)

  useEffect(() => {
    rolesApi.list().then((res) => setAvailableRoles(Array.isArray(res) ? res : [])).catch(() => {})
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
        <PageHeader
          title="Users"
          description="View and manage all your team members and their account settings."
          backTo="/"
          actions={
            <div className="crm-flex-end crm-gap-12">
              {isAdmin && selectedUsers.length > 0 && (
                <button className="btn-premium action-secondary text-danger" onClick={onBulkDelete}>
                  <Icon name="trash" size={16} />
                  <span>Delete ({selectedUsers.length})</span>
                </button>
              )}
               <button 
                 className="btn-premium action-vibrant" 
                 onClick={() => {
                   const next = new URLSearchParams(searchParams)
                   next.set('add', 'true')
                   setSearchParams(next)
                 }}
               >
                 <Icon name="plus" size={16} />
                 <span>Add New User</span>
               </button>
            </div>
          }
        />

        <div className="crm-filter-panel">
          <div className="crm-filter-cell">
            <label className="crm-filter-label">Search Users</label>
            <div className="crm-search-input-wrap">
              <Icon name="search" className="search-icon" />
              <input
                type="text"
                placeholder="Search by name, email..."
                value={q}
                onChange={(e) => {
                  setQ(e.target.value)
                  setPage(1)
                }}
              />
            </div>
          </div>
          {!isHR && (
            <div className="crm-filter-cell">
              <label className="crm-filter-label">Role</label>
              <select
                className="crm-input"
                value={role}
                onChange={(e) => {
                  setRole(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">All Roles</option>
                {availableRoles.map((r) => (
                  <option key={r.id || r._id} value={r.name}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="crm-filter-cell">
            <label className="crm-filter-label">Status</label>
            <select
              className="crm-input"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setPage(1)
              }}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {error ? <div className="alert error glass-alert">{error}</div> : null}

        {loading ? (
          <div className="leadsLoadingState">
            <div className="spinner-medium" />
            <span className="muted">Synchronizing personnel data...</span>
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
                    {items.length > 0 ? (
                      items.map((user) => {
                        const id = user.id || user._id
                        const isSelected = selectedUsers.includes(String(id))

                        return (
                          <tr
                            key={String(id)}
                            className={`crm-table-row ${isSelected ? 'selected' : ''}`}
                            onClick={() => navigate(`/users/${id}`)}
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
                                <img style={{ width: '44px', height: '44px', borderRadius: '12px' }} src={user.profile_photo} alt={user.name} />
                              ) : (
                                <div className="tableAvatarFallback">
                                  {(user.name || user.username || 'U').charAt(0).toUpperCase()}
                                </div>
                              )}
                            </td>
                            <td>
                              <div className="usersIdentityCell">
                                <div className="usersPrimaryText">{user.name || user.username || '—'}</div>
                                <div className="usersSecondaryText">{user.role || 'Personnel'}</div>
                              </div>
                            </td>
                            <td className="tablet-hide">
                              <div className="usersEmailText">{user.email || '—'}</div>
                            </td>
                            <td>
                              <span
                                className={`crm-status-pill ${user.status === 'active' ? 'success' : user.status === 'pending' ? 'warning' : 'danger'}`}
                              >
                                {user.status || 'PENDING'}
                              </span>
                            </td>
                            <td className="tablet-hide">
                              <div className="usersDateCell">
                                <span className="usersDateMain">
                                  {new Date(user.joining_date || user.created_at || Date.now()).toLocaleDateString()}
                                </span>
                                <span className="usersDateSub">
                                  {new Date(user.joining_date || user.created_at || Date.now()).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                            </td>
                            <td className="text-right" onClick={stopRowNavigation}>
                              <div className="crm-action-group">
                                <button
                                  className="crm-action-btn"
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
                                    className="crm-action-btn danger"
                                    onClick={() => onDelete(id)}
                                    title="Purge Record"
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
                        <td colSpan={isAdminOrManager ? 7 : 6}>
                          <div className="emptyState" style={{ padding: '80px 0' }}>
                            <h3>No personnel found</h3>
                            <p className="muted">Expand filters or onboard a new team member.</p>
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
      
       <style>{`
         .tableAvatarFallback { width: 44px; height: 44px; border-radius: 12px; background: rgba(59, 130, 246, 0.1); color: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.1rem; }
         .usersIdentityCell { display: flex; flex-direction: column; gap: 2px; }
         .usersPrimaryText { color: var(--text); font-size: 1rem; font-weight: 700; }
         .usersSecondaryText { color: var(--text-dimmed); font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
         .usersEmailText { color: var(--text-muted); font-size: 0.9rem; font-weight: 600; }
         .usersDateCell { display: flex; flex-direction: column; gap: 2px; }
         .usersDateMain { color: var(--text); font-size: 0.9rem; font-weight: 700; }
         .usersDateSub { color: var(--text-dimmed); font-size: 0.75rem; }
 
         .crm-action-group { display: flex; gap: 8px; justify-content: flex-end; }
         .crm-action-btn { width: 36px; height: 36px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-surface); color: var(--text-muted); display: flex; align-items: center; justify-content: center; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer; }
         .crm-action-btn:hover { background: var(--primary-soft); color: var(--primary); border-color: var(--primary); transform: translateY(-2px); box-shadow: 0 4px 12px var(--primary-soft); }
         .crm-action-btn.danger:hover { background: rgba(239, 68, 68, 0.1); color: var(--danger); border-color: var(--danger); box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2); }
         .crm-action-btn svg { width: 16px; height: 16px; }
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
