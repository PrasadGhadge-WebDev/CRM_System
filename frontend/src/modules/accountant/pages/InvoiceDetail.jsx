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
    <div className="user-profile-container" style={{ background: 'var(--bg)', minHeight: '100vh', padding: '32px' }}>
      {/* Header Row */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Link to="/invoices" className="crm-btn-premium" style={{ background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)', padding: '8px 16px', fontSize: '0.85rem', boxShadow: 'var(--shadow-sm)', borderRadius: '8px' }}>
          <span>← Back</span>
        </Link>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
           {canEdit && remaining > 0 && (
             <button className="crm-btn-premium" onClick={() => navigate(`/payments/new?invoiceId=${invoice.id}&customerId=${invoice.customer_id?._id || invoice.customer_id}`)} style={{ background: 'var(--success)', color: '#ffffff', border: 'none', padding: '8px 16px', fontSize: '0.85rem', boxShadow: 'var(--shadow-sm)', borderRadius: '8px' }}>
               <Icon name="plus" />
               <span>Add Payment</span>
             </button>
           )}
           <button className="crm-btn-premium" onClick={handlePayOnline} style={{ background: '#7c3aed', color: '#ffffff', border: 'none', padding: '8px 16px', fontSize: '0.85rem', boxShadow: 'var(--shadow-sm)', borderRadius: '8px' }}>
             <Icon name="activity" />
             <span>Pay Now</span>
           </button>
           <button className="crm-btn-premium" onClick={handleShareWhatsApp} style={{ background: '#25d366', color: '#ffffff', border: 'none', padding: '8px 16px', fontSize: '0.85rem', boxShadow: 'var(--shadow-sm)', borderRadius: '8px' }}>
             <Icon name="phone" />
             <span>WhatsApp</span>
           </button>
           <button className="crm-btn-premium" onClick={handlePrint} style={{ background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)', padding: '8px 16px', fontSize: '0.85rem', boxShadow: 'var(--shadow-sm)', borderRadius: '8px' }}>
             <Icon name="reports" />
             <span>Print Bill</span>
           </button>
           {canEdit && (
             <button className="crm-btn-premium" onClick={() => navigate(`/invoices/${invoice.id}/edit`)} style={{ background: 'var(--primary)', color: '#ffffff', border: 'none', padding: '8px 24px', borderRadius: '8px', boxShadow: 'var(--shadow-sm)' }}>
               <Icon name="edit" />
               <span>Edit Bill</span>
             </button>
           )}
        </div>
      </div>

      {/* Profile Header Card */}
      <section className="no-print" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '32px', marginBottom: '24px', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--primary-soft)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 700, flexShrink: 0, boxShadow: 'inset 0 0 0 1px var(--primary-soft)' }}>
             <Icon name="billing" size={32} />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>{formatCurrency(invoice.total_amount)}</h1>
              <span style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', padding: '2px 12px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 600, border: '1px solid var(--border)' }}>
                {invoice.status}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: invoice.status === 'Paid' ? 'var(--success)' : 'var(--danger)', fontWeight: 600, marginLeft: '4px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: invoice.status === 'Paid' ? 'var(--success)' : 'var(--danger)' }} />
                <span>{invoice.status === 'Paid' ? 'Settled' : 'Pending'}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', color: 'var(--text-dimmed)', fontSize: '0.9rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Icon name="user" size={14} />
                <span>{invoice.customer_info?.name || invoice.customer_id?.name || 'Client'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Icon name="alert" size={14} />
                <span>Due: {new Date(invoice.due_date).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ height: '1px', background: 'var(--border)', margin: '24px 0' }} />

        {/* Time Stats Row */}
        <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <Icon name="clock" size={16} style={{ color: 'var(--text-dimmed)' }} />
             <span style={{ fontSize: '0.9rem', color: 'var(--text-dimmed)' }}>Total Amount:</span>
             <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>{formatCurrency(invoice.total_amount)}</span>
           </div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <Icon name="clock" size={16} style={{ color: 'var(--text-dimmed)' }} />
             <span style={{ fontSize: '0.9rem', color: 'var(--text-dimmed)' }}>Remaining:</span>
             <span style={{ fontSize: '0.9rem', fontWeight: 600, color: remaining > 0 ? 'var(--danger)' : 'var(--success)' }}>{formatCurrency(remaining)}</span>
           </div>
        </div>
      </section>

      {/* Main Grid */}
      <div className="crm-profile-grid-desktop no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        
        {/* Bill Details Card */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>Bill Overview</h3>
          </div>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Bill Number</label>
                <div style={{ color: 'var(--text)', fontWeight: 500 }}>#{invoice.invoice_number}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Total Billed</label>
                <div style={{ color: 'var(--text)', fontWeight: 700 }}>{formatCurrency(invoice.total_amount)}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Received</label>
                <div style={{ color: 'var(--success)', fontWeight: 700 }}>{formatCurrency(invoice.paid_amount || 0)}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Balance</label>
                <div style={{ color: remaining > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 700 }}>{formatCurrency(remaining)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Snapshot Table Card */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>Bill Snapshot</h3>
          </div>
          <div style={{ padding: '0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--border)' }}>
              <div style={{ padding: '20px 24px', borderRight: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dimmed)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📅</span> Bill Date
                </div>
                <div style={{ fontWeight: 600, color: 'var(--text)' }}>{new Date(invoice.invoice_date).toLocaleDateString()}</div>
              </div>
              <div style={{ padding: '20px 24px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dimmed)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>⚠️</span> Due Date
                </div>
                <div style={{ fontWeight: 600, color: remaining > 0 ? 'var(--danger)' : 'var(--text)' }}>{new Date(invoice.due_date).toLocaleDateString()}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              <div style={{ padding: '20px 24px', borderRight: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dimmed)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>👤</span> Client Name
                </div>
                <div style={{ fontWeight: 600, color: 'var(--text)' }}>{invoice.customer_info?.name || 'N/A'}</div>
              </div>
              <div style={{ padding: '20px 24px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dimmed)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>⚙️</span> Associated Deal
                </div>
                <div style={{ fontWeight: 600, color: 'var(--primary)' }}>
                   {invoice.deal_id ? (
                      <Link to={`/deals/${invoice.deal_id.id || invoice.deal_id}`} style={{ color: 'var(--primary)' }}>{invoice.deal_id.name || 'View Deal'}</Link>
                   ) : 'No Deal'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Printable Invoice Wrapper */}
      <div className="crm-detail-grid">
        <div className="crm-detail-main">
          <div className="invoice-container crm-detail-card no-padding overflow-hidden shadow-soft" id="printable-invoice" style={{ background: 'white', color: '#1a202c', border: 'none', borderRadius: '12px' }}>
            {/* Rest of the invoice content (lines 162-277) */}
            <div style={{ padding: '40px' }}>
              {/* Header Section */}
              <div className="row justify-between align-start">
                <div className="stack gap-12">
                  <div className="text-3xl font-black italic tracking-tighter" style={{ color: '#2563eb' }}>
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
                    <span className="font-black text-xl text-primary font-numeric" style={{ color: '#2563eb' }}>{formatCurrency(invoice.total_amount)}</span>
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

              <div className="divider mt-24" style={{ height: '4px', background: '#2563eb', opacity: 0.1, borderRadius: '99px' }} />
              <div className="text-center text-xs muted font-bold uppercase tracking-tighter">
                This is a computer generated document. No signature required.
              </div>
            </div>
          </div>
        </div>

        <aside className="crm-detail-side no-print">
          <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)', marginBottom: '24px' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>Payment Activity</h3>
            </div>
            <div style={{ padding: '24px' }}>
              <div className="snapshot-list">
                {payments.map(pay => (
                  <div key={pay.id} className="snapshot-row" style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }} onClick={() => navigate(`/payments/${pay.id}`)}>
                    <div className="stack tiny-gap">
                      <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text)' }}>{new Date(pay.payment_date).toLocaleDateString()}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)' }}>{pay.payment_method}</span>
                    </div>
                    <span style={{ fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(pay.amount)}</span>
                  </div>
                ))}
                {payments.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dimmed)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                    No payments documented.
                  </div>
                )}
              </div>
            </div>
          </section>

          <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'var(--text-dimmed)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '16px' }}>Ready for Dispatch?</div>
              <button className="crm-btn-premium" style={{ width: '100%', background: 'var(--primary)', color: '#ffffff', border: 'none', justifyContent: 'center' }} onClick={handlePrint}>
                <Icon name="reports" />
                <span>Download as PDF</span>
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
