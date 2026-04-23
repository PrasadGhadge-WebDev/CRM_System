import { useEffect, useCallback, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
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
import {
  DEFAULT_CUSTOMER_SORT,
  STATIC_CUSTOMER_TYPES,
} from '../customers/customerHelpers.js'
import { usersApi } from '../../../services/users.js'
import { ordersApi } from '../../../services/orders.js'

function stopRowNavigation(event) {
  event.stopPropagation()
}

export default function CustomersList() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const isAdmin = user?.role === 'Admin'
  const isManager = user?.role === 'Manager'
  const isEmployee = user?.role === 'Employee'
  const isManagement = isAdmin || isManager
  const canModify = isManagement // or specific logic if needed

  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [statusOptions, setStatusOptions] = useState([])
  useToastFeedback({ error, success: notice })

  // Filter & Sort State
  const [filters, setFilters] = useState({
    q: searchParams.get('q') || '',
    companyId: searchParams.get('companyId') || '',
    customer_type: searchParams.get('customer_type') || '',
    status: searchParams.get('status') || '',
    assigned_to: searchParams.get('assigned_to') || '',
    startDate: searchParams.get('startDate') || '',
    endDate: searchParams.get('endDate') || '',
    sortField: searchParams.get('sortField') || DEFAULT_CUSTOMER_SORT.field,
    sortOrder: searchParams.get('sortOrder') || DEFAULT_CUSTOMER_SORT.order,
    is_vip: searchParams.get('is_vip') || '',
    page: Math.max(1, Number(searchParams.get('page')) || 1),
    limit: Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20)),
  })

  const debouncedQ = useDebouncedValue(filters.q, 300)

  useEffect(() => {
    const next = new URLSearchParams()
    if (debouncedQ.trim()) next.set('q', debouncedQ.trim())
    if (filters.companyId) next.set('companyId', filters.companyId)
    if (filters.customer_type) next.set('customer_type', filters.customer_type)
    if (filters.status) next.set('status', filters.status)
    if (filters.assigned_to) next.set('assigned_to', filters.assigned_to)
    if (filters.startDate) next.set('startDate', filters.startDate)
    if (filters.endDate) next.set('endDate', filters.endDate)
    if (filters.sortField !== DEFAULT_CUSTOMER_SORT.field) next.set('sortField', filters.sortField)
    if (filters.sortOrder !== DEFAULT_CUSTOMER_SORT.order) next.set('sortOrder', filters.sortOrder)
    if (filters.is_vip) next.set('is_vip', filters.is_vip)
    if (filters.page > 1) next.set('page', String(filters.page))
    if (filters.limit !== 20) next.set('limit', String(filters.limit))

    setSearchParams(next, { replace: true })
  }, [debouncedQ, filters, setSearchParams])

  const loadCustomers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await customersApi.list({
        ...filters,
        q: debouncedQ,
        all: user?.role === 'Admin' ? true : undefined,
      })
      setItems(res.items || [])
      setTotal(res.total || 0)
    } catch {
      setError('Failed to load customers')
    } finally {
      setLoading(false)
    }
  }, [debouncedQ, filters, user])

  useEffect(() => {
    loadCustomers()
    usersApi.list({ limit: 'all' }).then(res => setEmployees(res.items || []))
    statusesApi.list('customer').then(res => {
      if (res && res.length > 0) {
        setStatusOptions(res)
      } else {
        setStatusOptions([
          { name: 'Active', color: '#10b981' },
          { name: 'Inactive', color: '#ef4444' }
        ])
      }
    })
  }, [loadCustomers])

  const handleFilterChange = (nextFilters) => {
    setFilters((prev) => ({ ...prev, ...nextFilters, page: 1 }))
  }

  const handleReset = () => {
    setFilters({
      q: '',
      companyId: '',
      customer_type: '',
      status: '',
      assigned_to: '',
      startDate: '',
      endDate: '',
      sortField: DEFAULT_CUSTOMER_SORT.field,
      sortOrder: DEFAULT_CUSTOMER_SORT.order,
      is_vip: '',
      page: 1,
      limit: 20,
    })
  }

  async function onDelete(id) {
    const confirmed = await confirmToast('Are you sure you want to move this customer to trash?', {
      confirmLabel: 'Move to Trash',
      type: 'danger',
    })
    if (!confirmed) return
    try {
      await customersApi.remove(id)
      toast.success('Record moved to Trash successfully')
      loadCustomers()
    } catch {
      setError('Delete failed')
    }
  }

  async function onExport(template = false) {
    setBusy(true)
    setError('')
    try {
      const blob = await customersApi.exportCsv({
        q: debouncedQ,
        companyId: filters.companyId,
        ...(template ? { template: true } : null),
      })
      const filename = template ? `customers-template.csv` : `customers-export.csv`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setNotice(template ? 'Template downloaded.' : 'Export completed.')
    } catch {
      setError('Export failed')
    } finally {
      setBusy(false)
    }
  }


  return (
    <div className="stack gap-24">
      <PageHeader
        title="Customer Intelligence"
        description="Monitor and manage client relationships across the business."
        backTo="/"
        actions={
          <div className="control-bar-premium">
            <div className="action-group">
              <button className="btn-premium action-secondary" onClick={() => fileInputRef.current?.click()} disabled={busy}>
                <Icon name="upload" />
                <span>Import CSV</span>
              </button>
              {canModify && (
                <button className="btn-premium action-vibrant" onClick={() => navigate('/customers/new')}>
                  <Icon name="plus" />
                  <span>Onboard Client</span>
                </button>
              )}
            </div>
          </div>
        }
      />

      <section className="glass-panel filter-section-premium">
        <div className="filter-grid-premium" style={{ gridTemplateColumns: '1.5fr 1fr 1fr 1.5fr auto', alignItems: 'end' }}>
          <div className="filter-cell">
            <label className="filter-label">Search Client</label>
            <div className="search-input-premium">
              <Icon name="search" className="search-icon" />
              <input
                type="text"
                placeholder="Name, Phone, ID..."
                value={filters.q}
                onChange={(e) => handleFilterChange({ q: e.target.value })}
              />
            </div>
          </div>

          <div className="filter-cell">
            <label className="filter-label">Status</label>
            <select className="input-premium" value={filters.status} onChange={(e) => handleFilterChange({ status: e.target.value })}>
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="filter-cell">
            <label className="filter-label">Assigned Owner</label>
            <select className="input-premium" value={filters.assigned_to} onChange={(e) => handleFilterChange({ assigned_to: e.target.value })}>
              <option value="">All Employees</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>

          <div className="filter-cell">
            <label className="filter-label">Registration Date</label>
            <div className="range-input-group">
              <input type="date" className="input-premium mini" value={filters.startDate} onChange={(e) => handleFilterChange({ startDate: e.target.value })} />
              <input type="date" className="input-premium mini" value={filters.endDate} onChange={(e) => handleFilterChange({ endDate: e.target.value })} />
            </div>
          </div>

          <div className="filter-cell" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <label className="filter-label" style={{ visibility: 'hidden' }}>Reset</label>
            <button className="btn-reset-premium" onClick={handleReset} style={{ height: '42px', padding: '0 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-dimmed)', fontSize: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: 'all 0.2s' }}>
              <Icon name="trash" size={14} />
              <span>Clear</span>
            </button>
          </div>
        </div>
      </section>

      {error && <div className="alert error">{error}</div>}
      {notice && <div className="alert success">{notice}</div>}

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        style={{ display: 'none' }}
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (!file) return
          setBusy(true)
          try {
            const csv = await file.text()
            const res = await customersApi.importCsv({ csv, companyId: filters.companyId })
            setNotice(`Imported ${res.created} customers.`)
            loadCustomers()
          } catch {
            setError('Import failed')
          } finally {
            setBusy(false)
            e.target.value = ''
          }
        }}
      />

      {loading ? (
        <div className="muted">Loading...</div>
      ) : (
        <>
          <div className="tableWrap shadow-soft rounded-xl overflow-hidden">
            <table className="table-premium">
              <thead>
                <tr>
                  <th style={{ minWidth: '180px' }} className="text-left">FULL NAME</th>
                  <th style={{ width: '130px' }} className="text-center">PHONE</th>
                  <th style={{ width: '180px' }} className="desktop-hide text-left">EMAIL</th>
                  <th style={{ width: '120px' }} className="text-left">CITY</th>
                  <th style={{ width: '120px' }} className="desktop-hide text-left">SOURCE</th>
                  <th style={{ width: '140px' }} className="tablet-hide text-left">ASSIGNED</th>
                  <th style={{ width: '100px' }} className="text-left">STATUS</th>
                  <th style={{ width: '80px' }} className="tablet-hide text-center">DEALS</th>
                  <th style={{ width: '120px' }} className="tablet-hide text-center">TOTAL PAID</th>
                  <th style={{ width: '140px' }} className="desktop-hide text-center">INTERACTION</th>
                  <th style={{ width: '120px' }} className="desktop-hide text-center">CREATED</th>
                  <th style={{ width: '160px' }} className="text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {items.length ? (
                  items.map((customer, idx) => (
                    <tr
                      key={customer.id}
                      className="tableRowInteractive"
                      onClick={() => navigate(`/customers/${customer.id}`)}
                    >
                      <td className="text-left">
                        <div className="stack tiny-gap">
                          <Link className="name-link" to={`/customers/${customer.id}`} onClick={stopRowNavigation}>
                            {customer.name}
                          </Link>
                          {customer.is_vip && <span className="vip-tag">VIP</span>}
                        </div>
                      </td>
                      <td className="font-numeric text-center">{customer.phone}</td>
                      <td className="desktop-hide text-xs muted text-left">{customer.email || '—'}</td>
                      <td className="text-left">{customer.city || '—'}</td>
                      <td className="desktop-hide text-left">
                        <span className="source-pill">{customer.source || 'Direct'}</span>
                      </td>
                      <td className="tablet-hide text-left">
                        <div className="user-mention">
                          <div className="user-dot" />
                          <span>{customer.assigned_to?.name || 'Unassigned'}</span>
                        </div>
                      </td>
                      <td className="text-left">
                        <span className={`status-pill-modern ${customer.status === 'Inactive' ? 'inactive' : 'active'}`}>
                          {customer.status || 'Active'}
                        </span>
                      </td>
                      <td className="tablet-hide text-center font-bold">{customer.total_deals || 0}</td>
                      <td className="tablet-hide text-center font-numeric-bold">
                        ₹{customer.total_purchase_amount?.toLocaleString() || 0}
                      </td>
                      <td className="desktop-hide text-xs text-center">
                        {customer.last_interaction ? new Date(customer.last_interaction).toLocaleDateString() : '—'}
                      </td>
                      <td className="desktop-hide text-xs muted text-center">
                        {new Date(customer.created_at).toLocaleDateString()}
                      </td>
                      <td className="text-right" onClick={stopRowNavigation}>
                        <div className="tableActions">
                          <button className="action-btn-mini" onClick={() => navigate(`/customers/${customer.id}/edit`)} title="Edit">
                            <Icon name="edit" />
                          </button>
                          <Link to={`/deals/new?customer_id=${customer.id}`} className="action-btn-mini success" title="Create Deal">
                            <Icon name="deals" />
                          </Link>
                          <button className="action-btn-mini danger" onClick={() => onDelete(customer.id)} title="Delete">
                            <Icon name="trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={12}>
                      <div className="emptyState" style={{ padding: '60px 0', textAlign: 'center' }}>
                        <div className="emptyStateTitle" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'white', marginBottom: '8px' }}>No records in registry</div>
                        <p className="muted" style={{ fontSize: '0.88rem' }}>Adjust your filters or onboard a new client to populate this list.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
            {total > filters.limit && (
              <Pagination
                page={filters.page}
                limit={filters.limit}
                total={total}
                onPageChange={(p) => handleFilterChange({ page: p })}
                onLimitChange={(l) => handleFilterChange({ limit: l, page: 1 })}
              />
            )}
          </>
        )}

      <style>{`
        .control-bar-premium { display: flex; align-items: center; gap: 16px; }
        .action-group { display: flex; gap: 12px; }
        
        .btn-premium { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 12px; font-weight: 800; font-size: 0.88rem; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border: 1px solid transparent; cursor: pointer; }
        .action-vibrant { background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; box-shadow: 0 8px 20px rgba(79, 70, 229, 0.3); }
        .action-secondary { background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1); }
        .action-secondary:hover { background: rgba(255,255,255,0.1); }

        .glass-panel { background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(12px); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 24px; }
        .filter-section-premium { padding: 24px; margin-bottom: 8px; }
        .filter-grid-premium { display: grid; gap: 16px; }
        .filter-label { display: block; font-size: 0.65rem; font-weight: 800; color: var(--text-dimmed); text-transform: uppercase; margin-bottom: 8px; }
        
        .search-input-premium { position: relative; height: 42px; display: flex; align-items: center; }
        .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-dimmed); font-size: 14px; z-index: 1; }
        .search-input-premium input { width: 100%; height: 100%; padding: 0 12px 0 38px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color: white; font-size: 0.85rem; }
        
        .input-premium { width: 100%; padding: 10px 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color: white; font-size: 0.85rem; outline: none; }
        .input-premium:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.2); }
        .range-input-group { display: flex; gap: 4px; }
        .input-premium.mini { padding: 8px; font-size: 0.75rem; }

        .table-container-premium { background: rgba(15, 23, 42, 0.4); border-radius: 20px; border: 1px solid rgba(148, 163, 184, 0.1); overflow: hidden; margin-top: 16px; }
        .table-premium { width: 100%; border-collapse: separate; border-spacing: 0; }
        .table-premium th { background: rgba(148, 163, 184, 0.08); padding: 16px 20px; font-size: 0.65rem; font-weight: 800; color: white; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid rgba(148, 163, 184, 0.2); vertical-align: middle; }
        .table-premium td { padding: 16px 20px; border-bottom: 1px solid rgba(148, 163, 184, 0.05); font-size: 0.85rem; vertical-align: middle; }
        
        .tableRowInteractive:hover { background: rgba(255,255,255,0.03); }
        .id-badge { background: rgba(59, 130, 246, 0.1); color: #3b82f6; padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; font-family: monospace; font-weight: 700; border: 1px solid rgba(59, 130, 246, 0.2); }
        .white-text { color: white; }
        .font-bold { font-weight: 700; }
        
        .status-pill-mini { font-size: 0.6rem; font-weight: 900; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; }
        .status-pill-mini.active { background: #22c55e20; color: #22c55e; }
        .status-pill-mini.inactive { background: #64748b20; color: #64748b; }

        .user-mention { display: flex; align-items: center; gap: 6px; }
        .user-dot { width: 6px; height: 6px; border-radius: 50%; background: #3b82f6; }
        .action-btn-mini { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 6px; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
        .action-btn-mini:hover { background: rgba(255,255,255,0.1); transform: translateY(-2px); }
        .action-btn-mini.danger:hover { background: #ef444420; border-color: #ef444440; color: #ef4444; }
      `}</style>
    </div>
  )
}
