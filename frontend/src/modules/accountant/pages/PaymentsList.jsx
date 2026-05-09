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

                                  {pay.invoice_id && (
                                    <button 
                                      className="modern-action-btn" 
                                      title="View Invoice"
                                      onClick={() => navigate(`/invoices/${pay.invoice_id?.id || pay.invoice_id?._id}`)}
                                    >
                                      <Icon name="billing" size={14} />
                                    </button>
                                  )}
                                  {isAdmin && (
                                    <button 
                                      className="modern-action-btn danger" 
                                      title="Delete"
                                      onClick={() => handleDelete(pay.id)}
                                    >
                                      <Icon name="trash" size={14} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        } else {
                          return (
                            <tr key={pay.id} className="crm-table-row clickable-row" onClick={() => navigate(`/payments/${pay.id}`)}>
                              <td><div className="font-bold">{pay.user_id?.name || pay.vendor_name || 'Unknown Staff'}</div></td>
                              <td>
                                <div className="stack gap-0">
                                  <span className="font-bold text-xs caps" style={{ color: 'var(--primary)' }}>
                                    {pay.payment_type === 'internal' ? 'Internal Payment' : pay.payment_type}
                                  </span>
                                  <span className="muted text-xs" style={{ fontSize: '0.65rem' }}>{pay.notes?.substring(0, 30)}{pay.notes?.length > 30 ? '...' : ''}</span>
                                </div>
                              </td>
                              <td><div className="text-xs font-numeric strong">{new Date(pay.payment_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</div></td>
                              <td className="text-right font-numeric font-bold" style={{ color: '#6366f1' }}>{formatCurrency(pay.paid_amount)}</td>
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

                                  {isAdmin && (
                                    <button 
                                      className="modern-action-btn danger" 
                                      title="Delete Record"
                                      onClick={() => handleDelete(pay.id)}
                                    >
                                      <Icon name="trash" size={14} />
                                    </button>
                                  )}
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
          /* Unified Design System */
          .users-page-header { margin-bottom: 24px; }
          .users-title { font-size: 1.5rem; font-weight: 800; color: var(--text); margin-bottom: 4px; }
          .users-subtitle { font-size: 0.9rem; color: var(--text-dimmed); font-weight: 500; }

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
            position: relative;
            overflow: hidden;
            box-shadow: inset 4px 0 0 var(--card-accent), var(--shadow-sm);
          }
          .premium-stat-card::after {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; height: 4px;
            background: transparent;
          }
          .premium-stat-card.highlight::after { background: var(--danger); }

          /* Header Actions & Buttons */
          .header-actions { display: flex; gap: 12px; align-items: center; }
          .btn-premium, .btn-premium-mini {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            padding: 0 24px;
            border-radius: 12px;
            font-weight: 700;
            font-size: 0.88rem;
            cursor: pointer;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            border: 1px solid transparent;
            height: 44px;
            white-space: nowrap;
          }
          .btn-premium-mini { padding: 0 16px; height: 38px; font-size: 0.82rem; }
          
          .action-vibrant {
            background: var(--primary);
            color: white;
            box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.2);
          }
          .action-vibrant:hover {
            background: var(--primary-hover);
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(var(--primary-rgb), 0.35);
          }

          .secondary-outline-btn {
            background: var(--bg-card);
            border: 1px solid var(--border-strong);
            color: var(--text);
            box-shadow: var(--shadow-sm);
          }
          .secondary-outline-btn:hover {
            border-color: var(--primary);
            color: var(--primary);
            background: var(--bg-surface);
            transform: translateY(-2px);
            box-shadow: var(--shadow-md);
          }

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

          /* Payment Flow Tabs - Modern Proper Shape */
          .payment-flow-tabs {
            display: flex;
            gap: 12px;
            margin-bottom: 32px;
            padding: 6px;
            background: var(--bg-surface);
            border: 1px solid var(--border-subtle);
            border-radius: 20px;
            width: fit-content;
          }
          .flow-tab {
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 10px 24px;
            background: transparent;
            border: none;
            border-radius: 16px;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            color: var(--text-dimmed);
            text-align: left;
            position: relative;
          }
          .flow-tab:hover { background: rgba(var(--primary-rgb), 0.03); color: var(--text); }
          .flow-tab.active { 
            background: white; 
            color: var(--primary); 
            box-shadow: 0 4px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(var(--primary-rgb), 0.05);
          }
          
          .tab-icon-wrap {
            width: 40px;
            height: 40px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--bg-card);
            border: 1px solid var(--border);
            color: var(--text-dimmed);
            transition: all 0.3s;
          }
          .flow-tab.active .tab-icon-wrap { 
            background: var(--primary); 
            color: white; 
            border-color: var(--primary);
            box-shadow: 0 4px 10px rgba(var(--primary-rgb), 0.3);
          }
          .flow-tab.active .tab-icon-wrap.staff {
            background: #0ea5e9;
            border-color: #0ea5e9;
            box-shadow: 0 4px 10px rgba(14, 165, 233, 0.3);
          }

          .tab-info { display: flex; flex-direction: column; gap: 1px; }
          .tab-label { font-size: 0.95rem; font-weight: 800; color: inherit; }
          .tab-desc { font-size: 0.65rem; font-weight: 700; opacity: 0.6; text-transform: uppercase; letter-spacing: 0.02em; }

          /* Table & Actions */
          .table-responsive { overflow-x: auto; border-radius: 16px; border: 1px solid var(--border-subtle); background: white; }
          .crm-table th { font-size: 0.75rem !important; text-transform: uppercase; letter-spacing: 0.05em; padding: 14px 16px !important; color: var(--text-dimmed); background: var(--bg-surface); }
          .crm-table td { padding: 12px 16px !important; vertical-align: middle; }
          .crm-table-row { border-bottom: 1px solid var(--border-subtle); transition: all 0.2s; }
          .crm-table-row:hover { background: var(--bg-surface) !important; }
          
          .modern-action-btn { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: var(--bg-surface); border: 1px solid var(--border); color: var(--text-muted); cursor: pointer; transition: all 0.2s; }
          .modern-action-btn:hover { background: var(--primary-soft); color: var(--primary); border-color: var(--primary); transform: translateY(-1px); }
          .modern-action-btn.danger:hover { background: #fee2e2; color: #ef4444; border-color: #fecaca; }

          /* Status Badges */
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

          /* Overdue Banner & Banner Actions */
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
          .banner-content { display: flex; align-items: center; gap: 12px; font-weight: 500; }
          .banner-action {
            background: white;
            color: #b91c1c;
            border: none;
            padding: 10px 20px;
            border-radius: 12px;
            font-weight: 800;
            font-size: 0.82rem;
            cursor: pointer;
            transition: all 0.2s;
            white-space: nowrap;
          }
          .banner-action:hover { transform: scale(1.05); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }

          .animate-pulse { animation: pulse 3s infinite ease-in-out; }
          @keyframes pulse {
            0% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.95; transform: scale(1.01); }
            100% { opacity: 1; transform: scale(1); }
          }
      `}</style>
    </div>
  )
}
