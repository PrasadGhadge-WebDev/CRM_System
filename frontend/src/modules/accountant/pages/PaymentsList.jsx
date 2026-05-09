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
import Modal from '../../../components/Modal.jsx'
import InteractionLogger from '../../../components/InteractionLogger.jsx'
import StatusBadge from '../../../components/StatusBadge.jsx'

export default function PaymentsList() {
  const { user } = useAuth()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [method, setMethod] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [activeTab, setActiveTab] = useState('customer') // 'customer' or 'staff'
  const [staffFilter, setStaffFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [dateRangeType, setDateRangeType] = useState('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20
  const [summary, setSummary] = useState({ total: 0, byMethod: {}, byStatus: {}, totalAmount: 0, bankTransferVolume: 0 })
  const [selectedPayments, setSelectedPayments] = useState([])
  const [followupPayment, setFollowupPayment] = useState(null)
  const [isFollowupOpen, setIsFollowupOpen] = useState(false)
  const navigate = useNavigate()

  const toggleSelect = (id) => {
    setSelectedPayments(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedPayments.length === payments.length) {
      setSelectedPayments([])
    } else {
      setSelectedPayments(payments.map(p => p.id))
    }
  }

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedPayments.length} records?`)) return
    try {
      await Promise.all(selectedPayments.map(id => paymentsApi.remove(id)))
      toast.success('Selected payments deleted')
      setSelectedPayments([])
      fetchPayments()
    } catch (err) {
      toast.error('Some deletions failed')
    }
  }

  const isAdmin = user?.role === 'Admin'
  const isAccountant = user?.role === 'Accountant'
  const isManager = user?.role === 'Manager'
  const isHR = user?.role === 'HR'
  const isEmployee = user?.role === 'Employee'

  const canAdd = isAdmin || isAccountant || isHR
  const canDelete = isAdmin
  const canApprove = isAdmin
  const canUpdateStatus = isAdmin || isAccountant

  // HR should not see customer payments, only internal ones
  useEffect(() => {
    if (isHR && activeTab !== 'staff') {
      setActiveTab('staff')
    }
  }, [isHR, activeTab])

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true)

      let sDate = startDate
      let eDate = endDate
      const now = new Date()
      now.setHours(0, 0, 0, 0)

      if (dateRangeType === 'today') {
        sDate = now.toISOString()
        eDate = new Date(new Date().setHours(23, 59, 59, 999)).toISOString()
      } else if (dateRangeType === 'yesterday') {
        const y = new Date(now)
        y.setDate(y.getDate() - 1)
        sDate = y.toISOString()
        const yEnd = new Date(y)
        yEnd.setHours(23, 59, 59, 999)
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
        payment_mode: method,
        status: statusFilter,
        payment_type: activeTab === 'customer' ? 'Customer Payment' : 'internal',
        created_by: staffFilter,
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
  }, [q, method, statusFilter, activeTab, staffFilter, startDate, endDate, dateRangeType, page])

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

  const handleModeChange = async (id, newMode) => {
    try {
      await paymentsApi.update(id, { payment_mode: newMode })
      toast.success(`Mode updated to ${newMode}`)
      fetchPayments()
    } catch (err) {
      toast.error('Failed to update payment mode')
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
    if (!payments.length) {
      toast.info('No data available to export')
      return
    }

    const headers = ['Payment #', 'Date', 'Customer', 'Bill #', 'Method', 'Status', 'Amount', 'Pending', 'Transaction ID', 'Notes']
    const rows = payments.map(p => ({
      payment_number: p.payment_number || 'N/A',
      date: new Date(p.payment_date).toLocaleDateString(),
      bill: p.invoice_id?.invoice_number || 'UNLINKED',
      method: p.payment_mode || 'UPI',
      status: p.status || 'Pending',
      amount: p.total_amount || p.amount || 0,
      pending: p.pending_amount || 0,
      txid: p.transaction_id || 'N/A',
      notes: (p.notes || '').replace(/\n/g, ' ')
    }))

    // Generate Excel-compatible XML (Excel 2003 XML format)
    const xmlHeader = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>
      <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
      xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
      xmlns:html="http://www.w3.org/TR/REC-html40">
      <Worksheet ss:Name="Payments">
      <Table>
        <Row ss:StyleID="header">
          ${headers.map(h => `<Cell><Data ss:Type="String">${h}</Data></Cell>`).join('')}
        </Row>`;

    const escapeXml = (unsafe) => {
      return String(unsafe).replace(/[<>&'"]/g, (c) => {
        switch (c) {
          case '<': return '&lt;';
          case '>': return '&gt;';
          case '&': return '&amp;';
          case '\'': return '&apos;';
          case '"': return '&quot;';
          default: return c;
        }
      });
    };

    const xmlRows = rows.map(r => `
      <Row>
        <Cell><Data ss:Type="String">${escapeXml(r.payment_number)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(r.date)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(r.customer)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(r.bill)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(r.method)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(r.status)}</Data></Cell>
        <Cell><Data ss:Type="Number">${r.amount}</Data></Cell>
        <Cell><Data ss:Type="Number">${r.pending}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(r.txid)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(r.notes)}</Data></Cell>
      </Row>`).join('');

    const xmlFooter = `</Table></Worksheet></Workbook>`;
    const xmlContent = xmlHeader + xmlRows + xmlFooter;

    const blob = new Blob([xmlContent], { type: 'application/vnd.ms-excel' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `Payments_Report_${new Date().toISOString().split('T')[0]}.xls`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success('Excel Report Generated')
  }

  return (
    <div className="stack">
      <section className="crm-fullscreen-shell">
        <div className="users-page-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 className="users-title">Payment History</h1>
              <p className="users-subtitle">Track all money coming in and going out of the business.</p>
            </div>
            <div className="header-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button className="btn-premium-mini secondary-outline-btn" onClick={exportToExcel}>
                <Icon name="download" size={16} />
                <span>Export Report</span>
              </button>
              {(isAdmin || isAccountant) && (
                <button className="btn-premium action-vibrant" onClick={() => navigate('/payments/new')}>
                  <Icon name="plus" size={16} />
                  <span>Add Payment</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Payment Flow Split Tabs */}
        <div className="payment-flow-tabs">
          {(!isHR) && (
            <button
              className={`flow-tab ${activeTab === 'customer' ? 'active' : ''}`}
              onClick={() => { setActiveTab('customer'); setPage(1); }}
            >
              <div className="tab-icon-wrap">
                <Icon name="billing" size={20} />
              </div>
              <div className="tab-info">
                <span className="tab-label">Customer Payments</span>
                <span className="tab-desc">Revenue & Invoices</span>
              </div>
            </button>
          )}
          {(isAdmin || isAccountant || isHR) && (
            <button
              className={`flow-tab ${activeTab === 'staff' ? 'active' : ''}`}
              onClick={() => { setActiveTab('staff'); setPage(1); }}
            >
              <div className="tab-icon-wrap staff">
                <Icon name="users" size={20} />
              </div>
              <div className="tab-info">
                <span className="tab-label">Staff Payments</span>
                <span className="tab-desc">Payroll & Claims</span>
              </div>
            </button>
          )}
        </div>

        {/* Analytics Section */}

        {/* Overdue Banner */}
        {summary.overdueAmount > 0 && !isHR && (
          <div className="overdue-banner animate-pulse">
            <div className="banner-content">
              <Icon name="info" size={18} />
              <span>
                <strong>Attention Required:</strong> You have <b>{formatCurrency(summary.overdueAmount)}</b> in overdue receivables. Please assign follow-ups immediately.
              </span>
            </div>
            <button className="banner-action" onClick={() => { setStatusFilter('Pending'); setPage(1); }}>View All Pending</button>
          </div>
        )}

        {/* Core Analytics Summary */}
        <div className="crm-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
          <div className="premium-stat-card">
            <div className="stat-icon collection">
              <Icon name={activeTab === 'customer' ? 'billing' : 'users'} size={24} />
            </div>
            <div className="stat-details">
              <span className="stat-label">{activeTab === 'customer' ? 'Total Collection' : 'Total Payroll'}</span>
              <span className="stat-value">{formatCurrency(activeTab === 'customer' ? summary.totalCollection : summary.totalStaffPayments || 0)}</span>
            </div>
          </div>

          <div className="premium-stat-card">
            <div className="stat-icon inflow">
              <Icon name="activity" size={24} />
            </div>
            <div className="stat-details">
              <span className="stat-label">{activeTab === 'customer' ? "Today's Inflow" : "Pending Approvals"}</span>
              <span className={`stat-value ${activeTab === 'customer' ? 'text-success' : 'text-warning'}`}>
                {activeTab === 'customer' ? formatCurrency(summary.todayCollection) : (summary.pendingStaffCount || 0)}
              </span>
            </div>
          </div>

          <div className="premium-stat-card highlight">
            <div className="stat-icon pending">
              <Icon name="info" size={24} />
            </div>
            <div className="stat-details">
              <span className="stat-label">{activeTab === 'customer' ? 'Total Pending' : 'Claims Processing'}</span>
              <span className="stat-value text-danger">
                {activeTab === 'customer' ? formatCurrency(summary.totalPending) : formatCurrency(summary.pendingClaimsAmount || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls & Filters */}
        <div className="unified-action-bar" style={{ display: 'flex', gap: '16px', alignItems: 'center', background: 'var(--bg-card)', padding: '12px 24px', borderRadius: '16px', border: '1px solid var(--border)', marginBottom: '24px' }}>
          <div style={{ flex: 1 }}>
            <ModernSearchBar
              value={q}
              onChange={e => { setQ(e.target.value); setPage(1); }}
              placeholder="Search by ID, Customer, Invoice..."
            />
          </div>

          <div className="filter-group" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexShrink: 0 }}>
            <select className="crm-input filter-select-modern" value={method} onChange={e => { setMethod(e.target.value); setPage(1); }} style={{ width: '160px' }}>
              <option value="">All Modes</option>
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="Cheque">Cheque</option>
            </select>

            <select className="crm-input filter-select-modern" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} style={{ width: '160px' }}>
              <option value="">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Partial">Partial</option>
              <option value="Pending">Pending</option>
              <option value="Overdue">Overdue</option>
              <option value="Failed">Failed</option>
            </select>

            <select
              className="crm-input filter-select-modern"
              value={dateRangeType}
              onChange={(e) => { setDateRangeType(e.target.value); setPage(1); }}
              style={{ width: '160px' }}
            >
              <option value="all">Any Date</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>

            {dateRangeType === 'custom' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <input type="date" className="crm-input date-mini" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} />
                <span className="muted text-xs">to</span>
                <input type="date" className="crm-input date-mini" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} />
              </div>
            )}

            {(q || method || statusFilter || dateRangeType !== 'all') && (
              <button
                className="btn-premium-mini reset-btn"
                onClick={() => {
                  setQ(''); setMethod(''); setStatusFilter('');
                  setStartDate(''); setEndDate(''); setDateRangeType('all');
                  setPage(1);
                }}
                style={{ height: '42px', width: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >
                <Icon name="refresh" size={14} />
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
                    {activeTab === 'customer' ? (
                      <tr>
                        <th style={{ minWidth: '120px' }}>PAYMENT ID</th>
                        <th style={{ minWidth: '150px' }}>CUSTOMER</th>
                        <th style={{ minWidth: '140px' }}>DEAL</th>
                        <th style={{ minWidth: '120px' }}>BILL #</th>
                        <th style={{ minWidth: '110px' }} className="text-right">TOTAL AMOUNT</th>
                        <th style={{ minWidth: '110px' }} className="text-right">PAID</th>
                        <th style={{ minWidth: '110px' }} className="text-right">PENDING</th>
                        <th style={{ minWidth: '120px' }}>METHOD</th>
                        <th style={{ minWidth: '120px' }}>STATUS</th>
                        <th style={{ minWidth: '120px' }}>DATE</th>
                        <th style={{ minWidth: '100px' }} className="text-right">ACTIONS</th>
                      </tr>
                    ) : (
                      <tr>
                        <th style={{ minWidth: '120px' }}>TXN ID</th>
                        <th style={{ minWidth: '150px' }}>EMPLOYEE NAME</th>
                        <th style={{ minWidth: '140px' }}>PAYMENT TYPE</th>
                        <th style={{ minWidth: '120px' }}>MONTH / DATE</th>
                        <th style={{ minWidth: '110px' }} className="text-right">AMOUNT</th>
                        <th style={{ minWidth: '130px' }}>METHOD</th>
                        <th style={{ minWidth: '120px' }}>STATUS</th>
                        <th style={{ minWidth: '100px' }} className="text-right">ACTIONS</th>
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {payments.length ? (
                      payments.map(pay => {
                        const isOverdue = pay.invoice_id?.due_date && new Date(pay.invoice_id.due_date) < new Date() && pay.status !== 'Paid';
                        const isInternal = ['Salary Payment', 'Employee Reimbursement', 'Vendor Payment'].includes(pay.payment_type);

                        if (activeTab === 'customer') {
                          return (
                            <tr
                              key={pay.id}
                              className={`crm-table-row clickable-row ${isOverdue ? 'overdue-row' : ''}`}
                              onClick={() => navigate(`/payments/${pay.id}`)}
                            >
                              <td><div className="font-bold text-primary">{pay.payment_number || 'PAY-PENDING'}</div></td>
                              <td><div className="font-bold">{pay.customer_id?.name || '—'}</div></td>
                              <td><div className="font-semibold text-xs">{pay.deal_id?.name || '—'}</div></td>
                              <td><div className="font-numeric strong">{pay.invoice_id?.invoice_number || 'UNLINKED'}</div></td>
                              <td className="text-right font-numeric font-bold" style={{ color: 'var(--text)' }}>{formatCurrency(pay.total_amount)}</td>
                              <td className="text-right font-numeric font-bold" style={{ color: '#10b981' }}>{formatCurrency(pay.paid_amount)}</td>
                              <td className="text-right font-numeric font-bold" style={{ color: pay.pending_amount > 0 ? '#ef4444' : '#10b981' }}>{formatCurrency(pay.pending_amount)}</td>
                              <td><div className="text-xs font-bold caps muted">{pay.payment_mode || '—'}</div></td>
                              <td>
                                <span className={`status-badge-mini ${pay.status === 'Paid' ? 'success' : 'warning'}`}>
                                  {isOverdue ? 'Overdue' : (pay.status || 'Pending')}
                                </span>
                              </td>
                              <td><div className="text-xs font-numeric strong">{new Date(pay.payment_date).toLocaleDateString('en-IN')}</div></td>
                              <td onClick={e => e.stopPropagation()}>
                                <div className="crm-action-group" style={{ justifyContent: 'flex-end', gap: '8px' }}>
                                  <button 
                                    className="modern-action-btn" 
                                    title="Edit Payment"
                                    onClick={() => navigate(`/payments/${pay.id}/edit`)}
                                  >
                                    <Icon name="edit" size={14} />
                                  </button>

                                  <details className="crm-actions-overflow">
                                    <summary className="modern-action-btn" title="More Options"><Icon name="more-vertical" size={14} /></summary>
                                    <div className="overflow-menu-content shadow-soft">
                                      {pay.invoice_id && <button className="overflow-item" onClick={() => navigate(`/invoices/${pay.invoice_id?.id || pay.invoice_id?._id}`)}><Icon name="billing" size={14} /><span>View Invoice</span></button>}
                                      {isAdmin && <button className="overflow-item danger" onClick={() => handleDelete(pay.id)}><Icon name="trash" size={14} /><span>Delete</span></button>}
                                    </div>
                                  </details>
                                </div>
                              </td>
                            </tr>
                          );
                        } else {
                          return (
                            <tr key={pay.id} className="crm-table-row clickable-row" onClick={() => navigate(`/payments/${pay.id}`)}>
                              <td><div className="font-numeric strong">{pay.transaction_id || 'INTERNAL'}</div></td>
                              <td><div className="font-bold">{pay.user_id?.name || pay.vendor_name || 'Staff Member'}</div></td>
                              <td>
                                <div className="stack gap-0">
                                  <span className="font-bold text-xs caps">{pay.payment_type}</span>
                                  <span className="muted text-xs">{pay.notes || ''}</span>
                                </div>
                              </td>
                              <td><div className="text-xs font-numeric strong">{new Date(pay.payment_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</div></td>
                              <td className="text-right font-numeric font-bold" style={{ color: '#6366f1' }}>{formatCurrency(pay.total_amount)}</td>
                              <td><div className="text-xs strong caps">{pay.payment_mode}</div></td>
                              <td><span className={`status-badge-mini ${pay.status === 'Paid' ? 'success' : 'warning'}`}>{pay.status}</span></td>
                              <td onClick={e => e.stopPropagation()}>
                                <div className="crm-action-group" style={{ justifyContent: 'flex-end', gap: '8px' }}>
                                  <button 
                                    className="modern-action-btn" 
                                    title="Update Record"
                                    onClick={() => navigate(`/payments/${pay.id}/edit`)}
                                  >
                                    <Icon name="edit" size={14} />
                                  </button>

                                  <details className="crm-actions-overflow">
                                    <summary className="modern-action-btn" title="More Options"><Icon name="more-vertical" size={14} /></summary>
                                    <div className="overflow-menu-content shadow-soft">
                                      {isAdmin && <button className="overflow-item danger" onClick={() => handleDelete(pay.id)}><Icon name="trash" size={14} /><span>Delete Record</span></button>}
                                    </div>
                                  </details>
                                </div>
                              </td>
                            </tr>
                          );
                        }
                      })
                    ) : (
                      <tr>
                        <td colSpan={12}>
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

      <Modal
        isOpen={isFollowupOpen}
        onClose={() => setIsFollowupOpen(false)}
        title={`Payment Follow-up: ${followupPayment?.payment_number}`}
      >
        <div className="p20 stack gap-20">
          <div className="payment-summary-mini glass-panel p16">
            <div className="flex justify-between items-center mb-8">
              <span className="muted text-xs caps strong">Pending Follow-up</span>
              <span className="text-danger font-bold">{formatCurrency(followupPayment?.pending_amount)}</span>
            </div>
            <div className="text-sm">
              Customer: <strong>{followupPayment?.customer_id?.name}</strong>
            </div>
          </div>
          <InteractionLogger
            relatedId={followupPayment?.id}
            relatedType="payment"
            onNoteAdded={() => {
              setIsFollowupOpen(false)
              fetchPayments()
            }}
          />
        </div>
      </Modal>

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
          .status-dropdown-mini.paid { color: var(--success); border-color: var(--success); }
          .status-dropdown-mini.partial { color: var(--warning); border-color: var(--warning); }
          .status-dropdown-mini.pending { color: var(--danger); border-color: var(--danger); }
          .status-dropdown-mini.failed { color: var(--danger); border-color: var(--danger); }

         .users-page-header { margin-bottom: 24px; }
         .users-title { font-size: 1.5rem; font-weight: 800; color: var(--text); margin-bottom: 4px; }
         .users-subtitle { font-size: 0.9rem; color: var(--text-dimmed); font-weight: 500; }

          .filter-select-modern {
            height: 42px;
            border-radius: 12px;
            border: 1px solid var(--border-strong);
            background: var(--bg-surface);
            padding: 0 16px;
            font-size: 0.85rem;
            font-weight: 700;
            color: var(--text);
            cursor: pointer;
            transition: all 0.2s;
            min-width: 150px;
          }
          .filter-select-modern:hover { border-color: var(--primary); background: var(--bg-card); }
          .filter-select-modern:focus { border-color: var(--primary); box-shadow: 0 0 0 4px rgba(var(--primary-rgb), 0.1); }

          .unified-action-bar { margin-bottom: 24px; }
          .crm-stats-grid { display: grid; gap: 20px; }
          .premium-stat-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 20px;
            padding: 24px;
            display: flex;
            align-items: center;
            gap: 20px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
            box-shadow: inset 4px 0 0 var(--card-accent), var(--shadow-sm);
          }
          .premium-stat-card:hover { transform: translateY(-4px); box-shadow: inset 4px 0 0 var(--card-accent), var(--shadow-md); border-color: var(--primary); }
          .premium-stat-card::after {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; height: 4px;
            background: transparent;
          }
          .premium-stat-card.highlight::after { background: var(--danger); }

          .stat-icon {
            width: 54px;
            height: 54px;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .stat-icon.collection { background: rgba(var(--primary-rgb), 0.1); color: var(--primary); }
          .stat-icon.inflow { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
          .stat-icon.pending { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

          .stat-details { display: flex; flex-direction: column; gap: 2px; }
          .stat-label { font-size: 0.75rem; font-weight: 800; color: var(--text-dimmed); text-transform: uppercase; letter-spacing: 0.05em; }
          .stat-value { font-size: 1.5rem; font-weight: 900; color: var(--text); font-variant-numeric: tabular-nums; }
          .stat-value.text-success { color: #22c55e; }
          .stat-value.text-danger { color: #ef4444; }

         .overdue-row { background: rgba(239, 68, 68, 0.03) !important; }
         .overdue-row:hover { background: rgba(239, 68, 68, 0.1) !important; }

         .due-badge { 
           font-size: 0.6rem; 
           font-weight: 900; 
           color: #ef4444; 
           background: rgba(239, 68, 68, 0.1); 
           padding: 1px 6px; 
           border-radius: 4px; 
           width: fit-content;
           margin-top: 2px;
         }

         .overdue-text {
           font-size: 0.6rem;
           font-weight: 900;
           color: white;
           background: #ef4444;
           padding: 1px 6px;
           border-radius: 4px;
           width: fit-content;
           margin-top: 2px;
           animation: pulse 2s infinite;
         }

          .modern-action-btn { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: var(--bg-surface); border: 1px solid var(--border); color: var(--text-muted); cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
          .modern-action-btn:hover { background: var(--primary-soft); color: var(--primary); border-color: var(--primary); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15); }
          
          .crm-actions-overflow { position: relative; }
          .crm-actions-overflow summary { list-style: none; outline: none; }
          .crm-actions-overflow summary::-webkit-details-marker { display: none; }
           
          .overflow-menu-content { 
            position: absolute; 
            right: 0; 
            top: calc(100% + 8px); 
            background: var(--bg-card); 
            border: 1px solid var(--border); 
            border-radius: 16px; 
            padding: 8px; 
            z-index: 1000; 
            min-width: 220px;
            display: flex;
            flex-direction: column;
            gap: 4px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            backdrop-filter: blur(20px);
          }
           
          .overflow-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 14px;
            border-radius: 10px;
            color: var(--text);
            font-size: 0.82rem;
            font-weight: 700;
            text-decoration: none;
            border: none;
            background: transparent;
            cursor: pointer;
            text-align: left;
            width: 100%;
            transition: all 0.2s;
            white-space: nowrap;
          }
          .overflow-item:hover { background: var(--bg-surface); color: var(--primary); }
          .overflow-item.danger:hover { background: #fee2e2; color: #ef4444; }
          .overflow-item span { flex: 1; }

         .pending-highlight {
           background: rgba(239, 68, 68, 0.1);
           border-radius: 999px;
           padding: 2px;
           display: inline-block;
         }

         @keyframes pulse {
           0% { opacity: 1; transform: scale(1); }
           50% { opacity: 0.8; transform: scale(0.95); }
           100% { opacity: 1; transform: scale(1); }
         }

         .payment-summary-mini {
           background: var(--bg-surface);
           border: 1px solid var(--border);
           border-radius: 16px;
         }

         .crm-action-btn-mini {
           width: 30px;
           height: 30px;
           border-radius: 8px;
           display: flex;
           align-items: center;
           justify-content: center;
           border: 1px solid var(--border);
           background: var(--bg-surface);
           color: var(--text-dimmed);
           transition: all 0.2s;
         }
         .crm-action-btn-mini:hover { transform: translateY(-2px); border-color: var(--primary); color: var(--primary); }
         .crm-action-btn-mini.danger { color: #ef4444; border-color: rgba(239, 68, 68, 0.2); }
         .crm-action-btn-mini.danger:hover { background: #ef4444; color: white; border-color: #ef4444; }
         .crm-action-btn-mini.success { color: var(--success); border-color: var(--success-soft); }
         .crm-action-btn-mini.success:hover { background: var(--success); color: white; }

         .crm-table th { font-size: 0.75rem !important; text-transform: uppercase; letter-spacing: 0.05em; padding: 12px 16px !important; color: var(--text-dimmed); }
         .crm-table td { padding: 12px 16px !important; vertical-align: middle; }

         .crm-table-row.selected { background: var(--primary-soft) !important; }
         .clickable-row { cursor: pointer; }
         .crm-table-row:hover { background: var(--bg-surface) !important; }
         
         .glass-btn {
           background: var(--bg-surface) !important;
           border: 1px solid var(--border-strong) !important;
           color: var(--text-dimmed) !important;
           border-radius: 8px !important;
           width: 30px !important;
           height: 30px !important;
           display: flex !important;
           align-items: center !important;
           justify-content: center !important;
           transition: all 0.2s !important;
         }
         .glass-btn:hover { border-color: var(--primary) !important; color: var(--primary) !important; transform: translateY(-2px); }

         .danger-btn {
           background: rgba(239, 68, 68, 0.1) !important;
           border: 1px solid rgba(239, 68, 68, 0.2) !important;
           color: #ef4444 !important;
           border-radius: 8px !important;
           width: 30px !important;
           height: 30px !important;
           display: flex !important;
           align-items: center !important;
           justify-content: center !important;
         }
         .danger-btn:hover { background: #ef4444 !important; color: white !important; transform: translateY(-2px); }
         
         .status-dropdown-mini.partial { color: var(--warning); border-color: var(--warning); }
         
         /* Payment Flow Tabs */
         .payment-flow-tabs {
           display: flex;
           gap: 16px;
           margin-bottom: 24px;
           border-bottom: 1px solid var(--border);
           padding-bottom: 1px;
         }
         .flow-tab {
           display: flex;
           align-items: center;
           gap: 12px;
           padding: 12px 24px;
           background: transparent;
           border: none;
           border-bottom: 3px solid transparent;
           cursor: pointer;
           transition: all 0.3s;
           color: var(--text-dimmed);
           text-align: left;
         }
         .flow-tab:hover { background: var(--bg-surface); color: var(--text); }
         .flow-tab.active { 
           color: var(--primary); 
           border-bottom-color: var(--primary); 
           background: rgba(var(--primary-rgb), 0.05); 
         }
         .flow-tab .tab-info { display: flex; flex-direction: column; }
         .tab-label { font-size: 0.9rem; font-weight: 800; line-height: 1.2; }
         .tab-desc { font-size: 0.65rem; font-weight: 600; opacity: 0.7; }

         /* Admin Analytics & Overdue Banner */
         .analytics-pane {
           animation: slideDown 0.4s ease-out;
         }
         @keyframes slideDown {
           from { opacity: 0; transform: translateY(-20px); }
           to { opacity: 1; transform: translateY(0); }
         }

         .overdue-banner {
           display: flex;
           justify-content: space-between;
           align-items: center;
           background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
           border: 1px solid #ef4444;
           padding: 12px 20px;
           border-radius: 16px;
           margin-bottom: 24px;
           color: #991b1b;
         }
         .banner-content { display: flex; align-items: center; gap: 12px; font-size: 0.9rem; }
         .banner-action {
           background: #ef4444;
           color: white;
           border: none;
           padding: 6px 16px;
           border-radius: 8px;
           font-size: 0.75rem;
           font-weight: 800;
           cursor: pointer;
           transition: all 0.2s;
         }
         .banner-action:hover { background: #dc2626; transform: scale(1.05); }

         @keyframes animate-pulse {
           0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
           70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
           100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
         }
         .animate-pulse { animation: animate-pulse 2s infinite; }

         /* FINAL Compact Structure Styles */
         .payee-avatar-mini {
           width: 28px;
           height: 28px;
           border-radius: 8px;
           background: var(--primary-soft);
           color: var(--primary);
           display: flex;
           align-items: center;
           justify-content: center;
           font-weight: 800;
           font-size: 0.75rem;
         }
         .payee-name-mini { font-size: 0.8rem; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px; }
         
         .invoice-link-mini {
           color: var(--primary);
           font-weight: 800;
           font-size: 0.8rem;
           text-decoration: none;
           background: rgba(var(--primary-rgb), 0.05);
           padding: 2px 6px;
           border-radius: 4px;
         }
         .invoice-link-mini:hover { background: var(--primary-soft); }

         .method-tag {
           font-size: 0.7rem;
           font-weight: 700;
           color: var(--text-dimmed);
           background: var(--bg-surface);
           border: 1px solid var(--border-strong);
           padding: 2px 8px;
           border-radius: 6px;
           width: fit-content;
           white-space: nowrap;
         }

         .crm-status-pill-mini {
           font-size: 0.65rem;
           font-weight: 800;
           padding: 2px 8px;
           border-radius: 6px;
           text-transform: uppercase;
         }
         .crm-status-pill-mini.success { background: #dcfce7; color: #166534; }
         .crm-status-pill-mini.warning { background: #fef9c3; color: #854d0e; }
         .crm-status-pill-mini.danger { background: #fee2e2; color: #991b1b; }
         .crm-status-pill-mini.info { background: #e0f2fe; color: #075985; }

         .overdue-text { font-size: 0.6rem; font-weight: 900; color: #ef4444; margin-top: 2px; text-transform: uppercase; }
          .due-badge { font-size: 0.55rem; font-weight: 900; background: #fee2e2; color: #ef4444; padding: 1px 4px; border-radius: 4px; margin-top: 2px; letter-spacing: 0.05em; width: fit-content; }
          .stack { display: flex; flex-direction: column; }
          .gap-0 { gap: 0; }
          .font-numeric { font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }

         .crm-action-btn-mini {
           width: 26px;
           height: 26px;
           border-radius: 6px;
           display: flex;
           align-items: center;
           justify-content: center;
           border: 1px solid var(--border-strong);
           transition: all 0.2s;
           background: var(--bg-surface);
           color: var(--text-dimmed);
         }
         .crm-action-btn-mini.glass:hover { border-color: var(--primary); color: var(--primary); transform: translateY(-1px); }
         .crm-action-btn-mini.danger:hover { background: #ef4444; border-color: #ef4444; color: white; transform: translateY(-1px); }

         .table-responsive { overflow-x: auto; border-radius: 12px; }
         .crm-table th { white-space: nowrap; padding: 10px 12px !important; }
         .crm-table td { padding: 8px 12px !important; vertical-align: middle; }

         .add-payment-btn {
           background: var(--primary) !important;
           color: white !important;
           border: none !important;
           border-radius: 12px !important;
           padding: 0 20px !important;
           font-weight: 700 !important;
           height: 38px !important;
           display: flex !important;
           align-items: center !important;
           gap: 8px !important;
           transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
           box-shadow: 0 2px 8px rgba(var(--primary-rgb), 0.2) !important;
           font-size: 0.85rem !important;
         }
         .add-payment-btn:hover {
           background: var(--primary-hover) !important;
           transform: translateY(-2px);
           box-shadow: 0 6px 18px rgba(var(--primary-rgb), 0.4);
         }

         .secondary-outline-btn {
           background: var(--bg-surface) !important;
           border: 1px solid var(--border-strong) !important;
           color: var(--text) !important;
           border-radius: 12px !important;
           padding: 0 16px !important;
           font-weight: 700 !important;
           height: 38px !important;
           display: flex !important;
           align-items: center !important;
           gap: 8px !important;
           transition: all 0.2s !important;
           font-size: 0.85rem !important;
         }
         .secondary-outline-btn:hover {
           border-color: var(--primary) !important;
           color: var(--primary) !important;
           transform: translateY(-2px);
         }
         .payment-flow-tabs { display: flex; gap: 24px; margin-bottom: 32px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px; }
         .flow-tab { 
           background: none; 
           border: none; 
           padding: 12px 0; 
           display: flex; 
           align-items: center; 
           gap: 16px; 
           cursor: pointer; 
           transition: all 0.3s;
           opacity: 0.5;
           position: relative;
         }
         .flow-tab:hover { opacity: 0.8; }
         .flow-tab.active { opacity: 1; }
         .flow-tab.active::after {
           content: '';
           position: absolute;
           bottom: -9px;
           left: 0;
           right: 0;
           height: 3px;
           background: var(--primary);
           border-radius: 3px 3px 0 0;
         }

         .tab-icon-wrap {
           width: 42px;
           height: 42px;
           border-radius: 12px;
           display: flex;
           align-items: center;
           justify-content: center;
           background: var(--bg-surface);
           border: 1px solid var(--border);
           color: var(--text-dimmed);
           transition: all 0.3s;
         }
         .flow-tab.active .tab-icon-wrap { background: var(--primary-soft); color: var(--primary); border-color: var(--primary); transform: scale(1.05); }
         .tab-icon-wrap.staff { }
         .flow-tab.active .tab-icon-wrap.staff { background: #f0f9ff; color: #0369a1; border-color: #0369a1; }

         .tab-info { display: flex; flex-direction: column; align-items: flex-start; }
         .tab-label { font-size: 0.95rem; font-weight: 800; color: var(--text); }
         .tab-desc { font-size: 0.7rem; font-weight: 600; color: var(--text-dimmed); text-transform: uppercase; letter-spacing: 0.05em; }

         .caps { text-transform: uppercase; }
         .text-primary { color: var(--primary); }
         .status-badge-mini {
           display: inline-flex;
           padding: 4px 12px;
           border-radius: 8px;
           font-size: 0.7rem;
           font-weight: 800;
           text-transform: uppercase;
           letter-spacing: 0.02em;
         }
         .status-badge-mini.success { background: #dcfce7; color: #15803d; }
         .status-badge-mini.warning { background: #fef3c7; color: #b45309; }
         .status-badge-mini.danger { background: #fee2e2; color: #b91c1c; }

         .overdue-banner {
           background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
           color: white;
           padding: 16px 24px;
           border-radius: 16px;
           display: flex;
           justify-content: space-between;
           align-items: center;
           margin-bottom: 24px;
           box-shadow: 0 10px 20px rgba(239, 68, 68, 0.2);
         }
         .banner-action {
           background: white;
           color: #b91c1c;
           border: none;
           padding: 8px 16px;
           border-radius: 10px;
           font-weight: 800;
           font-size: 0.8rem;
           cursor: pointer;
           transition: all 0.2s;
         }
         .banner-action:hover { transform: scale(1.05); }

         @keyframes pulse {
           0% { transform: scale(1); }
           50% { transform: scale(1.02); }
           100% { transform: scale(1); }
         }
         .animate-pulse { animation: pulse 3s infinite ease-in-out; }
      `}</style>
    </div>
  )
}
