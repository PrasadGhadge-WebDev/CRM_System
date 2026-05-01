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
        <div className="users-page-header">
          <h1 className="users-title">Customers Management</h1>
          <p className="users-subtitle">Full database of active clients and business partners</p>
        </div>

        <div className="crm-stats-bar-compact">
          <div className="stat-pill-mini">
            <span className="stat-pill-label">TOTAL CLIENTS</span>
            <span className="stat-pill-value total">{total}</span>
          </div>
          <div className="stat-pill-mini">
            <span className="stat-pill-label">ACTIVE</span>
            <span className="stat-pill-value active">{items.filter(c => String(c.status).toLowerCase().includes('active')).length}</span>
          </div>
          <div className="stat-pill-mini">
            <span className="stat-pill-label">VIP</span>
            <span className="stat-pill-value pending">{items.filter(c => c.is_vip).length}</span>
          </div>
          <div className="stat-pill-mini">
            <span className="stat-pill-label">PENDING</span>
            <span className="stat-pill-value inactive">{items.filter(c => String(c.status).toLowerCase().includes('pending') || String(c.status).toLowerCase().includes('inactive')).length}</span>
          </div>
        </div>

        <div className="unified-action-bar">
          <div className="search-filter-group">
            <div className="crm-search-input-wrap">
              <Icon name="search" className="search-icon" />
              <input 
                type="text" 
                className="crm-input" 
                placeholder="Search customers..." 
                value={filters.q} 
                onChange={e => setFilters(f => ({ ...f, q: e.target.value, page: 1 }))} 
              />
            </div>

            <select className="crm-input filter-select" value={filters.customer_type} onChange={e => setFilters(f => ({ ...f, customer_type: e.target.value, page: 1 }))}>
              <option value="">All Types</option>
              <option value="Lead">Lead</option>
              <option value="Active">Active</option>
              <option value="Partner">Partner</option>
            </select>

            <select className="crm-input filter-select" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))}>
              <option value="">All Statuses</option>
              {statusOptions.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>

            <button
              className="btn-premium-mini add-user-btn"
              onClick={() => navigate('/customers/new')}
            >
              <Icon name="plus" size={16} />
              <span>Add Customer</span>
            </button>

            {(filters.q || filters.status || filters.customer_type || filters.assigned_to) && (
              <button 
                className="btn-clear-filters"
                onClick={() => {
                  setFilters({
                    q: '',
                    customer_type: '',
                    status: '',
                    assigned_to: '',
                    is_vip: '',
                    page: 1,
                    limit: 20
                  })
                }}
              >
                Clear All
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
                              <span className="crm-status-pill-modern">
                                <div className="status-dot" />
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
                                  className="modern-action-btn"
                                  onClick={() => navigate(`/customers/${id}/edit`)}
                                  title="Edit Customer"
                                >
                                  <Icon name="edit" size={14} />
                                </button>
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
           padding: 6px 14px;
           border-radius: 10px;
           font-size: 0.7rem;
           font-weight: 700;
           text-transform: uppercase;
           letter-spacing: 0.05em;
           display: inline-flex;
           align-items: center;
           gap: 6px;
           background: var(--success-soft, rgba(16, 185, 129, 0.08)); 
           color: var(--success); 
           border: 1px solid var(--success-soft, rgba(16, 185, 129, 0.15));
        }
        .status-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--success); box-shadow: 0 0 8px var(--success); }

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
         .crm-search-input-wrap { position: relative; width: 100%; flex: 1; max-width: none; }
         .crm-search-input-wrap .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); z-index: 1; color: var(--text-dimmed); font-size: 14px; }
         .crm-search-input-wrap .crm-input { padding-left: 36px !important; }
         
         .add-user-btn { background: var(--primary) !important; color: white !important; border: none !important; border-radius: 10px !important; padding: 0 20px !important; font-weight: 700 !important; height: 38px; display: flex; align-items: center; gap: 6px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 2px 8px rgba(var(--primary-rgb), 0.2); font-size: 0.85rem; flex-shrink: 0; }
         .add-user-btn:hover { background: var(--primary-hover) !important; transform: translateY(-2px); box-shadow: 0 6px 18px rgba(var(--primary-rgb), 0.4); }

         .crm-table th { padding: 12px 16px !important; border-bottom: 2px solid var(--border-strong) !important; }
         .crm-table td { padding: 10px 16px !important; border-bottom: 1px solid var(--border-strong) !important; }
         
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
