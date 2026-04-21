import { useEffect, useCallback, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Icon } from '../../../layouts/icons.jsx'
import Pagination from '../../../components/Pagination.jsx'
import FilterBar from '../../../components/FilterBar.jsx'
import PageHeader from '../../../components/PageHeader.jsx'
import { supportApi } from '../../../services/workflow.js'
import { useDebouncedValue } from '../../../utils/useDebouncedValue.js'
import { useAuth } from '../../../context/AuthContext.jsx'

export default function SupportList() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.role === 'Admin'
  const isManager = user?.role === 'Manager'
  const isAccountant = user?.role === 'Accountant'
  const canManage = isAdmin || isManager

  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [filters, setFilters] = useState({
    q: searchParams.get('q') || '',
    status: searchParams.get('status') || '',
    priority: searchParams.get('priority') || '',
    category: searchParams.get('category') || (isAccountant ? 'Billing' : ''),
    is_escalated: searchParams.get('is_escalated') === 'true',
    customer_is_vip: searchParams.get('customer_is_vip') || '',
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
    if (filters.priority) next.set('priority', filters.priority)
    if (filters.category) next.set('category', filters.category)
    if (filters.is_escalated) next.set('is_escalated', 'true')
    if (filters.customer_is_vip) next.set('customer_is_vip', filters.customer_is_vip)
    if (filters.sortField !== 'created_at') next.set('sortField', filters.sortField)
    if (filters.sortOrder !== 'desc') next.set('sortOrder', filters.sortOrder)
    if (filters.page > 1) next.set('page', String(filters.page))
    if (filters.limit !== 20) next.set('limit', String(filters.limit))
    setSearchParams(next, { replace: true })
  }, [debouncedQ, filters, setSearchParams])

  const loadTickets = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await supportApi.list({ ...filters, q: debouncedQ, all: user?.role === 'Admin' ? true : undefined })
      setItems(Array.isArray(res) ? res : res.items || [])
      setTotal(res.total || (Array.isArray(res) ? res.length : 0))
    } catch {
      setError('Failed to load tickets')
    } finally {
      setLoading(false)
    }
  }, [debouncedQ, filters])

  useEffect(() => {
    loadTickets()
  }, [loadTickets])

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (!window.confirm('Are you sure you want to permanently delete this ticket?')) return
    try {
      await supportApi.remove(id)
      toast.success('Ticket deleted successfully')
      loadTickets()
    } catch (err) {
      toast.error('Failed to delete ticket')
    }
  }

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }))
  }

  const toggleEscalated = () => {
    setFilters(prev => ({ ...prev, is_escalated: !prev.is_escalated, page: 1 }))
  }

  const setBillingFilter = () => {
    handleFilterChange({ category: 'Billing', is_escalated: false })
  }

  return (
    <div className="stack gap-32 support-list-container">
      <PageHeader 
        title="Support Intelligence" 
        backTo="/" 
        actions={
          <div className="flex gap-12">
            {isAccountant && (
              <button 
                className={`btn-premium ${filters.category === 'Billing' ? 'action-info active-glow' : 'action-secondary'}`}
                onClick={setBillingFilter}
              >
                <Icon name="reports" />
                <span>Billing Intelligence</span>
              </button>
            )}
            {canManage && (
              <button 
                className={`btn-premium ${filters.is_escalated ? 'action-warning active-glow' : 'action-secondary'}`}
                onClick={toggleEscalated}
              >
                <Icon name="bell" />
                <span>Monitoring Escalations</span>
              </button>
            )}
            <Link to="/tickets/new" className="btn-premium action-vibrant">
              <Icon name="plus" />
              <span>Initialize Ticket</span>
            </Link>
          </div>
        }
      />

      <div className="search-filter-shell card-premium">
        <div className="padding20 flex gap-12 border-bottom">
           <div className="search-box-premium flex1">
             <Icon name="search" />
             <input
               className="search-input-premium"
               placeholder="Search by Ticket ID (e.g. TKT-101), subject, or data..."
               value={filters.q}
               onChange={(e) => handleFilterChange({ q: e.target.value })}
             />
           </div>
        </div>

        <FilterBar 
          filters={filters}
          onFilterChange={handleFilterChange}
          resetSort={{ field: 'created_at', order: 'desc' }}
          sortFields={[
            { key: 'created_at', label: 'Date' },
            { key: 'priority', label: 'Priority' },
            { key: 'status', label: 'Status' }
          ]}
          currentSort={{ field: filters.sortField, order: filters.sortOrder }}
          options={{
            status: [
              { value: 'open', label: 'Open' },
              { value: 'in-progress', label: 'In Progress' },
              { value: 'resolved', label: 'Resolved' },
              { value: 'closed', label: 'Closed' }
            ],
            priority: [
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'urgent', label: 'Urgent' }
            ],
            category: [
              { value: 'Support', label: 'Support' },
              { value: 'Billing', label: 'Billing' },
              { value: 'Technical', label: 'Technical' },
              { value: 'Bug', label: 'Bug' },
              { value: 'Feature Request', label: 'Feature Request' },
              { value: 'General', label: 'General' }
            ]
          }}
          extraFilters={
            <label className="vip-filter-toggle">
              <input
                type="checkbox"
                checked={filters.customer_is_vip === 'true'}
                onChange={(e) => handleFilterChange({ customer_is_vip: e.target.checked ? 'true' : '' })}
              />
              <span className="vip-toggle-label">VIP Clients Only</span>
            </label>
          }
        />
      </div>

      {error && <div className="alert-premium error">{error}</div>}

      {loading ? (
        <div className="center padding60">
           <div className="loader-premium" />
           <div className="muted margin-top-12">Synchronizing Ticket Cloud...</div>
        </div>
      ) : (
        <div className="card-premium noPadding overflow-hidden">
          <div className="tableWrap">
            <table className="table-premium">
              <thead>
                <tr>
                  <th>Ticket / Information</th>
                  <th>Entity</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((t) => (
                  <tr 
                    key={t.id}
                    className={`table-row-premium ${t.is_escalated ? 'row-escalated' : ''} ${t.category === 'Billing' ? 'row-billing' : ''}`}
                    onClick={() => navigate(`/tickets/${t.id}`)}
                  >
                    <td>
                      <div className="flex items-center gap-12">
                        <div className="entity-avatar support-id-avatar">
                          {t.customer_id?.is_vip ? '★' : (t.subject || 'S').charAt(0).toUpperCase()}
                        </div>
                        <div className="entity-info">
                          <div className="entity-name flex items-center gap-8">
                            {t.subject}
                            {t.customer_id?.is_vip && <span className="vip-tag-premium">VIP</span>}
                            {t.is_escalated && (
                              <span className="badge-signal pulse-red" title="Escalation Protocol Active">
                                 <Icon name="bell" size={12} />
                                 ESCALATED
                              </span>
                            )}
                          </div>
                          <div className="entity-type">#{t.ticket_id} • {t.category || 'Support'} • {new Date(t.created_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                       <div className="customer-chip">
                         <Icon name="user" />
                         <span>{t.customer_id?.name || 'Unknown'}</span>
                       </div>
                    </td>
                    <td>
                      <span className={`status-badge priority-${t.priority}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge status-${t.status.replace('-', '')}`}>
                        {t.status}
                      </span>
                    </td>
                    <td>
                       <div className="assignee-chip">
                         {t.assigned_to ? (
                           <>
                             <div className="avatar-xs">{t.assigned_to.name.charAt(0)}</div>
                             <span>{t.assigned_to.name}</span>
                           </>
                         ) : (
                           <span className="muted italic">Unassigned</span>
                         )}
                       </div>
                    </td>
                    <td>
                       <div className="flex gap-8">
                         <button 
                           className="btn-icon-premium" 
                           onClick={(e) => { e.stopPropagation(); navigate(`/tickets/${t.id}/edit`); }}
                           title="Edit Ticket"
                         >
                           <Icon name="edit" />
                         </button>
                         {isAdmin && (
                           <button 
                             className="btn-icon-premium danger" 
                             onClick={(e) => handleDelete(e, t.id)}
                             title="Delete Permanently"
                           >
                             <Icon name="trash" />
                           </button>
                         )}
                       </div>
                    </td>
                  </tr>
                ))}
                {!items.length && (
                  <tr>
                    <td colSpan="6" className="center padding60 muted">
                       <Icon name="bell" size={48} />
                       <p className="margin-top-12">No support signals detected in current filter.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination 
            page={filters.page} 
            limit={filters.limit} 
            total={total} 
            onPageChange={(p) => setFilters(prev => ({ ...prev, page: p }))} 
            onLimitChange={(l) => setFilters(prev => ({ ...prev, limit: l, page: 1 }))}
          />
        </div>
      )}

      <style>{`
        .support-list-container { padding-bottom: 40px; }
        .search-box-premium { display: flex; align-items: center; gap: 12px; background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border); border-radius: 12px; padding: 0 16px; }
        .search-input-premium { flex: 1; background: transparent; border: none; padding: 12px 0; color: white; font-size: 0.95rem; }
        .search-input-premium:focus { outline: none; }
        
        .table-premium { width: 100%; border-collapse: collapse; }
        .table-premium th { text-align: left; padding: 16px 20px; font-size: 0.75rem; color: var(--text-dimmed); text-transform: uppercase; font-weight: 800; border-bottom: 2px solid var(--border); }
        .table-premium td { padding: 16px 20px; border-bottom: 1px solid var(--border); vertical-align: middle; }
        .table-row-premium { transition: background 0.2s; cursor: pointer; }
        .table-row-premium:hover { background: rgba(255, 255, 255, 0.02); }
        .row-escalated { background: rgba(239, 68, 68, 0.05); }
        .row-billing { background: rgba(14, 165, 233, 0.03); }
        
        .billing-tag-vibrant { background: rgba(14, 165, 233, 0.1); color: #0ea5e9; border-color: rgba(14, 165, 233, 0.3); }
        
        .customer-chip, .assignee-chip { display: flex; align-items: center; gap: 8px; color: var(--text-muted); font-size: 0.9rem; }
        .avatar-xs { width: 20px; height: 20px; border-radius: 6px; background: var(--primary); color: white; font-size: 0.65rem; display: flex; align-items: center; justify-content: center; font-weight: 800; }
        
        .status-badge { display: inline-flex; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; border: 1px solid transparent; }
        .status-badge.priority-high, .status-badge.priority-urgent { background: rgba(239, 68, 68, 0.1); color: #ef4444; border-color: rgba(239, 68, 68, 0.2); }
        .status-badge.priority-medium { background: rgba(245, 158, 11, 0.1); color: #f59e0b; border-color: rgba(245, 158, 11, 0.2); }
        .status-badge.priority-low { background: rgba(16, 185, 129, 0.1); color: #10b981; border-color: rgba(16, 185, 129, 0.2); }
        
        .status-badge.status-open { background: rgba(59, 130, 246, 0.1); color: #3b82f6; border-color: rgba(59, 130, 246, 0.2); }
        .status-badge.status-inprogress { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; border-color: rgba(139, 92, 246, 0.2); }
        .status-badge.status-resolved { background: rgba(16, 185, 129, 0.1); color: #10b981; border-color: rgba(16, 185, 129, 0.2); }
        
        .btn-icon-premium { width: 32px; height: 32px; border-radius: 8px; background: rgba(255, 255, 255, 0.05); color: var(--text-muted); border: 1px solid var(--border); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .btn-icon-premium:hover { background: var(--bg-elevated); color: white; border-color: var(--primary); }
        .btn-icon-premium.danger:hover { background: rgba(239, 68, 68, 0.1); color: #ef4444; border-color: #ef4444; }
        
        .badge-signal { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 4px; font-size: 0.65rem; font-weight: 900; background: #ef4444; color: white; }
        .pulse-red { animation: pulse-red-badge 1.5s infinite; }
        @keyframes pulse-red-badge { 0% { opacity: 1; } 50% { opacity: 0.7; } 100% { opacity: 1; } }
        
        .action-info.active-glow { background: #0ea5e9; color: white; box-shadow: 0 0 15px rgba(14, 165, 233, 0.4); }
        .action-warning.active-glow { background: #f59e0b; color: white; box-shadow: 0 0 15px rgba(245, 158, 11, 0.4); }
        .info-text { color: #0ea5e9; }
        .margin-right-8 { margin-right: 8px; }
        
        .loader-premium { width: 40px; height: 40px; border: 4px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
