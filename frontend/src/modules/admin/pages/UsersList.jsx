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
import ModernSearchBar from '../../../components/ModernSearchBar.jsx'
import StatusDropdown from '../../crm/components/StatusDropdown.jsx'

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
  const [summary, setSummary] = useState({ total: 0, byStatus: {} })
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
        setSummary(res.summary || { total: 0, byStatus: {} })
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

  async function onUpdateStatus(id, newStatus) {
    try {
      await usersApi.update(id, { status: newStatus })
      toast.success(`Status updated to ${newStatus}`)
      setItems(prev => prev.map(item => (String(item.id || item._id) === String(id)) ? { ...item, status: newStatus } : item))
    } catch (err) {
      toast.error(err.message || 'Update failed')
    }
  }

  const isAllSelected = items.length > 0 && selectedUsers.length === items.length
  const isSomeSelected = selectedUsers.length > 0 && selectedUsers.length < items.length

  return (
    <div className="stack">
      <section className="crm-fullscreen-shell">
        <div className="users-page-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 className="users-title">Users Management</h1>
              <p className="users-subtitle">Overview of team access and identity control</p>
            </div>
            <button
              className="btn-premium action-vibrant"
              onClick={() => {
                const next = new URLSearchParams(searchParams)
                next.set('add', 'true')
                setSearchParams(next)
              }}
            >
              <Icon name="plus" size={16} />
              <span>Add User</span>
            </button>
          </div>
        </div>

        <div className="crm-stats-bar-compact overflow-x-auto pb-8">
          <div
            className={`stat-pill-mini clickable ${status === '' ? 'is-active' : ''}`}
            onClick={() => { setStatus(''); setPage(1); }}
          >
            <span className="stat-pill-label">ALL USERS</span>
            <span className="stat-pill-value total">{summary.total}</span>
          </div>
          {Object.entries(summary.byStatus).map(([name, count]) => (
            <div 
              key={name} 
              className={`stat-pill-mini clickable ${status === name ? 'is-active' : ''}`} 
              onClick={() => { setStatus(name); setPage(1); }}
            >
              <span className="stat-pill-label">{name.toUpperCase()}</span>
              <span className={`stat-pill-value ${String(name).toLowerCase()}`}>{count}</span>
            </div>
          ))}
        </div>

        <div className="unified-action-bar">

          <div className="search-filter-group">
            <ModernSearchBar
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setPage(1)
              }}
              placeholder="Search by name, username, email, role, phone, tags, address..."
            />

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
                className="btn-premium-mini reset-btn"
                onClick={() => {
                  setQ(''); setRole(''); setStatus('');
                  setPage(1);
                }}
                style={{ height: '42px', width: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                title="Reset Filters"
              >
                <Icon name="refresh" size={14} />
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
                          <th style={{ width: '60px' }}>PROFILE</th>
                          <th style={{ minWidth: '160px' }}>IDENTITY</th>
                          <th style={{ minWidth: '180px' }} className="tablet-hide">
                            CONTACT INFO
                          </th>
                          <th style={{ minWidth: '120px' }}>STATUS</th>
                          <th style={{ minWidth: '130px' }} className="tablet-hide">
                            LOGIN INFO
                          </th>
                          <th style={{ minWidth: '130px' }} className="tablet-hide">
                            JOINED DATE
                          </th>
                          <th className="text-right" style={{ width: '100px' }}>
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
                                <div className="usersPhoneText" style={{ fontSize: '11px', color: 'var(--text-dimmed)', marginTop: '4px' }}>
                                  {user.phone || '—'}
                                </div>
                              </td>
                              <td onClick={stopRowNavigation}>
                                <StatusDropdown 
                                  status={user.status} 
                                  options={[
                                    { name: 'active', color: '#10b981' },
                                    { name: 'inactive', color: '#64748b' },
                                    { name: 'pending', color: '#f59e0b' }
                                  ]} 
                                  onChange={(newStatus) => onUpdateStatus(id, newStatus)}
                                  disabled={!isAdminOrManager}
                                  size="small"
                                />
                              </td>
                              <td className="tablet-hide">
                                <div className="usersLoginCell" style={{ display: 'flex', flexDirection: 'column' }}>
                                  {user.last_login ? (
                                    <>
                                      <span className="usersLoginDate" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                                        {new Date(user.last_login).toLocaleDateString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                          year: 'numeric'
                                        })}
                                      </span>
                                      <span className="usersLoginTime" style={{ fontSize: '11px', color: 'var(--text-dimmed)', marginTop: '2px' }}>
                                        {new Date(user.last_login).toLocaleTimeString('en-US', {
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </span>
                                    </>
                                  ) : (
                                    <span style={{ color: 'var(--text-dimmed)', fontSize: '12px' }}>Never</span>
                                  )}
                                </div>
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
            padding: 12px 16px !important;
            font-size: 0.7rem !important;
            font-weight: 800 !important;
            color: var(--primary) !important;
            letter-spacing: 0.1em !important;
            text-transform: uppercase !important;
            border-bottom: 2px solid var(--border-strong) !important;
            opacity: 0.9;
         }

         .crm-table-row { transition: background 0.2s ease, transform 0.1s ease; cursor: pointer; border-bottom: 1px solid var(--border-strong) !important; }
         .crm-table-row:hover { background: var(--bg-hover) !important; }
         .crm-table-row td { padding: 10px 16px !important; }
         
         .tableAvatarFallback { 
            width: 40px; 
            height: 40px; 
            border-radius: 50%; 
            color: white; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            font-weight: 800; 
            font-size: 1rem; 
            text-shadow: 0 1px 2px rgba(0,0,0,0.1);
         }
         /* Dynamic background colors for initials */
         .crm-table-row:nth-child(3n+1) .tableAvatarFallback { background: #3b82f6; } /* Blue */
         .crm-table-row:nth-child(3n+2) .tableAvatarFallback { background: #10b981; } /* Green */
         .crm-table-row:nth-child(3n+3) .tableAvatarFallback { background: #8b5cf6; } /* Purple */
         
         .users-avatar-img { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; box-shadow: var(--shadow-sm); }
         
         .usersIdentityCell { display: flex; flex-direction: column; gap: 2px; }
         .usersPrimaryText { color: var(--text); font-size: 0.9rem; font-weight: 700; }
         
         .user-role-badge { 
            padding: 2px 8px; 
            border-radius: 4px; 
            font-size: 9px; 
            font-weight: 800; 
            text-transform: uppercase; 
            width: fit-content;
            color: white;
         }
         .user-role-badge.HR { background: #7C3AED; }
         .user-role-badge.EMPLOYEE { background: #3B82F6; }
         .user-role-badge.ADMIN { background: #ef4444; }
         .user-role-badge.MANAGER { background: #f59e0b; }
         .user-role-badge.ACCOUNTANT { background: #0D9488; }
         
         .crm-action-group { display: flex; gap: 8px; justify-content: flex-end; }
         .modern-action-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--border-strong); background: var(--bg-card); color: var(--text-dimmed); display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; cursor: pointer; }
         .modern-action-btn:hover { color: var(--primary); border-color: var(--primary); transform: translateY(-1px); }
         .modern-action-btn.danger:hover { background: var(--bg-hover); color: var(--danger); border-color: var(--danger); }
         .users-page-header { margin-bottom: 8px; }
         .users-title { font-size: 1.3rem; font-weight: 800; color: var(--text); margin-bottom: 2px; }
         .users-subtitle { font-size: 0.85rem; color: var(--text-dimmed); font-weight: 500; }

         .unified-action-bar { 
            display: flex; 
            align-items: center; 
            justify-content: space-between; 
            gap: 16px; 
            margin-bottom: 8px; 
            flex-wrap: wrap;
         }
         .search-filter-group { 
            display: flex; 
            align-items: center; 
            gap: 24px; 
            flex: 1; 
            justify-content: flex-start; 
         }
         .filter-select { max-width: 150px; }
         
         .btn-clear-filters { 
            background: none; 
            border: none; 
            color: var(--primary); 
            font-weight: 700; 
            font-size: 0.8rem; 
            cursor: pointer; 
            padding: 2px 6px; 
            transition: all 0.2s; 
         }
         .btn-clear-filters:hover { text-decoration: underline; color: var(--primary-hover); }

          .crm-stats-bar-compact { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 12px; justify-content: space-between; }
         .stat-pill-mini {
            --stat-accent: var(--card-accent);
            background: color-mix(in srgb, var(--bg-card) 88%, var(--bg-surface) 12%);
            border: 1px solid var(--border-strong);
            padding: 14px 18px;
            border-radius: 16px;
            display: flex;
            flex-direction: column;
            gap: 6px;
            flex: 1;
            min-width: 130px;
            box-shadow: inset 4px 0 0 var(--stat-accent), 0 10px 24px rgba(var(--text-rgb), 0.06);
            transition: all 0.25s ease;
          }
         .crm-stats-bar-compact .stat-pill-mini:nth-child(1) { --stat-accent: #3b82f6; }
         .crm-stats-bar-compact .stat-pill-mini:nth-child(2) { --stat-accent: #10b981; }
         .crm-stats-bar-compact .stat-pill-mini:nth-child(3) { --stat-accent: #f59e0b; }
         .crm-stats-bar-compact .stat-pill-mini:nth-child(4) { --stat-accent: #8b5cf6; }
         .crm-stats-bar-compact .stat-pill-mini:nth-child(5) { --stat-accent: #ef4444; }
         .crm-stats-bar-compact .stat-pill-mini:nth-child(6) { --stat-accent: #14b8a6; }
         .stat-pill-mini.clickable { cursor: pointer; }
         .stat-pill-mini:hover {
            transform: translateY(-2px);
            border-color: var(--primary);
            box-shadow: inset 4px 0 0 var(--stat-accent), 0 14px 30px color-mix(in srgb, var(--stat-accent) 20%, rgba(var(--text-rgb), 0.08));
         }
         .stat-pill-mini.is-active {
            background: color-mix(in srgb, var(--bg-card) 82%, var(--stat-accent) 18%);
            border-color: var(--stat-accent);
         }
         .stat-pill-label { font-size: 11px; font-weight: 800; color: var(--text-dimmed); text-transform: uppercase; letter-spacing: 0.08em; }
         .stat-pill-value { font-size: 20px; font-weight: 900; }
         .stat-pill-value.total { color: var(--text); }
         .stat-pill-value.active { color: var(--success); }
         .stat-pill-value.inactive { color: var(--text-dimmed); }
         .stat-pill-value.pending { color: var(--warning); }

         .crm-table-wrap { border-radius: 16px; overflow: hidden; }

         .crm-input { width: 100%; background: var(--bg-surface) !important; border: 1px solid var(--border-strong) !important; border-radius: 10px !important; padding: 8px 14px !important; color: var(--text) !important; font-size: 0.85rem !important; transition: all 0.2s; }
         .crm-search-input-wrap { position: relative; width: 100%; flex: 1; max-width: 500px; }
         .crm-search-input-wrap .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); z-index: 1; color: var(--text-dimmed); font-size: 14px; }
         .crm-search-input-wrap .crm-input { padding-left: 36px !important; }
         
          .add-user-btn { background: var(--primary) !important; color: white !important; border: none !important; border-radius: 10px !important; padding: 0 20px !important; font-weight: 700 !important; height: 38px; display: flex; align-items: center; gap: 6px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 2px 8px rgba(var(--primary-rgb), 0.2); font-size: 0.85rem; flex-shrink: 0; }
          .add-user-btn:hover { background: var(--primary-hover) !important; transform: translateY(-2px); box-shadow: 0 6px 18px rgba(var(--primary-rgb), 0.4); }
          @media (max-width: 1000px) {
            .add-user-btn { width: 100%; justify-content: center; }
          }

         .bulk-actions-group { display: flex; gap: 6px; align-items: center; padding-left: 10px; border-left: 2px solid var(--border); margin-left: 6px; }
         .btn-bulk { background: var(--bg-card); border: 1px solid var(--border-strong); padding: 6px 12px; border-radius: 8px; font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; gap: 4px; cursor: pointer; transition: all 0.2s; color: var(--text-muted); }
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
               gap: 16px; 
            }
            .stat-pill-mini { min-width: 0; padding: 10px; }
            .stat-pill-value { font-size: 1.1rem; }
            .stat-pill-label { font-size: 9px; }
         }
         
         .crm-status-pill-modern {
            padding: 4px 12px;
            border-radius: 8px;
            font-size: 0.65rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            display: inline-flex;
            align-items: center;
            gap: 6px;
         }
         .status-dot { width: 6px; height: 6px; border-radius: 50%; }
         .status-active { background: var(--bg-hover); color: var(--success); border: 1px solid var(--border-strong); }
         .status-active .status-dot { background: var(--success); }
         .status-pending { background: var(--bg-hover); color: var(--warning); border: 1px solid var(--border-strong); }
         .status-pending .status-dot { background: var(--warning); }
         .status-inactive { background: var(--bg-hover); color: var(--text-dimmed); border: 1px solid var(--border-strong); }
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
      
      <style>{`
        .crm-fullscreen-shell {
          padding: 12px 20px !important;
          gap: 12px !important;
        }
        .users-page-header {
          margin-bottom: 8px;
        }
        .crm-table th, .crm-table td {
          padding: 10px 12px !important;
        }
        .usersIdentityCell {
          gap: 8px;
        }
        .user-role-badge {
          padding: 2px 6px;
          font-size: 10px;
        }
        .crm-table-wrap {
          margin-top: 4px;
        }
      `}</style>
    </div>
  )
}
