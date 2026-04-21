import { useEffect, useCallback, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Icon } from '../../../layouts/icons.jsx'
import { leadsApi } from '../../../services/leads.js'
import { statusesApi } from '../../../services/statuses.js'
import { leadSourcesApi } from '../../../services/leadSources.js'
import { useDebouncedValue } from '../../../utils/useDebouncedValue.js'
import { useAuth } from '../../../context/AuthContext'
import { useToastFeedback } from '../../../utils/useToastFeedback.js'
import { usersApi } from '../../../services/users.js'
import { activitiesApi } from '../../../services/activities.js'
import PageHeader from '../../../components/PageHeader.jsx'
import LeadsTable from './LeadsTable.jsx'
import LeadsKanban from './LeadsKanban.jsx'
import Pagination from '../../../components/Pagination.jsx'
import DebouncedSearchInput from '../../../components/DebouncedSearchInput.jsx'
import LeadSummaryBar from '../components/LeadSummaryBar.jsx'

/* ─────────────────────────────────────────────
   Constants & Utilities
───────────────────────────────────────────── */
// FETCH_LIMIT removed as we use pagination limit now

// getLeadSearchText removed as search is done server-side

/* ─────────────────────────────────────────────
   Main Page Component
───────────────────────────────────────────── */
export default function LeadsList() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  
  const isEmployee = user.role === 'Employee'
  
  // ── State ──
  const [items, setItems] = useState([])
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)
  const [summary, setSummary] = useState({})
  
  const [users, setUsers] = useState([])
  const [statusOptions, setStatusOptions] = useState([])
  const [sourceOptions, setSourceOptions] = useState([])

  const loadInitialFilters = () => {
    const saved = localStorage.getItem('leads_filters')
    const parsed = saved ? JSON.parse(saved) : {}
    return {
      q: searchParams.get('q') || parsed.q || '',
      status: searchParams.get('status') || parsed.status || '',
      source: searchParams.get('source') || parsed.source || '',
      assignedTo: searchParams.get('assignedTo') || parsed.assignedTo || '',
      startDate: searchParams.get('startDate') || parsed.startDate || '',
      endDate: searchParams.get('endDate') || parsed.endDate || '',
      sortField: searchParams.get('sortField') || parsed.sortField || 'created_at',
      sortOrder: searchParams.get('sortOrder') || parsed.sortOrder || 'desc',
      page: Math.max(1, Number(searchParams.get('page')) || parsed.page || 1),
      limit: parsed.limit || 25
    }
  }

  const [filters, setFilters] = useState(loadInitialFilters())

  const [viewMode, setViewMode] = useState(localStorage.getItem('leads_view_mode') || 'list')
  const debouncedQ = useDebouncedValue(filters.q, 400)

  useToastFeedback({ error })

  // ── Sync URL and LocalStorage ──
  useEffect(() => {
    const next = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => {
      if (v && k !== 'limit') next.set(k, String(v))
    })
    setSearchParams(next, { replace: true })
    localStorage.setItem('leads_filters', JSON.stringify(filters))
  }, [filters, setSearchParams])

  const applyFilter = (updates) => {
    setFilters(prev => ({ ...prev, ...updates }))
  }

  const handleResetFilters = () => {
    const fresh = { q: '', status: '', source: '', assignedTo: '', startDate: '', endDate: '', page: 1, limit: 25, sortField: 'created_at', sortOrder: 'desc' }
    setFilters(fresh)
    localStorage.removeItem('leads_filters')
  }

  // ── Data Fetching ──
  const loadLeads = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await leadsApi.list({
        status: filters.status || undefined,
        source: filters.source || undefined,
        assignedTo: filters.assignedTo || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        q: debouncedQ || undefined,
        page: viewMode === 'kanban' ? 1 : filters.page,
        limit: viewMode === 'kanban' ? 2000 : filters.limit,
        sortField: filters.sortField,
        sortOrder: filters.sortOrder
      })
      setItems(res.items || [])
      setTotalItems(Number(res.total) || 0)
      const s = res.summary || {}
      setSummary({
        total: Number(s.total) || 0,
        converted: Number(s.converted) || 0,
        pending: Number(s.pending) || 0,
        overdue: Number(s.overdue) || 0
      })
    } catch (e) {
      setError(e.message || 'Error loading leads')
    } finally {
      setLoading(false)
    }
  }, [filters.status, filters.source, filters.assignedTo, filters.startDate, filters.endDate, debouncedQ, viewMode, filters.page, filters.limit, filters.sortField, filters.sortOrder])

  useEffect(() => { loadLeads() }, [loadLeads])

  useEffect(() => {
    usersApi.list({ limit: 'all' }).then(res => setUsers(res.items || []))
    statusesApi.list('lead').then(res => setStatusOptions(res.map(s => ({ value: s.name, label: s.name, color: s.color }))))
    leadSourcesApi.list().then(res => setSourceOptions(res.map(s => ({ value: s.name, label: s.name }))))
  }, [])

  // ── Frontend filters are removed in favor of Server-Side Filtering ──

  // ── Actions ──
  const handleExport = async () => {
    setExporting(true)
    try {
      const blob = await leadsApi.exportExcel(filters)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `leads-report.xlsx`
      a.click()
    } catch { toast.error('Export failed') }
    finally { setExporting(false) }
  }

  const handleStatusChange = async (id, newStatus) => {
    // 1. Snapshot old state
    const previousItems = [...items]
    
    // 2. Optimistic Update
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, status: newStatus, lastActivityAt: new Date() } : item
    ))

    try {
      await leadsApi.updateStatus(id, newStatus)
      toast.success('Status updated')
    } catch {
      toast.error('Failed to update status')
      // 3. Rollback on failure
      setItems(previousItems)
    }
  }
  const handleLogCall = async (lead) => {
    try {
      await activitiesApi.create({
        company_id: user.company_id,
        user_id: user.id,
        description: `Called lead: ${lead.name}`,
        related_to: lead.id,
        related_type: 'Lead'
      })
      toast.success('Call logged')
    } catch { toast.error('Call logging failed') }
  }

  return (
    <div className="leads-page">
      <PageHeader 
        title="Leads Module" 
        actions={
          <button className="btn primary flex-center-gap" onClick={() => navigate('/leads/new')}>
            <Icon name="plus" /> <span>Add Lead</span>
          </button>
        } 
      />

      <LeadSummaryBar summary={summary} loading={loading} />

      {/* Filter Toolbar */}
      <section className="lp-toolbar premium-glass">
        <div className="lp-filter-groups">
          {/* Group 1: Search & Core Filters */}
          <div className="lp-group">
            <div className="lp-group-title">🔍 Quick Search & Filters</div>
            <div className="lp-filter-row">
              <div style={{ flex: 1, minWidth: '300px' }}>
                <DebouncedSearchInput 
                  value={filters.q} 
                  onChange={(val) => applyFilter({ q: val, page: 1 })} 
                  placeholder="Search by Name, Phone, Email, Company..."
                />
              </div>
              
              <select value={filters.status} onChange={(e) => applyFilter({ status: e.target.value, page: 1 })}>
                <option value="">All Statuses</option>
                {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              
              <select value={filters.source} onChange={(e) => applyFilter({ source: e.target.value, page: 1 })}>
                <option value="">All Sources</option>
                {sourceOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              
              {!isEmployee && (
                <select value={filters.assignedTo} onChange={(e) => applyFilter({ assignedTo: e.target.value, page: 1 })}>
                  <option value="">All Assignees</option>
                  {users.filter(u => u.role === 'Employee').map(u => <option key={u._id || u.id} value={u._id || u.id}>{u.name}</option>)}
                </select>
              )}
            </div>
          </div>

          {/* Group 2: Date Range & Reset */}
          <div className="lp-group">
            <div className="lp-group-title">📅 Date Range</div>
            <div className="lp-filter-row">
              <div className="lp-date-group">
                <input 
                  type="date" 
                  title="Start Date"
                  value={filters.startDate} 
                  onChange={(e) => applyFilter({ startDate: e.target.value, page: 1 })} 
                  className="lp-date-input"
                />
                <span className="lp-date-sep">-</span>
                <input 
                  type="date" 
                  title="End Date"
                  value={filters.endDate} 
                  onChange={(e) => applyFilter({ endDate: e.target.value, page: 1 })} 
                  className="lp-date-input"
                />
              </div>

              <div className="lp-btn-group">
                <button className="lp-btn-reset" onClick={handleResetFilters} title="Clear all filters">
                  <Icon name="refresh" size={14} /> <span>Reset</span>
                </button>
                
                 <button className="lp-btn-qa" onClick={handleExport} disabled={exporting}>
                   <Icon name="reports" size={14} /> Export
                 </button>
              </div>
            </div>
          </div>
        </div>

        <div className="lp-toolbar-footer">
          <div className="lp-results-count">
            Found <strong>{totalItems}</strong> matching leads
          </div>
          {loading && <div className="lp-loading-pill">Updating live...</div>}
        </div>
      </section>

      {/* Quick Actions & View Toggle */}
      <section className="lp-actions-bar">
        <div className="lp-view-switcher glass-sw" style={{ marginLeft: 'auto' }}>
          <button 
            className={viewMode === 'list' ? 'active' : ''} 
            onClick={() => { setViewMode('list'); localStorage.setItem('leads_view_mode', 'list'); }}
          >
            <Icon name="activity" size={16} title="Table View" />
          </button>
          <button 
            className={viewMode === 'kanban' ? 'active' : ''} 
            onClick={() => { setViewMode('kanban'); localStorage.setItem('leads_view_mode', 'kanban'); }}
          >
            <Icon name="plus" size={16} title="Kanban Board" />
          </button>
        </div>
      </section>

      {/* Main Content */}
      <div className="lp-main-content">
        {viewMode === 'kanban' ? (
          <LeadsKanban 
            leads={items} 
            loading={loading} 
            onStatusChange={handleStatusChange} 
            onCallLead={handleLogCall}
            stages={statusOptions}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <LeadsTable 
              leads={items}
              loading={loading}
              onRefresh={loadLeads}
              filters={filters}
              onFilterChange={applyFilter}
              statusOptions={statusOptions}
              employeeOptions={users.filter(u => u.role === 'Employee')}
              userRole={user.role}
            />
            
            <Pagination 
              totalItems={totalItems}
              limit={filters.limit}
              currentPage={filters.page}
              onPageChange={(p) => applyFilter({ page: p })}
              onLimitChange={(l) => applyFilter({ limit: l, page: 1 })}
            />
          </div>
        )}
      </div>

      <style>{`
        .leads-page { padding: 20px 40px; display: flex; flex-direction: column; gap: 20px; position: relative; min-height: 100vh; }
        .premium-glass { background: rgba(30, 41, 59, 0.4); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; }
        
        .lp-toolbar { padding: 24px; display: flex; flex-direction: column; gap: 24px; }
        .lp-filter-groups { display: flex; flex-direction: column; gap: 20px; }
        
        .lp-group { display: flex; flex-direction: column; gap: 10px; }
        .lp-group-title { font-size: 0.72rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; padding-left: 2px; }
        
        .lp-filter-row { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
        .lp-btn-group { display: flex; gap: 8px; margin-left: auto; }
        
        .lp-filter-row select, .lp-date-input { 
          background: rgba(0,0,0,0.2); 
          border: 1px solid rgba(255,255,255,0.08); 
          color: white; 
          padding: 10px 14px; 
          border-radius: 10px; 
          cursor: pointer; 
          font-size: 0.88rem;
          transition: all 0.2s;
        }
        .lp-filter-row select:hover, .lp-date-input:hover { border-color: rgba(255,255,255,0.2); background: rgba(0,0,0,0.3); }
        .lp-filter-row select:focus { border-color: var(--primary); outline: none; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        
        .lp-date-group { display: flex; align-items: center; gap: 8px; }
        .lp-date-sep { color: #475569; font-weight: 700; }
        .lp-date-input::-webkit-calendar-picker-indicator { filter: invert(0.8); cursor: pointer; }
        
        .lp-btn-reset { 
          background: rgba(239, 68, 68, 0.05); 
          color: #f87171; 
          border: 1px solid rgba(239, 68, 68, 0.15); 
          padding: 10px 18px; 
          border-radius: 10px; 
          cursor: pointer; 
          font-weight: 700; 
          display: flex; 
          align-items: center; 
          gap: 8px; 
          transition: all 0.2s; 
        }
        .lp-btn-reset:hover { background: #ef4444; color: white; border-color: #ef4444; transform: translateY(-1px); }
        
        .lp-btn-qa { 
          background: rgba(59, 130, 246, 0.1); 
          border: 1px solid rgba(59, 130, 246, 0.2); 
          color: #60a5fa; 
          padding: 10px 18px; 
          border-radius: 10px; 
          cursor: pointer; 
          display: flex; 
          align-items: center; 
          gap: 8px; 
          font-weight: 700; 
          transition: all 0.2s; 
        }
        .lp-btn-qa:hover:not(:disabled) { background: #3b82f6; color: white; border-color: #3b82f6; transform: translateY(-1px); }

        .lp-toolbar-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.05); }
        .lp-results-count { font-size: 0.85rem; color: #94a3b8; }
        .lp-results-count strong { color: white; }
        .lp-loading-pill { font-size: 0.75rem; font-weight: 700; color: var(--primary); background: rgba(59,130,246,0.1); padding: 4px 12px; border-radius: 999px; animation: lp-pulse 1.5s infinite; }
        
        @keyframes lp-pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }

        .lp-actions-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }

        .lp-fab {
          position: fixed;
          bottom: 40px;
          right: 40px;
          width: 60px;
          height: 60px;
          border-radius: 20px;
          background: linear-gradient(135deg, #3b82f6, #6366f1);
          color: white;
          border: none;
          box-shadow: 0 10px 25px rgba(59, 130, 246, 0.4);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          z-index: 100;
        }
        .lp-fab:hover { transform: scale(1.1) rotate(90deg); box-shadow: 0 15px 35px rgba(59, 130, 246, 0.5); }
        .lp-fab:active { transform: scale(0.95); }
        
        .glass-sw { background: rgba(0,0,0,0.2); padding: 4px; border-radius: 10px; display: flex; gap: 4px; border: 1px solid rgba(255,255,255,0.05); }
        .glass-sw button { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border: 0; border-radius: 8px; background: transparent; color: #64748b; cursor: pointer; transition: 0.2s; }
        .glass-sw button.active { background: var(--primary); color: white; }
      `}</style>
    </div>
  )
}
