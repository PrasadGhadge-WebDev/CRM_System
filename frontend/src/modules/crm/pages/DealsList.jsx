import { useEffect, useCallback, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
import DealModal from '../components/DealModal.jsx'

const STAGE_OPTIONS = [
  { name: 'New', color: '#3b82f6' },
  { name: 'Qualified', color: '#a855f7' },
  { name: 'Proposal', color: '#0ea5e9' },
  { name: 'Won', color: '#22c55e' },
  { name: 'Lost', color: '#ef4444' }
]

function stopRowNavigation(event) {
  event.stopPropagation()
}

export default function DealsList() {
  const { user } = useAuth()
  const isManagement = user?.role === 'Admin' || user?.role === 'Manager'
  const isAccountant = user?.role === 'Accountant'
  const isEmployee = user?.role === 'Employee'
  const canCreate = isManagement || isEmployee
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [viewMode, setViewMode] = useState(searchParams.get('view') || 'list')

  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [employees, setEmployees] = useState([])
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDeal, setSelectedDeal] = useState(null)

  useToastFeedback({ error })

  const [filters, setFilters] = useState({
    q: searchParams.get('q') || '',
    stage: searchParams.get('stage') || '',
    assigned_to: searchParams.get('assigned_to') || '',
    page: Math.max(1, Number(searchParams.get('page')) || 1),
    limit: 100,
  })

  const debouncedQ = useDebouncedValue(filters.q, 300)

  useEffect(() => {
    const next = new URLSearchParams()
    if (debouncedQ.trim()) next.set('q', debouncedQ.trim())
    if (filters.stage) next.set('stage', filters.stage)
    if (filters.assigned_to) next.set('assigned_to', filters.assigned_to)
    if (filters.page > 1) next.set('page', String(filters.page))
    if (viewMode !== 'list') next.set('view', viewMode)
    setSearchParams(next, { replace: true })
  }, [debouncedQ, filters, setSearchParams, viewMode])

  const loadDeals = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await dealsApi.list({
        ...filters,
        q: debouncedQ,
        limit: viewMode === 'board' ? 'all' : filters.limit
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
  }, [debouncedQ, filters, viewMode])

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
    setFilters({ q: '', stage: '', assigned_to: '', page: 1, limit: 100 })
  }

  async function onUpdateStage(id, newStage) {
    try {
      await dealsApi.update(id, { stage: newStage })
      toast.success(`Stage: ${newStage}`)
      loadDeals()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed')
    }
  }

  const handleOpenCreateModal = () => {
    setSelectedDeal(null)
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (deal) => {
    setSelectedDeal(deal)
    setIsModalOpen(true)
  }

  return (
    <div className="stack">
      <section className="crm-fullscreen-shell">
        <PageHeader
          title={isAccountant ? 'Money Oversight' : isEmployee ? 'My Sales' : 'Sales Pipeline'}
          description={isAccountant ? 'Track won deals and payments.' : 'Manage sales deals from start to finish.'}
          backTo="/"
          actions={
            <div className="crm-flex-end crm-gap-12">
              <div className="crm-view-switcher">
                <button className={`crm-view-btn ${viewMode === 'board' ? 'active' : ''}`} onClick={() => setViewMode('board')}>
                  <Icon name="deals" size={18} />
                  <span>Kanban</span>
                </button>
                <button className={`crm-view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>
                  <Icon name="list" size={18} />
                  <span>Registry</span>
                </button>
              </div>
              {canCreate && (
                <button className="btn-premium action-vibrant" onClick={handleOpenCreateModal}>
                  <Icon name="plus" />
                  <span>Create Deal</span>
                </button>
              )}
            </div>
          }
        />

        <div className="crm-filter-panel" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <div className="crm-filter-cell">
            <label className="crm-filter-label">Search Deals</label>
            <div className="crm-search-input-wrap">
              <Icon name="search" className="search-icon" />
              <input
                type="text"
                placeholder="Name, Client, Owner..."
                value={filters.q}
                onChange={(e) => handleFilterChange({ q: e.target.value })}
              />
            </div>
          </div>

          <div className="crm-filter-cell">
            <label className="crm-filter-label">Deal Stage</label>
            <select className="crm-input" value={filters.stage} onChange={(e) => handleFilterChange({ stage: e.target.value })}>
              <option value="">All Stages</option>
              {STAGE_OPTIONS.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
          </div>

          <div className="crm-filter-cell">
            <label className="crm-filter-label">Staff Member</label>
            <select className="crm-input" value={filters.assigned_to} onChange={(e) => handleFilterChange({ assigned_to: e.target.value })}>
              <option value="">All Staff</option>
              {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
            </select>
          </div>

          <div className="crm-filter-cell">
            <label className="crm-filter-label" style={{ visibility: 'hidden' }}>Reset</label>
            <button className="crm-action-btn" onClick={handleReset} style={{ width: 'auto', padding: '0 16px', height: '48px', gap: '8px' }}>
              <Icon name="trash" size={14} />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {viewMode === 'board' ? (
          <DealsKanban deals={items} loading={loading} onStatusChange={onUpdateStage} />
        ) : (
          <div className="crm-table-wrap shadow-soft">
            <div className="crm-table-scroll">
              <table className="crm-table">
                <thead>
                  <tr>
                    <th className="text-left">DEAL NAME</th>
                    <th className="text-left">CUSTOMER</th>
                    <th className="text-center">AMOUNT</th>
                    <th className="text-center">STAGE</th>
                    <th className="text-left">OWNER</th>
                    <th className="text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="crm-table-row" onClick={() => navigate(`/deals/${item.id}`)}>
                      <td className="text-left font-bold" style={{ color: 'white' }}>{item.name}</td>
                      <td className="text-left">{item.customer_id?.name || '—'}</td>
                      <td className="text-center" style={{ fontWeight: 800, color: 'white' }}>₹{item.value?.toLocaleString()}</td>
                      <td className="text-center" onClick={stopRowNavigation}>
                        {isAccountant ? (
                          <span className={`crm-status-pill ${item.stage === 'Won' ? 'success' : item.stage === 'Lost' ? 'danger' : 'info'}`}>{item.stage}</span>
                        ) : (
                          <select 
                            className="crm-input" 
                            style={{ minWidth: '130px', padding: '6px 12px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }} 
                            value={item.stage} 
                            onChange={(e) => onUpdateStage(item.id, e.target.value)}
                          >
                            {STAGE_OPTIONS.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                          </select>
                        )}
                      </td>
                      <td className="text-left">
                        <div className="crm-user-mention">
                          <div className="crm-user-dot" />
                          <span>{item.assigned_to?.name || 'Unassigned'}</span>
                        </div>
                      </td>
                      <td className="text-right" onClick={stopRowNavigation}>
                        <div className="crm-action-group">
                          <button className="crm-action-btn" onClick={() => handleOpenEditModal(item)} title="Edit Deal"><Icon name="edit" /></button>
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
      </section>

      <DealModal 
        isOpen={isModalOpen}
        deal={selectedDeal}
        onClose={() => setIsModalOpen(false)}
        onSave={() => loadDeals()}
      />

      <style>{`
        .crm-view-switcher { display: flex; background: rgba(0,0,0,0.2); padding: 4px; border-radius: 12px; border: 1px solid var(--border); }
        .crm-view-btn { display: flex; align-items: center; gap: 8px; padding: 6px 12px; border: none; background: none; color: var(--text-dimmed); font-size: 0.8rem; font-weight: 800; cursor: pointer; border-radius: 8px; transition: all 0.2s; }
        .crm-view-btn.active { background: var(--primary); color: white; }
      `}</style>
    </div>
  )
}
