import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '../../../layouts/icons'
import { paymentsApi } from '../../../services/payments'
import { formatCurrency } from '../../../utils/formatters'
import { toast } from 'react-toastify'
import { useAuth } from '../../../context/AuthContext'
import PageHeader from '../../../components/PageHeader.jsx'

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
  const navigate = useNavigate()

  const canAdd = ['Admin', 'Accountant'].includes(user?.role)
  const canDelete = user?.role === 'Admin'

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true)
      const res = await paymentsApi.list({ q, payment_method: method, startDate, endDate, page, limit })
      setPayments(res.items || [])
      setTotal(res.total || 0)
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
        <PageHeader
          title="Payments Received"
          description="Track and manage all customer payments in one place."
          backTo="/"
          actions={canAdd && (
            <div className="crm-flex-end">
              <button className="btn-premium action-vibrant" onClick={() => navigate('/payments/new')}>
                <Icon name="plus" />
                <span>Add Payment</span>
              </button>
            </div>
          )}
        />

        <div className="crm-filter-panel">
          <div className="crm-filter-cell">
            <label className="crm-filter-label">Search Payments</label>
            <div className="crm-search-input-wrap">
              <Icon name="search" className="search-icon" />
              <input type="text" placeholder="Payment #, Customer Name..." value={q} onChange={e => { setQ(e.target.value); setPage(1); }} />
            </div>
          </div>

          <div className="crm-filter-cell">
            <label className="crm-filter-label">Payment Method</label>
            <select className="crm-input" value={method} onChange={e => { setMethod(e.target.value); setPage(1); }}>
              <option value="">All Methods</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Online">Online</option>
              <option value="Cheque">Cheque</option>
              <option value="UPI">UPI</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="crm-filter-cell">
            <label className="crm-filter-label">Start Date</label>
            <input type="date" className="crm-input" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }} />
          </div>

          <div className="crm-filter-cell">
            <label className="crm-filter-label">End Date</label>
            <input type="date" className="crm-input" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }} />
          </div>
        </div>

        {loading ? (
          <div className="leadsLoadingState" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border-subtle)', borderRadius: '32px', minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
            <div className="spinner-medium" />
            <span className="muted">Loading payment history...</span>
          </div>
        ) : (
          <>
            <div className="crm-table-wrap shadow-soft">
              <div className="crm-table-scroll">
                <table className="crm-table">
                  <thead>
                    <tr>
                      <th style={{ width: '150px' }}>PAYMENT #</th>
                      <th style={{ width: '140px' }}>DATE</th>
                      <th style={{ minWidth: '200px' }}>CUSTOMER NAME</th>
                      <th style={{ width: '160px' }}>BILL NUMBER</th>
                      <th style={{ width: '140px' }}>PAYMENT METHOD</th>
                      <th style={{ width: '160px' }}>AMOUNT</th>
                      {canDelete && <th className="text-right" style={{ width: '100px' }}>ACTION</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.length ? (
                      payments.map(pay => (
                        <tr key={pay.id} className="crm-table-row clickable" onClick={() => navigate(`/payments/${pay.id}`)}>
                          <td><span className="font-numeric" style={{ color: 'var(--primary)', fontWeight: 800 }}>#{pay.payment_number}</span></td>
                          <td><span className="text-sm">{new Date(pay.payment_date).toLocaleDateString()}</span></td>
                          <td><span className="font-bold" style={{ color: 'var(--text)' }}>{pay.customer_id?.name || 'Customer'}</span></td>
                          <td>
                            {pay.invoice_id?.invoice_number ? (
                              <Link to={`/invoices/${pay.invoice_id.id}`} className="text-sm" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>
                                #{pay.invoice_id.invoice_number}
                              </Link>
                            ) : <span className="muted text-xs">UNLINKED</span>}
                          </td>
                          <td><span className="crm-status-pill info">{pay.payment_method}</span></td>
                          <td><span className="font-numeric" style={{ fontWeight: 800, color: '#10b981' }}>{formatCurrency(pay.amount)}</span></td>
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
                            <h3>No Payments Found</h3>
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
                <button className="btn-premium action-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
                <span className="text-sm muted" style={{ display: 'flex', alignItems: 'center' }}>Page {page}</span>
                <button className="btn-premium action-secondary" disabled={page * limit >= total} onClick={() => setPage(p => p + 1)}>Next</button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
