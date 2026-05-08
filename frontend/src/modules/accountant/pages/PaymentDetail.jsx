import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { paymentsApi } from '../../../services/payments'
import { formatCurrency } from '../../../utils/formatters'
import { Icon } from '../../../layouts/icons'
import PageHeader from '../../../components/PageHeader.jsx'
import { toast } from 'react-toastify'

import BackButton from '../../../components/BackButton.jsx'

export default function PaymentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [payment, setPayment] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    paymentsApi.get(id)
      .then(setPayment)
      .catch(err => {
        toast.error('Failed to load payment details')
        navigate('/payments')
      })
      .finally(() => setLoading(false))
  }, [id, navigate])

  if (loading) return <div className="p-24 muted">Loading payment details...</div>
  if (!payment) return <div className="p-24 muted">Payment not found</div>

  return (
    <div className="user-profile-container" style={{ background: 'var(--bg)', minHeight: '100vh', padding: '32px' }}>
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }} className="print:hidden">
        <BackButton to="/payments" text="Back to Payments" />
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="crm-btn-premium" onClick={() => window.print()} style={{ background: 'var(--success)', color: '#ffffff', border: 'none', padding: '8px 24px', borderRadius: '8px', boxShadow: 'var(--shadow-sm)' }}>
            <Icon name="reports" />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>

      {/* Profile Header Card */}
      <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '32px', marginBottom: '24px', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--success-soft)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 700, flexShrink: 0, boxShadow: 'inset 0 0 0 1px var(--success-soft)' }}>
             <Icon name="billing" size={32} />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>{formatCurrency(payment.paid_amount)}</h1>
              <span style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', padding: '2px 12px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 600, border: '1px solid var(--border)' }}>
                {payment.status === 'Paid' ? 'Full Payment' : 'Partial Payment'}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: payment.status === 'Paid' ? 'var(--success)' : 'var(--warning)', fontWeight: 600, marginLeft: '4px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: payment.status === 'Paid' ? 'var(--success)' : 'var(--warning)' }} />
                <span>{payment.status}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', color: 'var(--text-dimmed)', fontSize: '0.9rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Icon name="user" size={14} />
                <span>{payment.customer_id?.name || 'Unknown Client'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Icon name="activity" size={14} />
                <span>{payment.payment_mode}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ height: '1px', background: 'var(--border)', margin: '24px 0' }} />

        {/* Time Stats Row */}
        <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <Icon name="clock" size={16} style={{ color: 'var(--text-dimmed)' }} />
             <span style={{ fontSize: '0.9rem', color: 'var(--text-dimmed)' }}>Date:</span>
             <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>{new Date(payment.payment_date).toLocaleDateString()}</span>
           </div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <Icon name="clock" size={16} style={{ color: 'var(--text-dimmed)' }} />
             <span style={{ fontSize: '0.9rem', color: 'var(--text-dimmed)' }}>Payment ID:</span>
             <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary)' }}>#{payment.payment_number}</span>
           </div>
        </div>
      </section>

      {/* Main Grid */}
      <div className="crm-profile-grid-desktop" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        
        {/* Payment Details Card */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>Transaction Summary</h3>
          </div>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Total Amount</label>
                <div style={{ color: 'var(--text)', fontWeight: 700 }}>{formatCurrency(payment.total_amount)}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Paid Amount</label>
                <div style={{ color: 'var(--success)', fontWeight: 700 }}>{formatCurrency(payment.paid_amount)}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Pending Balance</label>
                <div style={{ color: payment.pending_amount > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 700 }}>{formatCurrency(payment.pending_amount)}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Status</label>
                <div style={{ 
                  color: payment.status === 'Paid' ? 'var(--success)' : 
                         payment.status === 'Failed' ? 'var(--danger)' : 'var(--warning)', 
                  fontWeight: 700 
                }}>
                  {payment.status}
                </div>
              </div>
            </div>

            <div style={{ height: '1px', background: 'var(--border)', margin: '16px 0' }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Payment Mode</label>
                <div style={{ color: 'var(--text)', fontWeight: 500 }}>{payment.payment_mode}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Transaction ID</label>
                <div style={{ color: 'var(--text)', fontWeight: 500 }}>{payment.transaction_id || 'N/A'}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Collected By</label>
                <div style={{ color: 'var(--text)', fontWeight: 500 }}>{payment.collected_by?.name || 'Staff'}</div>
              </div>
            </div>

            {payment.notes && (
              <div style={{ marginTop: '20px' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Internal Notes</label>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.6' }}>{payment.notes}</div>
              </div>
            )}
          </div>
        </div>

        {/* Registry Snapshot Card */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>Registry Snapshot</h3>
          </div>
          <div style={{ padding: '0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--border)' }}>
              <div style={{ padding: '20px 24px', borderRight: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dimmed)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📄</span> Linked Invoice
                </div>
                <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                   {payment.invoice_id ? (
                      <Link to={`/invoices/${payment.invoice_id.id || payment.invoice_id._id || payment.invoice_id}`} style={{ color: 'var(--primary)' }}>#{payment.invoice_id.invoice_number}</Link>
                   ) : 'No Invoice'}
                </div>
              </div>
              <div style={{ padding: '20px 24px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dimmed)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🤝</span> Associated Deal
                </div>
                <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                   {payment.deal_id ? (
                      <Link to={`/deals/${payment.deal_id.id || payment.deal_id._id || payment.deal_id}`} style={{ color: 'var(--primary)' }}>{payment.deal_id.name}</Link>
                   ) : 'No Deal'}
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              <div style={{ padding: '20px 24px', borderRight: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dimmed)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>👤</span> Customer
                </div>
                <div style={{ fontWeight: 600, color: 'var(--text)' }}>{payment.customer_id?.name || 'N/A'}</div>
              </div>
              <div style={{ padding: '20px 24px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dimmed)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🛡️</span> Audit
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)', fontWeight: 700 }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)' }} />
                  Verified
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Printable Receipt Wrapper */}
      <div id="printable-receipt" style={{ display: 'none' }}>
        <div style={{ padding: '40px', background: 'white', color: '#111827', fontFamily: "'Inter', system-ui, sans-serif", border: '1px solid #e5e7eb' }}>
          {/* Receipt Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
            <div>
              <div style={{ background: '#4f46e5', color: 'white', display: 'inline-block', padding: '4px 12px', borderRadius: '4px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', marginBottom: '12px' }}>
                Official Receipt
              </div>
              <h1 style={{ fontSize: '32px', fontWeight: 900, margin: 0, color: '#111827', letterSpacing: '-0.02em' }}>PAYMENT RECEIPT</h1>
              <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>No: <span style={{ fontWeight: 700, color: '#111827' }}>#{payment.payment_number}</span></p>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>Date: <span style={{ fontWeight: 700, color: '#111827' }}>{new Date(payment.payment_date).toLocaleDateString()}</span></p>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 900, margin: 0, color: '#4f46e5' }}>DIVINE TECHNOLOGIES</h2>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0', lineHeight: '1.5' }}>
                Pune, Maharashtra, India<br/>
                contact@divinetech.com
              </p>
            </div>
          </div>

          <div style={{ height: '2px', background: '#f3f4f6', marginBottom: '40px' }} />

          {/* Parties Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '40px' }}>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Received From</p>
              <div style={{ background: '#f9fafb', padding: '20px', borderRadius: '12px', border: '1px solid #f3f4f6' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px 0', color: '#111827' }}>{payment.customer_id?.name || 'Valued Customer'}</h3>
                <p style={{ fontSize: '14px', color: '#4b5563', margin: '0 0 12px 0' }}>{payment.customer_id?.phone || 'No Phone Recorded'}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#6b7280' }}>
                  <span style={{ background: '#e5e7eb', padding: '2px 8px', borderRadius: '100px', fontWeight: 700 }}>CLIENT</span>
                  <span>Verified Account</span>
                </div>
              </div>
            </div>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Transaction Info</p>
              <div style={{ padding: '4px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>Payment Method</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>{payment.payment_mode}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>Reference ID</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>{payment.transaction_id || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>Invoice Ref</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#4f46e5' }}>#{payment.invoice_id?.invoice_number || 'Direct Payment'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div style={{ borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden', marginBottom: '40px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase' }}>Description</th>
                  <th style={{ padding: '14px 24px', textAlign: 'right', fontSize: '11px', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '24px', fontSize: '15px', color: '#111827' }}>
                    <div style={{ fontWeight: 800 }}>Payment for Deal</div>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>{payment.deal_id?.name || 'Professional Services / General Deal'}</div>
                  </td>
                  <td style={{ padding: '24px', textAlign: 'right', fontSize: '16px', fontWeight: 800, color: '#111827' }}>
                    {formatCurrency(payment.paid_amount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '60px' }}>
            <div style={{ width: '320px', background: '#f9fafb', borderRadius: '16px', padding: '24px', border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>Total Due</span>
                <span style={{ fontSize: '14px', fontWeight: 600 }}>{formatCurrency(payment.total_amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', color: '#059669' }}>
                <span style={{ fontSize: '14px', fontWeight: 600 }}>Amount Paid Today</span>
                <span style={{ fontSize: '14px', fontWeight: 800 }}>{formatCurrency(payment.paid_amount)}</span>
              </div>
              <div style={{ height: '1px', background: '#e5e7eb', marginBottom: '16px' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#111827' }}>Remaining Balance</span>
                <span style={{ 
                  fontSize: '20px', 
                  fontWeight: 900, 
                  color: payment.pending_amount > 0 ? '#dc2626' : '#059669',
                  background: payment.pending_amount > 0 ? '#fef2f2' : '#ecfdf5',
                  padding: '4px 12px',
                  borderRadius: '8px'
                }}>
                  {formatCurrency(payment.pending_amount)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ borderTop: '1px dashed #e5e7eb', paddingTop: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <h4 style={{ fontSize: '12px', fontWeight: 800, margin: '0 0 8px 0', textTransform: 'uppercase', color: '#111827' }}>Notes & Acknowledgement</h4>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, maxWidth: '400px', lineHeight: '1.6' }}>
                This is a computer-generated receipt and does not require a physical signature. 
                Thank you for your business. For any queries regarding this payment, please quote the Payment ID mentioned above.
              </p>
            </div>
            <div style={{ textAlign: 'center', width: '200px' }}>
              <div style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#e5e7eb', fontSize: '24px', fontStyle: 'italic' }}>Divine Tech</span>
              </div>
              <div style={{ borderTop: '1px solid #111827', marginTop: '12px', paddingTop: '8px' }}>
                <p style={{ fontSize: '12px', fontWeight: 800, margin: 0, textTransform: 'uppercase' }}>Authorized Signatory</p>
              </div>
            </div>
          </div>
        </div>
      </div>


      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-receipt, #printable-receipt * { visibility: visible; display: block !important; }
          #printable-receipt { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; }
        }
        @media (max-width: 900px) {
          .crm-profile-grid-desktop {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
