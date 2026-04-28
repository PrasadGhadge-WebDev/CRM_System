import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '../../../layouts/icons'
import { invoicesApi } from '../../../services/invoices'
import { formatCurrency } from '../../../utils/formatters'
import { toast } from 'react-toastify'
import { useAuth } from '../../../context/AuthContext'
import PageHeader from '../../../components/PageHeader.jsx'

export default function InvoicesList() {
  const { user } = useAuth()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20
  const navigate = useNavigate()

  const canAdd = ['Admin', 'Accountant'].includes(user?.role)
  const canEdit = ['Admin', 'Accountant'].includes(user?.role)
  const canDelete = user?.role === 'Admin'

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true)
      const res = await invoicesApi.list({ q, status, page, limit, startDate, endDate })
      setInvoices(res.items || [])
      setTotal(res.total || 0)
    } catch (err) {
      toast.error('Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }, [q, status, page])

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

  return (
    <div className="stack">
      <section className="crm-fullscreen-shell">
        <PageHeader
          title="Invoices"
          description="Track and manage all customer bills and invoices."
          backTo="/"
        />

        <div className="crm-filter-panel">
          <div className="crm-filter-cell">
            <label className="crm-filter-label">Search Invoices</label>
            <div className="crm-search-input-wrap">
              <Icon name="search" className="search-icon" />
              <input type="text" placeholder="Invoice #, Customer name..." value={q} onChange={e => setQ(e.target.value)} />
            </div>
          </div>
          <div className="crm-filter-cell">
            <label className="crm-filter-label">Status</label>
            <select className="crm-input" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All Invoices</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Paid">Paid</option>
              <option value="Overdue">Overdue</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <div className="crm-filter-cell">
            <label className="crm-filter-label">From Date</label>
            <input type="date" className="crm-input" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }} />
          </div>
          <div className="crm-filter-cell">
            <label className="crm-filter-label">To Date</label>
            <input type="date" className="crm-input" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }} />
          </div>
        </div>

        {loading ? (
          <div className="leadsLoadingState" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border-subtle)', borderRadius: '32px', minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
            <div className="spinner-medium" />
            <span className="muted">Loading invoices...</span>
          </div>
        ) : (
          <>
            <div className="crm-table-wrap shadow-soft">
              <div className="crm-table-scroll">
                <table className="crm-table">
                  <thead>
                    <tr>
                      <th style={{ width: '140px' }}>INVOICE #</th>
                      <th style={{ width: '140px' }}>DATE</th>
                      <th style={{ minWidth: '220px' }}>CUSTOMER NAME</th>
                      <th style={{ width: '160px' }}>TOTAL AMOUNT</th>
                      <th style={{ width: '130px' }}>STATUS</th>
                      {(canEdit || canDelete) && <th className="text-right" style={{ width: '120px' }}>ACTION</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.length ? (
                      invoices.map(inv => (
                        <tr key={inv.id} className="crm-table-row" onClick={() => navigate(`/invoices/${inv.id}`)}>
                          <td><span className="font-numeric" style={{ color: 'var(--primary)', fontWeight: 800 }}>#{inv.invoice_number}</span></td>
                          <td><span className="text-sm">{new Date(inv.invoice_date).toLocaleDateString()}</span></td>
                          <td>
                            <div className="stack gap-2">
                              <span className="font-bold" style={{ color: 'var(--text)' }}>{inv.customer_id?.name || 'Customer'}</span>
                              <span className="text-xs muted uppercase">{inv.customer_id?.company || 'Personal'}</span>
                            </div>
                          </td>
                          <td><span className="font-numeric" style={{ color: 'var(--primary)', fontWeight: 800 }}>{formatCurrency(inv.total_amount)}</span></td>
                          <td>
                            <span className={`crm-status-pill ${inv.status === 'Paid' ? 'success' : inv.status === 'Overdue' ? 'danger' : 'warning'}`}>
                              {inv.status}
                            </span>
                          </td>
                          {(canEdit || canDelete) && (
                            <td className="text-right" onClick={e => e.stopPropagation()}>
                              <div className="crm-action-group">
                                {canEdit && <button className="crm-action-btn" onClick={() => navigate(`/invoices/${inv.id}`)}><Icon name="edit" size={14} /></button>}
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
                            <h3>No Invoices Found</h3>
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
                <button className="btn-premium action-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
                <span className="text-sm muted" style={{ display: 'flex', alignItems: 'center' }}>Page {page} of {Math.ceil(total / limit)}</span>
                <button className="btn-premium action-secondary" disabled={page * limit >= total} onClick={() => setPage(p => p + 1)}>Next</button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
