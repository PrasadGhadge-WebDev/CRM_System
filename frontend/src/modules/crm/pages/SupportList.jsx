import { useEffect, useCallback, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Icon } from '../../../layouts/icons.jsx'
import Pagination from '../../../components/Pagination.jsx'
import LottieLoader from '../../../components/LottieLoader.jsx'
import LottieEmpty from '../../../components/LottieEmpty.jsx'
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
        <div className="users-page-header">
          <h1 className="users-title">Support Management</h1>
          <p className="users-subtitle">Oversee customer help requests and service level compliance</p>
        </div>

        <div className="crm-stats-bar-compact">
          <div className="stat-pill-mini">
            <span className="stat-pill-label">TOTAL TICKETS</span>
            <span className="stat-pill-value total">{total}</span>
          </div>
          <div className="stat-pill-mini">
            <span className="stat-pill-label">OPEN</span>
            <span className="stat-pill-value active">{items.filter(t => t.status === 'open').length}</span>
          </div>
          <div className="stat-pill-mini">
            <span className="stat-pill-label">URGENT</span>
            <span className="stat-pill-value inactive">{items.filter(t => t.priority === 'urgent').length}</span>
          </div>
          <div className="stat-pill-mini">
            <span className="stat-pill-label">ESCALATED</span>
            <span className="stat-pill-value pending">{items.filter(t => t.is_escalated).length}</span>
          </div>
        </div>

        <div className="unified-action-bar">
          <div className="search-filter-group">
            <div className="crm-search-input-wrap">
              <Icon name="search" className="search-icon" />
              <input
                type="text"
                className="crm-input"
                placeholder="Search tickets..."
                value={filters.q}
                onChange={(e) => handleFilterChange({ q: e.target.value })}
              />
            </div>

            <select className="crm-input filter-select" value={filters.status} onChange={(e) => handleFilterChange({ status: e.target.value })}>
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="in-progress">In-Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>

            <select className="crm-input filter-select" value={filters.priority} onChange={(e) => handleFilterChange({ priority: e.target.value })}>
              <option value="">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>

            <button
              className="btn-premium-mini add-user-btn"
              onClick={() => navigate('/tickets/new')}
            >
              <Icon name="plus" size={16} />
              <span>Add Ticket</span>
            </button>

            {(filters.q || filters.status || filters.priority || filters.category || filters.is_escalated) && (
              <button 
                className="btn-clear-filters"
                onClick={() => {
                  setFilters({
                    q: '',
                    status: '',
                    priority: '',
                    category: '',
                    is_escalated: false,
                    customer_is_vip: '',
                    sortField: 'created_at',
                    sortOrder: 'desc',
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

        {error && <div className="alert-premium error">{error}</div>}

        {loading ? (
          <LottieLoader message="Synchronizing support tickets..." />
        ) : (
          <>
            {items.length === 0 ? (
              <LottieEmpty 
                message="No tickets found" 
                description="Your search criteria didn't match any support tickets. Try broader keywords or clearing filters." 
              />
            ) : (
              <div className="crm-table-wrap shadow-soft" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="crm-table-scroll">
                  <table className="crm-table">
                    <thead style={{ background: 'var(--bg-surface)' }}>
                      <tr>
                        <th style={{ color: 'var(--text-dimmed)' }}>SUPPORT TICKET</th>
                        <th style={{ color: 'var(--text-dimmed)' }}>CUSTOMER</th>
                        <th style={{ color: 'var(--text-dimmed)' }}>PRIORITY</th>
                        <th style={{ color: 'var(--text-dimmed)' }}>STATUS</th>
                        <th style={{ color: 'var(--text-dimmed)' }}>ASSIGNED TO</th>
                        <th className="text-right" style={{ color: 'var(--text-dimmed)' }}>ACTIONS</th>
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
                               <span style={{ color: 'var(--text)' }}>{t.customer_id?.name || t.user_customer_id?.name || 'Unknown'}</span>
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
                                   <span style={{ color: 'var(--text)' }}>{t.assigned_to.name}</span>
                                 </>
                               ) : (
                                 <span className="muted italic">Not Assigned</span>
                               )}
                             </div>
                          </td>
                          <td className="text-right" onClick={(e) => e.stopPropagation()}>
                             <div className="crm-action-group">
                               <button className="crm-action-btn" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }} onClick={() => navigate(`/tickets/${t.id}/edit`)}><Icon name="edit" /></button>
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
          </>
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

         .crm-table th { padding: 12px 16px !important; border-bottom: 2px solid var(--border-strong) !important; color: var(--text-dimmed) !important; font-weight: 800 !important; font-size: 0.7rem !important; }
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
