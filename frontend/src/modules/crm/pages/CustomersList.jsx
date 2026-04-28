import { useEffect, useCallback, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
  const canDelete = isAdmin
  const canImportExport = isAdmin || isManager
  const canViewReports = isAdmin || isManager || (currentUser?.role === 'Accountant')

  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [statusOptions, setStatusOptions] = useState([])
  
  useToastFeedback({ error })

  const [filters, setFilters] = useState({
    q: searchParams.get('q') || '',
    customer_type: searchParams.get('customer_type') || '',
    status: searchParams.get('status') || '',
    assigned_to: searchParams.get('assigned_to') || '',
    is_vip: searchParams.get('is_vip') || '',
    page: Math.max(1, Number(searchParams.get('page')) || 1),
    limit: Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20)),
  })

  const debouncedQ = useDebouncedValue(filters.q, 300)

  useEffect(() => {
    const next = new URLSearchParams()
    if (debouncedQ.trim()) next.set('q', debouncedQ.trim())
    if (filters.customer_type) next.set('customer_type', filters.customer_type)
    if (filters.status) next.set('status', filters.status)
    if (filters.assigned_to) next.set('assigned_to', filters.assigned_to)
    if (filters.is_vip) next.set('is_vip', filters.is_vip)
    if (filters.page > 1) next.set('page', String(filters.page))
    if (filters.limit !== 20) next.set('limit', String(filters.limit))
    setSearchParams(next, { replace: true })
  }, [debouncedQ, filters, setSearchParams])

  const loadCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await customersApi.list({ ...filters, q: debouncedQ })
      setItems(res.items || [])
      setTotal(res.total || 0)
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

  function openCustomerDetails(id) {
    navigate(`/customers/${id}`)
  }

  return (
    <div className="stack">
      <section className="crm-fullscreen-shell">
        <PageHeader
          title="Customers"
          description="Manage your customer list and account info."
          backTo="/"
          actions={
            <div className="crm-flex-end crm-gap-12">
              {canImportExport && (
                <button className="btn-premium action-secondary" onClick={onExport} disabled={busy}>
                  <Icon name="download" />
                  <span>Export</span>
                </button>
              )}
              {canViewReports && (
                <button className="btn-premium action-secondary" onClick={() => navigate('/customers/reports')}>
                  <Icon name="reports" />
                  <span>Metrics</span>
                </button>
              )}
              {canModify && (
                <button className="btn-premium action-vibrant" onClick={() => navigate('/customers/new')}>
                  <Icon name="plus" />
                  <span>Add New Customer</span>
                </button>
              )}
            </div>
          }
        />

        <div className="crm-filter-panel">
          <div className="crm-filter-cell">
            <label className="crm-filter-label">Search Customers</label>
            <div className="crm-search-input-wrap">
              <Icon name="search" className="search-icon" />
              <input type="text" placeholder="Name, Email, Phone..." value={filters.q} onChange={e => setFilters(f => ({...f, q: e.target.value, page: 1}))} />
            </div>
          </div>
          <div className="crm-filter-cell">
            <label className="crm-filter-label">Category</label>
            <select className="crm-input" value={filters.customer_type} onChange={e => setFilters(f => ({...f, customer_type: e.target.value, page: 1}))}>
              <option value="">All Types</option>
              <option value="Lead">Potential Lead</option>
              <option value="Active">Active Customer</option>
              <option value="Partner">Business Partner</option>
            </select>
          </div>
          <div className="crm-filter-cell">
            <label className="crm-filter-label">Status</label>
            <select className="crm-input" value={filters.status} onChange={e => setFilters(f => ({...f, status: e.target.value, page: 1}))}>
              <option value="">All Statuses</option>
              {statusOptions.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
          </div>
          <div className="crm-filter-cell">
            <label className="crm-filter-label">Assigned To</label>
            <select className="crm-input" value={filters.assigned_to} onChange={e => setFilters(f => ({...f, assigned_to: e.target.value, page: 1}))}>
              <option value="">All Owners</option>
              {employees.map(e => <option key={e.id || e._id} value={e.id || e._id}>{e.name || e.username}</option>)}
            </select>
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
            <div className="crm-table-wrap shadow-soft">
              <div className="crm-table-scroll">
                <table className="crm-table">
                  <thead>
                    <tr>
                      <th style={{ width: '70px' }}>PROFILE</th>
                      <th style={{ minWidth: '220px' }}>CUSTOMER NAME</th>
                      <th style={{ minWidth: '180px' }} className="tablet-hide">CONTACT INFO</th>
                      <th style={{ width: '130px' }}>CATEGORY</th>
                      <th style={{ width: '130px' }}>STATUS</th>
                      <th style={{ minWidth: '170px' }} className="tablet-hide">ASSIGNED TO</th>
                      <th className="text-right" style={{ width: '130px' }}>ACTIONS</th>
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
                            <td className="mobile-hide crm-clickable-cell">
                              <div className="tableAvatarFallback">
                                {(customer.name || 'C').charAt(0).toUpperCase()}
                              </div>
                            </td>
                            <td className="crm-clickable-cell">
                              <div className="customersIdentityCell">
                                <div className="customersPrimaryText">{customer.name}</div>
                                <div className="customersSecondaryText">{customer.industry || 'General Business'}</div>
                              </div>
                            </td>
                            <td className="tablet-hide crm-clickable-cell">
                              <div className="customersContactCell">
                                <div className="contactMain">{customer.email || '—'}</div>
                                <div className="contactSub">{customer.phone || '—'}</div>
                              </div>
                            </td>
                            <td className="crm-clickable-cell">
                              <span className="customersTypeBadge">
                                {customer.customer_type || 'STANDARD'}
                              </span>
                            </td>
                            <td className="crm-clickable-cell">
                              <span className={`crm-status-pill success`}>
                                {customer.status || 'ACTIVE'}
                              </span>
                            </td>
                            <td className="tablet-hide crm-clickable-cell">
                              <div className="customersOwnerCell">
                                <span className="ownerName">{customer.assigned_to?.name || 'Unassigned'}</span>
                                <span className="ownerRole">{customer.assigned_to?.role || 'Staff'}</span>
                              </div>
                            </td>
                            <td className="text-right" onClick={stopRowNavigation}>
                              <div className="crm-action-group">
                                <button
                                  className="crm-action-btn"
                                  onClick={() => navigate(`/customers/${id}/edit`)}
                                  title="Edit Customer"
                                >
                                  <Icon name="edit" size={14} />
                                </button>
                                {canDelete && (
                                  <button
                                    className="crm-action-btn danger"
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
            <Pagination page={filters.page} limit={filters.limit} total={total} onPageChange={p => setFilters(f => ({...f, page: p}))} onLimitChange={l => setFilters(f => ({...f, limit: l, page: 1}))} />
          </>
        )}
      </section>

      <style>{`
        .tableAvatarFallback { width: 44px; height: 44px; border-radius: 12px; background: rgba(59, 130, 246, 0.1); color: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.1rem; }
        .customersIdentityCell { display: flex; flex-direction: column; gap: 2px; }
        .customersPrimaryText { color: var(--text); font-size: 1rem; font-weight: 700; }
        .customersSecondaryText { color: var(--text-dimmed); font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
        
        .customersContactCell { display: flex; flex-direction: column; gap: 2px; }
        .contactMain { color: var(--text); font-size: 0.9rem; font-weight: 700; }
        .contactSub { color: var(--text-muted); font-size: 0.8rem; font-weight: 500; }

        .customersOwnerCell { display: flex; flex-direction: column; gap: 2px; }
        .ownerName { color: var(--text); font-size: 0.9rem; font-weight: 700; }
        .ownerRole { color: var(--text-dimmed); font-size: 0.7rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }

        .customersTypeBadge { font-size: 0.7rem; font-weight: 800; color: var(--text-dimmed); letter-spacing: 0.05em; }
        .crm-clickable-row { cursor: pointer; }
        .crm-clickable-row:focus { outline: 2px solid var(--primary); outline-offset: -2px; }
        .crm-clickable-cell { cursor: pointer; }
        
        .crm-action-group { display: flex; gap: 8px; justify-content: flex-end; }
        .crm-action-btn { width: 36px; height: 36px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-surface); color: var(--text-muted); display: flex; align-items: center; justify-content: center; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer; }
        .crm-action-btn:hover { background: var(--primary-soft); color: var(--primary); border-color: var(--primary); transform: translateY(-2px); box-shadow: 0 4px 12px var(--primary-soft); }
        .crm-action-btn.danger:hover { background: rgba(239, 68, 68, 0.1); color: var(--danger); border-color: var(--danger); box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2); }
      `}</style>
    </div>
  )
}
