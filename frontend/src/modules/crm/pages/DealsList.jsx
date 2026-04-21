import { useEffect, useCallback, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Icon } from '../../../layouts/icons.jsx'
import { useAuth } from '../../../context/AuthContext'
import Pagination from '../../../components/Pagination.jsx'
import FilterBar from '../../../components/FilterBar.jsx'
import SearchInput from '../../../components/SearchInput.jsx'
import PageHeader from '../../../components/PageHeader.jsx'
import { dealsApi } from '../../../services/deals'
import { usersApi } from '../../../services/users'
import { statusesApi } from '../../../services/statuses'
import { confirmToast } from '../../../utils/confirmToast.jsx'
import { useDebouncedValue } from '../../../utils/useDebouncedValue.js'
import { useToastFeedback } from '../../../utils/useToastFeedback.js'
import DealsKanban from './DealsKanban.jsx'

const DEFAULT_STATUS_TYPES = ['New', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost']

function stopRowNavigation(event) {
  event.stopPropagation()
}

function getDealStatusOptions(currentStatus) {
  if (!currentStatus) return STATUS_TYPES
  return STATUS_TYPES.includes(currentStatus) ? STATUS_TYPES : [currentStatus, ...STATUS_TYPES]
}

export default function DealsList() {
  const { user } = useAuth()
  const isManagement = user?.role === 'Admin' || user?.role === 'Manager'
  const canCreate = user?.role === 'Admin' || user?.role === 'Manager' || user?.role === 'Employee'
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [viewMode, setViewMode] = useState(searchParams.get('view') || 'list')

  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [employees, setEmployees] = useState([])
  const [statusOptions, setStatusOptions] = useState([])
  useToastFeedback({ error })

  // Filter & Sort State
  const [filters, setFilters] = useState({
    q: searchParams.get('q') || '',
    status: searchParams.get('status') || '',
    assigned_to: searchParams.get('assigned_to') || (user?.role === 'Employee' ? user.id : ''),
    startDate: searchParams.get('startDate') || '',
    endDate: searchParams.get('endDate') || '',
    sortField: searchParams.get('sortField') || 'created_at',
    sortOrder: searchParams.get('sortOrder') || 'desc',
    page: Math.max(1, Number(searchParams.get('page')) || 1),
    limit: Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20)),
  })

  const debouncedQ = useDebouncedValue(filters.q, 300)

  useEffect(() => {
    const next = new URLSearchParams()
    if (debouncedQ.trim()) next.set('q', debouncedQ.trim())
    if (filters.status) next.set('status', filters.status)
    if (filters.assigned_to) next.set('assigned_to', filters.assigned_to)
    if (filters.startDate) next.set('startDate', filters.startDate)
    if (filters.endDate) next.set('endDate', filters.endDate)
    if (filters.sortField !== 'created_at') next.set('sortField', filters.sortField)
    if (filters.sortOrder !== 'desc') next.set('sortOrder', filters.sortOrder)
    if (filters.page > 1) next.set('page', String(filters.page))
    if (filters.limit !== 20) next.set('limit', String(filters.limit))
    if (viewMode !== 'list') next.set('view', viewMode)

    setSearchParams(next, { replace: true })
  }, [debouncedQ, filters, setSearchParams, viewMode])

  const loadDeals = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await dealsApi.list({
        ...filters,
        q: debouncedQ,
        all: user?.role === 'Admin' ? true : undefined
      })
      if (Array.isArray(res)) {
        setItems(res)
        setTotal(res.length)
      } else {
        setItems(res.items || [])
        setTotal(res.total || 0)
      }
    } catch {
      setError('Failed to load deals')
    } finally {
      setLoading(false)
    }
  }, [debouncedQ, filters])

  const loadEmployees = useCallback(async () => {
    try {
      const res = await usersApi.list({ limit: 'all' })
      setEmployees(res.items || res || [])
    } catch {
      console.error('Failed to load employees')
    }
  }, [])

  useEffect(() => {
    loadDeals()
  }, [loadDeals])

  useEffect(() => {
    loadEmployees()
    statusesApi.list('deal').then(res => {
      if (res && res.length > 0) {
        setStatusOptions(res)
      } else {
        setStatusOptions(DEFAULT_STATUS_TYPES.map(s => ({ name: s, color: '#3b82f6' })))
      }
    })
  }, [loadEmployees])

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }))
  }

  const handleReset = () => {
    setFilters({
      q: '',
      status: '',
      assigned_to: '',
      startDate: '',
      endDate: '',
      sortField: 'created_at',
      sortOrder: 'desc',
      page: 1,
      limit: 20
    })
  }

  function getStatusClass(status) {
    const name = (status || '').replace(/\s+/g, '-').toLowerCase()
    return `dynamic-deal-status-${name}`
  }

  async function onDelete(id) {
    const confirmed = await confirmToast('Are you sure you want to move this deal to trash?', {
      confirmLabel: 'Move to Trash',
      type: 'danger',
    })
    if (!confirmed) return
    try {
      await dealsApi.remove(id)
      toast.success('Deal moved to trash')
      loadDeals()
    } catch {
      setError('Delete failed')
    }
  }

  async function onUpdateStage(id, newStatus) {
    try {
      await dealsApi.update(id, { status: newStatus })
      
      if (newStatus === 'Won') {
        toast.success('Deal marked as WON!')
      } else {
        toast.success(`Deal stage updated to ${newStatus}`)
      }
      
      loadDeals()
    } catch {
      setError('Stage update failed')
    }
  }

  return (
    <div className="stack">
      <PageHeader
        title="Deals"
        description="Track all sales opportunities."
        backTo="/"
        actions={
          <div className="row gap-12">
            <div className="view-switcher-premium">
              <button 
                className={`view-btn ${viewMode === 'list' ? 'active' : ''}`} 
                onClick={() => setViewMode('list')}
                title="Table View"
              >
                <Icon name="list" size={18} />
              </button>
              <button 
                className={`view-btn ${viewMode === 'board' ? 'active' : ''}`} 
                onClick={() => setViewMode('board')}
                title="Pipeline Board"
              >
                <Icon name="deals" size={18} />
              </button>
            </div>
            {canCreate && (
              <button 
                className="btn primary" 
                onClick={() => navigate('/deals/new')}
              >
                + Create Deal
              </button>
            )}
          </div>
        }
      />
      <div className="card noPadding stack glass-panel" style={{ border: 'none', background: 'transparent', boxShadow: 'none' }}>
        <div className="padding" style={{ paddingBottom: 0 }}>
          <div className="search-filter-row" style={{ display: 'flex', gap: '15px', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap' }}>
            <div className="search-glass-wrap" style={{ flex: '1 1 240px', minWidth: '200px' }}>
              <SearchInput
                placeholder="Search deals..."
                value={filters.q}
                onChange={(e) => handleFilterChange({ q: e.target.value })}
                style={{ border: 'none', background: 'transparent' }}
              />
            </div>
            
            <div className="filters-group" style={{ display: 'flex', gap: '10px', flex: '2 1 auto', flexWrap: 'wrap', alignItems: 'center' }}>
              <div className="filter-select-wrap" style={{ minWidth: '150px' }}>
                <select
                  className="input"
                  style={{ width: '100%', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                  value={filters.status}
                  onChange={(e) => handleFilterChange({ status: e.target.value })}
                >
                  <option value="">All Status</option>
                  <option value="New">New</option>
                  <option value="Qualified">Qualified</option>
                  <option value="Proposal">Proposal</option>
                  <option value="Negotiation">Negotiation</option>
                  <option value="Won">Won</option>
                  <option value="Lost">Lost</option>
                </select>
              </div>

              <div className="filter-select-wrap" style={{ minWidth: '150px' }}>
                <select
                  className="input"
                  style={{ width: '100%', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                  value={filters.assigned_to}
                  onChange={(e) => handleFilterChange({ assigned_to: e.target.value })}
                >
                  <option value="">All Employees</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              <div className="date-filter-wrap" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input 
                  type="date" 
                  className="input" 
                  style={{ width: '140px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', fontSize: '13px' }}
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange({ startDate: e.target.value })}
                  title="From Date"
                />
                <span className="muted small">to</span>
                <input 
                  type="date" 
                  className="input" 
                  style={{ width: '140px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', fontSize: '13px' }}
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange({ endDate: e.target.value })}
                  title="To Date"
                />
              </div>

              <button
                className="btn-reset-minimal"
                onClick={handleReset}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '0 16px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'rgba(239, 68, 68, 0.05)',
                  border: '1px solid rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.2s ease',
                  marginLeft: 'auto'
                }}
              >
                <Icon name="trash" />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>

        <FilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          resetSort={{ field: 'created_at', order: 'desc' }}
          sortFields={[
            { key: 'name', label: 'Name' },
            { key: 'created_at', label: 'Date Added' }
          ]}
          currentSort={{ field: filters.sortField, order: filters.sortOrder }}
          options={{}}
          hideReset={true}
        />
      </div>

      {error && <div className="alert error">{error}</div>}

      {viewMode === 'board' ? (
        <DealsKanban deals={items} loading={loading} onStatusChange={onUpdateStage} />
      ) : (
        <div className="premium-table-wrap">
          <table className="table premium-table">
            <thead>
              <tr>
                <th>Deal ID</th>
                <th>Title</th>
                <th>Customer</th>
                <th>Value</th>
                <th className="mobile-hide">Stage</th>
                <th className="tablet-hide">Assigned To</th>
                <th className="tablet-hide">Close Date</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="tableRowLink"
                  onClick={() => navigate(`/deals/${item.id}`)}
                >
                  <td>
                    <span className="id-badge-professional">{item.readable_id || 'DL-PENDING'}</span>
                  </td>
                  <td>{item.title}</td>
                  <td>
                    <Link
                      to={`/deals/${item.id}`}
                      className="tableLink"
                      onClick={stopRowNavigation}
                    >
                      {item.customer_id?.name || '-'}
                    </Link>
                  </td>
                  <td><strong className="small">{item.currency === 'INR' ? '₹' : item.currency} {item.value?.toLocaleString()}</strong></td>
                  <td className="mobile-hide" onClick={stopRowNavigation}>
                    <div className="status-badge-container">
                      <select
                        className={`status-badge-select ${getStatusClass(item.status)}`}
                        value={item.status}
                        onChange={(e) => onUpdateStage(item.id, e.target.value)}
                        style={{ cursor: user?.role === 'Accountant' ? 'default' : 'pointer', border: 'none', appearance: 'none', padding: user?.role === 'Accountant' ? '4px 12px' : '4px 28px 4px 12px' }}
                        disabled={user?.role === 'Accountant'}
                      >
                        {statusOptions.length > 0 
                          ? statusOptions.map(s => <option key={s.id || s.name} value={s.name}>{s.name}</option>)
                          : DEFAULT_STATUS_TYPES.map(s => <option key={s} value={s}>{s}</option>)
                        }
                      </select>
                      {user?.role !== 'Accountant' && (
                        <div className="status-badge-chevron">
                          <Icon name="chevronDown" />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="tablet-hide"><div className="small">{item.assigned_to?.name || '-'}</div></td>
                  <td className="tablet-hide"><div className="small">{item.expected_close_date ? new Date(item.expected_close_date).toLocaleDateString('en-GB').replace(/\//g, '-') : '-'}</div></td>
                  <td className="text-right">
                    <div className="tableActions">
                      <Link
                        className="iconBtn success"
                        to={`/deals/${item.id}`}
                        title="View deal"
                        onClick={stopRowNavigation}
                        style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}
                      >
                        <Icon name="eye" />
                      </Link>

                       {user?.role !== 'Accountant' && (
                        <button
                          className="iconBtn success"
                          onClick={(e) => {
                            stopRowNavigation(e)
                            navigate(`/deals/${item.id}/edit`)
                          }}
                          title="Edit deal"
                          style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)' }}
                        >
                          <Icon name="edit" />
                        </button>
                      )}
                      {isManagement && (
                        <button
                          className="iconBtn text-danger"
                          onClick={(e) => {
                            stopRowNavigation(e)
                            onDelete(item.id)
                          }}
                          title="Delete deal"
                        >
                          <Icon name="trash" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length && !loading && (
                <tr><td colSpan="6" className="center muted padding30">No deals found.</td></tr>
              )}
              {loading && (
                <tr><td colSpan="7" className="center muted padding30">Loading deals...</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {viewMode === 'list' && (
        <Pagination
          page={filters.page}
          limit={filters.limit}
          total={total}
          onPageChange={(p) => setFilters(prev => ({ ...prev, page: p }))}
          onLimitChange={(l) => setFilters(prev => ({ ...prev, limit: l, page: 1 }))}
        />
      )}
      <style>{`
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .view-switcher-premium { background: rgba(255,255,255,0.05); padding: 4px; border-radius: 12px; display: flex; gap: 4px; border: 1px solid rgba(255,255,255,0.08); }
        .view-btn { background: transparent; border: none; padding: 8px 12px; border-radius: 8px; color: var(--text-dimmed); cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
        .view-btn:hover { background: rgba(255,255,255,0.03); color: white; }
        .view-btn.active { background: white; color: var(--bg-dark); box-shadow: 0 4px 10px rgba(0,0,0,0.2); }
        .id-badge-professional { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; font-weight: 700; color: var(--primary); background: rgba(59, 130, 246, 0.1); padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(59, 130, 246, 0.2); }

        ${statusOptions.map(opt => `
          .dynamic-deal-status-${opt.name.replace(/\s+/g, '-').toLowerCase()} { 
            background: ${opt.color || '#3b82f6'}20 !important; 
            color: ${opt.color || '#3b82f6'} !important; 
            border: 1px solid ${opt.color || '#3b82f6'}40 !important; 
          }
        `).join('')}
      `}</style>
    </div>
  )
}
