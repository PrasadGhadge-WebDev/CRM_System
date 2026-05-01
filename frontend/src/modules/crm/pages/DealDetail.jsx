import { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Icon } from '../../../layouts/icons.jsx'
import { dealsApi } from '../../../services/deals.js'
import { paymentsApi } from '../../../services/payments.js'
import { invoicesApi } from '../../../services/invoices.js'
import Timeline from '../../../components/Timeline.jsx'
import { useAuth } from '../../../context/AuthContext'
import { useToastFeedback } from '../../../utils/useToastFeedback.js'
import DealModal from '../components/DealModal.jsx'
import BillingModal from '../components/BillingModal.jsx'
import TransactionModal from '../components/TransactionModal.jsx'

function stripHtml(html) {
  if (!html) return ''
  const tmp = document.createElement('DIV')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

export default function DealDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
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
    <div className="loading-state-centered">
      <div className="spinner-medium" />
      <span>Retrieving opportunity record...</span>
    </div>
  )
  if (error && !deal) return <div className="alert error glass-alert">{error}</div>
  if (!deal) return <div className="muted center padding40">Deal not found.</div>

  const isOwner = String(deal.assigned_to?._id || deal.assigned_to) === user?.id
  const isManagement = user?.role === 'Admin' || user?.role === 'Manager'
  const canEdit = isManagement || isOwner

  return (
    <div className="user-profile-container" style={{ background: 'var(--bg)', minHeight: '100vh', padding: '32px' }}>
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <button onClick={() => navigate(-1)} className="back-btn-modern" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-dimmed)', fontWeight: 600 }}>
          <Icon name="arrowLeft" size={18} />
          <span>Back to Pipeline</span>
        </button>
        <div style={{ display: 'flex', gap: '12px' }}>
          {deal.stage === 'Won' && invoices.length === 0 && (isManagement || isOwner) && (
            <button className="crm-btn-premium" onClick={() => setIsBillingModalOpen(true)} style={{ background: 'var(--success)', color: '#ffffff', border: 'none', padding: '8px 20px', borderRadius: '8px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <Icon name="activity" />
              <span>Create Bill</span>
            </button>
          )}
          {canEdit && (
            <button className="crm-btn-premium" onClick={() => setIsEditModalOpen(true)} style={{ background: 'var(--primary)', color: '#ffffff', border: 'none', padding: '8px 24px', borderRadius: '8px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: 'var(--shadow-sm)', cursor: 'pointer' }}>
              <Icon name="edit" />
              <span>Update Deal</span>
            </button>
          )}
        </div>
      </div>

      {/* Profile Header Card */}
      <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '32px', marginBottom: '24px', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Icon/Avatar */}
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--primary-soft)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 700, flexShrink: 0, boxShadow: 'inset 0 0 0 1px var(--primary-soft)' }}>
             {(deal.name || 'D').charAt(0).toUpperCase()}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>{deal.name}</h1>
              <span className={`crm-status-pill-modern ${deal.stage === 'Won' ? 'status-active' : deal.stage === 'Lost' ? 'status-inactive' : 'status-pending'}`}>
                <div className="status-dot" />
                {deal.stage}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '20px', color: 'var(--text-dimmed)', fontSize: '0.9rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Icon name="users" size={14} />
                <Link to={`/customers/${deal.customer_id?._id || deal.customer_id}`} style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>
                  {deal.customer_id?.name || 'Unknown Customer'}
                </Link>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Icon name="user" size={14} />
                <span>Owner: <strong>{deal.assigned_to?.name || 'Unassigned'}</strong></span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ height: '1px', background: 'var(--border)', margin: '24px 0' }} />

        {/* Time Stats Row */}
        <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <Icon name="activity" size={16} style={{ color: 'var(--text-dimmed)' }} />
             <span style={{ fontSize: '0.9rem', color: 'var(--text-dimmed)' }}>Deal Value:</span>
             <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--success)' }}>₹{(deal.value || 0).toLocaleString('en-IN')}</span>
           </div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <Icon name="clock" size={16} style={{ color: 'var(--text-dimmed)' }} />
             <span style={{ fontSize: '0.9rem', color: 'var(--text-dimmed)' }}>Created On:</span>
             <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)' }}>{new Date(deal.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
           </div>
        </div>
      </section>

      {/* Main Grid */}
      <div className="crm-profile-grid-desktop" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        
        {/* Deal Details Card */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>Opportunity Details</h3>
          </div>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 800, display: 'block', marginBottom: '4px', letterSpacing: '0.05em' }}>Current Stage</label>
                <div style={{ color: 'var(--text)', fontWeight: 600 }}>{deal.stage}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 800, display: 'block', marginBottom: '4px', letterSpacing: '0.05em' }}>Deal Value</label>
                <div style={{ color: 'var(--success)', fontWeight: 800 }}>₹{(deal.value || 0).toLocaleString('en-IN')}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 800, display: 'block', marginBottom: '4px', letterSpacing: '0.05em' }}>Reference ID</label>
                <div style={{ color: 'var(--text)', fontWeight: 600 }}>{deal.readable_id || deal.id?.slice(-8).toUpperCase() || 'N/A'}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 800, display: 'block', marginBottom: '4px', letterSpacing: '0.05em' }}>Source</label>
                <div style={{ color: 'var(--text)', fontWeight: 600 }}>{deal.source || 'Direct Enquiry'}</div>
              </div>
            </div>
            {deal.description && (
              <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 800, display: 'block', marginBottom: '8px', letterSpacing: '0.05em' }}>Description</label>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.6' }}>{stripHtml(deal.description)}</div>
              </div>
            )}
          </div>
        </div>

        {/* Snapshot Table Card */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>Account Snapshot</h3>
          </div>
          <div style={{ padding: '0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--border)' }}>
              <div style={{ padding: '20px 24px', borderRight: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, textTransform: 'uppercase' }}>
                  Deal Owner
                </div>
                <div style={{ fontWeight: 700, color: 'var(--text)' }}>{deal.assigned_to?.name || 'Unassigned'}</div>
              </div>
              <div style={{ padding: '20px 24px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, textTransform: 'uppercase' }}>
                  Account Health
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)', fontWeight: 800 }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)' }} />
                  Healthy
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              <div style={{ padding: '20px 24px', borderRight: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, textTransform: 'uppercase' }}>
                  Active Bill
                </div>
                <div style={{ fontWeight: 700, color: 'var(--text)' }}>
                  {invoices.length > 0 ? invoices[0].invoice_number : 'Not Generated'}
                </div>
              </div>
              <div style={{ padding: '20px 24px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, textTransform: 'uppercase' }}>
                  Balance Due
                </div>
                <div style={{ fontWeight: 800, color: 'var(--danger)', fontSize: '0.9rem' }}>
                   ₹{invoices.length > 0 ? (invoices[0].total_amount - invoices[0].paid_amount).toLocaleString('en-IN') : (deal.value || 0).toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="crm-hub-nav" style={{ marginTop: '24px', display: 'flex', gap: '10px' }}>
        {[
          { id: 'info', label: 'Deal Overview', icon: 'dashboard' },
          { id: 'activity', label: 'History', icon: 'reports' },
          { id: 'notes', label: 'Notes', icon: 'notes' },
          { id: 'payments', label: 'Billing', icon: 'activity' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`crm-hub-tab ${activeTab === tab.id ? 'active' : ''}`}
            style={{ 
              background: activeTab === tab.id ? 'var(--primary)' : 'var(--bg-card)', 
              color: activeTab === tab.id ? 'white' : 'var(--text)', 
              border: '1px solid var(--border)',
              padding: '8px 16px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Icon name={tab.icon} size={14} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div style={{ marginTop: '24px' }}>
        {activeTab === 'info' && (
          <div style={{ display: 'grid', gap: '24px' }}>
             {invoices.length > 0 && (
                <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>Billing Intelligence</h3>
                    <span className="crm-status-pill-modern status-active" style={{ fontSize: '0.6rem' }}>{invoices[0].status}</span>
                  </div>
                  <div style={{ padding: '24px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '24px' }}>
                      <div style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                        <div style={{ color: 'var(--text-dimmed)', fontSize: '0.7rem', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 700 }}>Invoice ID</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)' }}>{invoices[0].invoice_number}</div>
                      </div>
                      <div style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                        <div style={{ color: 'var(--text-dimmed)', fontSize: '0.7rem', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 700 }}>Total Commitment</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)' }}>₹{invoices[0].total_amount?.toLocaleString('en-IN')}</div>
                      </div>
                      <div style={{ background: 'var(--primary-soft)', padding: '16px', borderRadius: '12px', border: '1px solid var(--primary-soft)' }}>
                        <div style={{ color: 'var(--primary)', fontSize: '0.7rem', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 700 }}>Revenue Collected</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>₹{invoices[0].paid_amount?.toLocaleString('en-IN')}</div>
                      </div>
                      <div style={{ background: 'var(--danger-soft)', padding: '16px', borderRadius: '12px', border: '1px solid var(--danger-soft)' }}>
                        <div style={{ color: 'var(--danger)', fontSize: '0.7rem', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 700 }}>Outstanding</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--danger)' }}>₹{(invoices[0].total_amount - invoices[0].paid_amount).toLocaleString('en-IN')}</div>
                      </div>
                    </div>
                    {invoices[0].status !== 'Paid' && (isManagement || isOwner) && (
                      <button className="crm-btn-premium" style={{ marginTop: '24px', width: '100%', background: 'var(--primary)', color: '#ffffff', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }} onClick={() => setIsTransactionModalOpen(true)}>
                        <Icon name="plus" />
                        <span>Log Transaction</span>
                      </button>
                    )}
                  </div>
                </section>
             )}
             {deal.stage === 'Lost' && (
                <section style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger-soft)', borderRadius: '12px', padding: '24px' }}>
                  <label style={{ color: 'var(--danger)', fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Loss Rationale</label>
                  <div style={{ color: 'var(--danger)', marginTop: '8px', lineHeight: '1.6', fontWeight: 500 }}>{deal.lost_reason || 'No loss reason documented.'}</div>
                </section>
             )}
          </div>
        )}

        {activeTab === 'activity' && (
          <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>Activity Intelligence</h3>
            </div>
            <div style={{ padding: '24px' }}>
              <Timeline relatedId={id} relatedType="Deal" defaultView="table" />
            </div>
          </section>
        )}

        {activeTab === 'notes' && (
          <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '32px', boxShadow: 'var(--shadow-sm)' }}>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 800, display: 'block', marginBottom: '16px', letterSpacing: '0.05em' }}>Internal Notes</label>
            <div style={{ color: 'var(--text-muted)', lineHeight: '1.8', whiteSpace: 'pre-wrap', fontSize: '0.95rem' }}>{stripHtml(deal.notes) || 'No detailed internal notes available for this opportunity.'}</div>
          </section>
        )}

        {activeTab === 'payments' && (
          <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>Financial Records</h3>
              {invoices.length > 0 && invoices[0].status !== 'Paid' && (isManagement || isOwner) && (
                <button className="crm-btn-premium" style={{ padding: '6px 16px', fontSize: '0.75rem', background: 'var(--primary)', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 700 }} onClick={() => setIsTransactionModalOpen(true)}>
                  <Icon name="plus" />
                  <span>Log Payment</span>
                </button>
              )}
            </div>
            <div style={{ padding: '24px' }}>
              {payments.length > 0 ? (
                <div className="crm-table-wrap">
                  <table className="crm-table">
                    <thead style={{ background: 'var(--bg-surface)' }}>
                      <tr>
                        <th style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>TRANSACTION #</th>
                        <th style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>AMOUNT</th>
                        <th style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>CHANNEL</th>
                        <th style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>DATE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map(p => (
                        <tr key={p.id}>
                          <td><span style={{ fontSize: '0.85rem', color: 'var(--text)', fontWeight: 600 }}>{p.payment_number}</span></td>
                          <td><span style={{ fontWeight: 800, color: 'var(--success)' }}>₹{p.amount?.toLocaleString('en-IN')}</span></td>
                          <td><span className="crm-status-pill-modern" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', fontSize: '0.65rem' }}>{p.payment_method}</span></td>
                          <td><span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{new Date(p.payment_date).toLocaleDateString()}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dimmed)', fontSize: '0.9rem', fontWeight: 500 }}>No transaction data documented for this deal.</div>}
            </div>
          </section>
        )}
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
         .crm-status-pill-modern {
            padding: 4px 12px;
            border-radius: 8px;
            font-size: 0.65rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            display: inline-flex;
            align-items: center;
            gap: 6px;
         }
         .status-dot { width: 6px; height: 6px; border-radius: 50%; }
         .status-active { background: var(--bg-hover); color: var(--success); border: 1px solid var(--border-strong); }
         .status-active .status-dot { background: var(--success); }
         .status-pending { background: var(--bg-hover); color: var(--warning); border: 1px solid var(--border-strong); }
         .status-pending .status-dot { background: var(--warning); }
         .status-inactive { background: var(--bg-hover); color: var(--text-dimmed); border: 1px solid var(--border-strong); }
         .status-inactive .status-dot { background: var(--text-dimmed); }

        @media (max-width: 900px) {
          .crm-profile-grid-desktop {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
