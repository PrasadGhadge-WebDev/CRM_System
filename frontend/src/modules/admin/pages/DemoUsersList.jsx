import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import Pagination from '../../../components/Pagination.jsx'
import SearchInput from '../../../components/SearchInput.jsx'
import PageHeader from '../../../components/PageHeader.jsx'
import { Icon } from '../../../layouts/icons.jsx'
import { demoUsersApi } from '../../../services/demoUsers.js'
import { confirmToast } from '../../../utils/confirmToast.jsx'
import { useAuth } from '../../../context/AuthContext'
import { useDebouncedValue } from '../../../utils/useDebouncedValue.js'
import { useToastFeedback } from '../../../utils/useToastFeedback.js'

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString()
}

function stopRowNavigation(event) {
  event.stopPropagation()
}

export default function DemoUsersList() {
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const qParam = searchParams.get('q') || ''
  const pageParam = Math.max(1, Number(searchParams.get('page') || 1) || 1)
  const limitParam = Number(searchParams.get('limit') || 20)

  const [items, setItems] = useState([])
  const [q, setQ] = useState(qParam)
  const [page, setPage] = useState(pageParam)
  const [limit, setLimit] = useState(limitParam)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [convertingId, setConvertingId] = useState(null)

  useToastFeedback({ error })

  const debouncedQ = useDebouncedValue(q, 250)

  useEffect(() => setQ(qParam), [qParam])
  useEffect(() => setPage(pageParam), [pageParam])
  useEffect(() => setLimit(limitParam), [limitParam])

  const desiredParams = useMemo(() => {
    const next = new URLSearchParams()
    const trimmedQ = debouncedQ.trim()
    if (trimmedQ) next.set('q', trimmedQ)
    if (page > 1) next.set('page', String(page))
    if (limit !== 20) next.set('limit', String(limit))
    return next
  }, [debouncedQ, page, limit])

  useEffect(() => {
    if (desiredParams.toString() === searchParams.toString()) return
    setSearchParams(desiredParams, { replace: true })
  }, [desiredParams, searchParams, setSearchParams])

  useEffect(() => {
    let canceled = false
    setLoading(true)
    setError('')

    demoUsersApi
      .list({
        ...(debouncedQ.trim() ? { q: debouncedQ.trim() } : null),
        page,
        limit,
        sortField: 'created_at',
        sortOrder: 'desc',
      })
      .then((res) => {
        if (canceled) return
        setItems(res.items || [])
        setTotal(Number(res.total) || 0)
      })
      .catch((e) => {
        if (canceled) return
        setError(e.message || 'Failed to load demo users')
      })
      .finally(() => {
        if (canceled) return
        setLoading(false)
      })

    return () => {
      canceled = true
    }
  }, [debouncedQ, page, limit])

  async function onDelete(id) {
    const confirmed = await confirmToast('Are you sure you want to move this demo user to trash?', {
      confirmLabel: 'Move to Trash',
      type: 'danger',
    })
    if (!confirmed) return

    try {
      await demoUsersApi.remove(id)
      toast.success('Demo user moved to trash')
      setItems((prev) => prev.filter((x) => x.id !== id))
      setTotal((t) => Math.max(0, (Number(t) || 0) - 1))
    } catch (e) {
      setError(e.message || 'Delete failed')
    }
  }

  async function onConvert(id) {
    const confirmed = await confirmToast('Are you sure you want to convert this demo user to a real user?', {
      confirmLabel: 'Convert Now',
      type: 'primary',
    })
    if (!confirmed) return

    setConvertingId(id)
    try {
      await demoUsersApi.convert(id)
      toast.success('Demo user converted to real user successfully!')
      setItems((prev) => prev.filter((x) => x.id !== id))
      setTotal((t) => Math.max(0, (Number(t) || 0) - 1))
    } catch (e) {
      toast.error(e.message || 'Conversion failed')
    } finally {
      setConvertingId(null)
    }
  }

  const isAdmin = currentUser?.role === 'Admin'

  return (
    <div className="stack">
      <PageHeader
        title="Demo Users"
        backTo="/"
        subtitle="Manage landing page registrations and guest accounts"
      />

      <div className="muted">
        Showing {items.length} of {total} demo users
      </div>

      <div className="filters">
        <SearchInput
          placeholder="Search name/email..."
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setPage(1)
          }}
        />
      </div>

      {error ? <div className="alert error">{error}</div> : null}

      {loading ? (
        <div className="muted">Loading demo users...</div>
      ) : (
        <>
          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }} className="mobile-hide">PROFILE</th>
                  <th style={{ minWidth: '200px' }}>NAME & EMAIL</th>
                  <th style={{ width: '120px' }}>TYPE</th>
                  <th style={{ width: '130px' }} className="mobile-hide">PHONE</th>
                  <th style={{ width: '130px' }}>STATUS</th>
                  <th style={{ width: '150px' }} className="tablet-hide">JOINED DATE</th>
                  {isAdmin && <th style={{ width: '180px' }} className="text-right">ACTION</th>}
                </tr>
              </thead>
              <tbody>
                {items.length ? (
                  items.map((user) => (
                    <tr key={user.id}>
                      <td className="mobile-hide">
                        <div className="avatar tableAvatarFallback">
                          {(user.name || user.username || 'D').charAt(0).toUpperCase()}
                        </div>
                      </td>
                      <td>
                        <div className="userIdentity">
                          <div style={{ fontWeight: 600 }}>{user.name || user.username || '-'}</div>
                          <div className="muted extra-small">{user.email || '-'}</div>
                        </div>
                      </td>
                      <td>
                        <div className="badge info" style={{ fontSize: '0.7rem' }}>DEMO USER</div>
                      </td>
                      <td className="mobile-hide">
                        <div style={{ fontSize: '0.82rem' }}>{user.phone || '-'}</div>
                      </td>
                      <td>
                        <div className={`badge-modern success`}>
                          <span className="badge-dot"></span>
                          Approved
                        </div>
                      </td>
                      <td className="tablet-hide">
                        <div style={{ fontSize: '0.85rem' }}>
                          {new Date(user.created_at || Date.now()).toLocaleDateString()}
                        </div>
                      </td>
                      {isAdmin ? (
                        <td className="text-right">
                          <div className="tableActions" style={{ justifyContent: 'flex-end' }}>
                            <button
                              className="btn primary small"
                              onClick={() => onConvert(user.id)}
                              disabled={convertingId === user.id}
                              title="Convert to Real User"
                            >
                              {convertingId === user.id ? 'Converting...' : 'Convert'}
                            </button>
                            <button
                              className="iconBtn text-danger"
                              onClick={() => onDelete(user.id)}
                              title="Delete demo user"
                            >
                              <Icon name="trash" />
                            </button>
                          </div>
                        </td>
                      ) : (
                        <td className="text-right" />
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7}>
                      <div className="emptyState">
                        <div className="emptyStateTitle">No demo users found</div>
                        <div className="emptyStateText">
                          Trial users who register from your landing page will appear here.
                        </div>
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
