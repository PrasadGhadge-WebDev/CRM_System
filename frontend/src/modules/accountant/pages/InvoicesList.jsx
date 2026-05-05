import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '../../../layouts/icons'
import { invoicesApi } from '../../../services/invoices'
import { formatCurrency } from '../../../utils/formatters'
import { toast } from 'react-toastify'
import { useAuth } from '../../../context/AuthContext'
import PageHeader from '../../../components/PageHeader.jsx'
import ModernSearchBar from '../../../components/ModernSearchBar.jsx'
import StatusDropdown from '../../crm/components/StatusDropdown.jsx'

function stopRowNavigation(event) {
  event.stopPropagation()
}

export default function InvoicesList() {
  const { user } = useAuth()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [dateRangeType, setDateRangeType] = useState('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [summary, setSummary] = useState({ total: 0, byStatus: {} })
  const limit = 20
  const navigate = useNavigate()

  const canAdd = ['Admin', 'Accountant'].includes(user?.role)
  const canEdit = ['Admin', 'Accountant'].includes(user?.role)
  const canDelete = user?.role === 'Admin'

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true)
      
      let sDate = startDate
      let eDate = endDate
      const now = new Date()
      now.setHours(0,0,0,0)

      if (dateRangeType === 'today') {
        sDate = now.toISOString()
        eDate = new Date(new Date().setHours(23,59,59,999)).toISOString()
      } else if (dateRangeType === 'yesterday') {
        const y = new Date(now)
        y.setDate(y.getDate() - 1)
        sDate = y.toISOString()
        const yEnd = new Date(y)
        yEnd.setHours(23,59,59,999)
        eDate = yEnd.toISOString()
      } else if (dateRangeType === 'week') {
        const w = new Date(now)
        w.setDate(w.getDate() - 7)
        sDate = w.toISOString()
      } else if (dateRangeType === 'month') {
        const m = new Date(now)
        m.setMonth(m.getMonth() - 1)
        sDate = m.toISOString()
      }

      const res = await invoicesApi.list({ q, status, page, limit, startDate: sDate, endDate: eDate })
      setInvoices(res.items || [])
      setTotal(res.total || 0)
      setSummary(res.summary || { total: 0, byStatus: {} })
    } catch (err) {
      toast.error('Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }, [q, status, page, dateRangeType, startDate, endDate])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) return
    try {
      await invoicesApi.remove(id)
      toast.success('Invoice deleted')
      fetchInvoices()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed')
    }
  }

  async function onUpdateStatus(id, newStatus) {
    try {
      await invoicesApi.update(id, { status: newStatus })
      toast.success(`Status updated to ${newStatus}`)
      setInvoices(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item))
    } catch (err) {
      toast.error(err.message || 'Update failed')
    }
  }

  return (
    <div className="stack">
      <section className="crm-fullscreen-shell">
        <div className="users-page-header">
          <h1 className="users-title">Invoices Management</h1>
          <p className="users-subtitle">Track and manage customer billing and payment statuses</p>
        </div>

        <div className="crm-stats-bar-compact overflow-x-auto pb-8">
          <div className="stat-pill-mini clickable" onClick={() => { setStatus(''); setPage(1); }} style={{ borderBottom: status === '' ? '2px solid var(--primary)' : '' }}>
            <span className="stat-pill-label">ALL INVOICES</span>
            <span className="stat-pill-value total">{summary.total}</span>
          </div>
          {Object.entries(summary.byStatus).map(([name, count]) => (
            <div 
              key={name} 
              className="stat-pill-mini clickable" 
              onClick={() => { setStatus(name); setPage(1); }}
              style={{ borderBottom: status === name ? '2px solid var(--primary)' : '' }}
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
              onChange={e => { setQ(e.target.value); setPage(1); }}
              placeholder="Search by invoice number, status, notes, address, terms..."
            />

            <select className="crm-input filter-select" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All Invoices</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Partially Paid">Partial</option>
              <option value="Paid">Paid</option>
              <option value="Overdue">Overdue</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <select 
              className="crm-input filter-select date-preset-select" 
              value={dateRangeType} 
              onChange={(e) => { setDateRangeType(e.target.value); setPage(1); }}
            >
              <option value="all">Date: All</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>

            {dateRangeType === 'custom' && (
              <div className="flex items-center gap-4 animate-fade-in">
                <input
                  type="date"
                  className="crm-input date-mini"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                />
                <span className="muted" style={{ fontSize: '0.7rem' }}>to</span>
                <input
                  type="date"
                  className="crm-input date-mini"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                />
              </div>
            )}

            <button
              className="btn-premium-mini add-user-btn"
              onClick={() => navigate('/invoices/new')}
            >
              <Icon name="plus" size={16} />
              <span>Add Invoice</span>
            </button>

            {(q || status || dateRangeType !== 'all') && (
              <button 
                className="btn-premium-mini reset-btn"
                onClick={() => {
                  setQ('')
                  setStatus('')
                  setStartDate('')
                  setEndDate('')
                  setDateRangeType('all')
                  setPage(1)
                }}
              >
                <Icon name="refresh" size={14} className="reset-icon" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="leadsLoadingState" style={{ background: 'var(--bg-surface)', border: '1px dashed var(--border)', borderRadius: '32px', minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
            <div className="spinner-medium" />
            <span className="muted">Loading invoices...</span>
          </div>
        ) : (
          <>
            <div className="crm-table-wrap shadow-soft" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="crm-table-scroll">
                <table className="crm-table">
                  <thead style={{ background: 'var(--bg-surface)' }}>
                    <tr>
                      <th style={{ width: '140px', color: 'var(--text-dimmed)' }}>INVOICE #</th>
                      <th style={{ width: '140px', color: 'var(--text-dimmed)' }}>DATE</th>
                      <th style={{ minWidth: '220px', color: 'var(--text-dimmed)' }}>CUSTOMER NAME</th>
                      <th style={{ width: '160px', color: 'var(--text-dimmed)' }}>TOTAL AMOUNT</th>
                      <th style={{ width: '130px', color: 'var(--text-dimmed)' }}>STATUS</th>
                      {(canEdit || canDelete) && <th className="text-right" style={{ width: '120px', color: 'var(--text-dimmed)' }}>ACTION</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.length ? (
                      invoices.map(inv => (
                        <tr key={inv.id} className="crm-table-row" onClick={() => navigate(`/invoices/${inv.id}`)}>
                          <td><span className="font-numeric" style={{ color: 'var(--primary)', fontWeight: 800 }}>#{inv.invoice_number}</span></td>
                          <td><span className="text-sm" style={{ color: 'var(--text-muted)' }}>{new Date(inv.invoice_date).toLocaleDateString()}</span></td>
                          <td>
                            <div className="stack gap-2">
                              <span className="font-bold" style={{ color: 'var(--text)' }}>{inv.customer_id?.name || 'Customer'}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="text-xs muted uppercase">{inv.customer_id?.company || 'Personal'}</span>
                                {inv.deal_id && (
                                  <span className="text-xs" style={{ color: 'var(--primary)', fontWeight: 700 }}>
                                    • {inv.deal_id.name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td><span className="font-numeric" style={{ color: 'var(--primary)', fontWeight: 800 }}>{formatCurrency(inv.total_amount)}</span></td>
                          <td onClick={stopRowNavigation}>
                            <StatusDropdown 
                              status={inv.status} 
                              options={[
                                { name: 'Unpaid', color: '#f59e0b' },
                                { name: 'Partially Paid', color: '#3b82f6' },
                                { name: 'Paid', color: '#10b981' },
                                { name: 'Overdue', color: '#ef4444' },
                                { name: 'Cancelled', color: '#64748b' }
                              ]} 
                              onChange={(newStatus) => onUpdateStatus(inv.id, newStatus)}
                              disabled={!canEdit}
                            />
                          </td>
                          {(canEdit || canDelete) && (
                            <td className="text-right" onClick={e => e.stopPropagation()}>
                              <div className="crm-action-group">
                                {canEdit && <button className="crm-action-btn" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }} onClick={() => navigate(`/invoices/${inv.id}`)}><Icon name="edit" size={14} /></button>}
                                {canDelete && <button className="crm-action-btn danger" onClick={() => handleDelete(inv.id)}><Icon name="trash" size={14} /></button>}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6">
                          <div className="emptyState" style={{ padding: '60px 0', textAlign: 'center' }}>
                            <h3 style={{ color: 'var(--text)' }}>No Invoices Found</h3>
                            <p className="muted">Create a new invoice to start tracking.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {total > limit && (
              <div className="pagination-container" style={{ marginTop: '24px', display: 'flex', justifyContent: 'center', gap: '12px' }}>
                <button className="btn-premium action-secondary" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)' }} disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
                <span className="text-sm muted" style={{ display: 'flex', alignItems: 'center' }}>Page {page} of {Math.ceil(total / limit)}</span>
                <button className="btn-premium action-secondary" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)' }} disabled={page * limit >= total} onClick={() => setPage(p => p + 1)}>Next</button>
              </div>
            )}
          </>
        )}
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
