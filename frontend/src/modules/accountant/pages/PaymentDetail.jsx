import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { paymentsApi } from '../../../services/payments'
import { formatCurrency } from '../../../utils/formatters'
import { Icon } from '../../../layouts/icons'
import PageHeader from '../../../components/PageHeader.jsx'
import { toast } from 'react-toastify'

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <button onClick={() => navigate('/payments')} className="back-btn-modern">
          <Icon name="chevronLeft" />
          <span>Back to Payments</span>
        </button>
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
              <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>{formatCurrency(payment.amount)}</h1>
              <span style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', padding: '2px 12px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 600, border: '1px solid var(--border)' }}>
                Payment Received
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--success)', fontWeight: 600, marginLeft: '4px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }} />
                <span>Verified</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', color: 'var(--text-dimmed)', fontSize: '0.9rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Icon name="user" size={14} />
                <span>{payment.customer_id?.name || 'Unknown Client'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Icon name="activity" size={14} />
                <span>{payment.payment_method}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ height: '1px', background: 'var(--border)', margin: '24px 0' }} />

        {/* Time Stats Row */}
        <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <Icon name="clock" size={16} style={{ color: 'var(--text-dimmed)' }} />
             <span style={{ fontSize: '0.9rem', color: 'var(--text-dimmed)' }}>Received On:</span>
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
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>Transaction Details</h3>
          </div>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Paid Amount</label>
                <div style={{ color: 'var(--success)', fontWeight: 700 }}>{formatCurrency(payment.amount)}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Method</label>
                <div style={{ color: 'var(--text)', fontWeight: 500 }}>{payment.payment_method}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  {payment.payment_method === 'Cheque' ? 'Cheque Number' : 'Transaction ID'}
                </label>
                <div style={{ color: 'var(--text)', fontWeight: 500 }}>
                  {payment.payment_method === 'Cheque' ? (payment.cheque_number || '—') : (payment.transaction_id || '—')}
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Status</label>
                <div style={{ 
                  color: payment.status === 'Completed' || payment.status === 'Verified' ? 'var(--success)' : 
                         payment.status === 'Failed' ? 'var(--danger)' : 'var(--warning)', 
                  fontWeight: 700 
                }}>
                  {payment.status || 'Received'}
                </div>
              </div>
              {payment.bank_name && (
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Bank Name</label>
                  <div style={{ color: 'var(--text)', fontWeight: 500 }}>{payment.bank_name}</div>
                </div>
              )}
            </div>
              {payment.received_by && (
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Received By</label>
                  <div style={{ color: 'var(--text)', fontWeight: 500 }}>{payment.received_by.name || 'System'}</div>
                </div>
              )}
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
                  <span>📄</span> Linked Bill
                </div>
                <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                   {payment.invoice_id ? (
                      <Link to={`/invoices/${payment.invoice_id.id || payment.invoice_id}`} style={{ color: 'var(--primary)' }}>#{payment.invoice_id.invoice_number}</Link>
                   ) : 'No Bill'}
                </div>
              </div>
              <div style={{ padding: '20px 24px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dimmed)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🤝</span> Associated Deal
                </div>
                <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                   {payment.deal_id ? (
                      <Link to={`/deals/${payment.deal_id.id || payment.deal_id}`} style={{ color: 'var(--primary)' }}>{payment.deal_id.name}</Link>
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
                  <span>🛡️</span> Security
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)', fontWeight: 700 }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)' }} />
                  Encrypted
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .crm-profile-grid-desktop {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
