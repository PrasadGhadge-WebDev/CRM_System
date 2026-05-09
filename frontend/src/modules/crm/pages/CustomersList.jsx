import { useEffect, useCallback, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Icon } from '../../../layouts/icons.jsx'
import Pagination from '../../../components/Pagination.jsx'
import { customersApi } from '../../../services/customers.js'
import { statusesApi } from '../../../services/statuses.js'
import { confirmToast } from '../../../utils/confirmToast.jsx'
import { useDebouncedValue } from '../../../utils/useDebouncedValue.js'
import { useToastFeedback } from '../../../utils/useToastFeedback.js'
import { useAuth } from '../../../context/AuthContext.jsx'
import { usersApi } from '../../../services/users.js'
import SearchableSelect from '../components/SearchableSelect.jsx'
import ModernSearchBar from '../../../components/ModernSearchBar.jsx'
import LeadAssignModal from '../components/LeadAssignModal.jsx'

function stopRowNavigation(event) {
  event.stopPropagation()
}

function getCustomerFinancialSnapshot(customer) {
  const latestDeal = customer?.latest_deal || null
  const dealValue = Number(latestDeal?.value ?? customer?.total_deal_value ?? 0) || 0
  const paidAmount = Number(latestDeal?.paid_amount ?? customer?.paid_amount ?? 0) || 0
  const pendingAmountFromDeal = latestDeal?.value != null
    ? Math.max(0, dealValue - paidAmount)
    : null
  const pendingAmount = pendingAmountFromDeal ?? Math.max(0, Number(customer?.pending_amount ?? (dealValue - paidAmount) ?? 0) || 0)
  const paymentStatus = latestDeal?.payment_status || customer?.payment_status || (pendingAmount === 0 ? 'Paid' : paidAmount > 0 ? 'Partial' : 'Pending')

  return {
    paidAmount,
    pendingAmount,
    paymentStatus,
  }
}

export default function CustomersList() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user: currentUser } = useAuth()

  const isAdmin = currentUser?.role === 'Admin'
  const isManager = currentUser?.role === 'Manager'
  const isEmployee = currentUser?.role === 'Employee'
  const isAccountant = currentUser?.role === 'Accountant'
  const isAdminOrManager = isAdmin || isManager

  const canModify = isAdmin || isManager || isEmployee
  const canDelete = isAdmin

  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [summary, setSummary] = useState({ total: 0, byStatus: {} })
  const [statusOptions, setStatusOptions] = useState([])
  const [selectedCustomers, setSelectedCustomers] = useState([])
  const [assignModal, setAssignModal] = useState({ open: false, customer: null })

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

  const handleSelectAll = (checked) =>
    setSelectedCustomers(checked ? items.map((item) => String(item.id || item._id)) : [])

  const handleSelectCustomer = (id, checked) => {
    if (checked) {
      setSelectedCustomers((prev) => [...new Set([...prev, String(id)])])
    } else {
      setSelectedCustomers((prev) => prev.filter((item) => String(item) !== String(id)))
    }
  }

  async function onDelete(id) {
    if (!canDelete) return toast.error('Admin permission required')
    const confirmed = await confirmToast('Move this customer to trash?', { confirmLabel: 'Move to Trash', type: 'danger' })
    if (!confirmed) return
    try { await customersApi.remove(id); toast.success('Customer moved to trash'); loadCustomers(); } catch { toast.error('Delete failed') }
  }

  async function handleAssignSubmit(employeeId, reason) {
    const ids = assignModal.customer ? [assignModal.customer.id || assignModal.customer._id] : selectedCustomers
    try {
      if (ids.length === 1) {
        await customersApi.update(ids[0], { assigned_to: employeeId, assignment_reason: reason })
      } else {
        // Bulk assign logic if supported by API, otherwise loop
        for (const id of ids) {
           await customersApi.update(id, { assigned_to: employeeId, assignment_reason: reason })
        }
      }
      toast.success('Assignment updated successfully')
      setAssignModal({ open: false, customer: null })
      setSelectedCustomers([])
      loadCustomers()
    } catch (err) {
      toast.error(err.message || 'Assignment failed')
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
          <div className={`stat-pill-mini clickable ${filters.status === '' ? 'is-active' : ''}`} onClick={() => setFilters(f => ({ ...f, status: '', page: 1 }))}>
            <span className="stat-pill-label">ALL CLIENTS</span>
            <span className="stat-pill-value total">{summary.total}</span>
          </div>
          {Object.entries(summary.byStatus).map(([name, count]) => (
            <div 
              key={name} 
              className={`stat-pill-mini clickable ${filters.status === name ? 'is-active' : ''}`} 
              onClick={() => setFilters(f => ({ ...f, status: name, page: 1 }))}
            >
              <span className="stat-pill-label">{name.toUpperCase()}</span>
              <span className={`stat-pill-value ${String(name).toLowerCase()}`}>{count}</span>
            </div>
          ))}
        </div>

        <div className="unified-action-bar">
          <div className="search-filter-group">
            <ModernSearchBar
              value={filters.q}
              onChange={e => setFilters(f => ({ ...f, q: e.target.value, page: 1 }))}
              placeholder="Search by name, phone, city, status, company, GST..."
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

            {selectedCustomers.length > 0 && isAdminOrManager && (
              <button
                className="btn-premium-mini bulk-assign-btn"
                onClick={() => setAssignModal({ open: true, customer: null })}
              >
                <Icon name="user" size={14} />
                <span>Assign Clients</span>
                <span className="selection-count">{selectedCustomers.length}</span>
              </button>
            )}

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
                  <thead style={{ background: 'var(--bg-surface)' }}>
                    <tr>
                      <th style={{ width: '50px' }}>
                        <input
                          type="checkbox"
                          checked={items.length > 0 && selectedCustomers.length === items.length}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                        />
                      </th>
                      <th style={{ minWidth: '200px' }} className="sortable" onClick={() => handleSort('name')}>
                        CUSTOMER NAME <Icon name={getSortIcon('name')} size={12} />
                      </th>
                      <th style={{ width: '130px' }} className="sortable" onClick={() => handleSort('status')}>
                        STATUS <Icon name={getSortIcon('status')} size={12} />
                      </th>
                      <th style={{ minWidth: '180px' }}>CONTACT</th>
                      <th style={{ minWidth: '170px' }} className="sortable" onClick={() => handleSort('assigned_to')}>
                        ASSIGNED TO <Icon name={getSortIcon('assigned_to')} size={12} />
                      </th>
                      <th style={{ minWidth: '160px' }}>ASSIGNED DEAL</th>
                      <th style={{ minWidth: '150px' }}>PENDING & STATUS</th>
                      <th className="text-right" style={{ width: '100px' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length > 0 ? (
                      items.map(customer => {
                        const id = customer.id || customer._id
                        const isSelected = selectedCustomers.includes(String(id))
                        const financials = getCustomerFinancialSnapshot(customer)
                        return (
                          <tr
                            key={String(id)}
                            className={`crm-table-row crm-clickable-row ${isSelected ? 'selected-row' : ''}`}
                            onClick={() => openCustomerDetails(id)}
                          >
                            <td onClick={stopRowNavigation}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => handleSelectCustomer(id, e.target.checked)}
                              />
                            </td>
                            <td>
                              <div className="leadsIdentityCell">
                                <div className="leadsPrimaryText">{customer.name}</div>
                                <div className="leadsSecondaryText" style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                                  JOINED: {customer.created_at ? new Date(customer.created_at).toLocaleDateString('en-GB') : '—'}
                                </div>
                              </div>
                            </td>
                            <td>
                               <div className="leadsIdentityCell">
                                 <div className="customersTypeBadge" style={{ 
                                    background: customer.status === 'Active' ? 'var(--success-soft)' : 
                                                customer.status === 'Inactive' ? 'var(--danger-soft)' : 'var(--bg-surface)',
                                    color: customer.status === 'Active' ? 'var(--success)' : 
                                           customer.status === 'Inactive' ? 'var(--danger)' : 'var(--text-dimmed)',
                                    width: 'fit-content'
                                  }}>
                                    {customer.status || 'Active'}
                                  </div>
                                  <div className="leadsSecondaryText" style={{ fontSize: '0.65rem', marginTop: '4px', whiteSpace: 'nowrap' }}>
                                    LAST: {customer.last_interaction ? new Date(customer.last_interaction).toLocaleDateString('en-GB') : 'NEVER'}
                                  </div>
                               </div>
                            </td>
                            <td>
                              <div className="leadsContactCell">
                                <div className="contactMain">{customer.phone || '—'}</div>
                                <div className="contactQuickActions">
                                   <a href={`tel:${customer.phone}`} className="action-icon-mini phone" onClick={stopRowNavigation} title="Call"><Icon name="phone" size={12} /></a>
                                   <a href={`https://wa.me/${customer.phone?.replace(/\D/g, '')}`} target="_blank" className="action-icon-mini whatsapp" onClick={stopRowNavigation} title="WhatsApp"><Icon name="whatsapp" size={12} /></a>
                                   <a href={`mailto:${customer.email}`} className="action-icon-mini email" onClick={stopRowNavigation} title="Email"><Icon name="mail" size={12} /></a>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div className="leadsOwnerCell">
                                <span className="ownerName">{customer.assigned_to?.name || 'Unassigned'}</span>
                                <span className="ownerRole">{customer.assigned_to?.role || 'Support'}</span>
                              </div>
                            </td>
                            <td>
                              {customer.latest_deal ? (
                                <div className="leadsIdentityCell">
                                  <div className="leadsPrimaryText" style={{ color: 'var(--primary)' }}>{customer.latest_deal.name}</div>
                                  <div className="leadsSecondaryText">{customer.latest_deal.stage}</div>
                                </div>
                              ) : (
                                <span className="leadsSecondaryText" style={{ opacity: 0.5 }}>No Active Deal</span>
                              )}
                            </td>
                            <td>
                              <div className="leadsIdentityCell">
                                <div className="leadsPrimaryText" style={{ color: financials.pendingAmount > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 800 }}>
                                  ₹{financials.pendingAmount.toLocaleString()}
                                </div>
                                <div className="customersTypeBadge" style={{ 
                                  background: financials.pendingAmount === 0 ? 'var(--success-soft)' : 
                                              (financials.paidAmount > 0) ? 'var(--warning-soft)' : 'var(--danger-soft)',
                                  color: financials.pendingAmount === 0 ? 'var(--success)' : 
                                         (financials.paidAmount > 0) ? 'var(--warning)' : 'var(--danger)',
                                  width: 'fit-content',
                                  marginTop: '4px'
                                }}>
                                  {financials.paymentStatus}
                                </div>
                              </div>
                            </td>
                            <td className="text-right" onClick={stopRowNavigation}>
                              <div className="crm-action-group">
                                {canModify && (
                                  <button
                                    className="modern-action-btn"
                                    onClick={() => navigate(`/customers/${id}/edit`)}
                                    title="Edit"
                                  >
                                    <Icon name="edit" size={14} />
                                  </button>
                                )}

                                {isAdmin && (
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
                        <td colSpan={8}>
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

      <LeadAssignModal
        isOpen={assignModal.open}
        selectedCount={assignModal.customer ? 1 : selectedCustomers.length}
        employees={employees}
        onClose={() => setAssignModal({ open: false, customer: null })}
        onAssign={handleAssignSubmit}
      />

      <style>{`
        .leadsIdentityCell { display: flex; flex-direction: column; gap: 2px; }
        .leadsPrimaryText { color: var(--text); font-size: 0.95rem; font-weight: 700; }
        .leadsSecondaryText { color: var(--text-dimmed); font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
        
        .leadsContactCell { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }
        .contactMain { color: var(--text); font-size: 0.85rem; font-weight: 800; white-space: nowrap; }
        .contactQuickActions { display: flex; gap: 6px; }
        .action-icon-mini { 
          width: 28px; 
          height: 28px; 
          border-radius: 8px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          background: var(--bg-surface); 
          color: var(--text-dimmed); 
          border: 1px solid var(--border-subtle);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .action-icon-mini.phone { color: #3b82f6; background: #eff6ff; border-color: #bfdbfe; }
        .action-icon-mini.whatsapp { color: #22c55e; background: #f0fdf4; border-color: #bbf7d0; }
        .action-icon-mini.email { color: #ef4444; background: #fef2f2; border-color: #fecaca; }
        
        .action-icon-mini:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .action-icon-mini.phone:hover { background: #3b82f6; color: white; border-color: #3b82f6; }
        .action-icon-mini.whatsapp:hover { background: #22c55e; color: white; border-color: #22c55e; }
        .action-icon-mini.email:hover { background: #ef4444; color: white; border-color: #ef4444; }

        .leadsOwnerCell { display: flex; flex-direction: column; gap: 2px; }
        .ownerName { color: var(--text); font-size: 0.85rem; font-weight: 700; }
        .ownerRole { color: var(--text-dimmed); font-size: 0.7rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }

        .customersTypeBadge { 
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 0.65rem; 
          font-weight: 800; 
          letter-spacing: 0.05em; 
          text-transform: uppercase;
          border: 1px solid transparent;
        }

        .crm-table-row { cursor: pointer; transition: all 0.2s; }
        .crm-table-row:hover { background: rgba(59, 130, 246, 0.03) !important; }
        .crm-table-row.selected-row { background: var(--primary-soft) !important; }
        
        .crm-action-group { display: flex; align-items: center; gap: 8px; justify-content: flex-end; }
        .modern-action-btn { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: var(--bg-surface); border: 1px solid var(--border); color: var(--text-muted); cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
        .modern-action-btn:hover { background: var(--primary-soft); color: var(--primary); border-color: var(--primary); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15); }

        .crm-actions-overflow { position: relative; }
        .crm-actions-overflow summary { list-style: none; outline: none; }
        .crm-actions-overflow summary::-webkit-details-marker { display: none; }
         
        .overflow-menu-content { 
          position: absolute; 
          right: 0; 
          top: calc(100% + 8px); 
          background: var(--bg-card); 
          border: 1px solid var(--border); 
          border-radius: 16px; 
          padding: 8px; 
          z-index: 1000; 
          min-width: 200px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          backdrop-filter: blur(20px);
        }
         
        .overflow-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: 10px;
          color: var(--text);
          font-size: 0.82rem;
          font-weight: 700;
          text-decoration: none;
          border: none;
          background: transparent;
          cursor: pointer;
          text-align: left;
          width: 100%;
          transition: all 0.2s;
        }
        .overflow-item:hover { background: var(--bg-surface); color: var(--primary); }
        .overflow-item.danger:hover { background: #fee2e2; color: #ef4444; }

        .users-page-header { margin-bottom: 8px; }
        .users-title { font-size: 1.3rem; font-weight: 800; color: var(--text); margin-bottom: 2px; }
        .users-subtitle { font-size: 0.85rem; color: var(--text-dimmed); font-weight: 500; }

        .unified-action-bar { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 8px; flex-wrap: wrap; }
        .search-filter-group { display: flex; align-items: center; gap: 16px; flex: 1; justify-content: space-between; }

        .crm-stats-bar-compact { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 12px; justify-content: space-between; }
        .stat-pill-mini { --stat-accent: var(--card-accent); background: color-mix(in srgb, var(--bg-card) 88%, var(--bg-surface) 12%); border: 1px solid var(--border-strong); padding: 14px 18px; border-radius: 16px; display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 130px; box-shadow: inset 4px 0 0 var(--stat-accent), 0 10px 24px rgba(var(--text-rgb), 0.06); transition: all 0.25s ease; }
        .crm-stats-bar-compact .stat-pill-mini:nth-child(1) { --stat-accent: #3b82f6; }
        .crm-stats-bar-compact .stat-pill-mini:nth-child(2) { --stat-accent: #10b981; }
        .crm-stats-bar-compact .stat-pill-mini:nth-child(3) { --stat-accent: #f59e0b; }
        .crm-stats-bar-compact .stat-pill-mini:nth-child(4) { --stat-accent: #8b5cf6; }
        .crm-stats-bar-compact .stat-pill-mini:nth-child(5) { --stat-accent: #ef4444; }
        .crm-stats-bar-compact .stat-pill-mini:nth-child(6) { --stat-accent: #14b8a6; }
        .stat-pill-mini.clickable { cursor: pointer; }
        .stat-pill-mini:hover { transform: translateY(-2px); border-color: var(--stat-accent); box-shadow: inset 4px 0 0 var(--stat-accent), 0 14px 30px color-mix(in srgb, var(--stat-accent) 20%, rgba(var(--text-rgb), 0.08)); }
        .stat-pill-mini.is-active { background: color-mix(in srgb, var(--bg-card) 82%, var(--stat-accent) 18%); border-color: var(--stat-accent); }
        .stat-pill-label { font-size: 11px; font-weight: 800; color: var(--text-dimmed); text-transform: uppercase; letter-spacing: 0.08em; }
        .stat-pill-value { font-size: 20px; font-weight: 900; }

        .bulk-assign-btn { background: #10b981 !important; color: white !important; border: none !important; border-radius: 10px !important; padding: 0 16px !important; font-weight: 700 !important; height: 38px; display: flex; align-items: center; gap: 8px; transition: all 0.3s; font-size: 0.85rem; flex-shrink: 0; }
        .bulk-assign-btn:hover { background: #059669 !important; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); }
        .selection-count { background: rgba(255, 255, 255, 0.2); padding: 2px 8px; border-radius: 6px; font-size: 0.75rem; margin-left: 4px; font-weight: 800; }

        @media (max-width: 1000px) {
          .crm-stats-bar-compact { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
          .stat-pill-mini { min-width: 0; padding: 10px; }
        }
      `}</style>
    </div>
  )
}
