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

const ACCOUNTANT_ACTIONS_STYLE = `
  .modern-action-btn { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: var(--bg-surface); border: 1px solid var(--border); color: var(--text-muted); cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
  .modern-action-btn:hover { background: var(--primary-soft); color: var(--primary); border-color: var(--primary); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15); }
  .modern-action-btn.success:hover { background: #dcfce7; color: #10b981; border-color: #10b981; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15); }
  .crm-actions-overflow { position: relative; }
  .crm-actions-overflow summary { list-style: none; outline: none; }
  .crm-actions-overflow summary::-webkit-details-marker { display: none; }
  .overflow-menu-content { position: absolute; right: 0; top: calc(100% + 8px); background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 8px; z-index: 1000; min-width: 220px; display: flex; flex-direction: column; gap: 4px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); backdrop-filter: blur(20px); }
  .overflow-item { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 10px; color: var(--text); font-size: 0.82rem; font-weight: 700; border: none; background: transparent; cursor: pointer; text-align: left; width: 100%; transition: all 0.2s; white-space: nowrap; }
  .overflow-item:hover { background: var(--bg-surface); color: var(--primary); }
  .overflow-item.danger:hover { background: #fee2e2; color: #ef4444; }
`;


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
      <style>{ACCOUNTANT_ACTIONS_STYLE}</style>
      <section className="crm-fullscreen-shell">
        <div className="users-page-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 className="users-title">Invoices Management</h1>
              <p className="users-subtitle">Track and manage customer billing and payment statuses</p>
            </div>
            {canAdd && (
              <button
                className="btn-premium action-vibrant"
                onClick={() => navigate('/invoices/new')}
              >
                <Icon name="plus" size={16} />
                <span>Add Invoice</span>
              </button>
            )}
          </div>
        </div>

        <div className="crm-stats-bar-compact overflow-x-auto pb-8">
          <div className={`stat-pill-mini clickable ${status === '' ? 'is-active' : ''}`} onClick={() => { setStatus(''); setPage(1); }}>
            <span className="stat-pill-label">ALL INVOICES</span>
            <span className="stat-pill-value total">{summary.total}</span>
          </div>
          
          <div className="stat-pill-mini">
            <span className="stat-pill-label">TOTAL BILLED</span>
            <span className="stat-pill-value active">{formatCurrency(invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0))}</span>
          </div>

          <div className="stat-pill-mini">
            <span className="stat-pill-label">OUTSTANDING</span>
            <span className="stat-pill-value inactive">{formatCurrency(invoices.reduce((sum, inv) => sum + (Math.max(0, inv.total_amount - (inv.paid_amount || 0))), 0))}</span>
          </div>

          <div className="stat-pill-mini">
            <span className="stat-pill-label">PAID / COLLECTED</span>
            <span className="stat-pill-value active" style={{ color: 'var(--success)' }}>{formatCurrency(invoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0))}</span>
          </div>
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
              <option value="Draft">Draft</option>
              <option value="Sent">Sent</option>
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


            {(q || status || dateRangeType !== 'all') && (
              <button 
                className="btn-premium-mini reset-btn"
                onClick={() => {
                  setQ(''); setStatus(''); setStartDate('');
                  setEndDate(''); setDateRangeType('all'); setPage(1);
                }}
                style={{ height: '42px', width: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                title="Reset Filters"
              >
                <Icon name="refresh" size={14} />
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
                      <th style={{ width: '120px', color: 'var(--text-dimmed)' }}>INVOICE #</th>
                      <th style={{ minWidth: '180px', color: 'var(--text-dimmed)' }}>CUSTOMER</th>
                      <th style={{ minWidth: '150px', color: 'var(--text-dimmed)' }}>DEAL</th>
                      <th style={{ width: '110px', color: 'var(--text-dimmed)' }}>TOTAL</th>
                      <th style={{ width: '110px', color: 'var(--text-dimmed)' }}>PAID</th>
                      <th style={{ width: '110px', color: 'var(--text-dimmed)' }}>PENDING</th>
                      <th style={{ width: '120px', color: 'var(--text-dimmed)' }}>STATUS</th>
                      <th style={{ width: '120px', color: 'var(--text-dimmed)' }}>DATE</th>
                      <th className="text-right" style={{ width: '150px', color: 'var(--text-dimmed)' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.length ? (
                      invoices.map(inv => {
                        const remaining = Math.max(0, inv.total_amount - (inv.paid_amount || 0));
                        const isOverdue = inv.status !== 'Paid' && new Date(inv.due_date) < new Date();
                        
                        return (
                          <tr 
                            key={inv.id} 
                            className={`crm-table-row ${isOverdue ? 'overdue-row' : ''}`} 
                            onClick={() => navigate(`/invoices/${inv.id}`)}
                          >
                            <td>
                              <div className="stack">
                                <span className="font-numeric" style={{ color: 'var(--primary)', fontWeight: 800 }}>#{inv.invoice_number}</span>
                                {isOverdue && <span className="overdue-label">🔥 OVERDUE</span>}
                              </div>
                            </td>
                            <td>
                              <div className="stack">
                                <span className="font-bold" style={{ color: 'var(--text)' }}>{inv.customer_id?.name || 'Customer'}</span>
                                <span className="text-xs muted uppercase">{inv.customer_id?.company || 'Personal'}</span>
                              </div>
                            </td>
                            <td>
                              <span className="text-sm font-medium" style={{ color: 'var(--text-dimmed)' }}>{inv.deal_id?.name || '—'}</span>
                            </td>
                            <td><span className="font-numeric" style={{ color: 'var(--text)', fontWeight: 700 }}>{formatCurrency(inv.total_amount)}</span></td>
                            <td><span className="font-numeric" style={{ color: 'var(--success)', fontWeight: 700 }}>{formatCurrency(inv.paid_amount || 0)}</span></td>
                            <td>
                              <div className="stack">
                                <span className="font-numeric" style={{ color: remaining > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 800 }}>
                                  {formatCurrency(remaining)}
                                </span>
                                {remaining > 0 && inv.status !== 'Paid' && <span className="due-badge">DUE</span>}
                              </div>
                            </td>
                            <td onClick={stopRowNavigation}>
                              <StatusDropdown 
                                status={inv.status} 
                                options={[
                                  { name: 'Draft', color: '#64748b' },
                                  { name: 'Sent', color: '#3b82f6' },
                                  { name: 'Partially Paid', color: '#f59e0b' },
                                  { name: 'Paid', color: '#10b981' },
                                  { name: 'Overdue', color: '#7f1d1d' },
                                  { name: 'Cancelled', color: '#94a3b8' }
                                ]} 
                                onChange={(newStatus) => onUpdateStatus(inv.id, newStatus)}
                                disabled={!canEdit}
                              />
                            </td>
                            <td><span className="text-xs muted font-numeric">{new Date(inv.invoice_date).toLocaleDateString()}</span></td>
                            <td className="text-right" onClick={stopRowNavigation}>
                              <div className="crm-action-group" style={{ justifyContent: 'flex-end', gap: '8px' }}>
                                {/* 🧾 Invoice */}
                                <button 
                                  className="modern-action-btn" 
                                  title="View Invoice" 
                                  onClick={() => navigate(`/invoices/${inv.id}`)}
                                >
                                  <Icon name="billing" size={14} />
                                </button>

                                {/* 💳 Payment */}
                                {inv.status !== 'Paid' && (user?.role === 'Admin' || user?.role === 'Accountant') && (
                                  <button 
                                    className="modern-action-btn success" 
                                    title="Record Payment" 
                                    onClick={() => navigate(`/payments/new?customer_id=${inv.customer_id?.id || inv.customer_id?._id || inv.customer_id}&invoice_id=${inv.id || inv._id}`)}
                                  >
                                    <Icon name="wallet" size={14} />
                                  </button>
                                )}

                                {/* 📄 Receipt */}
                                {(inv.paid_amount || 0) > 0 && (
                                  <button 
                                    className="modern-action-btn success" 
                                    title="View Receipt" 
                                    onClick={() => navigate(`/payments?invoice_id=${inv.id}`)}
                                  >
                                    <Icon name="reports" size={14} />
                                  </button>
                                )}
                                
                                <details className="crm-actions-overflow">
                                  <summary className="modern-action-btn" title="More">
                                    <Icon name="more-vertical" size={14} />
                                  </summary>
                                  <div className="overflow-menu-content shadow-soft">
                                    <button className="overflow-item" onClick={() => navigate(`/payments?invoice_id=${inv.id}`)}>
                                      <Icon name="activity" size={14} />
                                      <span>Payment History</span>
                                    </button>
                                    <button className="overflow-item" onClick={() => navigate(`/invoices/${inv.id}`)}>
                                      <Icon name="edit" size={14} />
                                      <span>Finance Notes</span>
                                    </button>
                                    <button className="overflow-item" onClick={() => navigate(`/invoices/${inv.id}`)}>
                                      <Icon name="download" size={14} />
                                      <span>Download PDF</span>
                                    </button>
                                    {canDelete && (
                                      <button className="overflow-item danger" onClick={() => handleDelete(inv.id)}>
                                        <Icon name="trash" size={14} />
                                        <span>Delete</span>
                                      </button>
                                    )}
                                  </div>
                                </details>
                              </div>
                            </td>
                          </tr>
                        );
                      })
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
         .stat-pill-mini { --stat-accent: var(--card-accent); background: color-mix(in srgb, var(--bg-card) 88%, var(--bg-surface) 12%); border: 1px solid var(--border-strong); padding: 14px 18px; border-radius: 16px; display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 130px; box-shadow: inset 4px 0 0 var(--stat-accent), 0 10px 24px rgba(var(--text-rgb), 0.06); transition: all 0.25s ease; }
         .crm-stats-bar-compact .stat-pill-mini:nth-child(1) { --stat-accent: #3b82f6; }
         .crm-stats-bar-compact .stat-pill-mini:nth-child(2) { --stat-accent: #10b981; }
         .crm-stats-bar-compact .stat-pill-mini:nth-child(3) { --stat-accent: #ef4444; }
         .crm-stats-bar-compact .stat-pill-mini:nth-child(4) { --stat-accent: #8b5cf6; }
         .stat-pill-mini.clickable { cursor: pointer; }
         .stat-pill-mini:hover { transform: translateY(-2px); border-color: var(--stat-accent); box-shadow: inset 4px 0 0 var(--stat-accent), 0 14px 30px color-mix(in srgb, var(--stat-accent) 20%, rgba(var(--text-rgb), 0.08)); }
         .stat-pill-mini.is-active { background: color-mix(in srgb, var(--bg-card) 82%, var(--stat-accent) 18%); border-color: var(--stat-accent); }
         .stat-pill-label { font-size: 11px; font-weight: 800; color: var(--text-dimmed); text-transform: uppercase; letter-spacing: 0.08em; }
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

         .overdue-row { background: rgba(239, 68, 68, 0.03) !important; }
         .overdue-row:hover { background: rgba(239, 68, 68, 0.06) !important; }
         
         .overdue-label { 
           font-size: 0.6rem; 
           font-weight: 900; 
           color: #ef4444; 
           background: rgba(239, 68, 68, 0.1); 
           padding: 1px 6px; 
           border-radius: 4px; 
           width: fit-content;
           margin-top: 2px;
         }

         .due-badge {
           font-size: 0.6rem;
           font-weight: 900;
           color: #f59e0b;
           background: rgba(245, 158, 11, 0.1);
           padding: 1px 6px;
           border-radius: 4px;
           width: fit-content;
           margin-top: 2px;
         }

         .glass-btn {
           background: var(--bg-surface) !important;
           border: 1px solid var(--border-strong) !important;
           color: var(--text-dimmed) !important;
           border-radius: 8px !important;
           width: 32px !important;
           height: 32px !important;
           display: flex !important;
           align-items: center !important;
           justify-content: center !important;
           transition: all 0.2s !important;
         }
         .glass-btn:hover {
           border-color: var(--primary) !important;
           color: var(--primary) !important;
           transform: translateY(-2px);
           box-shadow: var(--shadow-sm);
         }

         .danger-btn {
           background: rgba(239, 68, 68, 0.1) !important;
           border: 1px solid rgba(239, 68, 68, 0.2) !important;
           color: #ef4444 !important;
           border-radius: 8px !important;
           width: 32px !important;
           height: 32px !important;
           display: flex !important;
           align-items: center !important;
           justify-content: center !important;
           transition: all 0.2s !important;
         }
         .danger-btn:hover {
           background: #ef4444 !important;
           color: white !important;
           transform: translateY(-2px);
           box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
         }
         
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
