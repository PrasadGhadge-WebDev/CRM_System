import { useEffect, useCallback, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Icon } from '../../../layouts/icons.jsx'
import Pagination from '../../../components/Pagination.jsx'
import PageHeader from '../../../components/PageHeader.jsx'
import { customersApi } from '../../../services/customers.js'
import { statusesApi } from '../../../services/statuses.js'
import { confirmToast } from '../../../utils/confirmToast.jsx'
import { useDebouncedValue } from '../../../utils/useDebouncedValue.js'
import { useToastFeedback } from '../../../utils/useToastFeedback.js'
import { useAuth } from '../../../context/AuthContext.jsx'
import { usersApi } from '../../../services/users.js'
import SearchableSelect from '../components/SearchableSelect.jsx'
import ModernSearchBar from '../../../components/ModernSearchBar.jsx'
import StatusDropdown from '../components/StatusDropdown.jsx'

function stopRowNavigation(event) {
  event.stopPropagation()
}

export default function CustomersList() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user: currentUser } = useAuth()

  const isAdmin = currentUser?.role === 'Admin'
  const isManager = currentUser?.role === 'Manager'
  const isEmployee = currentUser?.role === 'Employee'
  const isAdminOrManager = isAdmin || isManager

  const canModify = isAdmin || isManager || isEmployee
  const isAccountant = currentUser?.role === 'Accountant'
  const canDelete = isAdmin
  const canImportExport = isAdmin || isManager
  const canViewReports = isAdmin || isManager || (currentUser?.role === 'Accountant')

  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [summary, setSummary] = useState({ total: 0, byStatus: {} })
  const [statusOptions, setStatusOptions] = useState([])

  useToastFeedback({ error })

  const [filters, setFilters] = useState({
    q: searchParams.get('q') || '',
    status: searchParams.get('status') || '',
    city: searchParams.get('city') || '',
    assigned_to: searchParams.get('assigned_to') || '',
    startDate: searchParams.get('startDate') || '',
    endDate: searchParams.get('endDate') || '',
    sortField: searchParams.get('sortField') || 'created_at',
    sortOrder: searchParams.get('sortOrder') || 'desc',
    page: Math.max(1, Number(searchParams.get('page')) || 1),
    limit: Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20)),
    dateRangeType: searchParams.get('dateRangeType') || 'all'
  })

  const debouncedQ = useDebouncedValue(filters.q, 300)

  useEffect(() => {
    const next = new URLSearchParams()
    if (debouncedQ.trim()) next.set('q', debouncedQ.trim())
    if (filters.status) next.set('status', filters.status)
    if (filters.city) next.set('city', filters.city)
    if (filters.assigned_to) next.set('assigned_to', filters.assigned_to)
    if (filters.startDate) next.set('startDate', filters.startDate)
    if (filters.endDate) next.set('endDate', filters.endDate)
    if (filters.sortField !== 'created_at') next.set('sortField', filters.sortField)
    if (filters.sortOrder !== 'desc') next.set('sortOrder', filters.sortOrder)
    if (filters.page > 1) next.set('page', String(filters.page))
    if (filters.limit !== 20) next.set('limit', String(filters.limit))
    if (filters.dateRangeType !== 'all') next.set('dateRangeType', filters.dateRangeType)
    setSearchParams(next, { replace: true })
  }, [debouncedQ, filters, setSearchParams])

  const loadCustomers = useCallback(async () => {
    setLoading(true)
    
    let startDate = filters.startDate
    let endDate = filters.endDate
    const now = new Date()
    now.setHours(0,0,0,0)

    if (filters.dateRangeType === 'today') {
      startDate = now.toISOString()
      endDate = new Date(new Date().setHours(23,59,59,999)).toISOString()
    } else if (filters.dateRangeType === 'yesterday') {
      const y = new Date(now)
      y.setDate(y.getDate() - 1)
      startDate = y.toISOString()
      const yEnd = new Date(y)
      yEnd.setHours(23,59,59,999)
      endDate = yEnd.toISOString()
    } else if (filters.dateRangeType === 'week') {
      const w = new Date(now)
      w.setDate(w.getDate() - 7)
      startDate = w.toISOString()
    } else if (filters.dateRangeType === 'month') {
      const m = new Date(now)
      m.setMonth(m.getMonth() - 1)
      startDate = m.toISOString()
    }

    try {
      const res = await customersApi.list({ ...filters, startDate, endDate, q: debouncedQ })
      setItems(res.items || [])
      setTotal(res.total || 0)
      setSummary(res.summary || { total: 0, byStatus: {} })
    } catch { setError('Failed to load customers') } finally { setLoading(false) }
  }, [debouncedQ, filters])

  useEffect(() => {
    loadCustomers()
    usersApi.list({ limit: 'all' }).then(res => setEmployees(res.items || []))
    statusesApi.list('customer').then(res => setStatusOptions(res || []))
  }, [loadCustomers])

  async function onDelete(id) {
    if (!canDelete) return toast.error('Admin permission required')
    const confirmed = await confirmToast('Move this customer to trash?', { confirmLabel: 'Move to Trash', type: 'danger' })
    if (!confirmed) return
    try { await customersApi.remove(id); toast.success('Customer moved to trash'); loadCustomers(); } catch { toast.error('Delete failed') }
  }

  async function onExport() {
    setBusy(true)
    try {
      const blob = await customersApi.exportCsv({ q: debouncedQ })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = 'customers.csv'; a.click();
    } catch { toast.error('Export failed') } finally { setBusy(false) }
  }

  async function onUpdateStatus(id, newStatus) {
    try {
      await customersApi.update(id, { status: newStatus })
      toast.success(`Status updated to ${newStatus}`)
      setItems(prev => prev.map(item => (item.id === id || item._id === id) ? { ...item, status: newStatus } : item))
    } catch (err) {
      toast.error(err.message || 'Update failed')
    }
  }

  function openCustomerDetails(id) {
    navigate(`/customers/${id}`)
  }

  function handleSort(field) {
    setFilters(f => ({
      ...f,
      sortField: field,
      sortOrder: f.sortField === field && f.sortOrder === 'asc' ? 'desc' : 'asc',
      page: 1
    }))
  }

  function getSortIcon(field) {
    if (filters.sortField !== field) return 'chevron-right'
    return filters.sortOrder === 'asc' ? 'chevron-up' : 'chevron-down'
  }

  return (
    <div className="stack">
      <section className="crm-fullscreen-shell">
        <div className="users-page-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 className="users-title">Customers Management</h1>
              <p className="users-subtitle">Full database of active clients and business partners</p>
            </div>
            {canModify && (
              <button
                className="btn-premium action-vibrant"
                onClick={() => navigate('/customers/new')}
              >
                <Icon name="plus" size={16} />
                <span>Add Customer</span>
              </button>
            )}
          </div>
        </div>

        <div className="crm-stats-bar-compact overflow-x-auto pb-8">
          <div className="stat-pill-mini clickable" onClick={() => setFilters(f => ({ ...f, status: '', page: 1 }))} style={{ borderBottom: filters.status === '' ? '2px solid var(--primary)' : '' }}>
            <span className="stat-pill-label">ALL CLIENTS</span>
            <span className="stat-pill-value total">{summary.total}</span>
          </div>
          {Object.entries(summary.byStatus).map(([name, count]) => (
            <div 
              key={name} 
              className="stat-pill-mini clickable" 
              onClick={() => setFilters(f => ({ ...f, status: name, page: 1 }))}
              style={{ borderBottom: filters.status === name ? '2px solid var(--primary)' : '' }}
            >
              <span className="stat-pill-label">{name.toUpperCase()}</span>
              <span className="stat-pill-value">{count}</span>
            </div>
          ))}
        </div>

        <div className="unified-action-bar">
          <div className="search-filter-group">
            <ModernSearchBar
              value={filters.q}
              onChange={e => setFilters(f => ({ ...f, q: e.target.value, page: 1 }))}
              placeholder="Search by name, phone, city, status, company, GST, website..."
            />


            <SearchableSelect
              value={filters.status}
              onChange={val => setFilters(f => ({ ...f, status: val, page: 1 }))}
              options={[
                { value: '', label: 'All Statuses' },
                ...(statusOptions.length > 0 
                  ? statusOptions.map(s => ({ value: s.name, label: s.name }))
                  : Object.keys(summary.byStatus).map(name => ({ value: name, label: name }))
                )
              ]}
              placeholder="All Statuses"
              icon="activity"
            />

            {!isEmployee && (
              <SearchableSelect
                value={filters.assigned_to}
                onChange={val => setFilters(f => ({ ...f, assigned_to: val, page: 1 }))}
                options={[
                  { value: '', label: 'All Assigned' },
                  ...employees.map(emp => ({ value: emp.id || emp._id, label: emp.name }))
                ]}
                placeholder="All Assigned"
                icon="user"
              />
            )}

            <SearchableSelect
              value={filters.dateRangeType}
              onChange={val => setFilters(f => ({ ...f, dateRangeType: val, page: 1 }))}
              options={[
                { value: 'all', label: 'Date: All' },
                { value: 'today', label: 'Today' },
                { value: 'yesterday', label: 'Yesterday' },
                { value: 'week', label: 'This Week' },
                { value: 'month', label: 'This Month' },
                { value: 'custom', label: 'Custom Range' }
              ]}
              placeholder="Date: All"
              icon="calendar"
            />

            {filters.dateRangeType === 'custom' && (
              <div className="flex items-center gap-4 animate-fade-in">
                <input 
                  type="date" 
                  className="crm-input date-mini" 
                  value={filters.startDate} 
                  onChange={e => setFilters(f => ({ ...f, startDate: e.target.value, page: 1 }))} 
                />
                <span className="muted" style={{ fontSize: '0.7rem' }}>to</span>
                <input 
                  type="date" 
                  className="crm-input date-mini" 
                  value={filters.endDate} 
                  onChange={e => setFilters(f => ({ ...f, endDate: e.target.value, page: 1 }))} 
                />
              </div>
            )}


            {(filters.q || filters.status || filters.assigned_to || filters.dateRangeType !== 'all') && (
              <button 
                className="btn-premium-mini reset-btn"
                onClick={() => {
                  setFilters({
                    q: '', status: '', city: '', assigned_to: '',
                    startDate: '', endDate: '', dateRangeType: 'all',
                    sortField: 'created_at', sortOrder: 'desc',
                    page: 1, limit: 20
                  })
                }}
                style={{ height: '42px', width: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                title="Reset Filters"
              >
                <Icon name="refresh" size={14} />
              </button>
            )}
          </div>
        </div>

        {error ? <div className="alert error glass-alert">{error}</div> : null}

        {loading ? (
          <div className="leadsLoadingState">
            <div className="spinner-medium" />
            <span className="muted">Loading customers...</span>
          </div>
        ) : (
          <>
            <div className="crm-table-wrap shadow-soft" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="crm-table-scroll">
                <table className="crm-table">
                  <thead style={{ background: 'var(--bg-surface)' }}>
                    <tr>
                      <th style={{ minWidth: '200px' }} className="sortable" onClick={() => handleSort('name')}>
                        NAME <Icon name={getSortIcon('name')} size={12} />
                      </th>
                      <th style={{ minWidth: '150px' }} className="sortable" onClick={() => handleSort('phone')}>
                        PHONE <Icon name={getSortIcon('phone')} size={12} />
                      </th>
                      <th style={{ minWidth: '170px' }} className="sortable" onClick={() => handleSort('assigned_to')}>
                        ASSIGNED TO <Icon name={getSortIcon('assigned_to')} size={12} />
                      </th>
                      <th style={{ width: '130px' }} className="sortable" onClick={() => handleSort('status')}>
                        STATUS <Icon name={getSortIcon('status')} size={12} />
                      </th>
                      <th style={{ minWidth: '150px' }} className="sortable" onClick={() => handleSort('created_at')}>
                        CREATED DATE <Icon name={getSortIcon('created_at')} size={12} />
                      </th>
                      <th style={{ minWidth: '180px' }} className="sortable" onClick={() => handleSort('last_interaction_date')}>
                        LAST INTERACTION <Icon name={getSortIcon('last_interaction_date')} size={12} />
                      </th>
                      <th className="text-right" style={{ width: '100px' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length > 0 ? (
                      items.map(customer => {
                        const id = customer.id || customer._id
                        return (
                          <tr
                            key={String(id)}
                            className="crm-table-row crm-clickable-row"
                            tabIndex={0}
                            onClick={() => openCustomerDetails(id)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault()
                                openCustomerDetails(id)
                              }
                            }}
                          >
                            <td>
                              <div className="customersIdentityCell">
                                <div className="customersPrimaryText">{customer.name}</div>
                                <div className="customersSecondaryText">{customer.company_name || 'Individual'}</div>
                              </div>
                            </td>
                            <td>
                              <div className="contactMain">{customer.phone || '—'}</div>
                              <div className="contactSub">{customer.email || '—'}</div>
                            </td>
                            <td>
                              <div className="customersOwnerCell">
                                <span className="ownerName">{customer.assigned_to?.name || 'Unassigned'}</span>
                                <span className="ownerRole">{customer.assigned_to?.role || 'Staff'}</span>
                              </div>
                            </td>
                            <td onClick={stopRowNavigation}>
                              <StatusDropdown 
                                status={customer.status} 
                                options={statusOptions.length > 0 
                                  ? statusOptions.map(s => ({ name: s.name, color: s.color }))
                                  : (Object.keys(summary.byStatus).length > 0 
                                      ? Object.keys(summary.byStatus).map(name => ({ name, color: 'var(--primary)' }))
                                      : ['Active', 'Inactive', 'Lost', 'Repeat'].map(name => ({ name, color: 'var(--primary)' }))
                                    )
                                } 
                                onChange={(newStatus) => onUpdateStatus(id, newStatus)}
                                disabled={!isAdminOrManager}
                              />
                            </td>
                            <td>
                              <div className="customersSecondaryText">
                                {customer.created_at ? new Date(customer.created_at).toLocaleDateString() : '—'}
                              </div>
                            </td>
                            <td>
                              <div className="customersSecondaryText">
                                {customer.last_interaction ? new Date(customer.last_interaction).toLocaleDateString() : '—'}
                              </div>
                            </td>
                            <td className="text-right" onClick={stopRowNavigation}>
                              <div className="crm-action-group">
                                {canModify && (
                                  <button
                                    className="modern-action-btn"
                                    onClick={() => navigate(`/customers/${id}/edit`)}
                                    title="Edit Customer"
                                  >
                                    <Icon name="edit" size={14} />
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    className="modern-action-btn danger"
                                    onClick={() => onDelete(id)}
                                    title="Delete"
                                  >
                                    <Icon name="trash" size={14} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={7}>
                          <div className="emptyState" style={{ padding: '80px 0' }}>
                            <h3>No customers found</h3>
                            <p className="muted">Expand your filters or add a new client to the database.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <Pagination page={filters.page} limit={filters.limit} total={total} onPageChange={p => setFilters(f => ({ ...f, page: p }))} onLimitChange={l => setFilters(f => ({ ...f, limit: l, page: 1 }))} />
          </>
        )}
      </section>

      <style>{`
        .tableAvatarFallback { width: 44px; height: 44px; border-radius: 14px; background: linear-gradient(135deg, var(--primary-soft), rgba(59, 130, 246, 0.2)); color: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.1rem; box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.1); }
        .customersIdentityCell { display: flex; flex-direction: column; gap: 2px; }
        .customersPrimaryText { color: var(--text); font-size: 0.95rem; font-weight: 700; }
        .customersSecondaryText { color: var(--text-dimmed); font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
        
        .customersContactCell { display: flex; flex-direction: column; gap: 2px; }
        .contactMain { color: var(--text); font-size: 0.85rem; font-weight: 700; }
        .contactSub { color: var(--text-muted); font-size: 0.75rem; font-weight: 500; }

        .customersOwnerCell { display: flex; flex-direction: column; gap: 2px; }
        .ownerName { color: var(--text); font-size: 0.85rem; font-weight: 700; }
        .ownerRole { color: var(--text-dimmed); font-size: 0.7rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }

        .customersTypeBadge { 
          padding: 4px 10px;
          background: var(--bg-surface);
          border-radius: 8px;
          font-size: 0.65rem; 
          font-weight: 800; 
          color: var(--text-muted); 
          letter-spacing: 0.05em; 
          text-transform: uppercase;
          border: 1px solid var(--border);
        }
        .crm-clickable-row { cursor: pointer; transition: all 0.2s; }
        .crm-clickable-row:hover { background: var(--bg-surface) !important; }
        .crm-clickable-row:focus { outline: 2px solid var(--primary); outline-offset: -2px; }
        
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
           padding: 4px 12px;
           border-radius: 8px;
           font-size: 0.65rem;
           font-weight: 700;
           text-transform: uppercase;
           letter-spacing: 0.05em;
           display: inline-flex;
           align-items: center;
           gap: 6px;
           background: var(--bg-surface);
           color: var(--text-muted);
           border: 1px solid var(--border-strong);
        }
        .status-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--text-muted); }

        .status-active { color: #10b981; border-color: #bbf7d0; background: #f0fdf4; }
        .status-active .status-dot { background: #10b981; box-shadow: 0 0 6px #10b981; }

        .status-inactive { color: #64748b; border-color: #e2e8f0; background: #f8fafc; }
        .status-inactive .status-dot { background: #64748b; }

        .status-lost { color: #ef4444; border-color: #fecaca; background: #fef2f2; }
        .status-lost .status-dot { background: #ef4444; box-shadow: 0 0 6px #ef4444; }

        .status-repeat { color: #8b5cf6; border-color: #ddd6fe; background: #f5f3ff; }
        .status-repeat .status-dot { background: #8b5cf6; box-shadow: 0 0 6px #8b5cf6; }

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

         
         .add-user-btn { background: var(--primary) !important; color: white !important; border: none !important; border-radius: 10px !important; padding: 0 20px !important; font-weight: 700 !important; height: 38px; display: flex; align-items: center; gap: 6px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 2px 8px rgba(var(--primary-rgb), 0.2); font-size: 0.85rem; flex-shrink: 0; }
         .add-user-btn:hover { background: var(--primary-hover) !important; transform: translateY(-2px); box-shadow: 0 6px 18px rgba(var(--primary-rgb), 0.4); }

         .crm-table th { padding: 12px 16px !important; border-bottom: 2px solid var(--border-strong) !important; }
         .crm-table td { padding: 10px 16px !important; border-bottom: 1px solid var(--border-strong) !important; }
         
         .crm-table th.sortable { cursor: pointer; transition: background 0.2s; position: relative; padding-right: 24px !important; }
         .crm-table th.sortable:hover { background: var(--bg-card) !important; }
         .crm-table th.sortable i { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); opacity: 0.5; }
         .crm-table th.sortable:hover i { opacity: 1; color: var(--primary); }

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
