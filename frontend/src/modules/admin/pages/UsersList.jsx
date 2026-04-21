import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import Pagination from '../../../components/Pagination.jsx'
import SearchInput from '../../../components/SearchInput.jsx'
import PageHeader from '../../../components/PageHeader.jsx'
import { Icon } from '../../../layouts/icons.jsx'
import { usersApi } from '../../../services/users.js'
import { confirmToast } from '../../../utils/confirmToast.jsx'
import { useAuth } from '../../../context/AuthContext'
import { useDebouncedValue } from '../../../utils/useDebouncedValue.js'
import { useToastFeedback } from '../../../utils/useToastFeedback.js'
import { rolesApi } from '../../../services/roles.js'

const DEFAULT_ROLE_OPTIONS = ['Admin', 'Manager', 'Accountant', 'Employee']

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString()
}

function stopRowNavigation(event) {
  event.stopPropagation()
}

export default function UsersList() {
  const navigate = useNavigate()
  const { user: currentUser, logout } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const qParam = searchParams.get('q') || ''
  const statusParam = searchParams.get('status') || ''
  const roleParam = searchParams.get('role') || ''
  const pageParam = Math.max(1, Number(searchParams.get('page') || 1) || 1)
  const rawLimitParam = (searchParams.get('limit') || '20').trim().toLowerCase()
  const limitParam =
    rawLimitParam === 'all' ? 'all' : Math.min(100, Math.max(1, Number(rawLimitParam) || 20))

  const [items, setItems] = useState([])
  const [availableRoles, setAvailableRoles] = useState([])
  const [q, setQ] = useState(qParam)
  const [status, setStatus] = useState(statusParam)
  const [role, setRole] = useState(roleParam)
  const [page, setPage] = useState(pageParam)
  const [limit, setLimit] = useState(limitParam)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedUsers, setSelectedUsers] = useState([])
  useToastFeedback({ error })

  const debouncedQ = useDebouncedValue(q, 250)

  useEffect(() => setQ(qParam), [qParam])
  useEffect(() => setStatus(statusParam), [statusParam])
  useEffect(() => setRole(roleParam), [roleParam])
  useEffect(() => setPage(pageParam), [pageParam])
  useEffect(() => setLimit(limitParam), [limitParam])

  const desiredParams = useMemo(() => {
    const next = new URLSearchParams()
    const trimmedQ = debouncedQ.trim()
    if (trimmedQ) next.set('q', trimmedQ)
    if (status.trim()) next.set('status', status.trim())
    if (role.trim()) next.set('role', role.trim())
    if (page > 1) next.set('page', String(page))
    if (String(limit) !== '20') next.set('limit', String(limit))
    return next
  }, [debouncedQ, status, role, page, limit])

  useEffect(() => {
    if (desiredParams.toString() === searchParams.toString()) return
    setSearchParams(desiredParams, { replace: true })
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
        ...(currentUser?.role === 'Admin' ? { all: true } : null),
        page,
        limit,
      })
      .then((res) => {
        if (canceled) return
        setItems(res.items || [])
        setTotal(Number(res.total) || 0)
        setSelectedUsers([]) // Clear selection when data changes
      })
      .catch((e) => {
        if (canceled) return
        setError(e.message || 'Failed to load users')
      })
      .finally(() => {
        if (canceled) return
        setLoading(false)
      })

    return () => {
      canceled = true
    }
  }, [debouncedQ, status, role, page, limit])

  useEffect(() => {
    rolesApi.list()
      .then((data) => setAvailableRoles(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  const isAdminOrManager = currentUser?.role === 'Admin' || currentUser?.role === 'Manager'

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedUsers(items.map(user => user.id))
    } else {
      setSelectedUsers([])
    }
  }

  const handleSelectUser = (userId, checked) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId])
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId))
    }
  }

  const isAllSelected = items.length > 0 && selectedUsers.length === items.length
  const isSomeSelected = selectedUsers.length > 0 && selectedUsers.length < items.length

  async function onBulkDelete() {
    if (selectedUsers.length === 0) return

    const confirmed = await confirmToast(`Are you sure you want to move ${selectedUsers.length} user(s) to trash?`, {
      confirmLabel: 'Move to Trash',
      type: 'danger',
    })
    if (!confirmed) return

    try {
      // Delete users one by one
      const deletePromises = selectedUsers.map(id => usersApi.remove(id))
      await Promise.all(deletePromises)
      
      toast.success(`${selectedUsers.length} user(s) moved to trash`)
      
      // Check if current user is being deleted
      const currentUserId = String(currentUser?.id || currentUser?._id || '')
      if (selectedUsers.includes(currentUserId)) {
        await logout()
        navigate('/login', { replace: true })
        return
      }
      
      // Remove deleted users from items
      setItems(prev => prev.filter(user => !selectedUsers.includes(user.id)))
      setTotal(prev => Math.max(0, prev - selectedUsers.length))
      setSelectedUsers([])
    } catch (e) {
      setError(e.message || 'Bulk delete failed')
    }
  }

  async function onDelete(id) {
    const confirmed = await confirmToast('Are you sure you want to move this user to trash?', {
      confirmLabel: 'Move to Trash',
      type: 'danger',
    })
    if (!confirmed) return

    const isSelfDelete = String(id) === String(currentUser?.id || currentUser?._id || '')

    try {
      await usersApi.remove(id)
      toast.success(isSelfDelete ? 'Your account was moved to trash' : 'User moved to trash')
      if (isSelfDelete) {
        await logout()
        navigate('/login', { replace: true })
        return
      }
      setItems((prev) => prev.filter((x) => x.id !== id))
      setTotal((t) => Math.max(0, (Number(t) || 0) - 1))
    } catch (e) {
      setError(e.message || 'Delete failed')
    }
  }

  return (
    <div className="stack">
      <PageHeader
        title="Users"
        backTo="/"
        actions={
          <div className="tableActions">
            {selectedUsers.length > 0 && (
              <button 
                className="btn danger" 
                onClick={onBulkDelete}
                title={`Delete ${selectedUsers.length} selected user(s)`}
              >
                Delete Selected ({selectedUsers.length})
              </button>
            )}
            <button 
              className="btn primary" 
              onClick={() => {
                navigate('/users/new')
              }} 
              title="Add User"
            >
              Add User
            </button>
          </div>
        }
      />

      <div className="muted">
        Showing {items.length} of {total} users
      </div>

      <div className="filters">
        <SearchInput
          placeholder="Search name/email/phone..."
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setPage(1)
          }}
        />
        <select
          className="input"
          value={role}
          onChange={(e) => {
            setRole(e.target.value)
            setPage(1)
          }}
        >
          <option value="">All Roles</option>
          {Array.isArray(availableRoles) && availableRoles.length > 0 ? (
            availableRoles.map((roleItem) => {
              const roleName =
                typeof roleItem === 'string' ? roleItem : (roleItem?.name || roleItem?.role || '')
              if (!roleName) return null
              const key =
                typeof roleItem === 'string'
                  ? roleItem
                  : (roleItem?.id ?? roleItem?._id ?? roleName)
              return (
                <option key={key} value={roleName}>
                  {roleName}
                </option>
              )
            })
          ) : (
            DEFAULT_ROLE_OPTIONS.map((roleOption) => (
              <option key={roleOption} value={roleOption}>
                {roleOption}
              </option>
            ))
          )}
        </select>
        <select
          className="input"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(1)
          }}
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {error ? <div className="alert error">{error}</div> : null}

      {loading ? (
        <div className="muted">Loading...</div>
      ) : (
        <>
          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  {isAdminOrManager && (
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
                  )}
                  <th style={{ width: '60px' }} className="mobile-hide">PROFILE</th>
                  <th style={{ minWidth: '160px' }}>NAME & ROLE</th>
                  <th style={{ minWidth: '180px' }} className="tablet-hide">EMAIL</th>
                  <th style={{ width: '120px' }} className="tablet-hide">DEPARTMENT</th>
                  <th style={{ width: '130px' }} className="mobile-hide">PHONE</th>
                  <th style={{ width: '130px' }}>STATUS</th>
                  <th style={{ width: '150px' }} className="tablet-hide">JOINED DATE</th>
                  {isAdminOrManager && <th style={{ width: '90px' }} className="text-right mobile-hide">ACTION</th>}
                </tr>
              </thead>
              <tbody>
                {items.length ? (
                  items.map((user) => (
                    <tr
                      key={user.id}
                      className="tableRowLink"
                      onClick={() => {
                        navigate(`/users/${user.id}`)
                      }}
                    >
                      {isAdminOrManager && (
                        <td onClick={stopRowNavigation}>
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.id)}
                            onChange={(e) => handleSelectUser(user.id, e.target.checked)}
                            onClick={stopRowNavigation}
                          />
                        </td>
                      )}
                      <td className="mobile-hide">
                        {user.profile_photo ? (
                          <img
                            className="tableAvatarImage"
                            src={user.profile_photo}
                            alt={user.name || user.username || 'User'}
                          />
                        ) : (
                          <div className="avatar tableAvatarFallback">
                            {(user.name || user.username || 'U').charAt(0).toUpperCase()}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="userIdentity">
                          <div>
                            <Link
                              className="tableLink"
                              to={`/users/${user.id}`}
                              onClick={stopRowNavigation}
                            >
                              {user.name || user.username || '-'}
                            </Link>
                            <div className="muted extra-small" style={{ fontSize: '0.8rem', marginTop: '2px' }}>
                              {user.role || 'Admin'}
                            </div>
                            {/* Show key details and actions under name on mobile only */}
                            <div className="mobile-only-block" style={{ marginTop: '4px' }}>
                              <div className="muted xsmall" style={{ marginBottom: '6px' }}>
                                {user.phone || user.status || '-'}
                              </div>
                              {isAdminOrManager && (
                                <div className="tableActions" style={{ justifyContent: 'flex-start', gap: '8px' }}>
                                  <Link className="iconBtn small" to={`/users/${user.id}/edit`} title="Edit" onClick={stopRowNavigation}><Icon name="edit" /></Link>
                                  <button className="iconBtn text-danger small" type="button" onClick={(e) => { stopRowNavigation(e); onDelete(user.id); }} title="Delete"><Icon name="trash" /></button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="tablet-hide">
                        <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>{user.email || '-'}</div>
                      </td>
                      <td className="tablet-hide">
                        <div className="badge secondary" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                          {user.department || 'Employee'}
                        </div>
                      </td>
                      <td className="mobile-hide">
                        <div style={{ fontSize: '0.82rem' }}>{user.phone || '-'}</div>
                      </td>
                      <td>
                        <div className={`badge-modern ${user.status === 'active' ? 'success' : user.status === 'pending' ? 'warning' : 'danger'}`}>
                          <span className="badge-dot"></span>
                          {user.status === 'active' ? 'Active' : user.status === 'pending' ? 'Pending' : 'Inactive'}
                        </div>
                      </td>
                      <td className="tablet-hide">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.85rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                            {new Date(user.joining_date || user.created_at || Date.now()).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {new Date(user.joining_date || user.created_at || Date.now()).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </td>
                      {isAdminOrManager ? (
                        <td className="text-right mobile-hide">
                          <div className="tableActions">
                            <button
                              className="iconBtn"
                              onClick={(e) => {
                                stopRowNavigation(e)
                                navigate(`/users/${user.id}/edit`)
                              }}
                              title="Edit user"
                            >
                              <Icon name="edit" />
                            </button>
                            <button
                              className="iconBtn text-danger"
                              type="button"
                              onClick={(event) => {
                                stopRowNavigation(event)
                                onDelete(user.id)
                              }}
                              title="Delete user"
                              aria-label="Delete user"
                            >
                              <Icon name="trash" />
                            </button>
                          </div>
                        </td>
                      ) : (
                        <td className="text-right mobile-hide" />
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={isAdminOrManager ? 9 : 8}>
                      <div className="emptyState">
                        <div className="emptyStateTitle">No users found</div>
                        <div className="emptyStateText">
                          Add CRM users and link them to companies so account ownership is easier to manage.
                        </div>
                        <button 
                          className="btn primary" 
                          onClick={() => {
                            navigate('/users/new')
                          }}
                        >
                          + New User
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
    </div>
  )
}
