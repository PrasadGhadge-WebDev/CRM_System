import { useEffect, useCallback, useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Icon } from '../../../layouts/icons.jsx'
import { useAuth } from '../../../context/AuthContext'
import SearchableSelect from '../components/SearchableSelect.jsx'
import ModernSearchBar from '../../../components/ModernSearchBar.jsx'
import Pagination from '../../../components/Pagination.jsx'
import LottieLoader from '../../../components/LottieLoader.jsx'
import LottieEmpty from '../../../components/LottieEmpty.jsx'
import { dealsApi } from '../../../services/deals'
import { usersApi } from '../../../services/users'
import { useDebouncedValue } from '../../../utils/useDebouncedValue.js'
import { useToastFeedback } from '../../../utils/useToastFeedback.js'
import DealsKanban from './DealsKanban.jsx'
import DealModal from '../components/DealModal.jsx'
import StatusDropdown from '../components/StatusDropdown.jsx'

const STAGE_OPTIONS = [
  { name: 'Prospecting', color: '#6366f1' },
  { name: 'Qualification', color: '#3b82f6' },
  { name: 'Needs Analysis', color: '#8b5cf6' },
  { name: 'Proposal', color: '#f59e0b' },
  { name: 'Negotiation', color: '#f97316' },
  { name: 'Won', color: '#10b981' },
  { name: 'Lost', color: '#ef4444' }
]

function formatCurrency(value) {
  const val = Number(value) || 0
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val)
}

function stopRowNavigation(event) {
  event.stopPropagation()
}

export default function DealsList() {
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const isManagement = currentUser?.role === 'Admin' || currentUser?.role === 'Manager'
  const isEmployee = currentUser?.role === 'Employee'
  const canCreate = isManagement || isEmployee

  const qParam = searchParams.get('q') || ''
  const stageParam = searchParams.get('stage') || ''
  const assignedToParam = searchParams.get('assigned_to') || ''
  const viewParam = searchParams.get('view') || 'list'
  const pageParam = Math.max(1, Number(searchParams.get('page') || 1) || 1)
  const limitParam = 50

  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [summary, setSummary] = useState({ total: 0, byStage: {}, totalValue: 0 })
  const [employees, setEmployees] = useState([])
  const [viewMode, setViewMode] = useState(viewParam)
  
  const [q, setQ] = useState(qParam)
  const [stage, setStage] = useState(stageParam)
  const [assignedTo, setAssignedTo] = useState(assignedToParam)
  const [page, setPage] = useState(pageParam)
  const [dateRange, setDateRange] = useState(searchParams.get('dateRange') || 'all')
  const [customDates, setCustomDates] = useState({ 
    start: searchParams.get('startDate') || '', 
    end: searchParams.get('endDate') || '' 
  })
  
  const [formModal, setFormModal] = useState({ open: false, deal: null })

  useToastFeedback({ error })
  const debouncedQ = useDebouncedValue(q, 500)

  useEffect(() => {
    usersApi.list({ limit: 'all' }).then(res => {
      setEmployees(res.items || res || [])
    }).catch(() => {})
  }, [])

  const desiredParams = useMemo(() => {
    const next = new URLSearchParams()
    if (debouncedQ.trim()) next.set('q', debouncedQ.trim())
    if (stage.trim()) next.set('stage', stage.trim())
    if (assignedTo.trim()) next.set('assigned_to', assignedTo.trim())
    if (dateRange !== 'all') next.set('dateRange', dateRange)
    if (customDates.start) next.set('startDate', customDates.start)
    if (customDates.end) next.set('endDate', customDates.end)
    if (page > 1) next.set('page', String(page))
    if (viewMode !== 'list') next.set('view', viewMode)
    
    const addDeal = searchParams.get('addDeal')
    const editDeal = searchParams.get('editDeal')
    if (addDeal) next.set('addDeal', addDeal)
    if (editDeal) next.set('editDeal', editDeal)

    return next
  }, [debouncedQ, stage, assignedTo, page, viewMode, searchParams])

  useEffect(() => {
    if (desiredParams.toString() !== searchParams.toString()) {
      setSearchParams(desiredParams, { replace: true })
    }
  }, [desiredParams, searchParams, setSearchParams])

  useEffect(() => {
    const addDeal = searchParams.get('addDeal')
    const editDeal = searchParams.get('editDeal')
    if (addDeal === 'true') {
      setFormModal({ open: true, deal: null })
    } else if (editDeal) {
      setFormModal({ open: true, deal: { id: editDeal } })
    } else {
      setFormModal({ open: false, deal: null })
    }
  }, [searchParams])

  const loadDeals = useCallback(async () => {
    setLoading(true)
    setError('')

    let startDate = ''
    let endDate = ''
    const now = new Date()
    now.setHours(0,0,0,0)

    if (dateRange === 'today') {
      startDate = now.toISOString()
      endDate = new Date(new Date().setHours(23,59,59,999)).toISOString()
    } else if (dateRange === 'yesterday') {
      const y = new Date(now)
      y.setDate(y.getDate() - 1)
      startDate = y.toISOString()
      const yEnd = new Date(y)
      yEnd.setHours(23,59,59,999)
      endDate = yEnd.toISOString()
    } else if (dateRange === 'week') {
      const w = new Date(now)
      w.setDate(w.getDate() - 7)
      startDate = w.toISOString()
    } else if (dateRange === 'month') {
      const m = new Date(now)
      m.setMonth(m.getMonth() - 1)
      startDate = m.toISOString()
    } else if (dateRange === 'custom' && customDates.start && customDates.end) {
      startDate = new Date(customDates.start).toISOString()
      endDate = new Date(new Date(customDates.end).setHours(23,59,59,999)).toISOString()
    }

    try {
      const res = await dealsApi.list({
        q: debouncedQ,
        stage,
        assigned_to: assignedTo,
        startDate,
        endDate,
        page,
        limit: viewMode === 'board' ? 'all' : limitParam
      })
      setItems(res.items || res || [])
      setTotal(res.total || (Array.isArray(res) ? res.length : 0))
      setSummary(res.summary || { total: 0, byStage: {}, totalValue: 0 })
    } catch (e) {
      setError(e.message || 'Failed to load deals')
    } finally {
      setLoading(false)
    }
  }, [debouncedQ, stage, assignedTo, page, viewMode, dateRange, customDates])

  useEffect(() => {
    loadDeals()
  }, [loadDeals])

  async function onUpdateStage(id, newStage) {
    try {
      await dealsApi.update(id, { stage: newStage })
      toast.success(`Stage updated to ${newStage}`)
      loadDeals()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed')
    }
  }

  const handleOpenCreateModal = () => {
    const next = new URLSearchParams(searchParams)
    next.set('addDeal', 'true')
    setSearchParams(next)
  }

  const handleOpenEditModal = (deal) => {
    const next = new URLSearchParams(searchParams)
    next.set('editDeal', String(deal.id))
    setSearchParams(next)
  }

  const handleDeleteDeal = (deal) => {
    if (currentUser?.role !== 'Admin') {
      toast.info('Admin access required')
      return
    }

    const DeleteConfirm = ({ closeToast }) => (
      <div className="stack gap-10">
        <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Delete "{deal.name}"?</div>
        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>This action cannot be undone.</div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <button 
            onClick={async () => {
              try {
                await dealsApi.remove(deal.id)
                toast.success('Deal deleted')
                loadDeals()
                closeToast()
              } catch (err) {
                toast.error(err.message || 'Failed')
              }
            }}
            style={{ background: '#ef4444', color: 'white', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}
          >
            Confirm
          </button>
          <button 
            onClick={closeToast}
            style={{ background: '#e2e8f0', color: '#475569', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}
          >
            Cancel
          </button>
        </div>
      </div>
    )

    toast(<DeleteConfirm />, {
      position: "top-right",
      autoClose: false,
      closeOnClick: false,
      draggable: false,
      closeButton: false
    })
  }

  const closeFormModal = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('addDeal')
    next.delete('editDeal')
    setSearchParams(next)
  }

  return (
    <div className="stack">
      <section className="crm-fullscreen-shell">
        <div className="users-page-header">
          <h1 className="users-title">Deals Management</h1>
          <p className="users-subtitle">Monitor your sales opportunities and team performance</p>
        </div>

        <div className="crm-stats-bar-compact overflow-x-auto pb-8">
          <div className="stat-pill-mini clickable" onClick={() => setStage('')} style={{ borderBottom: stage === '' ? '2px solid var(--primary)' : '' }}>
            <span className="stat-pill-label">ALL DEALS</span>
            <span className="stat-pill-value total">{summary.total}</span>
          </div>
          <div className="stat-pill-mini">
            <span className="stat-pill-label">PIPELINE VALUE</span>
            <span className="stat-pill-value" style={{ color: 'var(--primary)' }}>
              {formatCurrency(summary.totalValue)}
            </span>
          </div>
          {Object.entries(summary.byStage).map(([name, count]) => (
            <div 
              key={name} 
              className="stat-pill-mini clickable" 
              onClick={() => { setStage(name); setPage(1); }}
              style={{ borderBottom: stage === name ? '2px solid var(--primary)' : '' }}
            >
              <span className="stat-pill-label">{name.toUpperCase()}</span>
              <span className="stat-pill-value">{count}</span>
            </div>
          ))}
        </div>

        <div className="unified-action-bar">
          <div className="search-filter-group">
            <ModernSearchBar
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setPage(1)
              }}
              placeholder="Search by name, ID, description, stage, priority, lifecycle, payment status..."
            />

            <SearchableSelect
              value={stage}
              onChange={(val) => { setStage(val); setPage(1); }}
              options={[{ value: '', label: 'All Stages' }, ...STAGE_OPTIONS.map(s => ({ value: s.name, label: s.name }))]}
              placeholder="All Stages"
              icon="activity"
            />

            <SearchableSelect
              value={assignedTo}
              onChange={(val) => { setAssignedTo(val); setPage(1); }}
              options={[{ value: '', label: 'All Owners' }, ...employees.map(emp => ({ value: emp.id, label: emp.name }))]}
              placeholder="All Owners"
              icon="user"
            />

            <SearchableSelect
              value={dateRange}
              onChange={(val) => { setDateRange(val); setPage(1); }}
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

            {dateRange === 'custom' && (
              <div className="flex items-center gap-4 animate-fade-in">
                <input 
                  type="date" 
                  className="crm-input date-mini" 
                  value={customDates.start} 
                  onChange={e => setCustomDates(prev => ({ ...prev, start: e.target.value }))}
                />
                <span className="muted" style={{ fontSize: '0.7rem' }}>to</span>
                <input 
                  type="date" 
                  className="crm-input date-mini" 
                  value={customDates.end} 
                  onChange={e => setCustomDates(prev => ({ ...prev, end: e.target.value }))}
                />
              </div>
            )}

            <div className="crm-toggle-group">
              <button 
                className={`toggle-item ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="List View"
              >
                <Icon name="list" size={16} />
              </button>
              <button 
                className={`toggle-item ${viewMode === 'board' ? 'active' : ''}`}
                onClick={() => setViewMode('board')}
                title="Pipeline View"
              >
                <Icon name="columns" size={16} />
              </button>
            </div>

            {canCreate && (
              <button className="add-user-btn" onClick={handleOpenCreateModal}>
                <Icon name="plus" size={16} />
                <span>New Deal</span>
              </button>
            )}

            {(q || stage || assignedTo || dateRange !== 'all') && (
              <button 
                className="btn-premium-mini reset-btn"
                onClick={() => {
                  setQ('')
                  setStage('')
                  setAssignedTo('')
                  setDateRange('all')
                  setCustomDates({ start: '', end: '' })
                  setPage(1)
                }}
              >
                <Icon name="refresh" size={14} className="reset-icon" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>

        {error ? <div className="alert error glass-alert">{error}</div> : null}

        {loading ? (
          <LottieLoader message="Loading data..." />
        ) : (
          <>
            {viewMode === 'board' ? (
              <DealsKanban deals={items} loading={loading} onStatusChange={onUpdateStage} />
            ) : (
              <>
                {items.length === 0 ? (
                  <LottieEmpty 
                    message="No data found" 
                    description="Try adjusting your filters or search terms." 
                  />
                ) : (
                  <>
                    <div className="crm-table-wrap shadow-soft" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                      <div className="crm-table-scroll">
                        <table className="crm-table">
                          <thead>
                            <tr>
                              <th style={{ minWidth: '180px' }}>Deal Name</th>
                              <th style={{ minWidth: '160px' }}>Customer</th>
                              <th style={{ minWidth: '120px' }} className="text-right">Value</th>
                              <th style={{ minWidth: '130px' }} className="text-center">Stage</th>
                              <th style={{ minWidth: '120px' }}>Owner</th>
                              <th style={{ minWidth: '130px' }}>Last Updated</th>
                              <th style={{ minWidth: '80px' }} className="text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item) => (
                              <tr
                                key={item.id}
                                className="crm-table-row"
                                onClick={() => navigate(`/deals/${item.id}`)}
                                style={{ cursor: 'pointer' }}
                              >
                                <td style={{ padding: '12px 16px' }}>
                                  <div className="usersPrimaryText" style={{ fontWeight: 700 }}>{item.name}</div>
                                </td>
                                <td style={{ padding: '12px 16px' }}>
                                  <div className="usersPrimaryText" style={{ fontWeight: 700, color: 'var(--text)' }}>
                                    {item.customer_id?.name || '—'}
                                  </div>
                                  {item.customer_id?.phone && (
                                    <div className="usersEmailText" style={{ fontSize: '0.75rem', marginTop: '2px' }}>
                                      {item.customer_id.phone}
                                    </div>
                                  )}
                                </td>
                                <td className="text-right" style={{ padding: '12px 16px' }}>
                                  <div className="usersPrimaryText" style={{ fontWeight: 800, color: 'var(--text-dark)' }}>
                                    ₹{item.value?.toLocaleString('en-IN') || '0'}
                                  </div>
                                </td>
                                <td className="text-center" style={{ padding: '12px 16px' }} onClick={stopRowNavigation}>
                                  <StatusDropdown 
                                    status={item.stage} 
                                    options={STAGE_OPTIONS} 
                                    onChange={(newStage) => onUpdateStage(item.id, newStage)}
                                    disabled={!isManagement}
                                  />
                                </td>
                                <td style={{ padding: '12px 16px' }}>
                                  <div className="usersPrimaryText" style={{ fontWeight: 700, color: 'var(--text)' }}>
                                    {item.assigned_to?.name || 'Unassigned'}
                                  </div>
                                  {item.assigned_to?.phone && (
                                    <div className="usersEmailText" style={{ fontSize: '0.75rem', marginTop: '2px' }}>
                                      {item.assigned_to.phone}
                                    </div>
                                  )}
                                </td>
                                <td style={{ padding: '12px 16px' }}>
                                  <div className="usersEmailText" style={{ fontSize: '0.85rem' }}>
                                    {new Date(item.updated_at || item.created_at).toLocaleDateString('en-GB', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric'
                                    })}
                                  </div>
                                </td>
                                <td className="text-right" style={{ padding: '12px 16px' }} onClick={stopRowNavigation}>
                                  <div className="crm-action-group" style={{ justifyContent: 'flex-end' }}>
                                    <button
                                      className="modern-action-btn"
                                      onClick={() => handleOpenEditModal(item)}
                                      title="Edit"
                                    >
                                      <Icon name="edit" size={16} />
                                    </button>
                                    <button
                                      className="modern-action-btn danger"
                                      onClick={() => handleDeleteDeal(item)}
                                      title="Delete"
                                    >
                                      <Icon name="trash" size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="crm-mobile-cards">
                      {items.map((item) => (
                        <div key={item.id} className="crm-mobile-card shadow-soft" onClick={() => navigate(`/deals/${item.id}`)}>
                          <div className="card-header">
                            <div className="card-title-group">
                              <div className="card-title">{item.name}</div>
                              <div className="card-subtitle">
                                {item.customer_id?.name || 'No Customer'}
                                {item.customer_id?.phone && <span style={{ opacity: 0.8, fontSize: '0.75rem', marginLeft: '8px', fontWeight: 500 }}>• {item.customer_id.phone}</span>}
                              </div>
                            </div>
                            <StatusDropdown 
                              status={item.stage} 
                              options={STAGE_OPTIONS} 
                              onChange={(newStage) => onUpdateStage(item.id, newStage)}
                              disabled={!isManagement}
                            />
                          </div>
                          <div className="card-body">
                            <div className="card-stat">
                              <span className="stat-label">Value</span>
                              <span className="stat-value">₹{item.value?.toLocaleString('en-IN') || '0'}</span>
                            </div>
                            <div className="card-stat">
                              <span className="stat-label">Owner</span>
                              <div className="stat-value" style={{ fontSize: '0.8rem', fontWeight: 700, textAlign: 'right' }}>
                                {item.assigned_to?.name || 'Unassigned'}
                                {item.assigned_to?.phone && <div style={{ fontSize: '0.7rem', opacity: 0.7, fontWeight: 500 }}>{item.assigned_to.phone}</div>}
                              </div>
                            </div>
                          </div>
                          <div className="card-footer" onClick={stopRowNavigation}>
                            <span className="update-date">Updated: {new Date(item.updated_at || item.created_at).toLocaleDateString('en-GB')}</span>
                            <div className="card-actions">
                              <button className="icon-btn" onClick={() => handleOpenEditModal(item)}><Icon name="edit" size={14} /></button>
                              <button className="icon-btn danger" onClick={() => handleDeleteDeal(item)}><Icon name="trash" size={14} /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Pagination
                      page={page}
                      limit={limitParam}
                      total={total}
                      onPageChange={(p) => setPage(Math.max(1, p))}
                    />
                  </>
                )}
              </>
            )}
          </>
        )}
      </section>

      <DealModal
        isOpen={formModal.open}
        deal={formModal.deal}
        onClose={closeFormModal}
        onSave={() => {
          closeFormModal()
          loadDeals()
        }}
      />

      <style>{`
          .crm-table th {
             padding: 12px 16px !important;
             background: var(--bg-surface) !important;
             font-size: 0.75rem !important;
             font-weight: 800 !important;
             color: var(--text-dimmed) !important;
             letter-spacing: 0.05em !important;
             text-transform: uppercase !important;
             border-bottom: 2px solid var(--border-strong) !important;
          }

          .crm-table-row { transition: background 0.2s ease; cursor: pointer; border-bottom: 1px solid var(--border-subtle) !important; }
          .crm-table-row:hover { background: var(--bg-hover) !important; }
          .crm-table-row td { padding: 14px 16px !important; vertical-align: middle; }
          
          .usersPrimaryText { color: var(--text); font-size: 0.95rem; font-weight: 700; }
          .usersEmailText { font-size: 0.85rem; color: var(--text-dimmed); }
          
          .crm-action-group { display: flex; gap: 8px; justify-content: flex-end; }
          .modern-action-btn { width: 34px; height: 34px; border-radius: 8px; border: 1px solid var(--border-strong); background: var(--bg-card); color: var(--text-dimmed); display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; cursor: pointer; }
          .modern-action-btn:hover { color: var(--primary); border-color: var(--primary); transform: translateY(-1px); box-shadow: var(--shadow-sm); }
          .modern-action-btn.danger:hover { color: var(--danger); border-color: var(--danger); background: var(--bg-hover); }

          /* Responsive Layout */
          .crm-mobile-cards { display: none; }

          @media (max-width: 768px) {
            .crm-table-wrap { display: none; }
            .crm-mobile-cards { display: grid; grid-template-columns: 1fr; gap: 16px; padding-bottom: 20px; }
            
            .crm-mobile-card {
              background: var(--bg-card);
              border: 1px solid var(--border);
              border-radius: 16px;
              padding: 16px;
              display: flex;
              flex-direction: column;
              gap: 12px;
              cursor: pointer;
            }

            .card-header { display: flex; justify-content: space-between; align-items: flex-start; }
            .card-title { font-weight: 800; font-size: 1.05rem; color: var(--text); }
            .card-subtitle { font-size: 0.85rem; color: var(--primary); font-weight: 600; }
            
            .card-body { display: flex; flex-direction: column; gap: 8px; padding: 12px 0; border-top: 1px solid var(--border-subtle); border-bottom: 1px solid var(--border-subtle); }
            .card-stat { display: flex; justify-content: space-between; align-items: center; }
            .stat-label { font-size: 0.75rem; color: var(--text-dimmed); font-weight: 700; text-transform: uppercase; }
            .stat-value { font-weight: 800; color: var(--text); }

            .card-footer { display: flex; justify-content: space-between; align-items: center; }
            .update-date { font-size: 0.75rem; color: var(--text-dimmed); }
            .card-actions { display: flex; gap: 8px; }
            .icon-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-card); display: flex; align-items: center; justify-content: center; }
            .icon-btn.danger { color: #ef4444; }
          }

         .users-page-header { margin-bottom: 12px; }
         .users-title { font-size: 1.5rem; font-weight: 800; color: var(--text); margin-bottom: 4px; }
         .users-subtitle { font-size: 0.9rem; color: var(--text-dimmed); font-weight: 500; }

         .unified-action-bar { 
            display: flex; 
            align-items: center; 
            justify-content: space-between; 
            gap: 16px; 
            margin-bottom: 20px; 
            flex-wrap: wrap;
         }
         .search-filter-group { 
            display: flex; 
            align-items: center; 
            gap: 12px; 
            flex: 1; 
            justify-content: space-between; 
         }
         .filter-select { max-width: 160px; }
         
         .btn-clear-filters { 
            background: none; 
            border: none; 
            color: var(--primary); 
            font-weight: 700; 
            font-size: 0.85rem; 
            cursor: pointer; 
            padding: 2px 6px; 
            transition: all 0.2s; 
         }
         .btn-clear-filters:hover { text-decoration: underline; }

          .crm-stats-bar-compact { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; margin-bottom: 20px; justify-content: space-between; }
          .stat-pill-mini { background: var(--bg-card); border: 1px solid var(--border-strong); padding: 12px 20px; border-radius: 14px; display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 150px; box-shadow: var(--shadow-sm); }
         .stat-pill-label { font-size: 11px; font-weight: 800; color: var(--text-dimmed); text-transform: uppercase; letter-spacing: 0.05em; }
         .stat-pill-value { font-size: 22px; font-weight: 900; }
         .stat-pill-value.total { color: var(--text); }
         .stat-pill-value.active { color: #10b981; }
         .stat-pill-value.pending { color: #f59e0b; }

         .crm-table-wrap { border-radius: 12px; overflow: hidden; border: 1px solid var(--border-strong) !important; }

         .crm-input { width: 100%; background: var(--bg-card) !important; border: 1px solid var(--border) !important; border-radius: 10px !important; padding: 10px 14px !important; color: var(--text) !important; font-size: 0.9rem !important; transition: all 0.2s; }
         .crm-input:focus { border-color: var(--primary) !important; ring: 2px var(--primary-soft) !important; }
         
         .crm-search-input-wrap { position: relative; width: 100%; flex: 1; max-width: 400px; }
         .crm-search-input-wrap .search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); z-index: 1; color: #94a3b8; font-size: 16px; }
         .crm-search-input-wrap .crm-input { padding-left: 42px !important; }
         
          .add-user-btn { background: var(--primary) !important; color: white !important; border: none !important; border-radius: 10px !important; padding: 0 24px !important; font-weight: 700 !important; height: 42px; display: flex; align-items: center; gap: 8px; transition: all 0.3s; box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.2); font-size: 0.9rem; flex-shrink: 0; }
          .add-user-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(var(--primary-rgb), 0.3); }

          .crm-toggle-group {
            display: flex;
            background: #f3f4f6;
            border-radius: 10px;
            padding: 3px;
            height: 42px;
          }
          .toggle-item {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 44px;
            height: 100%;
            border: none;
            background: transparent;
            color: var(--text-dimmed);
            cursor: pointer;
            border-radius: 8px;
            transition: all 0.2s;
          }
          .toggle-item.active {
            background: var(--bg-card);
            color: var(--primary);
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          }

         .crm-status-pill-modern {
            padding: 6px 14px;
            border-radius: 10px;
            font-size: 0.7rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            border: 1px solid #e2e8f0;
            background: var(--bg-card);
         }
         .status-dot { width: 8px; height: 8px; border-radius: 50%; }
         
         .status-won { color: #10b981; border-color: #bbf7d0; background: #f0fdf4; }
         .status-won .status-dot { background: #10b981; }
         
         .status-lost { color: #ef4444; border-color: #fecaca; background: #fef2f2; }
         .status-lost .status-dot { background: #ef4444; }
         
         .status-new { color: #3b82f6; border-color: #bfdbfe; background: #eff6ff; }
         .status-new .status-dot { background: #3b82f6; }
         
         .status-qualified { color: #f59e0b; border-color: #fde68a; background: #fffbeb; }
         .status-qualified .status-dot { background: #f59e0b; }
         
         .status-proposal { color: #8b5cf6; border-color: #ddd6fe; background: #f5f3ff; }
         .status-proposal .status-dot { background: #8b5cf6; }

         .tableAvatarFallback { 
            border-radius: 50%; 
            color: white; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            font-weight: 800; 
            background: #6366f1;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
         }

         @media (max-width: 1200px) {
            .unified-action-bar { flex-direction: column; align-items: stretch; }
            .search-filter-group { flex-wrap: wrap; gap: 10px; }
            .crm-search-input-wrap { max-width: none; }
         }
      `}</style>
    </div>
  )
}
