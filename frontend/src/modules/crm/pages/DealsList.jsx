import { useEffect, useCallback, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Icon } from '../../../layouts/icons.jsx'
import { useAuth } from '../../../context/AuthContext'
import Pagination from '../../../components/Pagination.jsx'
import PageHeader from '../../../components/PageHeader.jsx'
import { dealsApi } from '../../../services/deals'
import { usersApi } from '../../../services/users'
import { confirmToast } from '../../../utils/confirmToast.jsx'
import { useDebouncedValue } from '../../../utils/useDebouncedValue.js'
import { useToastFeedback } from '../../../utils/useToastFeedback.js'
import DealsKanban from './DealsKanban.jsx'

const STAGE_OPTIONS = [
  { name: 'Pending', color: '#64748b' },
  { name: 'New', color: '#3b82f6' },
  { name: 'Contacted', color: '#eab308' },
  { name: 'Negotiation', color: '#f97316' },
  { name: 'Won', color: '#22c55e' },
  { name: 'Lost', color: '#ef4444' }
]

function stopRowNavigation(event) {
  event.stopPropagation()
}

export default function DealsList() {
  const { user } = useAuth()
  const isManagement = user?.role === 'Admin' || user?.role === 'Manager'
  const canCreate = user?.role === 'Admin' || user?.role === 'Manager' || user?.role === 'Employee'
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [viewMode, setViewMode] = useState(searchParams.get('view') || 'list')

  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [employees, setEmployees] = useState([])
  useToastFeedback({ error })

  // Filter & Sort State
  const [filters, setFilters] = useState({
    q: searchParams.get('q') || '',
    stage: searchParams.get('stage') || '',
    priority: searchParams.get('priority') || '',
    lifecycle_status: searchParams.get('lifecycle_status') || '',
    assigned_to: searchParams.get('assigned_to') || '',
    startDate: searchParams.get('startDate') || '',
    endDate: searchParams.get('endDate') || '',
    sortField: searchParams.get('sortField') || 'created_at',
    sortOrder: searchParams.get('sortOrder') || 'desc',
    page: Math.max(1, Number(searchParams.get('page')) || 1),
    limit: Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20)),
  })

  const debouncedQ = useDebouncedValue(filters.q, 300)

  useEffect(() => {
    const next = new URLSearchParams()
    if (debouncedQ.trim()) next.set('q', debouncedQ.trim())
    if (filters.stage) next.set('stage', filters.stage)
    if (filters.priority) next.set('priority', filters.priority)
    if (filters.lifecycle_status) next.set('lifecycle_status', filters.lifecycle_status)
    if (filters.assigned_to) next.set('assigned_to', filters.assigned_to)
    if (filters.startDate) next.set('startDate', filters.startDate)
    if (filters.endDate) next.set('endDate', filters.endDate)
    if (filters.sortField !== 'created_at') next.set('sortField', filters.sortField)
    if (filters.sortOrder !== 'desc') next.set('sortOrder', filters.sortOrder)
    if (filters.page > 1) next.set('page', String(filters.page))
    if (filters.limit !== 20) next.set('limit', String(filters.limit))
    if (viewMode !== 'list') next.set('view', viewMode)

    setSearchParams(next, { replace: true })
  }, [debouncedQ, filters, setSearchParams, viewMode])

  const loadDeals = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await dealsApi.list({
        ...filters,
        q: debouncedQ
      })
      if (Array.isArray(res)) {
        setItems(res)
        setTotal(res.length)
      } else {
        setItems(res.items || [])
        setTotal(res.total || 0)
      }
    } catch {
      setError('Failed to load deals')
    } finally {
      setLoading(false)
    }
  }, [debouncedQ, filters])

  const loadEmployees = useCallback(async () => {
    try {
      const res = await usersApi.list({ limit: 'all' })
      setEmployees(res.items || res || [])
    } catch {
      console.error('Failed to load employees')
    }
  }, [])

  useEffect(() => {
    loadDeals()
  }, [loadDeals])

  useEffect(() => {
    loadEmployees()
  }, [loadEmployees])

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }))
  }

  const handleReset = () => {
    setFilters({
      q: '',
      stage: '',
      priority: '',
      lifecycle_status: '',
      assigned_to: '',
      startDate: '',
      endDate: '',
      sortField: 'created_at',
      sortOrder: 'desc',
      page: 1,
      limit: 20
    })
  }

  function getStatusClass(status) {
    const name = (status || 'New').replace(/\s+/g, '-').toLowerCase()
    return `dynamic-deal-stage-${name}`
  }

  async function onDelete(id) {
    const confirmed = await confirmToast('Move deal to trash?', { type: 'danger' })
    if (!confirmed) return
    try {
      await dealsApi.remove(id)
      toast.success('Deal archived')
      loadDeals()
    } catch {
      setError('Delete failed')
    }
  }

  async function onUpdateStage(id, newStage) {
    try {
      await dealsApi.update(id, { stage: newStage })
      toast.success(`Stage updated: ${newStage}`)
      loadDeals()
    } catch {
      setError('Update failed')
    }
  }

  return (
    <div className="stack gap-24">
      <PageHeader
        title="Revenue Pipeline"
        description="Monitor and manage sales opportunities across the lifecycle."
        backTo="/"
        actions={
          <div className="control-bar-premium">
            <div className="view-switcher-premium">
              <button 
                className={`view-btn ${viewMode === 'list' ? 'active' : ''}`} 
                onClick={() => setViewMode('list')}
              >
                <Icon name="list" size={18} />
                <span>Registry</span>
              </button>
              <button 
                className={`view-btn ${viewMode === 'board' ? 'active' : ''}`} 
                onClick={() => setViewMode('board')}
              >
                <Icon name="deals" size={18} />
                <span>Pipeline</span>
              </button>
            </div>
            {canCreate && (
              <button className="btn-premium action-vibrant" onClick={() => navigate('/deals/new')}>
                <Icon name="plus" />
                <span>Initiate Deal</span>
              </button>
            )}
          </div>
        }
      />

      <section className="glass-panel filter-section-premium">
        <div className="filter-grid-premium" style={{ gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1.5fr auto', alignItems: 'end' }}>
          <div className="filter-cell">
            <label className="filter-label">Search Opportunity</label>
            <div className="search-input-premium">
              <Icon name="search" className="search-icon" />
              <input
                type="text"
                placeholder="ID, Name, Client..."
                value={filters.q}
                onChange={(e) => handleFilterChange({ q: e.target.value })}
              />
            </div>
          </div>

          <div className="filter-cell">
            <label className="filter-label">Sales Stage</label>
            <select className="input-premium" value={filters.stage} onChange={(e) => handleFilterChange({ stage: e.target.value })}>
              <option value="">All Stages</option>
              {STAGE_OPTIONS.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
          </div>

          <div className="filter-cell">
            <label className="filter-label">Priority</label>
            <select className="input-premium" value={filters.priority} onChange={(e) => handleFilterChange({ priority: e.target.value })}>
              <option value="">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <div className="filter-cell">
            <label className="filter-label">Portfolio Owner</label>
            <select className="input-premium" value={filters.assigned_to} onChange={(e) => handleFilterChange({ assigned_to: e.target.value })}>
              <option value="">All Owners</option>
              {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
            </select>
          </div>

          <div className="filter-cell">
            <label className="filter-label">Date Range</label>
            <div className="range-input-group">
              <input type="date" className="input-premium mini" value={filters.startDate} onChange={(e) => handleFilterChange({ startDate: e.target.value })} />
              <input type="date" className="input-premium mini" value={filters.endDate} onChange={(e) => handleFilterChange({ endDate: e.target.value })} />
            </div>
          </div>

          <div className="filter-cell" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <label className="filter-label" style={{ visibility: 'hidden' }}>Reset</label>
            <button className="btn-reset-premium" onClick={handleReset} style={{ height: '42px', padding: '0 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-dimmed)', fontSize: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: 'all 0.2s' }}>
              <Icon name="trash" size={14} />
              <span>Clear Filters</span>
            </button>
          </div>
        </div>
      </section>

      {viewMode === 'board' ? (
        <DealsKanban deals={items} loading={loading} onStatusChange={onUpdateStage} />
      ) : (
        <div className="table-container-premium">
          <div className="table-scroll">
            <table className="table-premium">
              <thead>
                <tr>
                  <th className="text-center">DEAL STATUS</th>
                  <th className="text-left">DEAL NAME</th>
                  <th className="text-left">CUSTOMER</th>
                  <th className="text-center">AMOUNT</th>
                  <th className="text-left">ASSIGNED TO</th>
                  <th className="text-center">STATUS</th>
                  <th className="text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="tableRowInteractive" onClick={() => navigate(`/deals/${item.id}`)}>
                    <td className="text-center" onClick={stopRowNavigation}>
                      <select className={`stage-pill-select ${getStatusClass(item.stage)}`} value={item.stage} onChange={(e) => onUpdateStage(item.id, e.target.value)}>
                        {STAGE_OPTIONS.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                      </select>
                    </td>
                    <td className="text-left font-bold">
                      {(item.name || item.title || '').replace(/Deal for\s+/i, '')}
                    </td>
                    <td className="text-left">{item.customer_id?.name || '—'}</td>
                    <td className="text-center font-numeric-bold">₹{item.value?.toLocaleString()}</td>
                    <td className="text-left">
                      <div className="user-mention">
                        <div className="user-dot" />
                        <span>{item.assigned_to?.name || 'Unassigned'}</span>
                      </div>
                    </td>
                    <td className="text-center">
                      <span className={`status-pill-mini ${item.lifecycle_status?.toLowerCase() || 'active'}`}>{item.lifecycle_status || 'Active'}</span>
                    </td>
                    <td className="text-right" onClick={stopRowNavigation}>
                      <div className="tableActions">
                        <button className="action-btn-mini" onClick={() => navigate(`/deals/${item.id}/edit`)}><Icon name="edit" /></button>
                        {isManagement && <button className="action-btn-mini danger" onClick={() => onDelete(item.id)}><Icon name="trash" /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewMode === 'list' && total > filters.limit && (
        <Pagination page={filters.page} limit={filters.limit} total={total} onPageChange={(p) => handleFilterChange({ page: p })} onLimitChange={(l) => handleFilterChange({ limit: l, page: 1 })} />
      )}

      <style>{`
        .control-bar-premium { display: flex; align-items: center; gap: 16px; }
        .view-switcher-premium { background: rgba(255,255,255,0.05); padding: 4px; border-radius: 12px; display: flex; gap: 4px; border: 1px solid rgba(255,255,255,0.08); }
        .view-btn { background: transparent; border: none; padding: 8px 16px; border-radius: 10px; color: var(--text-dimmed); cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 8px; font-size: 0.85rem; font-weight: 700; }
        .view-btn.active { background: white; color: var(--bg-dark); box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
        
        .btn-premium { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 12px; font-weight: 800; font-size: 0.88rem; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border: 1px solid transparent; cursor: pointer; }
        .action-vibrant { background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; box-shadow: 0 8px 20px rgba(79, 70, 229, 0.3); }
        
        .view-btn.active span { color: var(--bg-dark); }
        .view-btn:not(.active) span { color: var(--text-dimmed); }

        .glass-panel { background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(12px); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 24px; }
        .filter-section-premium { padding: 24px; margin-bottom: 8px; }
        .filter-grid-premium { display: grid; gap: 16px; }
        .filter-label { display: block; font-size: 0.65rem; font-weight: 800; color: var(--text-dimmed); text-transform: uppercase; margin-bottom: 8px; }
        
        .search-input-premium { position: relative; height: 42px; display: flex; align-items: center; }
        .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-dimmed); font-size: 14px; z-index: 1; }
        .search-input-premium input { width: 100%; height: 100%; padding: 0 12px 0 38px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color: white; font-size: 0.85rem; }
        
        .input-premium { width: 100%; padding: 10px 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color: white; font-size: 0.85rem; outline: none; }
        .range-input-group { display: flex; gap: 4px; }
        .input-premium.mini { padding: 8px; font-size: 0.75rem; }

        .input-premium:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.2); }
        .btn-reset-premium:hover { background: rgba(255,255,255,0.1) !important; color: white !important; }

        .table-container-premium { background: rgba(15, 23, 42, 0.4); border-radius: 20px; border: 1px solid rgba(148, 163, 184, 0.1); overflow: hidden; margin-top: 16px; }
        .table-premium { width: 100%; border-collapse: separate; border-spacing: 0; }
        .table-premium th { background: rgba(148, 163, 184, 0.08); padding: 16px 20px; font-size: 0.65rem; font-weight: 800; color: white; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid rgba(148, 163, 184, 0.2); vertical-align: middle; }
        .table-premium td { padding: 16px 20px; border-bottom: 1px solid rgba(148, 163, 184, 0.05); font-size: 0.85rem; vertical-align: middle; }
        
        .tableRowInteractive:hover { background: rgba(255,255,255,0.03); }
        .id-badge { background: rgba(59, 130, 246, 0.1); color: #3b82f6; padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; font-family: monospace; font-weight: 700; border: 1px solid rgba(59, 130, 246, 0.2); }
        .font-numeric-bold { font-weight: 800; font-variant-numeric: tabular-nums; color: white; }
        
        .stage-pill-select { appearance: none; border: 1px solid transparent; border-radius: 99px; padding: 6px 16px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; cursor: pointer; text-align: center; min-width: 120px; transition: all 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
        .stage-pill-select:hover { transform: scale(1.05); filter: brightness(1.2); }
        .priority-tag { font-size: 0.65rem; font-weight: 800; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; }
        .priority-tag.high { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
        .priority-tag.medium { background: rgba(249, 115, 22, 0.1); color: #f97316; }
        .priority-tag.low { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
        
        .status-pill-mini { font-size: 0.6rem; font-weight: 900; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; }
        .status-pill-mini.active { background: #22c55e20; color: #22c55e; }
        .status-pill-mini.closed { background: #64748b20; color: #64748b; }

        .user-mention { display: flex; align-items: center; gap: 6px; }
        .user-dot { width: 6px; height: 6px; border-radius: 50%; background: #3b82f6; }

        ${STAGE_OPTIONS.map(opt => `
          .dynamic-deal-stage-${opt.name.replace(/\s+/g, '-').toLowerCase()} { 
            background: ${opt.color}15 !important; 
            color: ${opt.color} !important; 
            border: 1px solid ${opt.color}30 !important; 
          }
        `).join('')}
      `}</style>
    </div>
  )
}
