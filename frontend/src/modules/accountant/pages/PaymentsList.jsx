import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '../../../layouts/icons'
import { paymentsApi } from '../../../services/payments'
import { invoicesApi } from '../../../services/invoices'
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
  const [statusFilter, setStatusFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [dateRangeType, setDateRangeType] = useState('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20
  const [summary, setSummary] = useState({ total: 0, byMethod: {}, byStatus: {}, totalAmount: 0, bankTransferVolume: 0 })
  const navigate = useNavigate()

  const isAdmin = user?.role === 'Admin'
  const isAccountant = user?.role === 'Accountant'
  const isManager = user?.role === 'Manager'
  const isHR = user?.role === 'HR'
  const isEmployee = user?.role === 'Employee'

  const canAdd = ['Admin', 'Accountant'].includes(user?.role)
  const canDelete = isAdmin
  const canApprove = isAdmin || isManager
  const canUpdateStatus = isAdmin || isAccountant

  const fetchPayments = useCallback(async () => {
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

      const res = await paymentsApi.list({ 
        q, 
        payment_method: method, 
        status: statusFilter,
        startDate: sDate, 
        endDate: eDate, 
        page, 
        limit 
      })
      setPayments(res.items || [])
      setTotal(res.total || 0)
      setSummary(res.summary || { total: 0, byMethod: {}, byStatus: {}, totalAmount: 0, bankTransferVolume: 0 })
    } catch (err) {
      toast.error('Failed to load payments')
    } finally {
      setLoading(false)
    }
  }, [q, method, statusFilter, startDate, endDate, dateRangeType, page])

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

  const handleStatusChange = async (id, newStatus) => {
    try {
      await paymentsApi.update(id, { status: newStatus })
      toast.success(`Status updated to ${newStatus}`)
      fetchPayments()
    } catch (err) {
      toast.error('Failed to update status')
    }
  }

  const handleApprove = async (id) => {
    try {
      await paymentsApi.approve(id)
      toast.success('Payment approved and completed')
      fetchPayments()
    } catch (err) {
      toast.error('Approval failed')
    }
  }

  const handleLinkBill = async (payment) => {
    const invoiceNumber = window.prompt('Enter Invoice Number to link (e.g., INV-101):')
    if (!invoiceNumber) return
    
    try {
      const res = await invoicesApi.list({ q: invoiceNumber })
      const invoice = res.items?.find(i => i.invoice_number === invoiceNumber)
      
      if (!invoice) {
        toast.error('Invoice not found')
        return
      }

      await paymentsApi.update(payment.id, { invoice_id: invoice.id })
      toast.success('Bill linked successfully')
      fetchPayments()
    } catch (err) {
      toast.error('Failed to link bill')
    }
  }

  const exportToExcel = () => {
    const headers = ['Payment #', 'Date', 'Customer', 'Bill #', 'Method', 'Status', 'Amount', 'Transaction ID']
    const rows = payments.map(p => [
      p.payment_number,
      new Date(p.payment_date).toLocaleDateString(),
      p.customer_id?.name || 'N/A',
      p.invoice_id?.invoice_number || 'UNLINKED',
      p.payment_method,
      p.status,
      p.amount,
      p.transaction_id || ''
    ])

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.map(val => `"${val}"`).join(",")).join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `payments_export_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="stack">
      <section className="crm-fullscreen-shell">
        <div className="users-page-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 className="users-title">Payments Module</h1>
              <p className="users-subtitle">
                {isAdmin ? 'Full system oversight' : 
                 isAccountant ? 'Execution & reconciliation' : 
                 isManager ? 'Team/operational oversight' : 
                 isHR ? 'Employee-related payments' : 'Personal payment tracking'}
              </p>
            </div>
            <div className="header-actions" style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-premium action-secondary" onClick={exportToExcel}>
                <Icon name="download" size={16} />
                <span>Export to Excel</span>
              </button>
              {canAdd && (
                <button className="btn-premium-mini add-user-btn" onClick={() => navigate('/payments/new')}>
                  <Icon name="plus" size={16} />
                  <span>Add Payment</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="crm-stats-bar-compact overflow-x-auto pb-8">
          <div className="stat-pill-mini clickable" onClick={() => { setMethod(''); setStatusFilter(''); setPage(1); }} style={{ borderBottom: (method === '' && statusFilter === '') ? '2px solid var(--primary)' : '' }}>
            <span className="stat-pill-label">ALL PAYMENTS</span>
            <span className="stat-pill-value total">{summary.total}</span>
          </div>
          
          {(isAdmin || isManager) && (
            <div className="stat-pill-mini">
              <span className="stat-pill-label">BANK TRANSFER VOL.</span>
              <span className="stat-pill-value info">{formatCurrency(summary.bankTransferVolume)}</span>
            </div>
          )}

          <div className="stat-pill-mini">
            <span className="stat-pill-label">TOTAL COLLECTED</span>
            <span className="stat-pill-value active">{formatCurrency(summary.totalAmount)}</span>
          </div>

          <div className="stat-pill-mini clickable" onClick={() => { setStatusFilter('Pending'); setPage(1); }} style={{ borderBottom: statusFilter === 'Pending' ? '2px solid var(--warning)' : '' }}>
            <span className="stat-pill-label">PENDING</span>
            <span className="stat-pill-value pending">{summary.byStatus?.['Pending'] || 0}</span>
          </div>
        </div>

        <div className="unified-action-bar">
          <div className="search-filter-group">
            <ModernSearchBar
              value={q}
              onChange={e => { setQ(e.target.value); setPage(1); }}
              placeholder={isHR ? "Search by employee reference..." : "Search by payment #, customer, reference..."}
            />

            <select className="crm-input filter-select" value={method} onChange={e => { setMethod(e.target.value); setPage(1); }}>
              <option value="">All Methods</option>
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="UPI">UPI</option>
              <option value="Card">Card</option>
              <option value="Cheque">Cheque</option>
            </select>

            <select className="crm-input filter-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
              <option value="Failed">Failed</option>
              <option value="Refunded">Refunded</option>
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

            {(q || method || statusFilter || dateRangeType !== 'all') && (
              <button 
                className="btn-premium-mini reset-btn"
                onClick={() => {
                  setQ('')
                  setMethod('')
                  setStatusFilter('')
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
            <span className="muted">Loading payment records...</span>
          </div>
        ) : (
          <>
            <div className="crm-table-wrap shadow-soft" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="crm-table-scroll">
                <table className="crm-table">
                  <thead style={{ background: 'var(--bg-surface)' }}>
                    <tr>
                      <th style={{ width: '150px' }}>PAYMENT #</th>
                      <th style={{ width: '120px' }}>DATE</th>
                      {!isEmployee && <th style={{ minWidth: '180px' }}>CUSTOMER</th>}
                      <th style={{ width: '150px' }}>BILL / LINKAGE</th>
                      <th style={{ width: '130px' }}>METHOD</th>
                      <th style={{ width: '160px' }}>STATUS</th>
                      <th style={{ width: '130px' }}>AMOUNT</th>
                      <th className="text-right" style={{ width: '140px' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.length ? (
                      payments.map(pay => (
                        <tr key={pay.id} className="crm-table-row">
                          <td onClick={() => navigate(`/payments/${pay.id}`)} className="clickable">
                            <span className="font-numeric" style={{ color: 'var(--primary)', fontWeight: 800 }}>#{pay.payment_number}</span>
                          </td>
                          <td><span className="text-sm muted">{new Date(pay.payment_date).toLocaleDateString()}</span></td>
                          {!isEmployee && (
                            <td>
                              <div className="stack gap-1">
                                <span className="font-bold">{pay.customer_id?.name || 'Customer'}</span>
                                {pay.transaction_id && <span className="text-xs muted">Ref: {pay.transaction_id}</span>}
                              </div>
                            </td>
                          )}
                          <td>
                            {pay.invoice_id?.invoice_number ? (
                              <Link to={`/invoices/${pay.invoice_id.id}`} className="text-sm font-bold" style={{ color: 'var(--primary)' }}>
                                #{pay.invoice_id.invoice_number}
                              </Link>
                            ) : (
                              <div className="stack gap-1">
                                <span className="muted text-xs font-bold" style={{ color: 'var(--danger)' }}>UNLINKED BILL</span>
                                {(isAccountant || isAdmin) && (
                                  <button 
                                    className="text-xs font-bold" 
                                    style={{ color: 'var(--primary)', background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', textDecoration: 'underline' }}
                                    onClick={(e) => { e.stopPropagation(); handleLinkBill(pay); }}
                                  >
                                    Link Bill
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                          <td><span className="crm-status-pill info">{pay.payment_method}</span></td>
                          <td>
                            {canUpdateStatus ? (
                              <select 
                                className={`status-dropdown-mini ${pay.status?.toLowerCase()}`}
                                value={pay.status || 'Pending'}
                                onChange={(e) => handleStatusChange(pay.id, e.target.value)}
                                onClick={e => e.stopPropagation()}
                              >
                                <option value="Pending">Pending</option>
                                <option value="Completed">Completed</option>
                                <option value="Failed">Failed</option>
                                <option value="Refunded">Refunded</option>
                              </select>
                            ) : (
                              <span className={`crm-status-pill ${
                                pay.status === 'Completed' ? 'success' : 
                                pay.status === 'Pending' ? 'warning' : 
                                pay.status === 'Failed' ? 'danger' : 'info'
                              }`}>
                                {pay.status || 'Pending'}
                              </span>
                            )}
                          </td>
                          <td>
                            <div className="stack gap-1">
                              <span className="font-numeric" style={{ fontWeight: 800, color: 'var(--success)' }}>{formatCurrency(pay.amount)}</span>
                              {pay.amount > 50000 && !pay.approved_by && (
                                <span className="text-xs font-bold" style={{ color: 'var(--warning)' }}>Requires Approval</span>
                              )}
                              {pay.approved_by && (
                                <span className="text-xs muted">By: {pay.approved_by.name}</span>
                              )}
                            </div>
                          </td>
                          <td className="text-right">
                            <div className="crm-action-group" style={{ justifyContent: 'flex-end' }}>
                              {pay.status === 'Pending' && pay.amount > 50000 && canApprove && !pay.approved_by && (
                                <button className="crm-action-btn success" title="Approve High Value" onClick={() => handleApprove(pay.id)}>
                                  <Icon name="check" size={14} />
                                </button>
                              )}
                              {isEmployee && (
                                <button className="crm-action-btn info" title="Request/Comment" onClick={() => navigate(`/payments/${pay.id}?comment=true`)}>
                                  <Icon name="message-square" size={14} />
                                </button>
                              )}
                              {canDelete && (
                                <button className="crm-action-btn danger" title="Delete" onClick={() => handleDelete(pay.id)}>
                                  <Icon name="trash" size={14} />
                                </button>
                              )}
                              <button className="crm-action-btn" onClick={() => navigate(`/payments/${pay.id}`)}>
                                <Icon name="eye" size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={isEmployee ? 7 : 8}>
                          <div className="emptyState" style={{ padding: '60px 0', textAlign: 'center' }}>
                            <h3 style={{ color: 'var(--text)' }}>No Payments Found</h3>
                            <p className="muted">Refine your filters or add a new record.</p>
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
                <button className="btn-premium action-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
                <span className="text-sm muted" style={{ display: 'flex', alignItems: 'center' }}>Page {page}</span>
                <button className="btn-premium action-secondary" disabled={page * limit >= total} onClick={() => setPage(p => p + 1)}>Next</button>
              </div>
            )}
          </>
        )}
      </section>

      <style>{`
         .status-dropdown-mini {
           background: var(--bg-surface);
           border: 1px solid var(--border-strong);
           border-radius: 8px;
           padding: 4px 8px;
           font-size: 0.75rem;
           font-weight: 700;
           cursor: pointer;
           outline: none;
         }
         .status-dropdown-mini.completed { color: var(--success); border-color: var(--success); }
         .status-dropdown-mini.pending { color: var(--warning); border-color: var(--warning); }
         .status-dropdown-mini.failed { color: var(--danger); border-color: var(--danger); }

         .users-page-header { margin-bottom: 24px; }
         .users-title { font-size: 1.5rem; font-weight: 800; color: var(--text); margin-bottom: 4px; }
         .users-subtitle { font-size: 0.9rem; color: var(--text-dimmed); font-weight: 500; }

         .unified-action-bar { margin-bottom: 24px; }
         .search-filter-group { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
         .filter-select { min-width: 140px; flex: 0; }
         
         .crm-stats-bar-compact { display: flex; gap: 16px; margin-bottom: 24px; }
         .stat-pill-mini { 
           background: var(--bg-card); 
           border: 1px solid var(--border); 
           padding: 12px 20px; 
           border-radius: 16px; 
           display: flex; 
           flex-direction: column; 
           min-width: 160px;
           transition: all 0.2s;
         }
         .stat-pill-mini.clickable:hover { border-color: var(--primary); transform: translateY(-2px); }
         .stat-pill-label { font-size: 0.7rem; font-weight: 800; color: var(--text-dimmed); margin-bottom: 4px; }
         .stat-pill-value { font-size: 1.25rem; font-weight: 900; }
         .stat-pill-value.total { color: var(--text); }
         .stat-pill-value.active { color: var(--success); }
         .stat-pill-value.pending { color: var(--warning); }
         .stat-pill-value.info { color: var(--primary); }

         .crm-table th { font-size: 0.75rem !important; text-transform: uppercase; letter-spacing: 0.05em; }
         .btn-clear-filters { color: var(--primary); font-weight: 700; cursor: pointer; background: none; border: none; }
      `}</style>
    </div>
  )
}
