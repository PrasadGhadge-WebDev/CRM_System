import { useEffect, useState, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { customersApi } from '../../../services/customers.js'
import { dealsApi } from '../../../services/deals.js'
import { workflowApi } from '../../../services/workflow.js'
import { ordersApi } from '../../../services/orders.js'
import Timeline from '../../../components/Timeline.jsx'
import PageHeader from '../../../components/PageHeader.jsx'
import { Icon } from '../../../layouts/icons.jsx'
import { useToastFeedback } from '../../../utils/useToastFeedback.js'
import { useAuth } from '../../../context/AuthContext.jsx'

export default function CustomerDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const isAdmin = user?.role === 'Admin'
  const isManager = user?.role === 'Manager'
  const isManagement = isAdmin || isManager
  const isEmployee = user?.role === 'Employee'
  
  const [customer, setCustomer] = useState(null)
  const [deals, setDeals] = useState([])
  const [orders, setOrders] = useState([])
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('info')
  const [newNote, setNewNote] = useState('')
  const [postingNote, setPostingNote] = useState(false)
  
  useToastFeedback({ error })

  const loadCustomerData = useCallback(async () => {
    try {
      const [c, d, n, o] = await Promise.all([
        customersApi.get(id),
        dealsApi.list({ customer_id: id }),
        customersApi.listNotes(id),
        ordersApi.list({ customer_id: id })
      ])
      setCustomer(c)
      setDeals(Array.isArray(d) ? d : d.items || [])
      setNotes(n || [])
      setOrders(o.items || [])
    } catch (e) {
      setError(e.message || 'Failed to load intelligence')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadCustomerData()
  }, [loadCustomerData])

  async function handleCreateTicket() {
    const subject = prompt('Enter ticket subject:')
    if (!subject) return
    try {
      await workflowApi.createSupportTicket({
        customerId: id,
        subject,
        description: 'New ticket from customer detail page',
        priority: 'medium',
      })
      toast.success('Support ticket created successfully')
    } catch {
      setError('Ticket creation failed')
    }
  }

  async function handleAddNote(e) {
    e.preventDefault()
    if (!newNote.trim()) return
    setPostingNote(true)
    try {
      const saved = await customersApi.addNote(id, { content: newNote })
      setNotes(prev => [saved, ...prev])
      setNewNote('')
      toast.success('Note logged')
    } catch (err) {
      toast.error('Failed to post note')
    } finally {
      setPostingNote(false)
    }
  }

  if (loading) return (
    <div className="center padding40 stack gap-20">
      <div className="spinner-medium" />
      <span className="muted">Synchronizing intelligence...</span>
    </div>
  )
  if (error && !customer) return <div className="alert error glass-alert">{error}</div>
  if (!customer) return <div className="muted center padding40">Entity not found.</div>

  const isAssignedToMe = String(customer.assigned_to?.id || customer.assigned_to) === String(user?.id)
  const canModify = isManagement || isAssignedToMe
  const totalLifecycleValue = deals.reduce((acc, d) => acc + (d.value || 0), 0)

  return (
    <div className="stack gap-32 user-profile-container">
      <PageHeader
        title="Client Intelligence"
        backTo="/customers"
        actions={
          <div className="action-group">
            {canModify && (
              <Link className="btn-premium action-secondary" to={`/customers/${id}/edit`}>
                <Icon name="edit" />
                <span>Update Profile</span>
              </Link>
            )}
            <button className="btn-premium action-vibrant" onClick={handleCreateTicket}>
              <Icon name="shield" />
              <span>Raise Ticket</span>
            </button>
          </div>
        }
      />

      <section className="user-hero-shell">
        <div className="hero-glow hero-glow-a" />
        <div className="hero-glow hero-glow-b" />

        <div className="hero-topline">
          <span className={`status-pill ${customer.status === 'Inactive' ? 'badge-danger-vibrant' : 'badge-success-vibrant'}`}>
            {customer.status || 'Active'}
          </span>
          <span className="hero-meta-chip">ID {customer.id.slice(-6).toUpperCase()}</span>
          <span className="hero-meta-chip">Type: {customer.customer_type || 'General'}</span>
        </div>

        <div className="hero-main-row">
          <div className="hero-avatar-modern" aria-hidden="true">
            {(customer.name || 'C').charAt(0).toUpperCase()}
          </div>

          <div className="hero-copy">
            <h1 className="hero-name-modern">{customer.name}</h1>
            <div className="hero-subline">
              <div className="hero-subline-item">
                <Icon name="mail" />
                <span>{customer.email || 'No email record'}</span>
              </div>
              <div className="hero-divider" />
              <div className="hero-subline-item">
                <Icon name="phone" />
                <span>{customer.phone || 'No phone record'}</span>
              </div>
              <div className="hero-divider" />
              <div className="hero-subline-item">
                <Icon name="user" />
                <span>Managed by {customer.assigned_to?.name || 'Central Team'}</span>
              </div>
            </div>
          </div>

          <div className="hero-side-stack">
            <div className="hero-stat-card">
              <span className="hero-stat-label">Lifecycle Value</span>
              <span className="hero-stat-value">
                INR {totalLifecycleValue.toLocaleString()}
              </span>
            </div>
            <div className="hero-stat-card">
              <span className="hero-stat-label">Global Territory</span>
              <span className="hero-stat-value">{customer.city || 'Undisclosed'}, {customer.country || 'IN'}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="hub-navigation">
        {['info', 'discussion', 'deals', 'payments', 'history'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`hub-tab ${activeTab === tab ? 'active' : ''}`}
          >
            <span className="capitalize">{tab}</span>
          </button>
        ))}
      </div>

      <div className="user-detail-grid">
        <div className="user-detail-main">
          
          {activeTab === 'info' && (
            <section className="detail-card">
              <div className="detail-card-header">
                <div className="detail-card-title">
                  <Icon name="user" />
                  <h3>Entity Attributes</h3>
                </div>
                <span className="detail-card-badge">Profile Core</span>
              </div>
              <div className="detail-card-body detail-grid-2">
                <div className="intel-field">
                  <label>Primary Email</label>
                  <div className="intel-value">{customer.email || 'N/A'}</div>
                </div>
                <div className="intel-field">
                  <label>Mobile Hub</label>
                  <div className="intel-value">{customer.phone || 'N/A'}</div>
                </div>
                <div className="intel-field">
                  <label>Alt Phone</label>
                  <div className="intel-value">{customer.alternate_phone || 'None recorded'}</div>
                </div>
                <div className="intel-field">
                  <label>Postal Code</label>
                  <div className="intel-value">{customer.postal_code || 'N/A'}</div>
                </div>
                <div className="intel-field full-width">
                  <label>Physical Address</label>
                  <div className="intel-value">{customer.address || 'No physical address tracked.'}</div>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'discussion' && (
            <div className="stack gap-24">
              <section className="discussion-input-card">
                <form className="discussion-form" onSubmit={handleAddNote}>
                  <textarea 
                    className="discussion-textarea"
                    placeholder="Log a discussion, update strategy, or add a private note..."
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    required
                  />
                  <div className="row justify-end padding12 border-top">
                    <button className="btn-modern-post" disabled={postingNote || !newNote.trim()}>
                      <Icon name="edit" size={14} />
                      <span>{postingNote ? 'Logging...' : 'Post Update'}</span>
                    </button>
                  </div>
                </form>
              </section>

              <div className="discussion-timeline">
                {notes.length > 0 ? notes.map(note => (
                  <div key={note.id} className="discussion-bubble-row">
                    <div className="discussion-avatar">
                      {(note.author_id?.name || 'U').charAt(0)}
                    </div>
                    <div className="discussion-bubble">
                      <div className="discussion-bubble-header">
                        <span className="discussion-author">{note.author_id?.name || 'System'}</span>
                        <span className="discussion-time">{new Date(note.created_at).toLocaleString()}</span>
                      </div>
                      <div className="discussion-content">{note.content}</div>
                    </div>
                  </div>
                )) : (
                  <div className="muted center padding40 glass-card">No discussion logs found for this client.</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'deals' && (
            <section className="detail-card">
              <div className="detail-card-header">
                <div className="detail-card-title">
                  <Icon name="deals" />
                  <h3>Deal Lifecycle</h3>
                </div>
              </div>
              <div className="detail-card-body">
                {deals.length > 0 ? (
                  <div className="high-density-table-wrap">
                    <table className="table-minimal-premium">
                      <thead>
                        <tr>
                          <th>Target Deal</th>
                          <th>Valuation</th>
                          <th>Stage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deals.map(deal => (
                          <tr key={deal.id}>
                            <td><Link className="link-standard" to={`/deals/${deal.id}`}>{deal.name}</Link></td>
                            <td className="font-numeric">INR {deal.value?.toLocaleString()}</td>
                            <td><span className="stage-chip-mini">{deal.stage}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="muted center padding20">No active deals found.</div>
                )}
              </div>
            </section>
          )}

          {activeTab === 'payments' && (
            <section className="detail-card">
              <div className="detail-card-header">
                <div className="detail-card-title">
                  <Icon name="reports" />
                  <h3>Payment History</h3>
                </div>
              </div>
              <div className="detail-card-body">
                {orders.length > 0 ? (
                  <div className="high-density-table-wrap">
                    <table className="table-minimal-premium">
                      <thead>
                        <tr>
                          <th>Order ID</th>
                          <th>Valuation</th>
                          <th>Status</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map(order => (
                          <tr key={order.id}>
                            <td>ORD-{order.id.slice(-6).toUpperCase()}</td>
                            <td className="font-numeric">{order.currency} {order.total_amount?.toLocaleString()}</td>
                            <td><span className={`stage-chip-mini ${order.status === 'paid' ? 'success' : ''}`}>{order.status}</span></td>
                            <td>{new Date(order.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="muted center padding20">No financial transactions recorded.</div>
                )}
              </div>
            </section>
          )}

          {activeTab === 'history' && (
            <section className="detail-card">
              <div className="detail-card-header">
                <div className="detail-card-title">
                  <Icon name="reports" />
                  <h3>Audit Trail</h3>
                </div>
              </div>
              <div className="detail-card-body">
                <Timeline relatedId={id} relatedType="Customer" />
              </div>
            </section>
          )}
        </div>

        <aside className="user-detail-side">
          {customer.converted_from_lead_id && (
            <section className="detail-card accent-card">
              <div className="detail-card-header">
                <div className="detail-card-title">
                  <Icon name="dashboard" />
                  <h3>Lead Origin</h3>
                </div>
                <span className="detail-card-badge success">Converted</span>
              </div>
              <div className="detail-card-body">
                <div className="snapshot-list">
                   <div className="snapshot-row">
                     <span className="snapshot-label">Captured As</span>
                     <span className="snapshot-value">{customer.converted_from_lead_id.name}</span>
                   </div>
                </div>
                <Link to={`/leads/${customer.converted_from_lead_id?.id || customer.converted_from_lead_id}`} className="converted-link-premium">
                  <div className="link-icon"><Icon name="eye" /></div>
                  <div className="link-text">
                    <strong>Inspect Original Lead</strong>
                    <span>View pre-conversion history</span>
                  </div>
                </Link>
              </div>
            </section>
          )}

          <section className="detail-card">
            <div className="detail-card-header">
              <div className="detail-card-title">
                <Icon name="notes" />
                <h3>Legacy Context</h3>
              </div>
            </div>
            <div className="detail-card-body">
              <div className="context-note-bubble">
                {customer.notes || 'No legacy notes available.'}
              </div>
            </div>
          </section>
        </aside>
      </div>

      <style>{`
        .user-profile-container { padding-bottom: 60px; }
        .control-bar-premium { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; justify-content: flex-end; }
        .btn-premium { display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 12px; font-weight: 700; font-size: 0.88rem; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border: 1px solid transparent; cursor: pointer; text-decoration: none; }
        .action-info { background: rgba(14, 165, 233, 0.1); color: #0ea5e9; border-color: rgba(14, 165, 233, 0.2); }
        .action-secondary { background: var(--bg-surface); color: var(--text-muted); border-color: var(--border); }
        .btn-premium:hover { transform: translateY(-2px); filter: brightness(1.05); }

        .user-hero-shell { position: relative; overflow: hidden; background: radial-gradient(circle at top left, rgba(99, 102, 241, 0.15), transparent 40%), linear-gradient(135deg, rgba(17, 24, 39, 0.98), rgba(15, 23, 42, 0.95)); border: 1px solid var(--border); border-radius: 32px; padding: 32px; box-shadow: var(--shadow-xl); backdrop-filter: blur(14px); }
        .hero-glow { position: absolute; border-radius: 999px; filter: blur(40px); pointer-events: none; opacity: 0.5; }
        .hero-glow-a { top: -80px; left: -40px; width: 300px; height: 300px; background: rgba(59, 130, 246, 0.2); }
        .hero-glow-b { right: -70px; bottom: -100px; width: 350px; height: 350px; background: rgba(99, 102, 241, 0.15); }
        
        .hero-topline { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; position: relative; z-index: 1; }
        .status-pill, .hero-meta-chip, .detail-card-badge { display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; font-size: 0.75rem; font-weight: 800; letter-spacing: 0.04em; padding: 7px 14px; text-transform: uppercase; }
        .badge-success-vibrant { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
        .badge-danger-vibrant { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }
        .hero-meta-chip { background: rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.85); border: 1px solid rgba(255, 255, 255, 0.15); }
        .detail-card-badge { background: rgba(255, 255, 255, 0.05); color: var(--text-dimmed); border: 1px solid rgba(255, 255, 255, 0.1); }
        .detail-card-badge.success { background: rgba(16, 185, 129, 0.1); color: #10b981; border-color: rgba(16, 185, 129, 0.2); }

        .hero-main-row { display: flex; align-items: center; gap: 32px; justify-content: space-between; position: relative; z-index: 1; }
        .hero-avatar-modern { width: 100px; height: 100px; flex: 0 0 auto; background: linear-gradient(135deg, #4f46e5, #9333ea); border-radius: 30px; border: 2px solid rgba(255, 255, 255, 0.1); display: flex; align-items: center; justify-content: center; font-size: 3.2rem; font-weight: 900; color: white; box-shadow: 0 16px 32px rgba(0, 0, 0, 0.4); }
        .hero-name-modern { margin: 0 0 12px; font-size: clamp(2rem, 4vw, 3.2rem); line-height: 1; letter-spacing: -0.04em; color: white; font-weight: 900; }
        .hero-subline { display: flex; align-items: center; flex-wrap: wrap; gap: 16px; }
        .hero-subline-item { display: inline-flex; align-items: center; gap: 8px; color: rgba(255, 255, 255, 0.75); font-size: 0.95rem; font-weight: 500; }
        .hero-subline-item svg { color: var(--primary); width: 18px; }
        .hero-divider { width: 1px; height: 14px; background: rgba(255, 255, 255, 0.1); }
        
        .hero-side-stack { display: grid; gap: 14px; min-width: 280px; }
        .hero-stat-card { background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 20px; padding: 14px 18px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2); }
        .hero-stat-label { display: block; color: rgba(255, 255, 255, 0.6); font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; margin-bottom: 6px; }
        .hero-stat-value { color: white; font-weight: 800; font-size: 1.1rem; line-height: 1.2; }

        .hub-navigation { display: flex; gap: 32px; border-bottom: 1px solid var(--border); padding-bottom: 2px; }
        .hub-tab { background: none; border: none; padding: 12px 4px; font-size: 0.95rem; font-weight: 800; color: var(--text-dimmed); cursor: pointer; transition: all 0.2s ease; border-bottom: 3px solid transparent; position: relative; bottom: -1px; }
        .hub-tab:hover { color: var(--text); }
        .hub-tab.active { color: var(--primary); border-color: var(--primary); }

        .user-detail-grid { display: flex; gap: 24px; align-items: start; }
        .user-detail-main { display: grid; gap: 24px; flex: 1 1 auto; min-width: 0; }
        .user-detail-side { width: 360px; flex: 0 0 auto; position: sticky; top: 96px; }

        .detail-card { background: var(--bg-surface); border: 1px solid rgba(148, 163, 184, 0.38); border-radius: 24px; overflow: hidden; box-shadow: var(--shadow-xl); }
        .detail-card-header { display: flex; align-items: center; justify-content: space-between; padding: 22px 24px; border-bottom: 1px solid rgba(255,255,255,0.03); background: rgba(255,255,255,0.02); }
        .detail-card-title { display: flex; align-items: center; gap: 12px; }
        .detail-card-title h3 { margin: 0; font-size: 1.05rem; font-weight: 800; color: white; }
        .detail-card-title svg { color: var(--primary); }
        .detail-card-body { padding: 24px; }
        .detail-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .intel-field label { display: block; font-size: 0.75rem; font-weight: 800; color: var(--text-dimmed); text-transform: uppercase; margin-bottom: 10px; letter-spacing: 0.08em; }
        .intel-value { font-size: 1.05rem; font-weight: 600; color: white; word-break: break-all; }
        .full-width { grid-column: 1 / -1; }

        /* Discussion Log Styles */
        .discussion-input-card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 20px; overflow: hidden; box-shadow: var(--shadow-lg); }
        .discussion-form { display: flex; flex-direction: column; }
        .discussion-textarea { width: 100%; min-height: 100px; padding: 20px; background: none; border: none; color: white; font-size: 0.95rem; line-height: 1.6; outline: none; resize: none; font-family: inherit; }
        .btn-modern-post { display: inline-flex; align-items: center; gap: 8px; padding: 8px 18px; background: var(--primary); color: white; border: none; border-radius: 10px; font-weight: 700; font-size: 0.85rem; cursor: pointer; transition: all 0.2s ease; }
        .btn-modern-post:disabled { opacity: 0.5; cursor: not-allowed; }
        .discussion-timeline { display: flex; flex-direction: column; gap: 16px; }
        .discussion-bubble-row { display: flex; gap: 16px; align-items: start; }
        .discussion-avatar { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, #4f46e5, #9333ea); color: white; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 0.9rem; flex-shrink: 0; }
        .discussion-bubble { flex: 1; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 16px; padding: 14px 18px; }
        .discussion-bubble-header { display: flex; justify-content: space-between; margin-bottom: 6px; }
        .discussion-author { font-size: 0.85rem; font-weight: 800; color: white; }
        .discussion-time { font-size: 0.72rem; color: var(--text-dimmed); }
        .discussion-content { font-size: 0.92rem; line-height: 1.5; color: var(--text-muted); }

        .high-density-table-wrap { overflow-x: auto; }
        .table-minimal-premium { width: 100%; border-collapse: collapse; }
        .table-minimal-premium th { text-align: left; padding: 12px 0; font-size: 0.75rem; color: var(--text-dimmed); text-transform: uppercase; font-weight: 800; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .table-minimal-premium td { padding: 14px 0; border-bottom: 1px solid rgba(255,255,255,0.03); font-size: 0.9rem; color: var(--text-muted); }
        .link-standard { color: var(--primary); font-weight: 600; text-decoration: none; }
        .link-standard:hover { text-decoration: underline; }
        .font-numeric { font-variant-numeric: tabular-nums; font-weight: 700; color: white; }
        .stage-chip-mini { display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 0.65rem; font-weight: 800; background: rgba(255,255,255,0.05); color: var(--text-dimmed); text-transform: uppercase; }

        .accent-card { background: linear-gradient(135deg, rgba(59, 130, 246, 0.05), var(--bg-surface)); border-color: rgba(59, 130, 246, 0.2); }
        .snapshot-list { display: grid; gap: 12px; margin-bottom: 18px; }
        .snapshot-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 16px; border-radius: 14px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.24); }
        .snapshot-label { font-size: 0.75rem; color: rgba(255, 255, 255, 0.68); text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; }
        .snapshot-value { color: rgba(255, 255, 255, 0.94); font-weight: 700; text-align: right; word-break: break-word; text-transform: capitalize; }

        .converted-link-premium { display: flex; align-items: center; gap: 16px; background: var(--bg-elevated); padding: 16px; border-radius: 16px; border: 1px solid rgba(148, 163, 184, 0.34); text-decoration: none; transition: all 0.2s ease; }
        .converted-link-premium:hover { border-color: var(--primary); transform: translateX(4px); }
        .link-icon { color: var(--primary); }
        .link-text { display: flex; flex-direction: column; gap: 2px; }
        .link-text strong { color: var(--text); font-size: 0.95rem; }
        .link-text span { color: var(--text-muted); font-size: 0.8rem; }
        .context-note-bubble { background: rgba(15, 23, 42, 0.4); padding: 16px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); font-size: 0.92rem; line-height: 1.6; color: var(--text-muted); font-style: italic; }

        @media (max-width: 1024px) {
          .user-detail-grid { flex-direction: column; }
          .user-detail-side { width: 100%; position: static; }
          .hero-main-row { flex-direction: column; align-items: flex-start; gap: 24px; }
          .hero-side-stack { width: 100%; min-width: 0; grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </div>
  )
}
