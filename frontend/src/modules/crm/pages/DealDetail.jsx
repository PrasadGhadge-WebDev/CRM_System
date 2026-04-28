import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Icon } from '../../../layouts/icons.jsx'
import { dealsApi } from '../../../services/deals.js'
import { paymentsApi } from '../../../services/payments.js'
import { customersApi } from '../../../services/customers.js'
import PageHeader from '../../../components/PageHeader.jsx'
import Timeline from '../../../components/Timeline.jsx'
import { useAuth } from '../../../context/AuthContext'
import { useToastFeedback } from '../../../utils/useToastFeedback.js'
import DealModal from '../components/DealModal.jsx'
import BillingModal from '../components/BillingModal.jsx'
import TransactionModal from '../components/TransactionModal.jsx'
import { invoicesApi } from '../../../services/invoices.js'

function stripHtml(html) {
  if (!html) return ''
  const tmp = document.createElement('DIV')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

export default function DealDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [deal, setDeal] = useState(null)
  const [payments, setPayments] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('info')
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false)
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [postingNote, setPostingNote] = useState(false)
  const [notes, setNotes] = useState([])

  useToastFeedback({ error })

  const loadDealData = useCallback(async () => {
    try {
      const [d, p, i] = await Promise.all([
        dealsApi.get(id),
        paymentsApi.list({ deal_id: id, limit: 'all' }),
        invoicesApi.list({ deal_id: id, limit: 1 })
      ])
      setDeal(d)
      setPayments(p.items || [])
      setInvoices(i.items || [])
    } catch (e) {
      setError('Failed to synchronize deal intelligence')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadDealData()
  }, [loadDealData])

  if (loading) return (
    <div className="center padding40 stack gap-20">
      <div className="spinner-medium" />
      <span className="muted">Retrieving opportunity record...</span>
    </div>
  )
  if (error && !deal) return <div className="alert error glass-alert">{error}</div>
  if (!deal) return <div className="muted center padding40">Deal not found.</div>

  const isOwner = String(deal.assigned_to?._id || deal.assigned_to) === user?.id
  const isManagement = user?.role === 'Admin' || user?.role === 'Manager'
  const canEdit = isManagement || isOwner

  return (
    <div className="stack gap-32 user-profile-container">
      <PageHeader
        title="Deal Details"
        description={deal.name}
        backTo="/deals"
        actions={
          <div className="action-group">
            {deal.stage === 'Won' && invoices.length === 0 && (isManagement || isOwner) && (
              <button className="btn-premium action-vibrant" onClick={() => setIsBillingModalOpen(true)} style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                <Icon name="activity" />
                <span>Create Bill</span>
              </button>
            )}
            {canEdit && (
              <button className="btn-premium secondary" onClick={() => setIsEditModalOpen(true)}>
                <Icon name="edit" />
                <span>Update Deal</span>
              </button>
            )}
          </div>
        }
      />

      <section className="user-hero-shell">
        <div className="hero-glow hero-glow-a" />
        <div className="hero-glow hero-glow-b" />

        <div className="hero-topline">
          <span className={`status-pill ${deal.stage === 'Won' ? 'badge-success-vibrant' : deal.stage === 'Lost' ? 'badge-danger-vibrant' : 'badge-info-vibrant'}`}>
            {deal.stage}
          </span>
          {deal.stage === 'Won' && (
            <span className={`status-pill ${deal.status === 'Completed' ? 'badge-success-vibrant' : 'badge-muted-vibrant'}`} style={{ marginLeft: '10px' }}>
              {deal.status || 'Pending Payment'}
            </span>
          )}
          <span className="hero-meta-chip">ID: {deal.readable_id || 'OPP-100'}</span>
        </div>

        <div className="hero-main-row">
          <div className="hero-avatar-modern" aria-hidden="true" style={{ background: 'linear-gradient(135deg, #4f46e5, #9333ea)' }}>
            <Icon name="deals" size={40} />
          </div>

          <div className="hero-copy">
            <h1 className="hero-name-modern">{deal.name}</h1>
            <div className="hero-subline">
              <div className="hero-subline-item">
                <Icon name="users" />
                <Link to={`/customers/${deal.customer_id?._id || deal.customer_id}`} className="link-standard" style={{ color: 'inherit' }}>
                  {deal.customer_id?.name || 'Unknown Customer'}
                </Link>
              </div>
              <div className="hero-divider" />
              <div className="hero-subline-item">
                <Icon name="user" />
                <span>Assigned to: {deal.assigned_to?.name || 'Unassigned'}</span>
              </div>
            </div>
          </div>

          <div className="hero-side-stack">
            <div className="hero-stat-card vibrant-border">
              <span className="hero-stat-label">Deal Value</span>
              <span className="hero-stat-value success-text" style={{ fontSize: '1.4rem' }}>
                ₹{(deal.value || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="hub-navigation">
        {[
          { id: 'info', label: 'Details', icon: 'dashboard' },
          { id: 'activity', label: 'Activity History', icon: 'reports' },
          { id: 'notes', label: 'General Notes', icon: 'notes' },
          { id: 'payments', label: 'Payments', icon: 'activity' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`hub-tab ${activeTab === tab.id ? 'active' : ''}`}
          >
            <Icon name={tab.icon} size={14} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="user-detail-grid">
        <div className="user-detail-main">
          {activeTab === 'info' && (
            <section className="detail-card">
              <div className="detail-card-header">
                <div className="detail-card-title">
                  <Icon name="info" />
                  <h3>Deal Summary</h3>
                </div>
                <span className="detail-card-badge subtle">Basic Info</span>
              </div>
              <div className="detail-card-body detail-grid-2">
                <div className="intel-field">
                  <label>Current Stage</label>
                  <div className="intel-value highlight">{deal.stage}</div>
                </div>
                <div className="intel-field">
                  <label>Deal Value</label>
                  <div className="intel-value">₹{(deal.value || 0).toLocaleString()}</div>
                </div>
                <div className="intel-field">
                  <label>Assigned to</label>
                  <div className="intel-value">{deal.assigned_to?.name || 'Unassigned'}</div>
                </div>
                <div className="intel-field">
                  <label>Created Date</label>
                  <div className="intel-value">{new Date(deal.created_at).toLocaleDateString()}</div>
                </div>
                <div className="intel-field full-width">
                  <label>Description</label>
                  <div className="intel-value" style={{ fontSize: '0.95rem', fontWeight: 400, opacity: 0.8, lineHeight: 1.6 }}>
                    {stripHtml(deal.description) || 'No description added.'}
                  </div>
                </div>

                {invoices.length > 0 && (
                  <div className="intel-field full-width" style={{ marginTop: '24px', padding: '24px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '24px', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <label style={{ color: 'var(--primary)', fontWeight: 900, margin: 0 }}>Billing Information</label>
                      <span className={`status-pill ${invoices[0].status === 'Paid' ? 'badge-success-vibrant' : 'badge-info-vibrant'}`} style={{ fontSize: '0.6rem' }}>
                        {invoices[0].status}
                      </span>
                    </div>
                    <div className="detail-grid-2">
                      <div className="intel-field">
                        <label>Bill Number</label>
                        <div className="intel-value">{invoices[0].invoice_number}</div>
                      </div>
                      <div className="intel-field">
                        <label>Total Bill Amount</label>
                        <div className="intel-value">₹{invoices[0].total_amount?.toLocaleString()}</div>
                      </div>
                      <div className="intel-field">
                        <label>Paid Amount</label>
                        <div className="intel-value success-text">₹{invoices[0].paid_amount?.toLocaleString()}</div>
                      </div>
                      <div className="intel-field">
                        <label>Pending Amount</label>
                        <div className="intel-value" style={{ color: '#f87171' }}>
                          ₹{(invoices[0].total_amount - invoices[0].paid_amount).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    {invoices[0].status !== 'Paid' && (isManagement || isOwner) && (
                      <button 
                        className="btn-premium action-vibrant" 
                        onClick={() => setIsTransactionModalOpen(true)}
                        style={{ marginTop: '24px', width: '100%', justifyContent: 'center' }}
                      >
                        <Icon name="plus" />
                        <span>Add Payment</span>
                      </button>
                    )}
                  </div>
                )}
                {deal.stage === 'Lost' && (
                  <div className="intel-field full-width" style={{ padding: '20px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <label style={{ color: '#ef4444', fontWeight: 900 }}>Lost Reason</label>
                    <div className="intel-value" style={{ color: 'white', marginTop: '8px' }}>{deal.lost_reason}</div>
                  </div>
                )}
              </div>
            </section>
          )}

          {activeTab === 'activity' && (
            <section className="detail-card">
              <div className="detail-card-header">
                <div className="detail-card-title">
                  <Icon name="reports" />
                  <h3>Activity History</h3>
                </div>
              </div>
              <div className="detail-card-body">
                <Timeline relatedId={id} relatedType="Deal" defaultView="table" />
              </div>
            </section>
          )}

          {activeTab === 'notes' && (
            <section className="detail-card">
              <div className="detail-card-header">
                <div className="detail-card-title">
                  <Icon name="notes" />
                  <h3>General Notes</h3>
                </div>
              </div>
              <div className="detail-card-body">
                 <div className="intel-value" style={{ whiteSpace: 'pre-wrap', fontSize: '1rem', fontWeight: 400, opacity: 0.9 }}>
                   {stripHtml(deal.notes) || 'No notes added yet.'}
                 </div>
              </div>
            </section>
          )}

          {activeTab === 'payments' && (
            <section className="detail-card">
              <div className="detail-card-header">
                <div className="detail-card-title">
                  <Icon name="activity" />
                  <h3>Payment History</h3>
                </div>
                {invoices.length > 0 && invoices[0].status !== 'Paid' && (isManagement || isOwner) && (
                  <button className="btn-premium secondary" style={{ fontSize: '0.7rem', padding: '6px 14px' }} onClick={() => setIsTransactionModalOpen(true)}>
                    <Icon name="plus" />
                    <span>Add Payment</span>
                  </button>
                )}
              </div>
              <div className="detail-card-body">
                {payments.length > 0 ? (
                  <div className="high-density-table-wrap">
                    <table className="table-minimal-premium">
                      <thead>
                        <tr>
                          <th>Bill #</th>
                          <th>Amount</th>
                          <th>Method</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map(p => (
                          <tr key={p.id}>
                            <td><span className="muted">{p.payment_number}</span></td>
                            <td className="font-numeric success-text">₹{p.amount?.toLocaleString()}</td>
                            <td>{p.payment_method}</td>
                            <td>{new Date(p.payment_date).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state-mini">No payments found for this deal.</div>
                )}
              </div>
            </section>
          )}
        </div>
      </div>

      <DealModal 
        isOpen={isEditModalOpen}
        deal={deal}
        onClose={() => setIsEditModalOpen(false)}
        onSave={() => loadDealData()}
      />

      <BillingModal
        isOpen={isBillingModalOpen}
        deal={deal}
        onClose={() => setIsBillingModalOpen(false)}
        onSave={() => loadDealData()}
      />

      <TransactionModal
        isOpen={isTransactionModalOpen}
        invoice={invoices[0]}
        deal={deal}
        onClose={() => setIsTransactionModalOpen(false)}
        onSave={() => loadDealData()}
      />

      <style>{`
        .user-profile-container { padding-bottom: 60px; }
        .user-hero-shell { position: relative; overflow: hidden; background: radial-gradient(circle at top left, rgba(99, 102, 241, 0.15), transparent 40%), linear-gradient(135deg, rgba(17, 24, 39, 0.98), rgba(15, 23, 42, 0.95)); border: 1px solid var(--border); border-radius: 32px; padding: 32px; box-shadow: var(--shadow-xl); backdrop-filter: blur(14px); margin-bottom: 32px; }
        .hero-glow { position: absolute; border-radius: 999px; filter: blur(40px); pointer-events: none; opacity: 0.5; }
        .hero-glow-a { top: -80px; left: -40px; width: 300px; height: 300px; background: rgba(59, 130, 246, 0.2); }
        .hero-glow-b { right: -70px; bottom: -100px; width: 350px; height: 350px; background: rgba(99, 102, 241, 0.15); }

        .hero-topline { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; position: relative; z-index: 1; }
        .status-pill, .hero-meta-chip { display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; font-size: 0.75rem; font-weight: 800; letter-spacing: 0.04em; padding: 7px 14px; text-transform: uppercase; }
        .badge-success-vibrant { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
        .badge-danger-vibrant { background: rgba(239, 68, 68, 0.12); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.28); }
        .badge-info-vibrant { background: rgba(59, 130, 246, 0.1); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.2); }
        .hero-meta-chip { background: rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.85); border: 1px solid rgba(255, 255, 255, 0.15); }

        .hero-main-row { display: flex; align-items: center; gap: 32px; justify-content: space-between; position: relative; z-index: 1; }
        .hero-avatar-modern { width: 100px; height: 100px; flex: 0 0 auto; border-radius: 30px; border: 2px solid rgba(255, 255, 255, 0.1); display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 16px 32px rgba(0, 0, 0, 0.4); overflow: hidden; }
        .hero-name-modern { margin: 0 0 12px; font-size: clamp(2rem, 4vw, 3.2rem); line-height: 1; letter-spacing: -0.04em; color: white; font-weight: 900; }
        .hero-subline { display: flex; align-items: center; flex-wrap: wrap; gap: 16px; }
        .hero-subline-item { display: inline-flex; align-items: center; gap: 8px; color: rgba(255, 255, 255, 0.75); font-size: 0.95rem; font-weight: 500; }
        .hero-subline-item svg { color: var(--primary); width: 18px; }
        .hero-divider { width: 1px; height: 14px; background: rgba(255, 255, 255, 0.1); }

        .hero-side-stack { display: grid; gap: 14px; min-width: 280px; grid-template-columns: 1fr; }
        .hero-stat-card { padding: 16px 18px; border-radius: 18px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.24); }
        .hero-stat-label { display: block; color: rgba(255, 255, 255, 0.72); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; margin-bottom: 6px; }
        .hero-stat-value { color: white; font-weight: 700; line-height: 1.3; }

        .hub-navigation { display: flex; gap: 12px; margin-bottom: 32px; border-bottom: 1px solid var(--border); padding-bottom: 2px; overflow-x: auto; }
        .hub-tab { display: flex; align-items: center; gap: 10px; padding: 12px 20px; border: none; background: none; color: var(--text-dimmed); font-size: 0.9rem; font-weight: 700; cursor: pointer; position: relative; white-space: nowrap; transition: all 0.2s; }
        .hub-tab:hover { color: white; }
        .hub-tab.active { color: var(--primary); }
        .hub-tab.active::after { content: ''; position: absolute; bottom: -2px; left: 0; width: 100%; height: 2px; background: var(--primary); box-shadow: 0 0 12px var(--primary); }

        .user-detail-grid { display: flex; gap: 24px; align-items: start; }
        .user-detail-main { display: flex; flex-direction: column; gap: 24px; flex: 1 1 auto; min-width: 0; }
        
        .detail-card { background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); border-radius: 24px; overflow: hidden; padding: 24px; }
        .detail-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
        .detail-card-title { display: flex; align-items: center; gap: 12px; }
        .detail-card-title h3 { margin: 0; font-size: 1.05rem; font-weight: 800; color: white; }
        .detail-card-title svg { color: var(--primary); }
        .detail-card-badge { display: inline-flex; align-items: center; justify-content: center; padding: 6px 12px; border-radius: 999px; font-size: 0.7rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.06em; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.14); color: rgba(255, 255, 255, 0.82); }
        .detail-card-badge.subtle { background: rgba(59, 130, 246, 0.08); color: #93c5fd; border-color: rgba(59, 130, 246, 0.18); }

        .detail-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .intel-field label { display: block; font-size: 0.65rem; font-weight: 900; color: var(--text-dimmed); text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.08em; }
        .intel-value { font-size: 1.05rem; font-weight: 700; color: white; }
        .intel-value.highlight { color: var(--primary); }
        .full-width { grid-column: 1 / -1; }
        
        @media (max-width: 768px) {
          .hero-main-row { flex-direction: column; align-items: flex-start; gap: 24px; }
          .hero-side-stack { width: 100%; min-width: auto; }
          .detail-grid-2 { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
