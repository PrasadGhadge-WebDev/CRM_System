import { useEffect, useCallback, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Icon } from '../../../layouts/icons.jsx'
import Pagination from '../../../components/Pagination.jsx'
import LottieLoader from '../../../components/LottieLoader.jsx'
import LottieEmpty from '../../../components/LottieEmpty.jsx'
import PageHeader from '../../../components/PageHeader.jsx'
import { supportApi } from '../../../services/workflow.js'
import { usersApi } from '../../../services/users.js'
import { useDebouncedValue } from '../../../utils/useDebouncedValue.js'
import { useAuth } from '../../../context/AuthContext.jsx'
import StatusDropdown from '../components/StatusDropdown.jsx'
import ModernSearchBar from '../../../components/ModernSearchBar.jsx'

function stopRowNavigation(event) {
  event.stopPropagation()
}

export default function SupportList() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.role === 'Admin'
  const isManager = user?.role === 'Manager'
  const isAccountant = user?.role === 'Accountant'
  const isCustomer = user?.role === 'Customer'
  const canManage = isAdmin || isManager || user?.role === 'Support Agent'

  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [summary, setSummary] = useState({ total: 0, byStatus: {} })
  const [agents, setAgents] = useState([])

  const [filters, setFilters] = useState({
    q: searchParams.get('q') || '',
    status: searchParams.get('status') || '',
    priority: searchParams.get('priority') || '',
    category: searchParams.get('category') || (isAccountant ? 'Billing' : ''),
    is_escalated: searchParams.get('is_escalated') === 'true',
    customer_is_vip: searchParams.get('customer_is_vip') || '',
    sortField: searchParams.get('sortField') || 'created_at',
    sortOrder: searchParams.get('sortOrder') || 'desc',
    limit: Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20)),
    startDate: searchParams.get('startDate') || '',
    endDate: searchParams.get('endDate') || '',
    assigned_to: searchParams.get('assigned_to') || '',
    dateRangeType: searchParams.get('dateRangeType') || 'all'
  })

  const applyDatePreset = (type) => {
    const now = new Date()
    let start = ''
    let end = ''

    if (type === 'today') {
      start = new Date(now.setHours(0,0,0,0)).toISOString()
      end = new Date(now.setHours(23,59,59,999)).toISOString()
    } else if (type === 'yesterday') {
      const yesterday = new Date(now.setDate(now.getDate() - 1))
      start = new Date(yesterday.setHours(0,0,0,0)).toISOString()
      end = new Date(yesterday.setHours(23,59,59,999)).toISOString()
    } else if (type === 'week') {
      const lastWeek = new Date(now.setDate(now.getDate() - 7))
      start = lastWeek.toISOString()
    } else if (type === 'month') {
      const lastMonth = new Date(now.setMonth(now.getMonth() - 1))
      start = lastMonth.toISOString()
    }

    setFilters(prev => ({
      ...prev,
      dateRangeType: type,
      startDate: start,
      endDate: end,
      page: 1
    }))
  }

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
    if (filters.startDate) next.set('startDate', filters.startDate)
    if (filters.endDate) next.set('endDate', filters.endDate)
    if (filters.assigned_to) next.set('assigned_to', filters.assigned_to)
    setSearchParams(next, { replace: true })
  }, [debouncedQ, filters, setSearchParams])

  const loadTickets = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [res, usersRes] = await Promise.all([
        supportApi.list({ ...filters, q: debouncedQ, all: user?.role === 'Admin' ? true : undefined }),
        (isAdmin || isManager) ? usersApi.list({ limit: 100 }) : Promise.resolve({ items: [] })
      ])
      setItems(Array.isArray(res) ? res : res.items || [])
      setTotal(res.total || (Array.isArray(res) ? res.length : 0))
      setSummary(res.summary || { total: 0, byStatus: {} })
      setAgents(Array.isArray(usersRes) ? usersRes : usersRes.items || [])
    } catch {
      setError('Failed to load tickets')
    } finally {
      setLoading(false)
    }
  }, [debouncedQ, filters, user?.role, isAdmin, isManager])

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

  async function onUpdateStatus(id, newStatus) {
    try {
      await supportApi.update(id, { status: newStatus })
      toast.success(`Status updated to ${newStatus}`)
      setItems(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item))
    } catch (err) {
      toast.error(err.message || 'Update failed')
    }
  }

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }))
  }

  const resetFilters = () => {
    setFilters({
      q: '',
      status: '',
      priority: '',
      category: (isAccountant ? 'Billing' : ''),
      is_escalated: false,
      customer_is_vip: '',
      sortField: 'created_at',
      sortOrder: 'desc',
      page: 1,
      limit: 20,
      startDate: '',
      endDate: '',
      assigned_to: '',
      dateRangeType: 'all'
    })
  }

  return (
    <div className="stack">
      <section className="crm-fullscreen-shell">
        <div className="users-page-header">
          <h1 className="users-title">Ticket Management</h1>
          <p className="users-subtitle">Oversee customer help requests and service level compliance</p>
        </div>

        <div className="crm-stats-bar-compact overflow-x-auto pb-8">
          <div className="stat-pill-mini clickable" onClick={() => handleFilterChange({ status: '' })} style={{ borderBottom: filters.status === '' ? '2px solid var(--primary)' : '' }}>
            <span className="stat-pill-label">ALL TICKETS</span>
            <span className="stat-pill-value total">{summary.total}</span>
          </div>
          {Object.entries(summary.byStatus).map(([name, count]) => (
            <div 
              key={name} 
              className="stat-pill-mini clickable" 
              onClick={() => handleFilterChange({ status: name })}
              style={{ borderBottom: filters.status === name ? '2px solid var(--primary)' : '' }}
            >
              <span className="stat-pill-label">{name.toUpperCase()}</span>
              <span className="stat-pill-value">{count}</span>
            </div>
          ))}
        </div>

        <div className="unified-action-bar">
          <div className="search-filter-group">
            <div className="search-wrap-mini">
              <ModernSearchBar
                value={filters.q}
                onChange={(e) => handleFilterChange({ q: e.target.value })}
                placeholder="Search tickets..."
              />
            </div>

            <select className="crm-input filter-select" value={filters.status} onChange={(e) => handleFilterChange({ status: e.target.value })}>
              <option value="">All Statuses</option>
              <option value="new">New</option>
              <option value="in-progress">In-Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>

            {(isAdmin || isManager) && (
              <select className="crm-input filter-select" value={filters.assigned_to} onChange={(e) => handleFilterChange({ assigned_to: e.target.value })}>
                <option value="">All Agents</option>
                {agents.filter(a => a.role !== 'Customer').map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            )}

            <select className="crm-input filter-select" value={filters.priority} onChange={(e) => handleFilterChange({ priority: e.target.value })}>
              <option value="">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>

            <div className="flex items-center gap-4">
              <select 
                className="crm-input filter-select date-preset-select" 
                value={filters.dateRangeType} 
                onChange={(e) => applyDatePreset(e.target.value)}
              >
                <option value="all">Date: All</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="custom">Custom Range</option>
              </select>

              {filters.dateRangeType === 'custom' && (
                <div className="flex items-center gap-4 animate-fade-in">
                  <input
                    type="date"
                    className="crm-input date-mini"
                    value={filters.startDate ? filters.startDate.split('T')[0] : ''}
                    onChange={(e) => handleFilterChange({ startDate: e.target.value })}
                  />
                  <span className="muted" style={{ fontSize: '0.7rem' }}>to</span>
                  <input
                    type="date"
                    className="crm-input date-mini"
                    value={filters.endDate ? filters.endDate.split('T')[0] : ''}
                    onChange={(e) => handleFilterChange({ endDate: e.target.value })}
                  />
                </div>
              )}
            </div>

            {(filters.q || filters.status || filters.priority || filters.dateRangeType !== 'all') && (
              <button 
                className="btn-premium-mini reset-btn" 
                onClick={resetFilters}
                title="Reset all filters"
              >
                <Icon name="refresh" size={14} className="reset-icon" />
                <span>Reset Filters</span>
              </button>
            )}

            <button
              className="btn-premium-mini add-user-btn"
              onClick={() => navigate('/tickets/new')}
            >
              <Icon name="plus" size={16} />
              <span>Add Ticket</span>
            </button>
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
                        <th style={{ color: 'var(--text-dimmed)' }}>TICKET</th>
                        <th style={{ color: 'var(--text-dimmed)' }}>SUBJECT</th>
                        <th style={{ color: 'var(--text-dimmed)' }}>CATEGORY</th>
                        <th style={{ color: 'var(--text-dimmed)' }}>CUSTOMER</th>
                        <th style={{ color: 'var(--text-dimmed)' }}>PRIORITY</th>
                        <th style={{ color: 'var(--text-dimmed)' }}>STATUS</th>
                        <th style={{ color: 'var(--text-dimmed)' }}>ASSIGNED TO</th>
                        <th style={{ color: 'var(--text-dimmed)' }}>CREATED</th>
                        <th style={{ color: 'var(--text-dimmed)' }}>DEADLINE</th>
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
                            <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                              {t.ticket_id}
                            </span>
                          </td>
                          <td>
                            <div className="flex items-center gap-12">
                              <div className="support-info">
                                <div className="support-subject" style={{ fontWeight: 800, color: 'var(--text)' }}>
                                  {t.subject}
                                  {t.is_sla_breached && <span className="sla-tag-mini">SLA BREACH</span>}
                                </div>
                                {t.attachments?.length > 0 && (
                                  <div className="support-meta" style={{ marginTop: '4px' }}>
                                    <span className="attachment-indicator" title={`${t.attachments.length} attachments`}>
                                      <Icon name="paperclip" size={10} />
                                      <span style={{ fontSize: '0.7rem', marginLeft: '2px' }}>{t.attachments.length}</span>
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="crm-status-pill info" style={{ fontSize: '0.75rem' }}>{t.category || 'General'}</span>
                          </td>
                           {!isCustomer && (
                            <td>
                              <div className="customer-info">
                                <div className="customer-name" style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                                  {t.customer_id?.name || 'Unknown'}
                                </div>
                                <div className="customer-meta" style={{ fontSize: '0.7rem', color: 'var(--text-dimmed)' }}>
                                  {t.customer_id?.company_name || 'Individual'}
                                </div>
                              </div>
                            </td>
                           )}

                           {!isAccountant && (
                            <td>
                              <span className={`priority-badge-modern ${t.priority?.toLowerCase()}`}>
                                {t.priority?.toUpperCase() || 'MEDIUM'}
                              </span>
                            </td>
                           )}

                          <td onClick={stopRowNavigation}>
                            <StatusDropdown 
                              status={t.status} 
                              options={[
                                { name: 'new', color: '#3b82f6' },
                                { name: 'in-progress', color: '#f59e0b' },
                                { name: 'resolved', color: '#10b981' },
                                { name: 'closed', color: '#64748b' }
                              ]} 
                              onChange={(newStatus) => onUpdateStatus(t.id, newStatus)}
                              disabled={!canManage}
                            />
                          </td>

                          {!isCustomer && !isAccountant && (
                            <td>
                              <div className="agent-select-container">
                                {isManager ? (
                                  <select 
                                    className="agent-inline-select"
                                    value={t.assigned_to?._id || ''}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => handleAssign(t._id, e.target.value)}
                                  >
                                    <option value="">Unassigned</option>
                                    {agents.map(a => (
                                      <option key={a._id} value={a._id}>{a.name}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <div className="agent-name-static">
                                    {t.assigned_to?.name || 'Not Assigned'}
                                  </div>
                                )}
                              </div>
                            </td>
                          )}

                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                                {new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                              <span style={{ fontSize: '11px', color: 'var(--text-dimmed)', marginTop: '2px' }}>
                                {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </td>

                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: new Date(t.deadline) < new Date() ? 'var(--danger)' : 'var(--text)' }}>
                                {t.deadline ? new Date(t.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No Deadline'}
                              </span>
                              {t.deadline && (
                                <span style={{ fontSize: '11px', color: 'var(--text-dimmed)', marginTop: '2px' }}>
                                  {new Date(t.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
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
         .users-page-header { margin-bottom: 4px; padding: 0 4px; }
         .users-title { font-size: 1.2rem; font-weight: 800; color: var(--text); margin-bottom: 0; }
         .users-subtitle { font-size: 0.8rem; color: var(--text-dimmed); font-weight: 500; }

         .unified-action-bar { margin-bottom: 16px; padding: 0 4px; overflow: visible; }
         .search-filter-group { display: flex; align-items: center; gap: 14px; width: 100%; flex-wrap: nowrap; justify-content: flex-start; }
         .flex { display: flex; }
         .items-center { align-items: center; }
         .gap-4 { gap: 12px; }
         .search-wrap-mini { width: 320px; flex-shrink: 0; }
         .filter-select { max-width: 140px; min-width: 110px; flex-shrink: 1; }
         .date-preset-select { width: 130px !important; min-width: 130px !important; }
         .animate-fade-in { animation: fadeIn 0.3s ease; }
         @keyframes fadeIn { from { opacity: 0; transform: translateX(-5px); } to { opacity: 1; transform: translateX(0); } }
         .date-mini { width: 110px !important; max-width: 110px !important; padding: 4px 10px !important; font-size: 0.75rem !important; height: 36px; flex-shrink: 0; }
         .btn-premium-mini.add-user-btn { height: 36px; padding: 0 16px !important; font-size: 0.8rem !important; margin-left: 12px; }
         .reset-btn { background: var(--bg-surface) !important; color: var(--text-muted) !important; border: 1px solid var(--border-strong) !important; height: 36px; padding: 0 12px !important; font-size: 0.75rem !important; margin-left: auto; display: flex; align-items: center; gap: 6px; border-radius: 10px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
         .reset-btn:hover { background: var(--bg-hover) !important; color: var(--primary) !important; border-color: var(--primary) !important; }
         .btn-clear-filters:hover { text-decoration: underline; }

         .crm-stats-bar-compact { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 8px; justify-content: space-between; padding: 0 4px; }
         .stat-pill-mini { background: var(--bg-card); border: 1px solid var(--border-strong); padding: 8px 12px; border-radius: 10px; display: flex; flex-direction: column; gap: 0; flex: 1; min-width: 120px; box-shadow: var(--shadow-sm); }
         .stat-pill-label { font-size: 9px; font-weight: 800; color: var(--text-dimmed); text-transform: uppercase; letter-spacing: 0.05em; }
         .stat-pill-value { font-size: 20px; font-weight: 900; }
         .stat-pill-value.total { color: var(--text); }
         .stat-pill-value.active { color: var(--success); }
         .stat-pill-value.inactive { color: var(--danger); }
         .stat-pill-value.pending { color: var(--warning); }

         .crm-input { width: 100%; background: var(--bg-surface) !important; border: 1px solid var(--border-strong) !important; border-radius: 10px !important; padding: 8px 14px !important; color: var(--text) !important; font-size: 0.85rem !important; transition: all 0.2s; }

         
         .add-user-btn { background: var(--primary) !important; color: white !important; border: none !important; border-radius: 10px !important; padding: 0 20px !important; font-weight: 700 !important; height: 38px; display: flex; align-items: center; gap: 6px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 2px 8px rgba(var(--primary-rgb), 0.2); font-size: 0.85rem; flex-shrink: 0; }
         .add-user-btn:hover { background: var(--primary-hover) !important; transform: translateY(-2px); box-shadow: 0 6px 18px rgba(var(--primary-rgb), 0.4); }

         .crm-table th { padding: 12px 16px !important; border-bottom: 2px solid var(--border-strong) !important; color: var(--text-dimmed) !important; font-weight: 800 !important; font-size: 0.7rem !important; }
         .crm-table td { padding: 10px 16px !important; border-bottom: 1px solid var(--border-strong) !important; vertical-align: middle; }
         
         .support-avatar { position: relative; width: 38px; height: 38px; border-radius: 10px; background: var(--bg-surface); border: 1px solid var(--border-strong); display: flex; align-items: center; justify-content: center; font-weight: 900; color: var(--primary); }
         .sla-breach-pulse { border-color: var(--danger); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); animation: sla-pulse 2s infinite; }
         @keyframes sla-pulse { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }
         
         .sla-tag-mini { background: var(--danger); color: white; font-size: 9px; font-weight: 900; padding: 2px 6px; border-radius: 4px; margin-left: 8px; vertical-align: middle; }
         .support-subject { display: flex; align-items: center; gap: 4px; }
         .attachment-indicator { margin-left: 8px; color: var(--text-dimmed); display: inline-flex; align-items: center; background: var(--bg-surface); border: 1px solid var(--border-strong); padding: 2px 4px; border-radius: 4px; }
         
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
