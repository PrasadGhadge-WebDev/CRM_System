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
    <div className="crm-fullscreen-shell crm-detail-container">
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

      <section className="crm-hero-shell">
        <div className="crm-hero-glow crm-hero-glow-1" />
        <div className="crm-hero-glow crm-hero-glow-2" />

        <div className="crm-hero-topline">
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

        <div className="crm-hero-main-row">
          <div className="crm-hero-avatar" aria-hidden="true">
            <Icon name="deals" size={48} />
          </div>

          <div className="crm-hero-copy">
            <h1 className="crm-hero-name">{deal.name}</h1>
            <div className="crm-hero-subline">
              <div className="crm-hero-subline-item">
                <Icon name="users" />
                <Link to={`/customers/${deal.customer_id?._id || deal.customer_id}`} className="link-standard" style={{ color: 'inherit' }}>
                  {deal.customer_id?.name || 'Unknown Customer'}
                </Link>
              </div>
              <div className="crm-hero-divider" />
              <div className="crm-hero-subline-item">
                <Icon name="user" />
                <span>Assigned to: {deal.assigned_to?.name || 'Unassigned'}</span>
              </div>
            </div>
          </div>

          <div className="crm-hero-side-stack">
            <div className="crm-hero-stat-card vibrant-border">
              <span className="crm-hero-stat-label">Deal Value</span>
              <span className="crm-hero-stat-value success">
                ₹{(deal.value || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="crm-hub-nav">
        {[
          { id: 'info', label: 'Details', icon: 'dashboard' },
          { id: 'activity', label: 'Activity History', icon: 'reports' },
          { id: 'notes', label: 'General Notes', icon: 'notes' },
          { id: 'payments', label: 'Payments', icon: 'activity' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`crm-hub-tab ${activeTab === tab.id ? 'active' : ''}`}
          >
            <Icon name={tab.icon} size={14} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="crm-detail-grid">
        <div className="crm-detail-main">
          {activeTab === 'info' && (
            <section className="crm-detail-card">
              <div className="crm-detail-card-header">
                <div className="crm-detail-card-title">
                  <Icon name="info" />
                  <h3>Deal Summary</h3>
                </div>
              </div>
              <div className="crm-detail-card-body">
                <div className="crm-intel-grid">
                  <div className="crm-intel-field">
                    <label>Current Stage</label>
                    <div className="crm-intel-value highlight">{deal.stage}</div>
                  </div>
                  <div className="crm-intel-field">
                    <label>Deal Value</label>
                    <div className="crm-intel-value">₹{(deal.value || 0).toLocaleString()}</div>
                  </div>
                  <div className="crm-intel-field">
                    <label>Assigned to</label>
                    <div className="crm-intel-value">{deal.assigned_to?.name || 'Unassigned'}</div>
                  </div>
                  <div className="crm-intel-field">
                    <label>Created Date</label>
                    <div className="crm-intel-value">{new Date(deal.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="crm-intel-field full-width">
                    <label>Description</label>
                    <div className="crm-intel-value" style={{ fontSize: '0.95rem', fontWeight: 400, opacity: 0.8, lineHeight: 1.6 }}>
                      {stripHtml(deal.description) || 'No description added.'}
                    </div>
                  </div>

                  {invoices.length > 0 && (
                    <div className="crm-intel-field full-width" style={{ marginTop: '24px', padding: '24px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '24px', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <label style={{ color: 'var(--primary)', fontWeight: 900, margin: 0 }}>Billing Information</label>
                        <span className={`status-pill ${invoices[0].status === 'Paid' ? 'badge-success-vibrant' : 'badge-info-vibrant'}`} style={{ fontSize: '0.6rem' }}>
                          {invoices[0].status}
                        </span>
                      </div>
                      <div className="crm-intel-grid">
                        <div className="crm-intel-field">
                          <label>Bill Number</label>
                          <div className="crm-intel-value">{invoices[0].invoice_number}</div>
                        </div>
                        <div className="crm-intel-field">
                          <label>Total Bill Amount</label>
                          <div className="crm-intel-value">₹{invoices[0].total_amount?.toLocaleString()}</div>
                        </div>
                        <div className="crm-intel-field">
                          <label>Paid Amount</label>
                          <div className="crm-intel-value success">₹{invoices[0].paid_amount?.toLocaleString()}</div>
                        </div>
                        <div className="crm-intel-field">
                          <label>Pending Amount</label>
                          <div className="crm-intel-value" style={{ color: '#f87171' }}>
                            ₹{(invoices[0].total_amount - invoices[0].paid_amount).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      {invoices[0].status !== 'Paid' && (isManagement || isOwner) && (
                        <button 
                          className="btn-modern-vibrant" 
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
                    <div className="crm-intel-field full-width" style={{ padding: '20px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                      <label style={{ color: '#ef4444', fontWeight: 900 }}>Lost Reason</label>
                      <div className="crm-intel-value" style={{ color: 'var(--text)', marginTop: '8px' }}>{deal.lost_reason}</div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {activeTab === 'activity' && (
            <section className="crm-detail-card">
              <div className="crm-detail-card-header">
                <div className="crm-detail-card-title">
                  <Icon name="reports" />
                  <h3>Activity History</h3>
                </div>
              </div>
              <div className="crm-detail-card-body">
                <Timeline relatedId={id} relatedType="Deal" defaultView="table" />
              </div>
            </section>
          )}

          {activeTab === 'notes' && (
            <section className="crm-detail-card">
              <div className="crm-detail-card-header">
                <div className="crm-detail-card-title">
                  <Icon name="notes" />
                  <h3>General Notes</h3>
                </div>
              </div>
              <div className="crm-detail-card-body">
                 <div className="crm-intel-value" style={{ whiteSpace: 'pre-wrap', fontSize: '1rem', fontWeight: 400, opacity: 0.9 }}>
                   {stripHtml(deal.notes) || 'No notes added yet.'}
                 </div>
              </div>
            </section>
          )}

          {activeTab === 'payments' && (
            <section className="crm-detail-card">
              <div className="crm-detail-card-header">
                <div className="crm-detail-card-title">
                  <Icon name="activity" />
                  <h3>Payment History</h3>
                </div>
                {invoices.length > 0 && invoices[0].status !== 'Paid' && (isManagement || isOwner) && (
                  <button className="btn-premium action-secondary" style={{ padding: '8px 16px' }} onClick={() => setIsTransactionModalOpen(true)}>
                    <Icon name="plus" />
                    <span>Add Payment</span>
                  </button>
                )}
              </div>
              <div className="crm-detail-card-body">
                {payments.length > 0 ? (
                  <div className="crm-table-wrap" style={{ borderRadius: '16px', overflow: 'hidden' }}>
                    <table className="crm-table">
                      <thead>
                        <tr>
                          <th>BILL #</th>
                          <th>AMOUNT</th>
                          <th>METHOD</th>
                          <th>DATE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map(p => (
                          <tr key={p.id} className="crm-table-row">
                            <td><span className="muted">{p.payment_number}</span></td>
                            <td className="font-numeric success">₹{p.amount?.toLocaleString()}</td>
                            <td><span className="badge-info-vibrant" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>{p.payment_method}</span></td>
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

        <aside className="crm-detail-side">
          <section className="crm-detail-card accent-card">
            <div className="crm-detail-card-header">
              <div className="crm-detail-card-title">
                <Icon name="dashboard" />
                <h3>Snapshot</h3>
              </div>
            </div>
            <div className="crm-detail-card-body">
              <div className="milestone-panel">
                <div className="milestone-label">Remaining Balance</div>
                <div className="milestone-value danger" style={{ color: '#f87171' }}>
                  ₹{invoices.length > 0 ? (invoices[0].total_amount - invoices[0].paid_amount).toLocaleString() : (deal.value || 0).toLocaleString()}
                </div>
              </div>

              <div className="snapshot-list">
                <div className="snapshot-row">
                  <span className="snapshot-label">Deal Owner</span>
                  <span className="snapshot-value">{deal.assigned_to?.name || 'Unassigned'}</span>
                </div>
                <div className="snapshot-row">
                  <span className="snapshot-label">Customer</span>
                  <span className="snapshot-value">{deal.customer_id?.name || 'N/A'}</span>
                </div>
              </div>

              {deal.stage !== 'Won' && (
                <button className="btn-modern-vibrant full-width" onClick={() => setIsEditModalOpen(true)}>
                  <Icon name="edit" />
                  <span>Update Stage</span>
                </button>
              )}
            </div>
          </section>

          {invoices.length > 0 && (
            <section className="crm-detail-card">
              <div className="crm-detail-card-header">
                <div className="crm-detail-card-title">
                  <Icon name="reports" />
                  <h3>Billing Summary</h3>
                </div>
              </div>
              <div className="crm-detail-card-body">
                <div className="snapshot-list">
                  <div className="snapshot-row">
                    <span className="snapshot-label">Bill No</span>
                    <span className="snapshot-value" style={{ fontWeight: 800 }}>{invoices[0].invoice_number}</span>
                  </div>
                  <div className="snapshot-row">
                    <span className="snapshot-label">Total</span>
                    <span className="snapshot-value">₹{invoices[0].total_amount?.toLocaleString()}</span>
                  </div>
                  <div className="snapshot-row">
                    <span className="snapshot-label">Paid</span>
                    <span className="snapshot-value success-text">₹{invoices[0].paid_amount?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </section>
          )}
        </aside>
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
    </div>
  );
}
