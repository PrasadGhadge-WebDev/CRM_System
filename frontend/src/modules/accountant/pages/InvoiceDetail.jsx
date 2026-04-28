import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { invoicesApi } from '../../../services/invoices'
import { paymentsApi } from '../../../services/payments'
import { formatCurrency } from '../../../utils/formatters'
import { Icon } from '../../../layouts/icons'
import PageHeader from '../../../components/PageHeader.jsx'
import { toast } from 'react-toastify'

import { useAuth } from '../../../context/AuthContext'

export default function InvoiceDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [invoice, setInvoice] = useState(null)
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  const canEdit = ['Admin', 'Accountant'].includes(user?.role)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [invData, payData] = await Promise.all([
          invoicesApi.get(id),
          paymentsApi.list({ invoice_id: id, limit: 100 })
        ])
        setInvoice(invData)
        setPayments(payData.items || [])
      } catch (err) {
        toast.error('Failed to load bill details')
        navigate('/invoices')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id, navigate])

  if (loading) return <div className="p-24 muted">Loading bill details...</div>
  if (!invoice) return <div className="p-24 muted">Bill not found</div>

  const remaining = invoice.total_amount - (invoice.paid_amount || 0)

  const handleShareWhatsApp = async () => {
    window.open(`https://wa.me/${invoice.customer_info?.phone || invoice.customer_id?.phone}?text=Hello, your bill #${invoice.invoice_number} for ${formatCurrency(invoice.total_amount)} is ready.`)
    try {
      await invoicesApi.logAction(id, 'Shared via WhatsApp')
    } catch (err) {
      console.error('Failed to log share action', err)
    }
  }

  const handlePrint = async () => {
    window.print()
    try {
      await invoicesApi.logAction(id, 'Printed / Saved as PDF')
    } catch (err) {
      console.error('Failed to log print action', err)
    }
  }

  const handlePayOnline = () => {
    toast.info('Razorpay Integration Coming Soon! This will open the secure payment gateway.')
  }

  return (
    <div className="crm-fullscreen-shell">
      <PageHeader
        title="Customer Bill"
        backTo="/invoices"
        actions={
          <div className="flex gap-12 align-center">
             {canEdit && remaining > 0 && (
               <button 
                 className="crm-btn-premium vibrant" 
                 onClick={() => navigate(`/payments/new?invoiceId=${invoice.id}&customerId=${invoice.customer_id?._id || invoice.customer_id}`)}
                 style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
               >
                 <Icon name="plus" />
                 <span>Add Payment</span>
               </button>
             )}
             <button className="crm-btn-premium vibrant" onClick={handlePayOnline} style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
              <Icon name="activity" />
              <span>Pay Now</span>
            </button>
             <button className="crm-btn-premium vibrant" onClick={handleShareWhatsApp} style={{ background: '#25d366' }}>
              <Icon name="phone" />
              <span>Share WhatsApp</span>
            </button>
            <button className="crm-btn-premium glass" onClick={handlePrint}>
              <Icon name="reports" />
              <span>Print Bill</span>
            </button>
            {canEdit && (
              <button className="crm-btn-premium glass" onClick={() => navigate(`/invoices/${invoice.id}/edit`)}>
                <Icon name="edit" />
                <span>Edit</span>
              </button>
            )}
          </div>
        }
      />

      <section className="crm-hero-shell">
        <div className="crm-hero-glow crm-hero-glow-1" />
        <div className="crm-hero-glow crm-hero-glow-2" />

        <div className="crm-hero-topline">
          <span className={`status-pill ${invoice.status === 'Paid' ? 'Paid' : invoice.status === 'Overdue' ? 'Lost' : 'Contacted'}`}>
            {invoice.status}
          </span>
          <span className="hero-meta-chip">Billed on {new Date(invoice.invoice_date).toLocaleDateString()}</span>
          {invoice.paid_date && (
            <span className="hero-meta-chip" style={{ color: '#34d399', borderColor: 'rgba(52, 211, 153, 0.3)' }}>Settled {new Date(invoice.paid_date).toLocaleDateString()}</span>
          )}
        </div>

        <div className="crm-hero-main-row">
          <div className="crm-hero-avatar">
             <Icon name="billing" size={40} />
          </div>

          <div className="crm-hero-copy">
            <h1 className="crm-hero-name">{formatCurrency(invoice.total_amount)}</h1>
            <div className="crm-hero-subline">
              <div className="crm-hero-subline-item">
                <Icon name="user" />
                <span>{invoice.customer_info?.name || invoice.customer_id?.name || 'Client'}</span>
              </div>
              <div className="crm-hero-divider" />
              <div className="crm-hero-subline-item">
                <Icon name="alert" />
                <span>Due: {new Date(invoice.due_date).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="crm-hero-side-stack" style={{ gridTemplateColumns: 'repeat(3, 1fr)', width: 'auto', minWidth: '480px' }}>
            <div className="crm-hero-stat-card">
              <span className="crm-hero-stat-label">Total Billed</span>
              <span className="crm-hero-stat-value">{formatCurrency(invoice.total_amount)}</span>
            </div>
            <div className="crm-hero-stat-card">
              <span className="crm-hero-stat-label">Received</span>
              <span className="crm-hero-stat-value" style={{ color: '#34d399' }}>{formatCurrency(invoice.paid_amount || 0)}</span>
            </div>
            <div className="crm-hero-stat-card">
              <span className="crm-hero-stat-label">Balance</span>
              <span className="crm-hero-stat-value" style={{ color: remaining > 0 ? '#f87171' : '#34d399' }}>{formatCurrency(remaining)}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="crm-detail-grid">
        <div className="crm-detail-main">
          <div className="invoice-container crm-detail-card no-padding overflow-hidden shadow-soft" id="printable-invoice" style={{ background: 'white', color: '#1a202c', border: 'none' }}>
            <div style={{ padding: '40px' }}>
              {/* Header Section */}
              <div className="row justify-between align-start">
                <div className="stack gap-12">
                  <div className="text-3xl font-black italic tracking-tighter" style={{ color: 'var(--primary)' }}>
                     {invoice.company_info?.name?.toUpperCase() || 'COMPANY NAME'}
                  </div>
                  <div className="text-sm muted stack gap-2 max-w-200">
                    <div>{invoice.company_info?.address}</div>
                    <div>Ph: {invoice.company_info?.phone}</div>
                    {invoice.gst_number && <div className="font-bold">GST: {invoice.gst_number}</div>}
                  </div>
                </div>
                <div className="text-right stack gap-4">
                  <div className="text-2xl font-bold uppercase tracking-widest text-muted">Bill / Invoice</div>
                  <div className="font-numeric font-bold text-lg">#{invoice.invoice_number}</div>
                  <div className="mt-8 stack gap-2 text-sm">
                    <div className="font-bold">Date: {new Date(invoice.invoice_date).toLocaleDateString()}</div>
                    <div className="text-danger font-bold">Due Date: {new Date(invoice.due_date).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>

              <div className="divider" style={{ height: '2px', background: '#edf2f7', margin: '32px 0' }} />

              {/* Customer Section */}
              <div className="grid2 gap-40 py-8">
                <div className="stack gap-12">
                  <div className="muted text-xs uppercase font-black tracking-widest">Bill To:</div>
                  <div className="stack gap-2">
                    <div className="text-xl font-bold">{invoice.customer_info?.name || invoice.customer_id?.name}</div>
                    <div className="text-sm">{invoice.customer_info?.phone || invoice.customer_id?.phone}</div>
                    <div className="text-sm">{invoice.customer_info?.email || invoice.customer_id?.email}</div>
                    <div className="text-sm max-w-300 mt-4 italic">{invoice.customer_info?.address || invoice.customer_id?.address}</div>
                  </div>
                </div>
                <div className="stack gap-12 text-right">
                  <div className="muted text-xs uppercase font-black tracking-widest">Payment Status:</div>
                  <div className={`text-2xl font-black ${invoice.status === 'Paid' ? 'text-success' : 'text-danger'}`}>
                    {invoice.status?.toUpperCase()}
                  </div>
                  {invoice.paid_date && (
                    <div className="text-sm muted">Settled on: {new Date(invoice.paid_date).toLocaleDateString()}</div>
                  )}
                </div>
              </div>

              {/* Table Section */}
              <table className="invoice-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '32px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                    <th className="py-16 px-12 uppercase text-xs font-black">Description</th>
                    <th className="py-16 px-12 text-center uppercase text-xs font-black">Qty</th>
                    <th className="py-16 px-12 text-right uppercase text-xs font-black">Unit Price</th>
                    <th className="py-16 px-12 text-right uppercase text-xs font-black">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #edf2f7' }}>
                      <td className="py-16 px-12 font-medium">{item.description}</td>
                      <td className="py-16 px-12 text-center font-numeric">{item.quantity}</td>
                      <td className="py-16 px-12 text-right font-numeric">{formatCurrency(item.price)}</td>
                      <td className="py-16 px-12 text-right font-bold font-numeric">{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Footer Calculation */}
              <div className="row justify-between align-end mt-16 pt-24 border-top">
                <div className="stack gap-12 max-w-400">
                  <div className="stack gap-4">
                    <div className="muted text-xs uppercase font-black tracking-widest">Notes & Terms:</div>
                    <div className="text-sm italic" style={{ whiteSpace: 'pre-wrap' }}>
                      {invoice.terms_and_conditions || invoice.notes || 'Payment is due within the stipulated time. Thank you for your business!'}
                    </div>
                  </div>
                </div>

                <div className="stack gap-12" style={{ width: '320px' }}>
                  <div className="row justify-between text-sm">
                    <span className="muted font-bold">Subtotal:</span>
                    <span className="font-numeric font-bold">{formatCurrency(invoice.subtotal)}</span>
                  </div>
                  {invoice.discount > 0 && (
                    <div className="row justify-between text-sm text-danger">
                      <span className="font-bold">Discount:</span>
                      <span className="font-numeric font-bold">- {formatCurrency(invoice.discount)}</span>
                    </div>
                  )}
                  <div className="row justify-between text-sm">
                    <span className="muted font-bold">Tax / GST (0%):</span>
                    <span className="font-numeric font-bold">{formatCurrency(invoice.tax_amount || 0)}</span>
                  </div>
                  <div className="row justify-between border-top pt-12 mt-4">
                    <span className="font-black text-xl uppercase">Total Amount:</span>
                    <span className="font-black text-xl text-primary font-numeric">{formatCurrency(invoice.total_amount)}</span>
                  </div>
                  <div className="row justify-between mt-8 p-12 rounded-12" style={{ background: remaining > 0 ? '#fff5f5' : '#f0fff4' }}>
                    <span className={`font-bold ${remaining > 0 ? 'text-danger' : 'text-success'}`}>
                      {remaining > 0 ? 'Balance Remaining:' : 'Payment Received:'}
                    </span>
                    <span className={`font-black font-numeric ${remaining > 0 ? 'text-danger' : 'text-success'}`}>
                      {formatCurrency(remaining > 0 ? remaining : invoice.paid_amount)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="divider mt-24" style={{ height: '4px', background: 'var(--primary)', opacity: 0.1, borderRadius: '99px' }} />
              <div className="text-center text-xs muted font-bold uppercase tracking-tighter">
                This is a computer generated document. No signature required.
              </div>
            </div>
          </div>
        </div>

        <aside className="crm-detail-side">
          <section className="crm-detail-card accent-card">
            <div className="crm-detail-card-header">
              <div className="crm-detail-card-title">
                <Icon name="activity" />
                <h3>Payment Activity</h3>
              </div>
            </div>
            <div className="crm-detail-card-body">
              <div className="snapshot-list">
                {payments.map(pay => (
                  <div key={pay.id} className="snapshot-row" style={{ cursor: 'pointer' }} onClick={() => navigate(`/payments/${pay.id}`)}>
                    <div className="stack tiny-gap">
                      <span className="snapshot-label">{new Date(pay.payment_date).toLocaleDateString()}</span>
                      <span className="text-xs muted">{pay.payment_method}</span>
                    </div>
                    <span className="snapshot-value text-success">{formatCurrency(pay.amount)}</span>
                  </div>
                ))}
                {payments.length === 0 && (
                  <div className="center padding-24 muted italic" style={{ border: '1px dashed var(--border)', borderRadius: '12px' }}>
                    No payments yet.
                  </div>
                )}
              </div>
            </div>
          </section>

          {invoice.deal_id && (
            <Link to={`/deals/${invoice.deal_id.id || invoice.deal_id}`} className="converted-link-premium">
              <div className="link-icon"><Icon name="deals" /></div>
              <div className="link-text">
                <strong>Linked Deal: {invoice.deal_id.name}</strong>
                <span>Back to sales pipeline</span>
              </div>
            </Link>
          )}

          <section className="crm-detail-card">
            <div className="center text-center">
              <div className="muted text-xs uppercase font-black margin-bottom-12">Next Action Intelligence</div>
              <button className="crm-btn-premium vibrant full-width" style={{ justifyContent: 'center' }} onClick={() => window.print()}>
                <Icon name="reports" />
                <span>Dispatch to Client</span>
              </button>
            </div>
          </section>
        </aside>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-invoice, #printable-invoice * { visibility: visible; }
          #printable-invoice { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; padding: 0 !important; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  )
}
