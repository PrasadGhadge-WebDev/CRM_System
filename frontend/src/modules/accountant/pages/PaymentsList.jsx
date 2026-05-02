import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '../../../layouts/icons'
import { paymentsApi } from '../../../services/payments'
import { formatCurrency } from '../../../utils/formatters'
import { toast } from 'react-toastify'
import { useAuth } from '../../../context/AuthContext'
import PageHeader from '../../../components/PageHeader.jsx'
import ModernSearchBar from '../../../components/ModernSearchBar.jsx'

export default function PaymentsList() {
  const { user } = useAuth()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [method, setMethod] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20
  const [summary, setSummary] = useState({ total: 0, byMethod: {}, totalAmount: 0 })
  const navigate = useNavigate()

  const canAdd = ['Admin', 'Accountant'].includes(user?.role)
  const canDelete = user?.role === 'Admin'

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true)
      const res = await paymentsApi.list({ q, payment_method: method, startDate, endDate, page, limit })
      setPayments(res.items || [])
      setTotal(res.total || 0)
      setSummary(res.summary || { total: 0, byMethod: {}, totalAmount: 0 })
    } catch (err) {
      toast.error('Failed to load payments')
    } finally {
      setLoading(false)
    }
  }, [q, method, startDate, endDate, page])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this payment record? This will update the invoice balance.')) return
    try {
      await paymentsApi.remove(id)
      toast.success('Payment deleted')
      fetchPayments()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed')
    }
  }

  return (
    <div className="stack">
      <section className="crm-fullscreen-shell">
        <div className="users-page-header">
          <h1 className="users-title">Payments Management</h1>
          <p className="users-subtitle">Review collection history and financial transaction records</p>
        </div>

        <div className="crm-stats-bar-compact overflow-x-auto pb-8">
          <div className="stat-pill-mini clickable" onClick={() => { setMethod(''); setPage(1); }} style={{ borderBottom: method === '' ? '2px solid var(--primary)' : '' }}>
            <span className="stat-pill-label">ALL PAYMENTS</span>
            <span className="stat-pill-value total">{summary.total}</span>
          </div>
          <div className="stat-pill-mini">
            <span className="stat-pill-label">TOTAL COLLECTED</span>
            <span className="stat-pill-value active">{formatCurrency(summary.totalAmount)}</span>
          </div>
          {Object.entries(summary.byMethod).map(([name, count]) => (
            <div 
              key={name} 
              className="stat-pill-mini clickable" 
              onClick={() => { setMethod(name); setPage(1); }}
              style={{ borderBottom: method === name ? '2px solid var(--primary)' : '' }}
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
              placeholder="Search by payment number, status, reference number, method, notes..."
            />

            <select className="crm-input filter-select" value={method} onChange={e => { setMethod(e.target.value); setPage(1); }}>
              <option value="">All Methods</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
              <option value="Online">Online Gateway</option>
            </select>

            <button
              className="btn-premium-mini add-user-btn"
              onClick={() => navigate('/payments/new')}
            >
              <Icon name="plus" size={16} />
              <span>Add Payment</span>
            </button>

            {(q || method || startDate || endDate) && (
              <button 
                className="btn-clear-filters"
                onClick={() => {
                  setQ('')
                  setMethod('')
                  setStartDate('')
                  setEndDate('')
                  setPage(1)
                }}
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="leadsLoadingState" style={{ background: 'var(--bg-surface)', border: '1px dashed var(--border)', borderRadius: '32px', minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
            <div className="spinner-medium" />
            <span className="muted">Loading payment history...</span>
          </div>
        ) : (
          <>
            <div className="crm-table-wrap shadow-soft" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="crm-table-scroll">
                <table className="crm-table">
                  <thead style={{ background: 'var(--bg-surface)' }}>
                    <tr>
                      <th style={{ width: '150px', color: 'var(--text-dimmed)' }}>PAYMENT #</th>
                      <th style={{ width: '140px', color: 'var(--text-dimmed)' }}>DATE</th>
                      <th style={{ minWidth: '200px', color: 'var(--text-dimmed)' }}>CUSTOMER NAME</th>
                      <th style={{ width: '160px', color: 'var(--text-dimmed)' }}>BILL NUMBER</th>
                      <th style={{ width: '140px', color: 'var(--text-dimmed)' }}>METHOD</th>
                      <th style={{ width: '130px', color: 'var(--text-dimmed)' }}>STATUS</th>
                      <th style={{ width: '140px', color: 'var(--text-dimmed)' }}>AMOUNT</th>
                      {canDelete && <th className="text-right" style={{ width: '100px', color: 'var(--text-dimmed)' }}>ACTION</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.length ? (
                      payments.map(pay => (
                        <tr key={pay.id} className="crm-table-row clickable" onClick={() => navigate(`/payments/${pay.id}`)}>
                          <td><span className="font-numeric" style={{ color: 'var(--primary)', fontWeight: 800 }}>#{pay.payment_number}</span></td>
                          <td><span className="text-sm" style={{ color: 'var(--text-muted)' }}>{new Date(pay.payment_date).toLocaleDateString()}</span></td>
                          <td><span className="font-bold" style={{ color: 'var(--text)' }}>{pay.customer_id?.name || 'Customer'}</span></td>
                          <td>
                            <div className="stack gap-2">
                              {pay.invoice_id?.invoice_number ? (
                                <Link to={`/invoices/${pay.invoice_id.id}`} className="text-sm font-bold" style={{ color: 'var(--primary)' }}>
                                  #{pay.invoice_id.invoice_number}
                                </Link>
                              ) : <span className="muted text-xs">UNLINKED BILL</span>}
                              {pay.deal_id && (
                                <span className="text-xs muted" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Icon name="activity" size={10} />
                                  {pay.deal_id.name || 'Deal Record'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td><span className="crm-status-pill info">{pay.payment_method}</span></td>
                          <td>
                            <span className={`crm-status-pill ${
                              pay.status === 'Completed' || pay.status === 'Verified' ? 'success' : 
                              pay.status === 'Failed' ? 'danger' : 
                              pay.status === 'Refunded' ? 'warning' : 'info'
                            }`}>
                              {pay.status || 'Pending'}
                            </span>
                          </td>
                          <td><span className="font-numeric" style={{ fontWeight: 800, color: 'var(--success)' }}>{formatCurrency(pay.amount)}</span></td>
                          {canDelete && (
                            <td className="text-right" onClick={e => e.stopPropagation()}>
                              <div className="crm-action-group">
                                <button className="crm-action-btn danger" onClick={() => handleDelete(pay.id)}><Icon name="trash" size={14} /></button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7">
                          <div className="emptyState" style={{ padding: '60px 0', textAlign: 'center' }}>
                            <h3 style={{ color: 'var(--text)' }}>No Payments Found</h3>
                            <p className="muted">Add a new payment record to start tracking.</p>
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
                <span className="text-sm muted" style={{ display: 'flex', alignItems: 'center' }}>Page {page}</span>
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
