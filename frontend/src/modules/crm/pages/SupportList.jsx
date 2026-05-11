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
  const [selectedItems, setSelectedItems] = useState([])

  const [filters, setFilters] = useState({
    q: searchParams.get('q') || '',
    status: searchParams.get('status') || '',
    priority: searchParams.get('priority') || '',
    category: searchParams.get('category') || '',
    department: searchParams.get('department') || '',
    is_escalated: searchParams.get('is_escalated') === 'true',
    customer_is_vip: searchParams.get('customer_is_vip') || '',
    sortField: searchParams.get('sortField') || 'created_at',
    sortOrder: searchParams.get('sortOrder') || 'desc',
    limit: Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20)),
    page: Number(searchParams.get('page')) || 1,
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
    if (filters.department) next.set('department', filters.department)
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

  const handleAssign = async (id, agentId) => {
    if (!id || !agentId) return
    try {
      await supportApi.update(id, { assigned_to: agentId })
      toast.success('Agent assigned successfully')
      loadTickets()
    } catch (err) {
      toast.error('Failed to assign agent')
    }
  }

  const onUpdateStatus = async (id, newStatus) => {
    try {
      await supportApi.update(id, { status: newStatus })
      toast.success(`Ticket status updated to ${newStatus}`)
      loadTickets()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status')
    }
  }

  const onUpdatePriority = async (id, newPriority) => {
    try {
      await supportApi.update(id, { priority: newPriority })
      toast.success(`Ticket priority updated to ${newPriority}`)
      loadTickets()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update priority')
    }
  }

  const formatTicketDate = (date) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric'
    })
  }

  const formatRelativeTime = (date) => {
    if (!date) return '—'
    const now = new Date()
    const past = new Date(date)
    const diffMs = now - past
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return formatTicketDate(date)
  }

  const getOverdueText = (deadline, status) => {
    if (!deadline || status === 'resolved' || status === 'closed') return null
    const now = new Date()
    const dl = new Date(deadline)
    if (now < dl) return null
    
    const diffMs = now - dl
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffDays > 0) return `Overdue by ${diffDays}d`
    return `Overdue by ${diffHours}h`
  }

  const toggleSelectAll = () => {
    if (selectedItems.length === items.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(items.map(t => t.id || t._id))
    }
  }

  const toggleSelectItem = (e, id) => {
    e.stopPropagation()
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedItems.length} tickets?`)) return
    try {
      await Promise.all(selectedItems.map(id => supportApi.remove(id)))
      toast.success('Selected tickets deleted')
      setSelectedItems([])
      loadTickets()
    } catch { toast.error('Failed to delete some tickets') }
  }

  const handleBulkStatus = async (status) => {
    try {
      await Promise.all(selectedItems.map(id => supportApi.update(id, { status })))
      toast.success('Statuses updated')
      setSelectedItems([])
      loadTickets()
    } catch { toast.error('Bulk update failed') }
  }

  return (
    <div className="stack">
      <section className="crm-fullscreen-shell">
        <div className="users-page-header">
          <h1 className="users-title">Ticket Management</h1>
          <p className="users-subtitle">Oversee customer help requests and service level compliance</p>
        </div>

        <div className="crm-stats-bar-compact overflow-x-auto pb-8">
          <div className={`stat-pill-mini clickable ${filters.status === '' ? 'is-active' : ''}`} onClick={() => handleFilterChange({ status: '' })}>
            <span className="stat-pill-label">ALL TICKETS</span>
            <span className="stat-pill-value total">{summary.total}</span>
          </div>
          {Object.entries(summary.byStatus).map(([name, count]) => (
            <div 
              key={name} 
              className={`stat-pill-mini clickable ${filters.status === name ? 'is-active' : ''}`} 
              onClick={() => handleFilterChange({ status: name })}
            >
              <span className="stat-pill-label">{name.toUpperCase()}</span>
              <span className={`stat-pill-value ${String(name).toLowerCase()}`}>{count}</span>
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
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Waiting for Customer">Waiting</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>

            <select className="crm-input filter-select" value={filters.department} onChange={(e) => handleFilterChange({ department: e.target.value })}>
              <option value="">All Depts</option>
              <option value="Support">Support</option>
              <option value="Sales">Sales</option>
              <option value="Technical">Technical</option>
            </select>

            {(isAdmin || isManager) && (
              <select className="crm-input filter-select" value={filters.assigned_to} onChange={(e) => handleFilterChange({ assigned_to: e.target.value })}>
                <option value="">All Agents</option>
                {agents.filter(a => a.role !== 'Customer').map(a => (
                  <option key={a.id || a._id} value={a.id || a._id}>{a.name}</option>
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
                style={{ height: '42px', width: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                title="Reset all filters"
              >
                <Icon name="refresh" size={14} />
              </button>
            )}

            {user?.role !== 'HR' && (
              <button
                className="btn-premium-mini add-user-btn"
                onClick={() => navigate('/tickets/new')}
              >
                <Icon name="plus" size={16} />
                <span>Add Ticket</span>
              </button>
            )}
          </div>
        </div>

        {error && <div className="alert-premium error">{error}</div>}

        {loading ? (
          <LottieLoader message="Synchronizing support tickets..." />
        ) : (
          <>
            {selectedItems.length > 0 && (
              <div className="bulk-actions-bar animate-fade-in shadow-soft">
                <div className="bulk-count">
                  <span className="count-badge">{selectedItems.length}</span>
                  <span>Tickets Selected</span>
                </div>
                <div className="bulk-ops">
                  <select className="bulk-select" onChange={(e) => handleBulkStatus(e.target.value)}>
                    <option value="">Update Status...</option>
                    <option value="open">Open</option>
                    <option value="assigned">Assigned</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                  <button className="bulk-btn danger" onClick={handleBulkDelete}>
                    <Icon name="trash" size={14} />
                    <span>Delete</span>
                  </button>
                  <button className="bulk-btn secondary" onClick={() => setSelectedItems([])}>Cancel</button>
                </div>
              </div>
            )}

            {items.length === 0 ? (
              <div className="empty-state-card shadow-soft">
                <LottieEmpty 
                  message="No Tickets Found" 
                  description="Your search criteria didn't match any support tickets. Try broader keywords or clearing filters." 
                />
                {!isCustomer && (
                  <button className="btn-premium add-user-btn" onClick={() => navigate('/tickets/new')} style={{ marginTop: '20px' }}>
                    <Icon name="plus" size={18} />
                    <span>Raise New Ticket</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="crm-table-wrap shadow-soft" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="crm-table-scroll">
                  <table className="crm-table">
                    <thead style={{ background: 'var(--bg-surface)' }}>
                      <tr>
                        <th style={{ width: '40px' }}>
                          <input type="checkbox" checked={selectedItems.length === items.length && items.length > 0} onChange={toggleSelectAll} />
                        </th>
                        <th style={{ color: 'var(--text-dimmed)' }}>TICKET ID</th>
                        <th style={{ color: 'var(--text-dimmed)', minWidth: '150px' }}>SUBJECT</th>
                        <th style={{ color: 'var(--text-dimmed)' }}>CUSTOMER</th>
                        <th style={{ color: 'var(--text-dimmed)' }}>CATEGORY</th>
                        <th style={{ color: 'var(--text-dimmed)' }}>PRIORITY</th>
                        <th style={{ color: 'var(--text-dimmed)' }}>STATUS</th>
                        <th style={{ color: 'var(--text-dimmed)' }}>ASSIGNED</th>
                        <th style={{ color: 'var(--text-dimmed)' }}>CREATED</th>
                        <th style={{ color: 'var(--text-dimmed)' }}>UPDATED</th>
                        <th className="text-right" style={{ color: 'var(--text-dimmed)' }}>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((t) => {
                        const overdueText = getOverdueText(t.deadline, t.status)
                        return (
                        <tr 
                          key={t.id || t._id}
                          className={`crm-table-row ${overdueText ? 'row-overdue' : ''} ${selectedItems.includes(t.id || t._id) ? 'row-selected' : ''}`}
                          onClick={() => navigate(`/tickets/${t.id || t._id}`)}
                          style={{ cursor: 'pointer' }}
                        >
                          <td onClick={stopRowNavigation}>
                            <input 
                              type="checkbox" 
                              checked={selectedItems.includes(t.id || t._id)} 
                              onChange={(e) => toggleSelectItem(e, t.id || t._id)} 
                            />
                          </td>
                          <td>
                            <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.85rem' }}>
                              {String(t.ticket_id).startsWith('TCK') ? t.ticket_id : `TCK-${t.ticket_id}`}
                            </span>
                          </td>
                          <td>
                            <div className="support-subject-group">
                              <Link 
                                to={`/tickets/${t.id || t._id}`} 
                                className="support-subject-link"
                                title={t.subject}
                              >
                                {t.subject}
                              </Link>
                              {overdueText && (
                                <span className="sla-tag-overdue">
                                  <Icon name="clock" size={10} />
                                  {overdueText}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="customer-info-compact">
                              <div className="customer-name-mini">{t.customer_id?.name || 'Unknown'}</div>
                              <div className="customer-type-mini">{t.customer_id?.phone || '—'}</div>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dimmed)' }}>{t.category || 'General'}</span>
                          </td>
                          <td onClick={stopRowNavigation}>
                            <StatusDropdown 
                              status={t.priority || 'Medium'} 
                              options={[
                                { name: 'High', color: '#dc2626' },
                                { name: 'Medium', color: '#d97706' },
                                { name: 'Low', color: '#059669' }
                              ]} 
                              onChange={(newPriority) => onUpdatePriority(t.id || t._id, newPriority)}
                              disabled={!canManage}
                              bypassRules={true}
                              className="priority-dropdown-mini"
                            />
                          </td>

                          <td onClick={stopRowNavigation}>
                            <StatusDropdown 
                              status={t.status} 
                              options={[
                                { name: 'Open', color: '#3b82f6' },
                                { name: 'In Progress', color: '#f59e0b' },
                                { name: 'Waiting for Customer', color: '#ec4899' },
                                { name: 'Resolved', color: '#10b981' },
                                { name: 'Closed', color: '#64748b' }
                              ]} 
                              onChange={(newStatus) => onUpdateStatus(t.id || t._id, newStatus)}
                              disabled={!canManage}
                            />
                          </td>

                          <td>
                            <div className="agent-avatar-group" title={`${t.assigned_to?.name || 'Unassigned'} - ${t.assigned_to?.role || 'Agent'}`}>
                              <div className="agent-avatar-circle">
                                {t.assigned_to?.name?.charAt(0) || <Icon name="user" size={12} />}
                              </div>
                              <div className="agent-info-stack">
                                <span className="agent-name-text">{t.assigned_to?.name?.split(' ')[0] || 'Unassigned'}</span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <div className="time-stack" title={formatTicketDate(t.created_at)}>
                              <span className="time-relative">{formatRelativeTime(t.created_at)}</span>
                            </div>
                          </td>

                          <td>
                            <div className="time-stack" title={formatTicketDate(t.updated_at)}>
                              <span className="time-relative dimmed">{formatRelativeTime(t.updated_at)}</span>
                            </div>
                          </td>

                          <td className="text-right" onClick={(e) => e.stopPropagation()}>
                             <div className="crm-action-group-compact">
                               <button 
                                 className="modern-action-btn-mini" 
                                 onClick={() => navigate(`/tickets/${t.id || t._id}/edit`)}
                                 title="Edit Ticket Details"
                               >
                                 <Icon name="edit" size={12} />
                               </button>
                               
                               {(isAdmin || isManager) && t.status !== 'closed' && (
                                 <button 
                                   className="modern-action-btn-mini success" 
                                   onClick={() => onUpdateStatus(t.id || t._id, 'closed')}
                                   title="Verify & Resolve Ticket"
                                 >
                                   <Icon name="check" size={12} />
                                 </button>
                               )}

                               {isAdmin && (
                                 <button 
                                   className="modern-action-btn-mini danger" 
                                   onClick={(e) => handleDelete(e, t.id || t._id)}
                                   title="Permanently Delete"
                                 >
                                   <Icon name="trash" size={12} />
                                 </button>
                               )}
                             </div>
                          </td>
                        </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        <div className="pagination-wrapper animate-fade-in shadow-soft">
          <div className="pagination-info">
            Showing <span className="highlight">{items.length > 0 ? (filters.page - 1) * filters.limit + 1 : 0}</span> to <span className="highlight">{Math.min(filters.page * filters.limit, total)}</span> of <span className="highlight">{total}</span> tickets
          </div>
          <Pagination 
            page={filters.page} 
            limit={filters.limit} 
            total={total} 
            onPageChange={(p) => setFilters(prev => ({ ...prev, page: p }))} 
            onLimitChange={(l) => setFilters(prev => ({ ...prev, limit: l, page: 1 }))}
          />
        </div>
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
         .stat-pill-mini { --stat-accent: var(--card-accent); background: color-mix(in srgb, var(--bg-card) 88%, var(--bg-surface) 12%); border: 1px solid var(--border-strong); padding: 12px 14px; border-radius: 14px; display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 120px; box-shadow: inset 4px 0 0 var(--stat-accent), 0 10px 24px rgba(var(--text-rgb), 0.06); transition: all 0.25s ease; }
         .crm-stats-bar-compact .stat-pill-mini:nth-child(1) { --stat-accent: #3b82f6; }
         .crm-stats-bar-compact .stat-pill-mini:nth-child(2) { --stat-accent: #10b981; }
         .crm-stats-bar-compact .stat-pill-mini:nth-child(3) { --stat-accent: #f59e0b; }
         .crm-stats-bar-compact .stat-pill-mini:nth-child(4) { --stat-accent: #8b5cf6; }
         .crm-stats-bar-compact .stat-pill-mini:nth-child(5) { --stat-accent: #ef4444; }
         .crm-stats-bar-compact .stat-pill-mini:nth-child(6) { --stat-accent: #14b8a6; }
         .stat-pill-mini.clickable { cursor: pointer; }
         .stat-pill-mini:hover { transform: translateY(-2px); border-color: var(--stat-accent); box-shadow: inset 4px 0 0 var(--stat-accent), 0 14px 30px color-mix(in srgb, var(--stat-accent) 20%, rgba(var(--text-rgb), 0.08)); }
         .stat-pill-mini.is-active { background: color-mix(in srgb, var(--bg-card) 82%, var(--stat-accent) 18%); border-color: var(--stat-accent); }
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
         
         .crm-action-group { display: flex; align-items: center; gap: 8px; justify-content: flex-end; }
         .modern-action-btn { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; background: var(--bg-surface); border: 1px solid var(--border-strong); color: var(--text); cursor: pointer; transition: all 0.2s; padding: 0; }
         .modern-action-btn:hover { background: var(--bg-hover); border-color: var(--primary); color: var(--primary); transform: translateY(-1px); box-shadow: var(--shadow-sm); }
         .modern-action-btn.success:hover { border-color: var(--success); color: var(--success); }
         .modern-action-btn.danger:hover { border-color: var(--danger); color: var(--danger); }

         .support-avatar { position: relative; width: 38px; height: 38px; border-radius: 10px; background: var(--bg-surface); border: 1px solid var(--border-strong); display: flex; align-items: center; justify-content: center; font-weight: 900; color: var(--primary); }
         .sla-breach-pulse { border-color: var(--danger); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); animation: sla-pulse 2s infinite; }
         @keyframes sla-pulse { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }
         
         .sla-tag-mini { background: var(--danger); color: white; font-size: 9px; font-weight: 900; padding: 2px 6px; border-radius: 4px; margin-left: 8px; vertical-align: middle; }
         .support-subject { display: flex; align-items: center; gap: 4px; }
         .attachment-indicator { margin-left: 8px; color: var(--text-dimmed); display: inline-flex; align-items: center; background: var(--bg-surface); border: 1px solid var(--border-strong); padding: 2px 4px; border-radius: 4px; }
         
         .crm-table tr:hover { background: var(--bg-hover) !important; }
         .row-overdue { background: rgba(239, 68, 68, 0.03) !important; }
         .row-overdue:hover { background: rgba(239, 68, 68, 0.06) !important; }
         .row-selected { background: var(--primary-soft) !important; }

         .support-subject-group { display: flex; flex-direction: column; gap: 4px; }
         .support-subject-link { color: var(--text); font-weight: 700; text-decoration: none; font-size: 0.85rem; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; transition: color 0.2s; }
         .support-subject-link:hover { color: var(--primary); text-decoration: underline; }
         
         .sla-tag-overdue { background: var(--danger-soft); color: var(--danger); font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px; width: fit-content; }
         
         .customer-info-compact { display: flex; flex-direction: column; }
         .customer-name-mini { font-weight: 700; font-size: 0.85rem; color: var(--text); }
         .customer-type-mini { font-size: 0.7rem; color: var(--text-dimmed); font-weight: 600; }

         .agent-avatar-group { display: flex; align-items: center; gap: 10px; }
         .agent-avatar-circle { width: 28px; height: 28px; border-radius: 50%; background: var(--primary-soft); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800; border: 1px solid var(--primary-border); }
         .agent-info-stack { display: flex; flex-direction: column; line-height: 1.2; }
         .agent-name-text { font-size: 0.8rem; font-weight: 700; color: var(--text); }
         .agent-role-text { font-size: 0.65rem; color: var(--text-dimmed); font-weight: 600; }

         .time-stack { display: flex; flex-direction: column; }
         .time-relative { font-size: 0.8rem; font-weight: 700; color: var(--text); }
         .time-relative.dimmed { color: var(--text-dimmed); }

         .bulk-actions-bar { position: sticky; top: 0; z-index: 100; background: var(--bg-card); border: 1px solid var(--primary-border); border-radius: 12px; padding: 12px 20px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 4px 20px rgba(var(--primary-rgb), 0.1); }
         .bulk-count { display: flex; align-items: center; gap: 12px; font-weight: 700; font-size: 0.9rem; }
         .count-badge { background: var(--primary); color: white; padding: 2px 10px; border-radius: 20px; font-size: 0.75rem; }
         .bulk-ops { display: flex; align-items: center; gap: 12px; }
         .bulk-select { background: var(--bg-surface); border: 1px solid var(--border-strong); border-radius: 8px; padding: 6px 12px; font-size: 0.8rem; font-weight: 600; outline: none; }
         .bulk-btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; font-size: 0.8rem; font-weight: 700; cursor: pointer; border: none; transition: all 0.2s; }
         .bulk-btn.danger { background: var(--danger); color: white; }
         .bulk-btn.secondary { background: var(--bg-surface); border: 1px solid var(--border-strong); color: var(--text); }

         .empty-state-card { background: var(--bg-card); border: 1px solid var(--border-strong); border-radius: 20px; padding: 60px 40px; text-align: center; display: flex; flex-direction: column; align-items: center; }

         .modern-action-btn-mini { width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; background: var(--bg-surface); border: 1px solid var(--border-strong); color: var(--text); cursor: pointer; transition: all 0.2s; }
         .modern-action-btn-mini:hover { background: var(--bg-hover); border-color: var(--primary); color: var(--primary); }
         .modern-action-btn-mini.success:hover { border-color: var(--success); color: var(--success); }
         .modern-action-btn-mini.danger:hover { border-color: var(--danger); color: var(--danger); }
         .crm-action-group-compact { display: flex; align-items: center; gap: 6px; justify-content: flex-end; }

         .text-danger { color: var(--danger) !important; font-weight: 800; }

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
