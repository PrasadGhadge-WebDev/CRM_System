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
    <div className="stack gap-32 invoice-profile-container">
      <PageHeader
        title="Customer Bill"
        backTo="/invoices"
        actions={
          <div className="control-bar-premium">
             {canEdit && remaining > 0 && (
               <button 
                 className="btn-premium action-vibrant" 
                 onClick={() => navigate(`/payments/new?invoiceId=${invoice.id}&customerId=${invoice.customer_id?._id || invoice.customer_id}`)}
                 style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
               >
                 <Icon name="plus" />
                 <span>Add Payment</span>
               </button>
             )}
             <button className="btn-premium action-vibrant" onClick={handlePayOnline} style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
              <Icon name="activity" />
              <span>Pay Now</span>
            </button>
             <button className="btn-premium action-info" onClick={handleShareWhatsApp}>
              <Icon name="phone" />
              <span>Share on WhatsApp</span>
            </button>
            <button className="btn-premium action-secondary" onClick={handlePrint}>
              <Icon name="reports" />
              <span>Print / Download PDF</span>
            </button>
            {canEdit && (
              <button className="btn-premium action-secondary" onClick={() => navigate(`/invoices/${invoice.id}/edit`)}>
                <Icon name="edit" />
                <span>Edit Bill</span>
              </button>
            )}
          </div>
        }
      />

      <section className="user-hero-shell" style={{ background: 'radial-gradient(circle at top left, rgba(59, 130, 246, 0.15), transparent 40%), linear-gradient(135deg, rgba(17, 24, 39, 0.98), rgba(15, 23, 42, 0.95))' }}>
        <div className="hero-glow hero-glow-a" style={{ background: 'rgba(59, 130, 246, 0.2)' }} />
        <div className="hero-glow hero-glow-b" style={{ background: 'rgba(37, 99, 235, 0.15)' }} />

        <div className="hero-topline">
          <span className={`status-pill ${invoice.status === 'Paid' ? 'badge-success-vibrant' : invoice.status === 'Overdue' ? 'badge-danger-vibrant' : 'badge-muted-vibrant'}`}>
            {invoice.status}
          </span>
          <span className="hero-meta-chip">Billed on {new Date(invoice.invoice_date).toLocaleDateString()}</span>
          {invoice.paid_date && (
            <span className="hero-meta-chip badge-success-vibrant">Settled on {new Date(invoice.paid_date).toLocaleDateString()}</span>
          )}
        </div>

        <div className="hero-main-row">
          <div className="hero-avatar-modern" aria-hidden="true" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
             <Icon name="billing" size={40} color="white" />
          </div>

          <div className="hero-copy">
            <h1 className="hero-name-modern">{formatCurrency(invoice.total_amount)}</h1>
            <div className="hero-subline">
              <div className="hero-subline-item">
                <Icon name="user" />
                <span>{invoice.customer_info?.name || invoice.customer_id?.name || 'Client'}</span>
              </div>
              <div className="hero-divider" />
              <div className="hero-subline-item">
                <Icon name="alert" />
                <span>Due: {new Date(invoice.due_date).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="hero-side-stack" style={{ gridTemplateColumns: 'repeat(3, 1fr)', width: 'auto', minWidth: '450px' }}>
            <div className="hero-stat-card">
              <span className="hero-stat-label">Total Billed</span>
              <span className="hero-stat-value">{formatCurrency(invoice.total_amount)}</span>
            </div>
            <div className="hero-stat-card">
              <span className="hero-stat-label">Total Received</span>
              <span className="hero-stat-value text-success">{formatCurrency(invoice.paid_amount || 0)}</span>
            </div>
            <div className="hero-stat-card">
              <span className="hero-stat-label">Balance Due</span>
              <span className={`hero-stat-value ${remaining > 0 ? 'text-danger' : 'text-success'}`}>{formatCurrency(remaining)}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="user-detail-grid">
        <div className="user-detail-main stack gap-24">
          <div className="invoice-container card p-40 stack gap-32 shadow-soft" id="printable-invoice" style={{ background: 'white', color: '#1a202c', border: 'none', borderRadius: '24px' }}>
            
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

            <div className="divider" style={{ height: '2px', background: '#edf2f7' }} />

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
            <table className="invoice-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
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

        <aside className="user-detail-side">
          <section className="detail-card accent-card" style={{ background: 'rgba(59, 130, 246, 0.03)', borderColor: 'rgba(59, 130, 246, 0.2)' }}>
            <div className="detail-card-header">
              <div className="detail-card-title">
                <Icon name="activity" />
                <h3>Payment Activity</h3>
              </div>
              <span className="detail-card-badge success">Live updates</span>
            </div>
            <div className="detail-card-body">
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
                  <div className="p-16 text-center muted italic border-subtle rounded-12">No payments received yet.</div>
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

          <section className="detail-card" style={{ background: 'rgba(59, 130, 246, 0.05)', borderColor: 'rgba(59, 130, 246, 0.2)' }}>
            <div className="stack tiny-gap align-center text-center">
              <div className="text-xs muted uppercase font-bold">Next Action</div>
              <button className="btn-modern-vibrant mt-12" onClick={() => window.print()}>
                <Icon name="reports" />
                <span>Send to Customer</span>
              </button>
            </div>
          </section>
        </aside>
      </div>

      <style>{`
        .invoice-profile-container { padding-bottom: 60px; }
        .control-bar-premium { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; justify-content: flex-end; }
        .btn-premium { display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 12px; font-weight: 700; font-size: 0.88rem; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border: 1px solid transparent; cursor: pointer; text-decoration: none; }
        .action-vibrant { background: var(--primary); color: white; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }
        .action-secondary { background: var(--bg-surface); color: var(--text-muted); border-color: var(--border); }
        .action-info { background: #25d366; color: white; box-shadow: 0 4px 12px rgba(37, 211, 102, 0.3); }
        .btn-premium:hover { transform: translateY(-2px); filter: brightness(1.05); }

        .user-hero-shell { position: relative; overflow: hidden; border: 1px solid var(--border); border-radius: 32px; padding: 32px; box-shadow: var(--shadow-xl); backdrop-filter: blur(14px); }
        .hero-glow { position: absolute; border-radius: 999px; filter: blur(40px); pointer-events: none; opacity: 0.5; }
        .hero-glow-a { top: -80px; left: -40px; width: 300px; height: 300px; }
        .hero-glow-b { right: -70px; bottom: -100px; width: 350px; height: 350px; }

        .hero-topline { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; position: relative; z-index: 1; }
        .status-pill, .hero-meta-chip { display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; font-size: 0.75rem; font-weight: 800; letter-spacing: 0.04em; padding: 7px 14px; text-transform: uppercase; }
        .badge-success-vibrant { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
        .badge-danger-vibrant { background: rgba(239, 68, 68, 0.12); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.28); }
        .badge-muted-vibrant { background: rgba(148, 163, 184, 0.12); color: rgba(255, 255, 255, 0.7); border: 1px solid rgba(148, 163, 184, 0.25); }
        .hero-meta-chip { background: rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.85); border: 1px solid rgba(255, 255, 255, 0.15); }

        .hero-main-row { display: flex; align-items: center; gap: 32px; justify-content: space-between; position: relative; z-index: 1; }
        .hero-avatar-modern { width: 100px; height: 100px; flex: 0 0 auto; border-radius: 30px; border: 2px solid rgba(255, 255, 255, 0.1); display: flex; align-items: center; justify-content: center; font-size: 3.2rem; font-weight: 900; color: white; box-shadow: 0 16px 32px rgba(0, 0, 0, 0.4); overflow: hidden; }
        .hero-name-modern { margin: 0 0 12px; font-size: clamp(2rem, 4vw, 3.2rem); line-height: 1; letter-spacing: -0.04em; color: white; font-weight: 900; }
        .hero-subline { display: flex; align-items: center; flex-wrap: wrap; gap: 16px; }
        .hero-subline-item { display: inline-flex; align-items: center; gap: 8px; color: rgba(255, 255, 255, 0.75); font-size: 0.95rem; font-weight: 500; }
        .hero-subline-item svg { color: var(--primary); width: 18px; }
        .hero-divider { width: 1px; height: 14px; background: rgba(255, 255, 255, 0.1); }

        .hero-side-stack { display: grid; gap: 14px; min-width: 280px; grid-template-columns: 1fr; }
        .hero-stat-card { padding: 16px 18px; border-radius: 18px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.24); }
        .hero-stat-label { display: block; color: rgba(255, 255, 255, 0.72); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; margin-bottom: 6px; }
        .hero-stat-value { color: white; font-weight: 700; line-height: 1.3; word-break: break-word; text-shadow: 0 1px 0 rgba(0, 0, 0, 0.2); }

        .user-detail-grid { display: flex; gap: 24px; align-items: start; }
        .user-detail-main { display: flex; flex-direction: column; gap: 24px; flex: 1 1 auto; min-width: 0; }
        .user-detail-side { width: 360px; flex: 0 0 auto; position: sticky; top: 96px; display: flex; flex-direction: column; gap: 24px; }

        .detail-card { background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); border-radius: 24px; overflow: hidden; padding: 24px; }
        .detail-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
        .detail-card-title { display: flex; align-items: center; gap: 12px; }
        .detail-card-title h3 { margin: 0; font-size: 1.05rem; font-weight: 800; color: white; }
        .detail-card-title svg { color: var(--primary); }
        
        .snapshot-list { display: flex; flex-direction: column; gap: 12px; }
        .snapshot-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-radius: 14px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); transition: all 0.2s; }
        .snapshot-row:hover { background: rgba(255,255,255,0.06); border-color: var(--primary); transform: translateX(4px); }
        .snapshot-label { font-size: 0.8rem; color: var(--text-muted); font-weight: 600; }
        .snapshot-value { color: white; font-weight: 800; text-align: right; }

        .btn-modern-vibrant { background: var(--primary); color: white; border: none; border-radius: 12px; padding: 14px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; transition: 0.2s; }
        .btn-modern-vibrant:hover { transform: translateY(-2px); box-shadow: 0 4px 12px var(--primary-soft); }

        .converted-link-premium { display: flex; align-items: center; gap: 16px; background: rgba(255,255,255,0.03); padding: 16px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); text-decoration: none; transition: all 0.2s; }
        .converted-link-premium:hover { border-color: var(--primary); transform: translateX(4px); }
        .link-icon { color: var(--primary); }
        .link-text strong { display: block; color: white; font-size: 0.9rem; }
        .link-text span { font-size: 0.75rem; color: var(--text-dimmed); }

        @media print {
          body * { visibility: hidden; }
          #printable-invoice, #printable-invoice * { visibility: visible; }
          #printable-invoice { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; padding: 0 !important; }
          .no-print { display: none !important; }
        }

        @media (max-width: 1024px) {
          .user-detail-grid { flex-direction: column; }
          .user-detail-side { width: 100%; position: static; }
          .hero-main-row { flex-direction: column; align-items: flex-start; }
          .hero-side-stack { width: 100%; grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </div>
  )
}
