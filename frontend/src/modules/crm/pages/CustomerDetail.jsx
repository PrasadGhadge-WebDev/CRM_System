import { useEffect, useState, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { customersApi } from '../../../services/customers.js'
import { dealsApi } from '../../../services/deals.js'
import { paymentsApi } from '../../../services/payments.js'
import { workflowApi } from '../../../services/workflow.js'
import Timeline from '../../../components/Timeline.jsx'
import PageHeader from '../../../components/PageHeader.jsx'
import FollowupModal from '../../../components/FollowupModal.jsx'
import { Icon } from '../../../layouts/icons.jsx'
import { useToastFeedback } from '../../../utils/useToastFeedback.js'
import { useAuth } from '../../../context/AuthContext.jsx'
import DealModal from '../components/DealModal.jsx'

function displayValue(value, fallback = '—') {
  return value || fallback
}

function stripHtml(html) {
  if (!html) return ''
  const tmp = document.createElement('DIV')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

export default function CustomerDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const isAdmin = user?.role === 'Admin'
  const isManager = user?.role === 'Manager'
  const isAccountant = user?.role === 'Accountant'
  const isHR = user?.role === 'HR'
  
  const isManagement = isAdmin || isManager
  const isReadOnly = isHR || isAccountant
  
  const [customer, setCustomer] = useState(null)
  const [deals, setDeals] = useState([])
  const [payments, setPayments] = useState([])
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('summary')
  const [newNote, setNewNote] = useState('')
  const [postingNote, setPostingNote] = useState(false)
  const [isFollowupOpen, setIsFollowupOpen] = useState(false)
  const [isDealModalOpen, setIsDealModalOpen] = useState(false)
  
  useToastFeedback({ error })

  const loadCustomerData = useCallback(async () => {
    try {
      const [c, d, n, p] = await Promise.all([
        customersApi.get(id),
        dealsApi.list({ customer_id: id, limit: 'all' }),
        customersApi.listNotes(id),
        paymentsApi.list({ customer_id: id, limit: 'all' })
      ])
      setCustomer(c)
      setDeals(d.items || [])
      setNotes(n || [])
      setPayments(p.items || [])
    } catch (e) {
      setError(e.message || 'Failed to load intelligence')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadCustomerData()
  }, [loadCustomerData])

  async function handleAddNote(e) {
    e.preventDefault()
    if (!newNote.trim()) return
    setPostingNote(true)
    try {
      const saved = await customersApi.addNote(id, { content: newNote })
      setNotes(prev => [saved, ...prev])
      setNewNote('')
      toast.success('Strategy note logged')
    } catch (err) {
      toast.error('Failed to log update')
    } finally {
      setPostingNote(false)
    }
  }

  if (loading) return (
    <div className="center padding40 stack gap-20">
      <div className="spinner-medium" />
      <span className="muted">Synchronizing client record...</span>
    </div>
  )
  if (error && !customer) return <div className="alert error glass-alert">{error}</div>
  if (!customer) return <div className="muted center padding40">Record not found.</div>

  const canModify = !isReadOnly && (isManagement || String(customer.assigned_to?.id || customer.assigned_to) === String(user?.id))

  const paymentStatusClass = customer.payment_status === 'Paid' ? 'badge-success-vibrant' : 
                            customer.payment_status === 'Partial' ? 'badge-warning-vibrant' : 
                            'badge-danger-vibrant'

  return (
    <div className="stack gap-32 user-profile-container">
      <PageHeader
        title="Customer Details"
        description={customer.name}
        backTo="/customers"
        actions={
          <div className="action-group">
            <button className="btn-premium action-info" onClick={() => setIsFollowupOpen(true)}>
              <Icon name="phone" />
              <span>Log Follow-up</span>
            </button>
            {canModify && (
              <Link className="btn-premium action-secondary" to={`/customers/${id}/edit`}>
                <Icon name="edit" />
                <span>Edit Customer</span>
              </Link>
            )}
            {!isReadOnly && (
              <button className="btn-premium action-vibrant" onClick={() => setIsDealModalOpen(true)}>
                <Icon name="plus" />
                <span>New Deal</span>
              </button>
            )}
          </div>
        }
      />

      <section className="user-hero-shell">
        <div className="hero-glow hero-glow-a" />
        <div className="hero-glow hero-glow-b" />

        <div className="hero-topline">
          <span className={`status-pill ${customer.status === 'Lost' ? 'badge-danger-vibrant' : 'badge-success-vibrant'}`}>
            {customer.status || 'Active'}
          </span>
          <span className={`status-pill ${paymentStatusClass}`}>
            Payment: {customer.payment_status || 'Pending'}
          </span>
          <span className="hero-meta-chip">Assigned to: {customer.assigned_to?.name || 'Unassigned'}</span>
        </div>

        <div className="hero-main-row">
          <div className="hero-avatar-modern" aria-hidden="true" style={{ background: 'linear-gradient(135deg, #10b981, #3b82f6)' }}>
            <Icon name="users" size={40} />
          </div>

          <div className="hero-copy">
            <h1 className="hero-name-modern">{customer.name}</h1>
            <div className="hero-subline">
              <div className="hero-subline-item">
                <Icon name="mail" />
                <span>{customer.email || 'No email'}</span>
              </div>
              <div className="hero-divider" />
              <div className="hero-subline-item">
                <Icon name="phone" />
                <span>{customer.phone || 'No phone'}</span>
              </div>
            </div>
          </div>

          <div className="hero-side-stack">
            <div className="hero-stat-card vibrant-border">
              <span className="hero-stat-label">Total Deal Value</span>
              <span className="hero-stat-value success-text" style={{ fontSize: '1.4rem' }}>
                ₹{(customer.total_deal_value || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="hub-navigation">
        {[
          { id: 'summary', label: 'Summary', icon: 'dashboard', roles: ['Admin', 'Manager', 'Employee', 'Accountant', 'HR'] },
          { id: 'deals', label: 'Deals', icon: 'deals', roles: ['Admin', 'Manager', 'Employee', 'Accountant'] },
          { id: 'payments', label: 'Payments', icon: 'reports', roles: ['Admin', 'Manager', 'Accountant'] },
          { id: 'notes', label: 'Notes', icon: 'notes', roles: ['Admin', 'Manager', 'Employee'] },
          { id: 'activity', label: 'Activity History', icon: 'reports', roles: ['Admin', 'Manager', 'Employee', 'Accountant'] }
        ].filter(tab => !tab.roles || tab.roles.includes(user?.role)).map(tab => (
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
          
          {activeTab === 'summary' && (
            <div className="stack gap-24">
              <section className="detail-card">
                <div className="detail-card-header">
                  <div className="detail-card-title">
                    <Icon name="info" />
                    <h3>Company Details</h3>
                  </div>
                  <span className="detail-card-badge subtle">Basic Info</span>
                </div>
                <div className="detail-card-body detail-grid-2">
                  <div className="intel-field">
                    <label>Company Name</label>
                    <div className="intel-value">{displayValue(customer.company_name)}</div>
                  </div>
                  <div className="intel-field">
                    <label>Customer Status</label>
                    <div className="intel-value highlight">{displayValue(customer.status)}</div>
                  </div>
                  <div className="intel-field">
                    <label>Lead Source</label>
                    <div className="intel-value">{displayValue(customer.source)}</div>
                  </div>
                  <div className="intel-field">
                    <label>Last Follow-up</label>
                    <div className="intel-value">
                      {customer.last_interaction_date ? new Date(customer.last_interaction_date).toLocaleDateString() : 'Never'}
                    </div>
                  </div>
                  <div className="intel-field full-width">
                    <label>Office Address</label>
                    <div className="intel-value" style={{ fontSize: '0.95rem', fontWeight: 400, opacity: 0.8 }}>
                      {stripHtml(customer.address) || 'No address added.'}
                    </div>
                  </div>
                </div>
              </section>

              <section className="detail-card">
                <div className="detail-card-header">
                  <div className="detail-card-title">
                    <Icon name="reports" />
                    <h3>Payment Summary</h3>
                  </div>
                </div>
                <div className="detail-card-body">
                  <div className="financial-stats-row">
                    <div className="f-stat">
                      <div className="f-label">Total Deals</div>
                      <div className="f-value">₹{(customer.total_deal_value || 0).toLocaleString()}</div>
                    </div>
                    <div className="f-stat success">
                      <div className="f-label">Paid Amount</div>
                      <div className="f-value">₹{(customer.paid_amount || 0).toLocaleString()}</div>
                    </div>
                    <div className="f-stat warning">
                      <div className="f-label">Pending Amount</div>
                      <div className="f-value">₹{(customer.pending_amount || 0).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="progress-bar-wrap">
                    <div className="progress-bar-label">Collection Progress</div>
                    <div className="progress-bg">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${customer.total_deal_value > 0 ? (customer.paid_amount / customer.total_deal_value) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'deals' && (
            <section className="detail-card">
              <div className="detail-card-header">
                <div className="detail-card-title">
                  <Icon name="deals" />
                  <h3>Deals List</h3>
                </div>
              </div>
              <div className="detail-card-body">
                {deals.length > 0 ? (
                  <div className="high-density-table-wrap">
                    <table className="table-minimal-premium">
                      <thead>
                        <tr>
                          <th>Deal ID</th>
                          <th>Deal Name</th>
                          <th>Value</th>
                          <th>Stage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deals.map(deal => (
                          <tr key={deal.id}>
                            <td><span className="muted">{deal.readable_id}</span></td>
                            <td><Link className="link-standard" to={`/deals/${deal.id}`}>{deal.name}</Link></td>
                            <td className="font-numeric">₹{deal.value?.toLocaleString()}</td>
                            <td><span className={`stage-chip-mini ${deal.stage === 'Won' ? 'success' : ''}`}>{deal.stage}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state-mini">No deals found for this customer.</div>
                )}
              </div>
            </section>
          )}

          {activeTab === 'payments' && (
            <section className="detail-card">
              <div className="detail-card-header">
                <div className="detail-card-title">
                  <Icon name="activity" />
                  <h3>Payment Records</h3>
                </div>
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
                  <div className="empty-state-mini">No payments found.</div>
                )}
              </div>
            </section>
          )}

          {activeTab === 'notes' && (
            <div className="stack gap-24">
              <section className="discussion-input-card">
                <form className="discussion-form" onSubmit={handleAddNote}>
                  <textarea 
                    className="discussion-textarea"
                    placeholder="Write a note about this customer..."
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    required
                  />
                  <div className="row justify-end padding12">
                    <button className="btn-modern-vibrant" style={{ width: 'auto', padding: '10px 24px' }} disabled={postingNote || !newNote.trim()}>
                      <Icon name="edit" size={14} />
                      <span>{postingNote ? 'Saving...' : 'Save Note'}</span>
                    </button>
                  </div>
                </form>
              </section>

              <div className="discussion-timeline">
                {notes.length > 0 ? notes.map(note => (
                  <div key={note.id} className="discussion-bubble-row">
                    <div className="discussion-avatar" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
                      {(note.author_id?.name || 'U').charAt(0)}
                    </div>
                    <div className="discussion-bubble">
                      <div className="discussion-bubble-header">
                        <span className="discussion-author">{note.author_id?.name || 'Staff'}</span>
                        <span className="discussion-time">{new Date(note.created_at).toLocaleString()}</span>
                      </div>
                      <div className="discussion-content">{stripHtml(note.content)}</div>
                    </div>
                  </div>
                )) : (
                  <div className="empty-state-mini">No notes found for this customer.</div>
                )}
              </div>
            </div>
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
                <Timeline relatedId={id} relatedType="Customer" defaultView="table" />
              </div>
            </section>
          )}
        </div>

        <aside className="user-detail-side">
          <section className="detail-card accent-card">
            <div className="detail-card-header">
              <div className="detail-card-title">
                <Icon name="dashboard" />
                <h3>Account Summary</h3>
              </div>
              <span className="detail-card-badge success">Live</span>
            </div>
            <div className="detail-card-body">
              <div className="milestone-panel">
                 <div className="milestone-label">Pending Payment</div>
                 <div className="milestone-value danger-text">
                   ₹{(customer.pending_amount || 0).toLocaleString()}
                 </div>
              </div>

              <div className="snapshot-list">
                <div className="snapshot-row">
                  <span className="snapshot-label">Assigned To</span>
                  <span className="snapshot-value">{customer.assigned_to?.name || 'Unassigned'}</span>
                </div>
                <div className="snapshot-row">
                  <span className="snapshot-label">Next Follow-up</span>
                  <span className="snapshot-value">
                    {customer.next_followup_date ? new Date(customer.next_followup_date).toLocaleDateString() : '—'}
                  </span>
                </div>
              </div>

              <button className="btn-modern-vibrant full-width" onClick={() => setIsFollowupOpen(true)}>
                <Icon name="plus" />
                <span>Set Follow-up</span>
              </button>
            </div>
          </section>

          {customer.converted_from_lead_id && (
            <section className="detail-card">
              <div className="detail-card-header">
                <div className="detail-card-title">
                  <Icon name="eye" />
                  <h3>Lead History</h3>
                </div>
                <span className="detail-card-badge subtle">Converted</span>
              </div>
              <div className="detail-card-body">
                <Link to={`/leads/${customer.converted_from_lead_id?.id || customer.converted_from_lead_id}`} className="converted-link-premium">
                  <div className="link-icon"><Icon name="eye" size={14} /></div>
                  <div className="link-text">
                    <strong>View Original Lead</strong>
                    <span>Check records before conversion</span>
                  </div>
                </Link>
              </div>
            </section>
          )}
        </aside>
      </div>

      <DealModal 
        isOpen={isDealModalOpen}
        customerId={id}
        onClose={() => setIsDealModalOpen(false)}
        onSave={() => loadCustomerData()}
      />

      <FollowupModal 
        isOpen={isFollowupOpen}
        lead={{ ...customer, relatedType: 'Customer' }}
        onClose={() => setIsFollowupOpen(false)}
        onSave={(updated) => {
          setCustomer(prev => ({ ...prev, ...updated }));
          setIsFollowupOpen(false);
          loadCustomerData();
        }}
      />

      <style>{`
        .user-profile-container { padding-bottom: 60px; }
        .btn-premium { display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 12px; font-weight: 700; font-size: 0.88rem; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border: 1px solid transparent; cursor: pointer; text-decoration: none; }
        .action-info { background: rgba(14, 165, 233, 0.1); color: #0ea5e9; border-color: rgba(14, 165, 233, 0.2); }
        .action-secondary { background: var(--bg-surface); color: var(--text-muted); border-color: var(--border); }
        .action-vibrant { background: var(--primary); color: white; box-shadow: 0 4px 12px var(--primary-soft); }
        .btn-premium:hover { transform: translateY(-2px); filter: brightness(1.05); }

        .user-hero-shell { position: relative; overflow: hidden; background: radial-gradient(circle at top left, rgba(99, 102, 241, 0.15), transparent 40%), linear-gradient(135deg, rgba(17, 24, 39, 0.98), rgba(15, 23, 42, 0.95)); border: 1px solid var(--border); border-radius: 32px; padding: 32px; box-shadow: var(--shadow-xl); backdrop-filter: blur(14px); margin-bottom: 32px; }
        .hero-glow { position: absolute; border-radius: 999px; filter: blur(40px); pointer-events: none; opacity: 0.5; }
        .hero-glow-a { top: -80px; left: -40px; width: 300px; height: 300px; background: rgba(59, 130, 246, 0.2); }
        .hero-glow-b { right: -70px; bottom: -100px; width: 350px; height: 350px; background: rgba(99, 102, 241, 0.15); }

        .hero-topline { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; position: relative; z-index: 1; }
        .status-pill, .hero-meta-chip, .detail-card-badge { display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; font-size: 0.75rem; font-weight: 800; letter-spacing: 0.04em; padding: 7px 14px; text-transform: uppercase; }
        .badge-success-vibrant { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
        .badge-warning-vibrant { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
        .badge-danger-vibrant { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }
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
        .user-detail-side { width: 360px; flex: 0 0 auto; position: sticky; top: 96px; display: flex; flex-direction: column; gap: 24px; }
        
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

        .financial-stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
        .f-stat { background: rgba(255,255,255,0.03); padding: 16px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); }
        .f-stat.success { border-color: rgba(16, 185, 129, 0.2); }
        .f-stat.warning { border-color: rgba(245, 158, 11, 0.2); }
        .f-label { font-size: 0.65rem; font-weight: 800; color: var(--text-dimmed); text-transform: uppercase; margin-bottom: 4px; }
        .f-value { font-size: 1.1rem; font-weight: 900; color: white; }
        .success-text { color: #34d399 !important; }
        .danger-text { color: #f87171 !important; }

        .progress-bar-wrap { margin-top: 12px; }
        .progress-bar-label { font-size: 0.7rem; font-weight: 800; color: var(--text-dimmed); margin-bottom: 8px; text-transform: uppercase; }
        .progress-bg { height: 8px; background: rgba(255,255,255,0.05); border-radius: 99px; overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, var(--primary), #34d399); border-radius: 999px; transition: width 0.5s ease; }

        .accent-card { background: rgba(59, 130, 246, 0.03); border-color: rgba(59, 130, 246, 0.2); }
        .milestone-panel { background: rgba(59, 130, 246, 0.05); border: 1px solid rgba(59, 130, 246, 0.1); border-radius: 18px; padding: 20px; margin-bottom: 24px; text-align: center; }
        .milestone-label { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: var(--text-dimmed); margin-bottom: 8px; }
        .milestone-value { font-size: 1.4rem; font-weight: 900; color: var(--primary); }

        .snapshot-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; }
        .snapshot-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-radius: 14px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); }
        .snapshot-label { font-size: 0.8rem; color: var(--text-muted); font-weight: 600; }
        .snapshot-value { color: white; font-weight: 800; text-align: right; }

        .btn-modern-vibrant { background: var(--primary); color: white; border: none; border-radius: 12px; padding: 14px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; transition: 0.2s; }
        .btn-modern-vibrant:hover { transform: translateY(-2px); box-shadow: 0 4px 12px var(--primary-soft); }

        .high-density-table-wrap { overflow-x: auto; }
        .table-minimal-premium { width: 100%; border-collapse: collapse; }
        .table-minimal-premium th { text-align: left; padding: 12px 8px; font-size: 0.65rem; color: var(--text-dimmed); text-transform: uppercase; font-weight: 900; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .table-minimal-premium td { padding: 16px 8px; border-bottom: 1px solid rgba(255,255,255,0.03); font-size: 0.95rem; color: white; }
        .link-standard { color: var(--primary); font-weight: 800; text-decoration: none; }
        .stage-chip-mini { display: inline-block; padding: 4px 10px; border-radius: 8px; font-size: 0.65rem; font-weight: 900; background: rgba(59, 130, 246, 0.1); color: #3b82f6; text-transform: uppercase; }
        .stage-chip-mini.success { background: rgba(16, 185, 129, 0.1); color: #10b981; }

        .discussion-input-card { background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); border-radius: 24px; padding: 20px; }
        .discussion-textarea { width: 100%; min-height: 120px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 16px; color: white; font-size: 0.95rem; line-height: 1.6; outline: none; resize: none; }
        
        .discussion-bubble-row { display: flex; gap: 16px; margin-top: 24px; }
        .discussion-avatar { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 900; flex: 0 0 auto; }
        .discussion-bubble { flex: 1; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 16px; }
        .discussion-bubble-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .discussion-author { font-weight: 800; color: white; font-size: 0.9rem; }
        .discussion-time { font-size: 0.7rem; color: var(--text-dimmed); }
        .discussion-content { font-size: 0.95rem; color: var(--text-muted); line-height: 1.5; }

        .snapshot-label { font-size: 0.75rem; font-weight: 600; color: var(--text-muted); }
        .snapshot-value { color: white; font-weight: 800; font-size: 0.9rem; }

        .converted-link-premium { display: flex; align-items: center; gap: 12px; padding: 16px; background: rgba(59, 130, 246, 0.05); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 16px; text-decoration: none; transition: 0.2s; }
        .converted-link-premium:hover { background: rgba(59, 130, 246, 0.1); border-color: var(--primary); }
        .link-icon { color: var(--primary); }
        .link-text strong { display: block; color: white; font-size: 0.9rem; }
        .link-text span { font-size: 0.75rem; color: var(--text-dimmed); }

        @media (max-width: 1024px) {
          .user-detail-grid { flex-direction: column; }
          .user-detail-side { width: 100%; position: static; }
          .hero-main-row { flex-direction: column; align-items: flex-start; gap: 24px; }
          .hero-side-stack { width: 100%; grid-template-columns: 1fr 1fr; }
          .financial-stats-row { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
