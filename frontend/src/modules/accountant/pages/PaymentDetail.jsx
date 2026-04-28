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
    <div className="stack gap-32 payment-profile-container">
      <PageHeader
        title="Payment Record"
        backTo="/payments"
        actions={
          <div className="control-bar-premium">
            <button className="btn-premium action-vibrant" onClick={() => window.print()}>
              <Icon name="reports" />
              <span>Print Receipt</span>
            </button>
          </div>
        }
      />

      <section className="user-hero-shell">
        <div className="hero-glow hero-glow-a" />
        <div className="hero-glow hero-glow-b" />

        <div className="hero-topline">
          <span className="status-pill badge-success-vibrant">SUCCESS</span>
          <span className="hero-meta-chip">Received on {new Date(payment.payment_date).toLocaleDateString()}</span>
        </div>

        <div className="hero-main-row">
          <div className="hero-avatar-modern" aria-hidden="true" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
             <Icon name="billing" size={40} color="white" />
          </div>

          <div className="hero-copy">
            <h1 className="hero-name-modern">{formatCurrency(payment.amount)}</h1>
            <div className="hero-subline">
              <div className="hero-subline-item">
                <Icon name="user" />
                <span>{payment.customer_id?.name || 'Unknown Client'}</span>
              </div>
              <div className="hero-divider" />
              <div className="hero-subline-item">
                <Icon name="activity" />
                <span>{payment.payment_method}</span>
              </div>
            </div>
          </div>

          <div className="hero-side-stack">
            <div className="hero-stat-card">
              <span className="hero-stat-label">Reference ID</span>
              <span className="hero-stat-value">{payment.transaction_id || 'N/A'}</span>
            </div>
            <div className="hero-stat-card">
              <span className="hero-stat-label">Payment ID</span>
              <span className="hero-stat-value">#{payment.payment_number}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="user-detail-grid">
        <div className="user-detail-main">
          <section className="detail-card">
            <div className="detail-card-header">
              <div className="detail-card-title">
                <Icon name="billing" />
                <h3>Transaction Details</h3>
              </div>
              <span className="detail-card-badge">Financial Record</span>
            </div>
            <div className="detail-card-body detail-grid-2">
              <div className="intel-field">
                <label>Paid Amount</label>
                <div className="intel-value text-success">{formatCurrency(payment.amount)}</div>
              </div>
              <div className="intel-field">
                <label>Payment Method</label>
                <div className="intel-value">{payment.payment_method}</div>
              </div>
              <div className="intel-field">
                <label>Transaction Date</label>
                <div className="intel-value">{new Date(payment.payment_date).toLocaleDateString()}</div>
              </div>
              <div className="intel-field">
                <label>Reference Number</label>
                <div className="intel-value">{payment.transaction_id || '—'}</div>
              </div>
              <div className="intel-field full-width">
                <label>Internal Notes</label>
                <div className="intel-value" style={{ fontWeight: 400, color: 'var(--text-dimmed)', fontSize: '0.95rem' }}>
                  {payment.notes || 'No internal notes recorded for this transaction.'}
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className="user-detail-side">
          <section className="detail-card accent-card">
            <div className="detail-card-header">
              <div className="detail-card-title">
                <Icon name="deals" />
                <h3>Linked Registry</h3>
              </div>
            </div>
            <div className="detail-card-body">
              {payment.invoice_id ? (
                <Link to={`/invoices/${payment.invoice_id.id}`} className="converted-link-premium" style={{ marginBottom: '16px' }}>
                  <div className="link-icon"><Icon name="billing" /></div>
                  <div className="link-text">
                    <strong>Bill #{payment.invoice_id.invoice_number}</strong>
                    <span>View original bill details</span>
                  </div>
                </Link>
              ) : (
                <div className="p-16 text-center muted italic border-subtle rounded-12 mb-16">No linked bill</div>
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

          <section className="detail-card" style={{ background: 'rgba(16, 185, 129, 0.05)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
            <div className="stack tiny-gap align-center text-center">
              <div className="text-xs muted uppercase font-bold">Total Settled</div>
              <div className="text-3xl font-bold text-success">{formatCurrency(payment.amount)}</div>
              <div className="text-xs text-success font-bold mt-4">Verified Transaction</div>
            </div>
          </section>
        </aside>
      </div>

      <style>{`
        .payment-profile-container { padding-bottom: 60px; }
        .control-bar-premium { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; justify-content: flex-end; }
        .btn-premium { display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 12px; font-weight: 700; font-size: 0.88rem; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border: 1px solid transparent; cursor: pointer; text-decoration: none; }
        .action-vibrant { background: var(--primary); color: white; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }
        .action-secondary { background: var(--bg-surface); color: var(--text-muted); border-color: var(--border); }
        .btn-premium:hover { transform: translateY(-2px); filter: brightness(1.05); }

        .user-hero-shell { position: relative; overflow: hidden; background: radial-gradient(circle at top left, rgba(16, 185, 129, 0.15), transparent 40%), linear-gradient(135deg, rgba(17, 24, 39, 0.98), rgba(15, 23, 42, 0.95)); border: 1px solid var(--border); border-radius: 32px; padding: 32px; box-shadow: var(--shadow-xl); backdrop-filter: blur(14px); }
        .hero-glow { position: absolute; border-radius: 999px; filter: blur(40px); pointer-events: none; opacity: 0.5; }
        .hero-glow-a { top: -80px; left: -40px; width: 300px; height: 300px; background: rgba(16, 185, 129, 0.2); }
        .hero-glow-b { right: -70px; bottom: -100px; width: 350px; height: 350px; background: rgba(5, 150, 105, 0.15); }

        .hero-topline { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; position: relative; z-index: 1; }
        .status-pill, .hero-meta-chip { display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; font-size: 0.75rem; font-weight: 800; letter-spacing: 0.04em; padding: 7px 14px; text-transform: uppercase; }
        .badge-success-vibrant { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
        .hero-meta-chip { background: rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.85); border: 1px solid rgba(255, 255, 255, 0.15); }

        .hero-main-row { display: flex; align-items: center; gap: 32px; justify-content: space-between; position: relative; z-index: 1; }
        .hero-avatar-modern { width: 100px; height: 100px; flex: 0 0 auto; background: linear-gradient(135deg, #10b981, #059669); border-radius: 30px; border: 2px solid rgba(255, 255, 255, 0.1); display: flex; align-items: center; justify-content: center; font-size: 3.2rem; font-weight: 900; color: white; box-shadow: 0 16px 32px rgba(0, 0, 0, 0.4); overflow: hidden; }
        .hero-name-modern { margin: 0 0 12px; font-size: clamp(2rem, 4vw, 3.2rem); line-height: 1; letter-spacing: -0.04em; color: white; font-weight: 900; }
        .hero-subline { display: flex; align-items: center; flex-wrap: wrap; gap: 16px; }
        .hero-subline-item { display: inline-flex; align-items: center; gap: 8px; color: rgba(255, 255, 255, 0.75); font-size: 0.95rem; font-weight: 500; }
        .hero-subline-item svg { color: #10b981; width: 18px; }
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
        .detail-card-title svg { color: #10b981; }

        .detail-card-badge { display: inline-flex; align-items: center; justify-content: center; padding: 6px 12px; border-radius: 999px; font-size: 0.7rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.06em; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.14); color: rgba(255, 255, 255, 0.82); }
        
        .detail-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .intel-field label { display: block; font-size: 0.65rem; font-weight: 900; color: var(--text-dimmed); text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.08em; }
        .intel-value { font-size: 1.05rem; font-weight: 700; color: white; }
        .full-width { grid-column: 1 / -1; }

        .accent-card { background: rgba(16, 185, 129, 0.03); border-color: rgba(16, 185, 129, 0.2); }
        .converted-link-premium { display: flex; align-items: center; gap: 16px; background: rgba(255,255,255,0.03); padding: 16px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); text-decoration: none; transition: all 0.2s; }
        .converted-link-premium:hover { border-color: #10b981; transform: translateX(4px); }
        .link-icon { color: #10b981; }
        .link-text strong { display: block; color: white; font-size: 0.9rem; }
        .link-text span { font-size: 0.75rem; color: var(--text-dimmed); }

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
