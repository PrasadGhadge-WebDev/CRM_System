import { useEffect, useCallback, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Icon } from '../../../layouts/icons.jsx'
import Pagination from '../../../components/Pagination.jsx'
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
  }, [debouncedQ, filters, user?.role])

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
    handleFilterChange({ is_escalated: !filters.is_escalated })
  }

  const setBillingFilter = () => {
    handleFilterChange({ category: 'Billing', is_escalated: false })
  }

  return (
    <div className="stack">
      <section className="crm-fullscreen-shell">
        <PageHeader 
          title="Customer Support" 
          description="Manage and track customer issues."
          backTo="/" 
          actions={
            <div className="crm-flex-end crm-gap-12">
              {isAccountant && (
                <button 
                  className={`btn-premium ${filters.category === 'Billing' ? 'action-info active-glow' : 'action-secondary'}`}
                  onClick={setBillingFilter}
                >
                  <Icon name="reports" />
                  <span>Billing Tickets</span>
                </button>
              )}
              {canManage && (
                <button 
                  className={`btn-premium ${filters.is_escalated ? 'action-warning active-glow' : 'action-secondary'}`}
                  onClick={toggleEscalated}
                >
                  <Icon name="bell" />
                  <span>Escalations</span>
                </button>
              )}
              <Link to="/tickets/new" className="btn-premium action-vibrant">
                <Icon name="plus" />
                <span>Create Ticket</span>
              </Link>
            </div>
          }
        />

        <div className="crm-filter-panel">
          <div className="crm-filter-cell">
            <label className="crm-filter-label">Search Tickets</label>
            <div className="crm-search-input-wrap">
              <Icon name="search" className="search-icon" />
              <input
                type="text"
                placeholder="ID, Subject, Client..."
                value={filters.q}
                onChange={(e) => handleFilterChange({ q: e.target.value })}
              />
            </div>
          </div>

          <div className="crm-filter-cell">
            <label className="crm-filter-label">Status</label>
            <select className="crm-input" value={filters.status} onChange={(e) => handleFilterChange({ status: e.target.value })}>
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className="crm-filter-cell">
            <label className="crm-filter-label">Priority</label>
            <select className="crm-input" value={filters.priority} onChange={(e) => handleFilterChange({ priority: e.target.value })}>
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div className="crm-filter-cell">
            <label className="crm-filter-label">Category</label>
            <select className="crm-input" value={filters.category} onChange={(e) => handleFilterChange({ category: e.target.value })}>
              <option value="">All Categories</option>
              <option value="Support">Support</option>
              <option value="Billing">Billing</option>
              <option value="Technical">Technical</option>
              <option value="Bug">Bug</option>
              <option value="General">General</option>
            </select>
          </div>
        </div>

        {error && <div className="alert-premium error">{error}</div>}

        {loading ? (
          <div className="leadsLoadingState" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border-subtle)', borderRadius: '32px', minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
             <div className="spinner-medium" />
             <span className="muted">Loading tickets...</span>
          </div>
        ) : (
          <div className="crm-table-wrap shadow-soft">
            <div className="crm-table-scroll">
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>SUPPORT TICKET</th>
                    <th>CUSTOMER</th>
                    <th>PRIORITY</th>
                    <th>STATUS</th>
                    <th>ASSIGNED TO</th>
                    <th className="text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((t) => (
                    <tr 
                      key={t.id}
                      className={`crm-table-row ${t.is_escalated ? 'row-escalated' : ''}`}
                      onClick={() => navigate(`/tickets/${t.id}`)}
                    >
                      <td>
                        <div className="flex items-center gap-12">
                          <div className="support-avatar">
                            {t.customer_id?.is_vip ? '★' : (t.subject || 'S').charAt(0).toUpperCase()}
                          </div>
                          <div className="support-info">
                            <div className="support-subject" style={{ fontWeight: 800, color: 'var(--text)' }}>{t.subject}</div>
                            <div className="support-meta">#{t.ticket_id} • {t.category || 'General'}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                         <div className="crm-user-mention">
                           <Icon name="user" size={14} />
                           <span>{t.customer_id?.name || t.user_customer_id?.name || 'Unknown'}</span>
                         </div>
                      </td>
                      <td>
                        <span className={`crm-status-pill ${t.priority === 'urgent' || t.priority === 'high' ? 'danger' : t.priority === 'medium' ? 'warning' : 'success'}`}>
                          {t.priority}
                        </span>
                      </td>
                      <td>
                        <span className={`crm-status-pill ${t.status === 'open' ? 'info' : t.status === 'in-progress' ? 'warning' : 'success'}`}>
                          {t.status}
                        </span>
                      </td>
                      <td>
                         <div className="crm-user-mention">
                           {t.assigned_to ? (
                             <>
                               <div className="crm-user-dot" />
                               <span>{t.assigned_to.name}</span>
                             </>
                           ) : (
                             <span className="muted italic">Not Assigned</span>
                           )}
                         </div>
                      </td>
                      <td className="text-right" onClick={(e) => e.stopPropagation()}>
                         <div className="crm-action-group">
                           <button className="crm-action-btn" onClick={() => navigate(`/tickets/${t.id}/edit`)}><Icon name="edit" /></button>
                           {isAdmin && <button className="crm-action-btn danger" onClick={(e) => handleDelete(e, t.id)}><Icon name="trash" /></button>}
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <Pagination 
          page={filters.page} 
          limit={filters.limit} 
          total={total} 
          onPageChange={(p) => setFilters(prev => ({ ...prev, page: p }))} 
          onLimitChange={(l) => setFilters(prev => ({ ...prev, limit: l, page: 1 }))}
        />
      </section>

      <style>{`
        .support-avatar { width: 40px; height: 40px; border-radius: 12px; background: var(--bg-surface); border: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: center; font-weight: 800; color: var(--primary); }
        .support-info { display: flex; flex-direction: column; gap: 2px; }
        .support-subject { font-size: 0.95rem; }
        .support-meta { font-size: 0.75rem; color: var(--text-dimmed); }
        .row-escalated { background: rgba(239, 68, 68, 0.05); }
      `}</style>
    </div>
  )
}
