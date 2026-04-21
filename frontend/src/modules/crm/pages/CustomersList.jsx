import { useEffect, useCallback, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Icon } from '../../../layouts/icons.jsx'
import Pagination from '../../../components/Pagination.jsx'
import FilterBar from '../../../components/FilterBar.jsx'
import SearchInput from '../../../components/SearchInput.jsx'
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

  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
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
    sortField: searchParams.get('sortField') || DEFAULT_CUSTOMER_SORT.field,
    sortOrder: searchParams.get('sortOrder') || DEFAULT_CUSTOMER_SORT.order,
    is_vip: searchParams.get('is_vip') || '',
    page: Math.max(1, Number(searchParams.get('page')) || 1),
    limit: Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20)),
  })

  const debouncedQ = useDebouncedValue(filters.q, 300)
  const { companyId, customer_type, sortField, sortOrder, page, limit } = filters

  useEffect(() => {
    const next = new URLSearchParams()
    if (debouncedQ.trim()) next.set('q', debouncedQ.trim())
    if (companyId) next.set('companyId', companyId)
    if (customer_type) next.set('customer_type', customer_type)
    if (sortField !== DEFAULT_CUSTOMER_SORT.field) next.set('sortField', sortField)
    if (sortOrder !== DEFAULT_CUSTOMER_SORT.order) next.set('sortOrder', sortOrder)
    if (filters.is_vip) next.set('is_vip', filters.is_vip)
    if (page > 1) next.set('page', String(page))
    if (limit !== 20) next.set('limit', String(limit))

    setSearchParams(next, { replace: true })
  }, [companyId, customer_type, debouncedQ, limit, page, setSearchParams, sortField, sortOrder])

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
  }, [debouncedQ, filters])

  useEffect(() => {
    loadCustomers()
    statusesApi.list('customer').then(res => {
      if (res && res.length > 0) {
        setStatusOptions(res)
      } else {
        setStatusOptions([
          { name: 'Active', color: '#10b981' },
          { name: 'Inactive', color: '#ef4444' },
          { name: 'Prospect', color: '#3b82f6' }
        ])
      }
    })
  }, [loadCustomers])

  const handleFilterChange = (nextFilters) => {
    setFilters((prev) => ({ ...prev, ...nextFilters, page: 1 }))
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

  // CSV stuff...
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  async function onExport(template = false) {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const blob = await customersApi.exportCsv({
        q: debouncedQ,
        companyId: filters.companyId,
        ...(template ? { template: true } : null),
      })
      const filename = template ? `customers-template.csv` : `customers-export.csv`
      downloadBlob(blob, filename)
      setNotice(template ? 'Template downloaded.' : 'Export completed.')
    } catch {
      setError('Export failed')
    } finally {
      setBusy(false)
    }
  }

  async function onImportFileSelected(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
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
    }
  }

  return (
    <div className="stack gap-24">
      <PageHeader
        title={isAdmin ? 'Customer Master Registry' : (isEmployee ? 'Assigned Portfolio' : 'Customer Intelligence')}
        backTo="/"
        actions={
          !isManagement ? null : (
            <div className="control-bar-premium">
              <Link className="btn-premium action-vibrant" to="/reports" title="View Analytics">
                <Icon name="reports" />
                <span>Analytics</span>
              </Link>
              <button className="btn-premium action-info" onClick={() => onExport(false)} disabled={busy}>
                <Icon name="download" />
                <span>Export</span>
              </button>
              <button className="btn-premium action-info" onClick={() => fileInputRef.current?.click()} disabled={busy}>
                <Icon name="plus" />
                <span>Import</span>
              </button>
              <button 
                className="btn-premium action-primary" 
                onClick={() => navigate('/customers/new')}
              >
                <Icon name="plus" />
                <span>New Customer</span>
              </button>
            </div>
          )
        }
      />

      <section className="customers-hero-stats">
        <div className="stat-card-glass">
          <div className="stat-icon-wrap primary-tint">
            <Icon name="user" />
          </div>
          <div className="stat-data">
            <span className="stat-value">{total}</span>
            <span className="stat-label">Total Portfolio</span>
          </div>
        </div>
        <div className="stat-card-glass">
          <div className="stat-icon-wrap success-tint">
            <Icon name="deals" />
          </div>
          <div className="stat-data">
            <span className="stat-value">{items.filter(i => i.status !== 'Inactive').length}</span>
            <span className="stat-label">Active Accounts</span>
          </div>
        </div>
        <div className="stat-card-glass">
          <div className="stat-icon-wrap info-tint">
            <Icon name="dashboard" />
          </div>
          <div className="stat-data">
            <span className="stat-value">{items.filter(i => i.customer_type === 'Enterprise' || i.customer_type === 'Corporate').length}</span>
            <span className="stat-label">Key Accounts</span>
          </div>
        </div>
      </section>

      <div className="premium-filter-system">
        <div className="search-bar-integrated">
          <Icon name="search" className="search-icon-dimmed" />
          <input
            className="search-input-sleek"
            placeholder="Search the portfolio: name, email, phone, city..."
            value={filters.q}
            onChange={(e) => handleFilterChange({ q: e.target.value })}
          />
        </div>

        <FilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          resetSort={DEFAULT_CUSTOMER_SORT}
          sortFields={[
            { key: 'name', label: 'Name' },
            { key: 'created_at', label: 'Date Added' },
            { key: 'city', label: 'City' },
          ]}
          currentSort={{ field: filters.sortField, order: filters.sortOrder }}
          options={{
            customer_type: STATIC_CUSTOMER_TYPES,
          }}
          extraFilters={
            <label className="vip-filter-toggle">
              <input
                type="checkbox"
                checked={filters.is_vip === 'true'}
                onChange={(e) => handleFilterChange({ is_vip: e.target.checked ? 'true' : '' })}
              />
              <span className="vip-toggle-label">VIP Only</span>
            </label>
          }
        />
      </div>

      {error && <div className="alert error glass-alert">{error}</div>}
      {notice && <div className="alert glass-alert">{notice}</div>}

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        style={{ display: 'none' }}
        onChange={onImportFileSelected}
      />

      {loading ? (
        <div className="loading-state-centered">
          <div className="spinner-medium" />
          <span>Crunching portfolio data...</span>
        </div>
      ) : (
        <div className="portfolio-registry-container">
          <table className="table premium-table">
            <thead>
              <tr>
                <th style={{ minWidth: '240px' }}>Customer / Company</th>
                <th className="mobile-hide" style={{ width: '180px' }}>Contact Hub</th>
                <th className="tablet-hide" style={{ width: '140px' }}>Financial Info</th>
                <th className="mobile-hide" style={{ width: '160px' }}>{isEmployee ? 'Next Task' : 'Account Manager'}</th>
                <th style={{ width: '130px' }}>Status</th>
                <th className="text-right" style={{ width: '120px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((customer) => (
                <tr 
                  key={customer.id} 
                  className="premium-row"
                  onClick={() => navigate(`/customers/${customer.id}`)}
                >
                  <td className="customer-main-cell">
                    <div className="entity-avatar">
                      {(customer.name || 'C').charAt(0).toUpperCase()}
                    </div>
                    <div className="entity-info">
                      <div className="entity-name">
                        {customer.name}
                        {customer.is_vip && (
                          <span className="vip-badge-mini" title="Strategic VIP Account">
                            <Icon name="star" />
                          </span>
                        )}
                      </div>
                      <div className="entity-type">{customer.company_name || 'Individual'}</div>
                      {(isAdmin || isManager) && (
                        <div className="satisfaction-stars-mini row gap-2 margin-top-4">
                           {[1, 2, 3, 4, 5].map(s => (
                             <Icon key={s} name="star" style={{ fontSize: '10px', color: s <= (customer.satisfaction_score || 0) ? '#fbbf24' : 'rgba(255,255,255,0.1)' }} />
                           ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="mobile-hide">
                    <div className="contact-info-stack">
                      <span className="contact-primary">{customer.phone || 'No phone record'}</span>
                      <span className="contact-secondary">{customer.email || 'No email record'}</span>
                    </div>
                  </td>
                  <td className="tablet-hide Financials-cell">
                    <div className="geo-main">{customer.payment_status || 'Pending'}</div>
                    <div className="geo-sub">₹{customer.total_purchase_amount?.toLocaleString() || 0}</div>
                  </td>
                  <td className="mobile-hide">
                    {isEmployee ? (
                      <div className={`followup-badge ${customer.follow_up_date && new Date(customer.follow_up_date) < new Date() ? 'overdue' : ''}`}>
                         <Icon name="activity" />
                         <span>
                           {customer.follow_up_date 
                             ? new Date(customer.follow_up_date).toLocaleDateString()
                             : 'No Task Set'}
                         </span>
                      </div>
                    ) : (
                      <div className="manager-chip">
                        <Icon name="user" />
                        <span>{customer.assigned_to?.name || 'Unassigned'}</span>
                      </div>
                    )}
                  </td>
                  <td>
                    <span 
                      className={`status-badge-vibrant dynamic-cust-status-${(customer.status || 'Active').replace(/\s+/g, '-').toLowerCase()}`}
                    >
                      {customer.status || 'Active'}
                    </span>
                  </td>
                  <td className="text-right">
                    {isManagement && (
                      <div className="action-pill-group" onClick={stopRowNavigation}>
                        <button
                          className="action-btn-minimal info-tint"
                          onClick={(e) => {
                             stopRowNavigation(e)
                             navigate(`/customers/${customer.id}/edit`)
                          }}
                          title="Edit Entity"
                        >
                          <Icon name="edit" />
                        </button>
                        <button
                          className="action-btn-minimal danger-tint"
                          onClick={(e) => {
                            stopRowNavigation(e)
                            onDelete(customer.id)
                          }}
                          title="Move to Trash"
                        >
                          <Icon name="trash" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr>
                  <td colSpan="6" className="empty-state-cell">
                    <div className="empty-state-content">
                      <Icon name="search" />
                      <p>No customer entities found in the current registry.</p>
                      <button className="btn-reset-minimal" onClick={() => handleFilterChange({ q: '' })}>
                        Reset Registry
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          
          <div className="portfolio-footer">
            <div className="footer-stats">
              Showing {items.length} of {total} total entities
            </div>
            <Pagination
              page={filters.page}
              limit={filters.limit}
              total={total}
              onPageChange={(nextPage) => setFilters((prev) => ({ ...prev, page: nextPage }))}
              onLimitChange={(nextLimit) =>
                setFilters((prev) => ({ ...prev, limit: nextLimit, page: 1 }))
              }
            />
          </div>
        </div>
      )}

      <style>{`
        .control-bar-premium { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; justify-content: flex-end; }
        .btn-premium { display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 12px; font-weight: 700; font-size: 0.88rem; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border: 1px solid transparent; cursor: pointer; }
        .action-vibrant { background: var(--primary); color: white; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }
        .action-success { background: rgba(16, 185, 129, 0.1); color: #10b981; border-color: rgba(16, 185, 129, 0.2); }
        .action-info { background: rgba(14, 165, 233, 0.1); color: #0ea5e9; border-color: rgba(14, 165, 233, 0.2); }
        .action-primary { background: linear-gradient(135deg, #2563eb, #4f46e5); color: white; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4); }
        .btn-premium:hover { transform: translateY(-2px); filter: brightness(1.05); }

        .customers-hero-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 8px; }
        .stat-card-glass { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; padding: 24px; display: flex; align-items: center; gap: 20px; backdrop-filter: blur(10px); }
        .stat-icon-wrap { width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; }
        .stat-icon-wrap.primary-tint { background: rgba(59, 130, 246, 0.1); color: #60a5fa; }
        .stat-icon-wrap.success-tint { background: rgba(16, 185, 129, 0.1); color: #34d399; }
        .stat-icon-wrap.info-tint { background: rgba(14, 165, 233, 0.1); color: #38bdf8; }
        .stat-data { display: flex; flex-direction: column; }
        .stat-value { font-size: 1.8rem; font-weight: 800; color: white; line-height: 1; margin-bottom: 4px; }
        .stat-label { font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }

        .premium-filter-system { background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border); border-radius: 24px; padding: 24px; margin-bottom: 8px; }
        .search-bar-integrated { display: flex; align-items: center; gap: 12px; background: rgba(0,0,0,0.2); border: 1px solid var(--border); border-radius: 16px; padding: 12px 16px; margin-bottom: 20px; transition: all 0.3s ease; }
        .search-bar-integrated:focus-within { border-color: var(--primary); background: rgba(0,0,0,0.3); box-shadow: 0 0 0 4px var(--primary-soft); }
        .search-input-sleek { background: transparent; border: none; color: var(--text); font-size: 1rem; width: 100%; outline: none; }
        .search-icon-dimmed { color: var(--text-dimmed); opacity: 0.7; }

        .portfolio-registry-container { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 24px; overflow: hidden; box-shadow: var(--shadow-lg); }
        .premium-table th { background: rgba(255, 255, 255, 0.02); color: var(--text-muted); font-weight: 700; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.1em; padding: 18px 24px; border-bottom: 1px solid var(--border); }
        .premium-row { cursor: pointer; transition: all 0.2s ease; border-bottom: 1px solid rgba(255,255,255,0.02); }
        .premium-row:hover { background: rgba(59, 130, 246, 0.03); }
        .customer-main-cell { display: flex; align-items: center; gap: 16px; padding: 18px 24px; }
        .entity-avatar { width: 44px; height: 44px; border-radius: 14px; background: linear-gradient(135deg, #6366f1, #2563eb); color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.2rem; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.2); }
        .entity-info { display: flex; flex-direction: column; gap: 2px; }
        .entity-name { font-weight: 700; color: white; font-size: 1.05rem; }
        .entity-type { font-size: 0.72rem; color: var(--text-muted); font-weight: 600; }
        
        .contact-info-stack { display: flex; flex-direction: column; gap: 1px; }
        .contact-primary { font-size: 0.9rem; color: var(--text); font-weight: 600; }
        .contact-secondary { font-size: 0.72rem; color: var(--text-dimmed); }
        
        .geo-main { font-weight: 600; color: var(--text); font-size: 0.9rem; }
        .geo-sub { font-size: 0.72rem; color: var(--text-dimmed); }
        
        .manager-chip { display: inline-flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.05); padding: 6px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); font-size: 0.82rem; color: var(--text-muted); font-weight: 600; }
        .manager-chip svg { width: 14px; height: 14px; color: var(--primary); }
        
        .status-badge-vibrant { display: inline-block; padding: 6px 14px; border-radius: 10px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; border: 1px solid transparent; }
        
        ${statusOptions.map(opt => `
          .dynamic-cust-status-${opt.name.replace(/\s+/g, '-').toLowerCase()} { 
            background: ${opt.color || '#3b82f6'}15 !important; 
            color: ${opt.color || '#3b82f6'} !important; 
            border: 1px solid ${opt.color || '#3b82f6'}30 !important; 
          }
        `).join('')}
        
        .action-pill-group { display: flex; align-items: center; gap: 8px; }
        .action-btn-minimal { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.05); border: 1px solid var(--border); color: var(--text-dimmed); transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer; }
        .action-btn-minimal:hover { transform: translateY(-2px); color: white; background: var(--bg-elevated); }
        .info-tint:hover { background: var(--info); border-color: var(--info); box-shadow: 0 4px 12px rgba(14, 165, 233, 0.2); }
        .danger-tint:hover { background: var(--danger); border-color: var(--danger); box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2); }

        .portfolio-footer { display: flex; align-items: center; justify-content: space-between; padding: 24px; border-top: 1px solid var(--border); background: rgba(255,255,255,0.01); }
        .empty-state-cell { padding: 80px 20px; text-align: center; }
        .empty-state-content { display: flex; flex-direction: column; align-items: center; gap: 16px; color: var(--text-dimmed); }
        .empty-state-content svg { width: 56px; height: 56px; opacity: 0.15; }
        
        .glass-alert { background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border); border-radius: 16px; backdrop-filter: blur(10px); }
        .loading-state-centered { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100px 40px; gap: 20px; color: var(--text-muted); }
        
        .vip-badge-mini { display: inline-flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; width: 18px; height: 18px; border-radius: 50%; font-size: 0.6rem; margin-left: 8px; vertical-align: middle; box-shadow: 0 2px 4px rgba(217, 119, 6, 0.4); }
        .vip-badge-mini svg { width: 10px; height: 10px; }
        
        .vip-filter-toggle { display: flex; align-items: center; gap: 8px; padding: 0 16px; border-left: 1px solid var(--border); margin-left: auto; cursor: pointer; }
        .vip-toggle-label { font-size: 0.75rem; font-weight: 700; color: #f59e0b; text-transform: uppercase; }
        
        .followup-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(255, 255, 255, 0.05); padding: 6px 12px; border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.1); font-size: 0.82rem; color: var(--text-muted); font-weight: 600; }
        .followup-badge svg { width: 14px; height: 14px; color: var(--primary); }
        .followup-badge.overdue { background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.2); color: #f87171; }
        .followup-badge.overdue .followup-date { color: #ef4444; }
        .margin-top-4 { margin-top: 4px; }
        .satisfaction-stars-mini { opacity: 0.8; }
      `}</style>
    </div>
  )
}
