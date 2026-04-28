import { useEffect, useState, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { customersApi } from '../../../services/customers.js'
import { dealsApi } from '../../../services/deals.js'
import { paymentsApi } from '../../../services/payments.js'
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
    } catch {
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
    <div className="crm-fullscreen-shell crm-detail-container">
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

      <section className="crm-hero-shell">
        <div className="crm-hero-glow crm-hero-glow-1" />
        <div className="crm-hero-glow crm-hero-glow-2" />

        <div className="crm-hero-topline">
          <span className={`status-pill ${customer.status === 'Lost' ? 'badge-danger-vibrant' : 'badge-success-vibrant'}`}>
            {customer.status || 'Active'}
          </span>
          <span className={`status-pill ${paymentStatusClass}`}>
            Payment: {customer.payment_status || 'Pending'}
          </span>
          <span className="hero-meta-chip">Assigned to: {customer.assigned_to?.name || 'Unassigned'}</span>
        </div>

        <div className="crm-hero-main-row">
          <div className="crm-hero-avatar" aria-hidden="true">
            <Icon name="users" size={48} />
          </div>

          <div className="crm-hero-copy">
            <h1 className="crm-hero-name">{customer.name}</h1>
            <div className="crm-hero-subline">
              <div className="crm-hero-subline-item">
                <Icon name="mail" />
                <span>{customer.email || 'No email'}</span>
              </div>
              <div className="crm-hero-divider" />
              <div className="crm-hero-subline-item">
                <Icon name="phone" />
                <span>{customer.phone || 'No phone'}</span>
              </div>
            </div>
          </div>

          <div className="crm-hero-side-stack">
            <div className="crm-hero-stat-card vibrant-border">
              <span className="crm-hero-stat-label">Total Deal Value</span>
              <span className="crm-hero-stat-value success">
                ₹{(customer.total_deal_value || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="crm-hub-nav">
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
            className={`crm-hub-tab ${activeTab === tab.id ? 'active' : ''}`}
          >
            <Icon name={tab.icon} size={14} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="crm-detail-grid">
        <div className="crm-detail-main">

          {activeTab === 'summary' && (
            <div className="stack gap-24">
              <section className="crm-detail-card">
                <div className="crm-detail-card-header">
                  <div className="crm-detail-card-title">
                    <Icon name="info" />
                    <h3>Company Details</h3>
                  </div>
                </div>
                <div className="crm-detail-card-body">
                  <div className="crm-intel-grid">
                    <div className="crm-intel-field">
                      <label>Company Name</label>
                      <div className="crm-intel-value">{displayValue(customer.company_name)}</div>
                    </div>
                    <div className="crm-intel-field">
                      <label>Customer Status</label>
                      <div className="crm-intel-value highlight">{displayValue(customer.status)}</div>
                    </div>
                    <div className="crm-intel-field">
                      <label>Lead Source</label>
                      <div className="crm-intel-value">{displayValue(customer.source)}</div>
                    </div>
                    <div className="crm-intel-field">
                      <label>Last Follow-up</label>
                      <div className="crm-intel-value">
                        {customer.last_interaction_date ? new Date(customer.last_interaction_date).toLocaleDateString() : 'Never'}
                      </div>
                    </div>
                    <div className="crm-intel-field full-width">
                      <label>Office Address</label>
                      <div className="crm-intel-value" style={{ fontSize: '0.95rem', fontWeight: 400, opacity: 0.8 }}>
                        {stripHtml(customer.address) || 'No address added.'}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="crm-detail-card">
                <div className="crm-detail-card-header">
                  <div className="crm-detail-card-title">
                    <Icon name="reports" />
                    <h3>Payment Summary</h3>
                  </div>
                </div>
                <div className="crm-detail-card-body">
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
            <section className="crm-detail-card">
              <div className="crm-detail-card-header">
                <div className="crm-detail-card-title">
                  <Icon name="deals" />
                  <h3>Deals List</h3>
                </div>
              </div>
              <div className="crm-detail-card-body">
                {deals.length > 0 ? (
                  <div className="crm-table-wrap">
                    <table className="crm-table">
                      <thead>
                        <tr>
                          <th>DEAL ID</th>
                          <th>DEAL NAME</th>
                          <th>VALUE</th>
                          <th>STAGE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deals.map(deal => (
                          <tr key={deal.id} className="crm-table-row">
                            <td><span className="muted">{deal.readable_id || 'OPP-100'}</span></td>
                            <td><Link className="link-standard" style={{ fontWeight: 700 }} to={`/deals/${deal.id}`}>{deal.name}</Link></td>
                            <td className="font-numeric">₹{deal.value?.toLocaleString()}</td>
                            <td><span className={`status-pill ${deal.stage === 'Won' ? 'badge-success-vibrant' : 'badge-info-vibrant'}`} style={{ fontSize: '0.65rem' }}>{deal.stage}</span></td>
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
            <section className="crm-detail-card">
              <div className="crm-detail-card-header">
                <div className="crm-detail-card-title">
                  <Icon name="activity" />
                  <h3>Payment Records</h3>
                </div>
              </div>
              <div className="crm-detail-card-body">
                {payments.length > 0 ? (
                  <div className="crm-table-wrap">
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
                            <td className="font-numeric success-text">₹{p.amount?.toLocaleString()}</td>
                            <td><span className="badge-info-vibrant" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>{p.payment_method}</span></td>
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
            <section className="crm-detail-card">
              <div className="crm-detail-card-header">
                <div className="crm-detail-card-title">
                  <Icon name="reports" />
                  <h3>Activity History</h3>
                </div>
              </div>
              <div className="crm-detail-card-body">
                <Timeline relatedId={id} relatedType="Customer" defaultView="table" />
              </div>
            </section>
          )}
        </div>

        <aside className="crm-detail-side">
          <section className="crm-detail-card accent-card">
            <div className="crm-detail-card-header">
              <div className="crm-detail-card-title">
                <Icon name="dashboard" />
                <h3>Quick Actions</h3>
              </div>
            </div>
            <div className="crm-detail-card-body">
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
            <section className="crm-detail-card">
              <div className="crm-detail-card-header">
                <div className="crm-detail-card-title">
                  <Icon name="eye" />
                  <h3>Lead History</h3>
                </div>
              </div>
              <div className="crm-detail-card-body">
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
    </div>
  );
}
