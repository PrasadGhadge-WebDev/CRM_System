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
    <div className="crm-fullscreen-shell">
      <PageHeader
        title="Payment Record"
        backTo="/payments"
        actions={
          <div className="flex gap-12 align-center">
            <button className="crm-btn-premium vibrant" onClick={() => window.print()}>
              <Icon name="reports" />
              <span>Print Receipt</span>
            </button>
          </div>
        }
      />

      <section className="crm-hero-shell" style={{ background: 'radial-gradient(circle at top left, rgba(16, 185, 129, 0.15), transparent 40%), linear-gradient(135deg, rgba(17, 24, 39, 0.98), rgba(15, 23, 42, 0.95))' }}>
        <div className="crm-hero-glow crm-hero-glow-1" style={{ background: 'rgba(16, 185, 129, 0.2)' }} />
        <div className="crm-hero-glow crm-hero-glow-2" style={{ background: 'rgba(5, 150, 105, 0.15)' }} />

        <div className="crm-hero-topline">
          <span className="status-pill Won">SUCCESS</span>
          <span className="hero-meta-chip">Received on {new Date(payment.payment_date).toLocaleDateString()}</span>
        </div>

        <div className="crm-hero-main-row">
          <div className="crm-hero-avatar" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
             <Icon name="billing" size={40} />
          </div>

          <div className="crm-hero-copy">
            <h1 className="crm-hero-name">{formatCurrency(payment.amount)}</h1>
            <div className="crm-hero-subline">
              <div className="crm-hero-subline-item">
                <Icon name="user" />
                <span>{payment.customer_id?.name || 'Unknown Client'}</span>
              </div>
              <div className="crm-hero-divider" />
              <div className="crm-hero-subline-item">
                <Icon name="activity" />
                <span>{payment.payment_method}</span>
              </div>
            </div>
          </div>

          <div className="crm-hero-side-stack">
            <div className="crm-hero-stat-card">
              <span className="crm-hero-stat-label">Reference ID</span>
              <span className="crm-hero-stat-value">{payment.transaction_id || 'N/A'}</span>
            </div>
            <div className="crm-hero-stat-card">
              <span className="crm-hero-stat-label">Payment ID</span>
              <span className="crm-hero-stat-value">#{payment.payment_number}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="crm-detail-grid">
        <div className="crm-detail-main">
          <section className="crm-detail-card">
            <div className="crm-detail-card-header">
              <div className="crm-detail-card-title">
                <Icon name="billing" />
                <h3>Transaction Details</h3>
              </div>
            </div>
            <div className="crm-detail-card-body">
              <div className="crm-intel-grid">
                <div className="crm-intel-field">
                  <label>Paid Amount</label>
                  <div className="crm-intel-value" style={{ color: '#34d399' }}>{formatCurrency(payment.amount)}</div>
                </div>
                <div className="crm-intel-field">
                  <label>Payment Method</label>
                  <div className="crm-intel-value">{payment.payment_method}</div>
                </div>
                <div className="crm-intel-field">
                  <label>Transaction Date</label>
                  <div className="crm-intel-value">{new Date(payment.payment_date).toLocaleDateString()}</div>
                </div>
                <div className="crm-intel-field">
                  <label>Reference Number</label>
                  <div className="crm-intel-value">{payment.transaction_id || '—'}</div>
                </div>
                <div className="crm-intel-field full-width">
                  <label>Internal Notes</label>
                  <div className="crm-intel-value" style={{ fontWeight: 400 }}>
                    {payment.notes || 'No internal notes recorded for this transaction.'}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className="crm-detail-side">
          <section className="crm-detail-card accent-card">
            <div className="crm-detail-card-header">
              <div className="crm-detail-card-title">
                <Icon name="deals" />
                <h3>Linked Registry</h3>
              </div>
            </div>
            <div className="crm-detail-card-body">
              {payment.invoice_id ? (
                <Link to={`/invoices/${payment.invoice_id.id}`} className="converted-link-premium" style={{ marginBottom: '16px' }}>
                  <div className="link-icon"><Icon name="billing" /></div>
                  <div className="link-text">
                    <strong>Bill #{payment.invoice_id.invoice_number}</strong>
                    <span>View original bill details</span>
                  </div>
                </Link>
              ) : (
                <div className="center padding-24 muted italic" style={{ border: '1px dashed var(--border)', borderRadius: '12px', marginBottom: '16px' }}>No linked bill</div>
              )}

              {payment.deal_id && (
                <Link to={`/deals/${payment.deal_id.id}`} className="converted-link-premium">
                  <div className="link-icon"><Icon name="deals" /></div>
                  <div className="link-text">
                    <strong>Deal: {payment.deal_id.name}</strong>
                    <span>View associated deal pipeline</span>
                  </div>
                </Link>
              )}
            </div>
          </section>

          <section className="crm-detail-card" style={{ background: 'rgba(16, 185, 129, 0.05)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
            <div className="center text-center">
              <div className="muted text-xs uppercase font-black margin-bottom-12">Total Settled</div>
              <div className="text-3xl font-black" style={{ color: '#10b981' }}>{formatCurrency(payment.amount)}</div>
              <div className="text-xs font-black mt-4" style={{ color: '#10b981' }}>Verified Transaction</div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
