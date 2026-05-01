import { useEffect, useCallback, useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Icon } from '../../../layouts/icons.jsx'
import { useAuth } from '../../../context/AuthContext'
import Pagination from '../../../components/Pagination.jsx'
import LottieLoader from '../../../components/LottieLoader.jsx'
import LottieEmpty from '../../../components/LottieEmpty.jsx'
import { dealsApi } from '../../../services/deals'
import { usersApi } from '../../../services/users'
import { useDebouncedValue } from '../../../utils/useDebouncedValue.js'
import { useToastFeedback } from '../../../utils/useToastFeedback.js'
import DealsKanban from './DealsKanban.jsx'
import DealModal from '../components/DealModal.jsx'

const STAGE_OPTIONS = [
  { name: 'New', color: '#3b82f6' },
  { name: 'Qualified', color: '#f59e0b' },
  { name: 'Proposal', color: '#8b5cf6' },
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
  const [employees, setEmployees] = useState([])
  const [viewMode, setViewMode] = useState(viewParam)
  
  const [q, setQ] = useState(qParam)
  const [stage, setStage] = useState(stageParam)
  const [assignedTo, setAssignedTo] = useState(assignedToParam)
  const [page, setPage] = useState(pageParam)
  
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
    try {
      const res = await dealsApi.list({
        q: debouncedQ,
        stage,
        assigned_to: assignedTo,
        page,
        limit: viewMode === 'board' ? 'all' : limitParam
      })
      setItems(res.items || res || [])
      setTotal(res.total || (Array.isArray(res) ? res.length : 0))
    } catch (e) {
      setError(e.message || 'Failed to load deals')
    } finally {
      setLoading(false)
    }
  }, [debouncedQ, stage, assignedTo, page, viewMode])

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

        <div className="crm-stats-bar-compact">
          <div className="stat-pill-mini">
            <span className="stat-pill-label">Total Deals</span>
            <span className="stat-pill-value total">{total}</span>
          </div>
          <div className="stat-pill-mini">
            <span className="stat-pill-label">Won Deals</span>
            <span className="stat-pill-value active">{items.filter(d => d.stage === 'Won').length}</span>
          </div>
          <div className="stat-pill-mini">
            <span className="stat-pill-label">Sales Value</span>
            <span className="stat-pill-value" style={{ color: 'var(--primary)' }}>
              {formatCurrency(items.reduce((sum, d) => sum + (Number(d.value) || 0), 0))}
            </span>
          </div>
          <div className="stat-pill-mini">
            <span className="stat-pill-label">In Progress</span>
            <span className="stat-pill-value pending">{items.filter(d => d.stage !== 'Won' && d.stage !== 'Lost').length}</span>
          </div>
        </div>

        <div className="unified-action-bar">
          <div className="search-filter-group">
            <div className="crm-search-input-wrap">
              <Icon name="search" className="search-icon" />
              <input
                type="text"
                placeholder="Search deals..."
                className="crm-input"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value)
                  setPage(1)
                }}
              />
            </div>

            <select
              className="crm-input filter-select"
              value={stage}
              onChange={(e) => {
                setStage(e.target.value)
                setPage(1)
              }}
            >
              <option value="">All Stages</option>
              {STAGE_OPTIONS.map((s) => (
                <option key={s.name} value={s.name}>{s.name}</option>
              ))}
            </select>

            <select
              className="crm-input filter-select"
              value={assignedTo}
              onChange={(e) => {
                setAssignedTo(e.target.value)
                setPage(1)
              }}
            >
              <option value="">All Owners</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>

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

            {(q || stage || assignedTo) && (
              <button 
                className="btn-clear-filters"
                onClick={() => {
                  setQ('')
                  setStage('')
                  setAssignedTo('')
                  setPage(1)
                }}
              >
                Clear Filters
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
                              <th style={{ minWidth: '280px' }}>Deal & Customer</th>
                              <th style={{ minWidth: '150px' }} className="text-right">Value</th>
                              <th style={{ minWidth: '160px' }} className="text-center">Current Stage</th>
                              <th style={{ minWidth: '180px' }}>Owner</th>
                              <th style={{ minWidth: '160px' }}>Last Updated</th>
                              <th className="text-right" style={{ width: '130px' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item) => (
                              <tr
                                key={item.id}
                                className="crm-table-row"
                                onClick={() => navigate(`/deals/${item.id}`)}
                              >
                                <td>
                                  <div className="deal-identity-cell">
                                    <div className="usersPrimaryText">{item.name}</div>
                                    <div className="usersEmailText" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                                      {item.customer_id?.name || '—'}
                                    </div>
                                  </div>
                                </td>
                                <td className="text-right">
                                  <div className="usersPrimaryText" style={{ fontWeight: 800 }}>
                                    {formatCurrency(item.value)}
                                  </div>
                                </td>
                                <td className="text-center" onClick={stopRowNavigation}>
                                  <span className={`crm-status-pill-modern status-${(item.stage || 'new').toLowerCase().replace(' ', '')}`}>
                                    <div className="status-dot" />
                                    {item.stage || 'NEW'}
                                  </span>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div className="tableAvatarFallback" style={{ width: '30px', height: '30px', fontSize: '0.75rem' }}>
                                      {(item.assigned_to?.name || 'U').charAt(0).toUpperCase()}
                                    </div>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text)', fontWeight: 600 }}>
                                      {item.assigned_to?.name || 'Unassigned'}
                                    </span>
                                  </div>
                                </td>
                                <td>
                                  <div className="usersEmailText">
                                    {new Date(item.updated_at || item.created_at).toLocaleDateString('en-GB', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric'
                                    })}
                                  </div>
                                </td>
                                <td className="text-right" onClick={stopRowNavigation}>
                                  <div className="crm-action-group">
                                    <button
                                      className="modern-action-btn"
                                      onClick={() => navigate(`/deals/${item.id}`)}
                                      title="View"
                                    >
                                      <Icon name="reports" size={14} />
                                    </button>
                                    <button
                                      className="modern-action-btn"
                                      onClick={() => handleOpenEditModal(item)}
                                      title="Edit"
                                    >
                                      <Icon name="edit" size={14} />
                                    </button>
                                    <button
                                      className="modern-action-btn danger"
                                      onClick={() => handleDeleteDeal(item)}
                                      title="Delete"
                                    >
                                      <Icon name="trash" size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
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
            background: #f3f4f6 !important;
            font-size: 0.75rem !important;
            font-weight: 800 !important;
            color: #4b5563 !important;
            letter-spacing: 0.05em !important;
            text-transform: uppercase !important;
            border-bottom: 2px solid var(--border-strong) !important;
         }

         .crm-table-row { transition: background 0.2s ease; cursor: pointer; border-bottom: 1px solid var(--border-subtle) !important; }
         .crm-table-row:hover { background: #f9fafb !important; }
         .crm-table-row td { padding: 14px 16px !important; vertical-align: middle; }
         
         .deal-identity-cell { display: flex; flex-direction: column; gap: 2px; }
         .usersPrimaryText { color: var(--text); font-size: 0.95rem; font-weight: 700; }
         .usersEmailText { font-size: 0.85rem; color: #64748b; }
         
         .crm-action-group { display: flex; gap: 8px; justify-content: flex-end; }
         .modern-action-btn { width: 34px; height: 34px; border-radius: 8px; border: 1px solid var(--border-strong); background: white; color: #64748b; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; cursor: pointer; }
         .modern-action-btn:hover { color: var(--primary); border-color: var(--primary); transform: translateY(-1px); box-shadow: var(--shadow-sm); }
         .modern-action-btn.danger:hover { color: #ef4444; border-color: #ef4444; background: #fee2e2; }

         .users-page-header { margin-bottom: 12px; }
         .users-title { font-size: 1.5rem; font-weight: 800; color: var(--text); margin-bottom: 4px; }
         .users-subtitle { font-size: 0.9rem; color: #64748b; font-weight: 500; }

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
          .stat-pill-mini { background: white; border: 1px solid var(--border-strong); padding: 12px 20px; border-radius: 14px; display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 150px; box-shadow: var(--shadow-sm); }
         .stat-pill-label { font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
         .stat-pill-value { font-size: 22px; font-weight: 900; }
         .stat-pill-value.total { color: var(--text); }
         .stat-pill-value.active { color: #10b981; }
         .stat-pill-value.pending { color: #f59e0b; }

         .crm-table-wrap { border-radius: 12px; overflow: hidden; border: 1px solid var(--border-strong) !important; }

         .crm-input { width: 100%; background: white !important; border: 1px solid #d1d5db !important; border-radius: 10px !important; padding: 10px 14px !important; color: #1f2937 !important; font-size: 0.9rem !important; transition: all 0.2s; }
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
            color: #64748b;
            cursor: pointer;
            border-radius: 8px;
            transition: all 0.2s;
          }
          .toggle-item.active {
            background: white;
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
            background: white;
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
