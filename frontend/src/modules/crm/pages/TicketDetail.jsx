import { useCallback, useEffect, useState, useRef } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { supportApi } from '../../../services/workflow.js'
import { usersApi } from '../../../services/users.js'
import SearchableSelect from '../components/SearchableSelect.jsx'
import PageHeader from '../../../components/PageHeader.jsx'
import { Icon } from '../../../layouts/icons.jsx'
import { useAuth } from '../../../context/AuthContext.jsx'

const STATUS_OPTIONS = [
  { value: 'Open', label: 'Open' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Waiting for Customer', label: 'Waiting for Customer' },
  { value: 'Resolved', label: 'Resolved' },
  { value: 'Closed', label: 'Closed' }
]

const PRIORITY_OPTIONS = [
  { value: 'Low', label: 'Low' },
  { value: 'Medium', label: 'Medium' },
  { value: 'High', label: 'High' }
]

export default function TicketDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.role === 'Admin'
  const isManager = user?.role === 'Manager'
  const isEmployee = user?.role === 'Employee' || user?.role === 'Support'
  const isCustomer = user?.role === 'Customer'
  
  const [ticket, setTicket] = useState(null)
  const [teamMembers, setTeamMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [escalating, setEscalating] = useState(false)
  
  const chatEndRef = useRef(null)

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [ticketData, usersData] = await Promise.all([
        supportApi.get(id),
        isAdmin || isManager ? usersApi.list({ limit: 100 }) : Promise.resolve({ items: [] })
      ])
      setTicket(ticketData)
      setTeamMembers(Array.isArray(usersData) ? usersData : usersData.items || [])
    } catch (err) {
      toast.error('Failed to load ticket details')
    } finally {
      setLoading(false)
    }
  }, [id, isAdmin, isManager])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (ticket?.messages?.length) {
      scrollToBottom()
    }
  }, [ticket?.messages])

  async function handleReply(e) {
    e.preventDefault()
    if (!replyText.trim() || sendingReply) return
    setSendingReply(true)
    try {
      const updated = await supportApi.reply(id, replyText)
      setTicket(updated)
      setReplyText('')
    } catch (err) {
      toast.error('Failed to send')
    } finally {
      setSendingReply(false)
    }
  }

  async function updateStatus(newStatus) {
    if (newStatus === 'Closed' && !isAdmin && !isManager) {
      toast.warning('Only Admins or Managers can finalize and Close tickets.')
      return
    }
    try {
      await supportApi.update(id, { status: newStatus })
      toast.success(`Status updated to ${newStatus}`)
      loadData()
    } catch {
      toast.error('Update failed')
    }
  }

  async function assignTicket(userId) {
    try {
      await supportApi.update(id, { assigned_to: userId })
      toast.success('Ticket assigned successfully')
      loadData()
    } catch {
      toast.error('Assignment failed')
    }
  }

  async function handleResolve() {
    const problem = window.prompt('1. What was the problem?')
    if (!problem) return
    const method = window.prompt('2. How was it solved?')
    if (!method) return
    const prevention = window.prompt('3. How to avoid this again?')
    if (!prevention) return

    const solution = `Problem: ${problem}\nSolution: ${method}\nPrevention: ${prevention}`
    
    try {
      await supportApi.update(id, { status: 'Resolved', solution })
      toast.success('Ticket marked as Resolved')
      loadData()
    } catch {
      toast.error('Failed to resolve ticket')
    }
  }

  async function handleEscalate() {
    const reason = window.prompt('Reason for escalation:')
    if (!reason) return
    setEscalating(true)
    try {
      await supportApi.escalate(id, reason)
      toast.success('Escalated to management')
      loadData()
    } catch {
      toast.error('Escalation failed')
    } finally {
      setEscalating(false)
    }
  }

  if (loading) return <div className="center padding60"><div className="loader-premium" /></div>
  if (!ticket) return <div className="center padding60 muted">Ticket not found.</div>

  const canManage = isAdmin || isManager
  const isHR = user?.role === 'HR'
  const isAccountant = user?.role === 'Accountant'
  const isAgent = isEmployee || user?.role === 'Support'

  const canReply = ticket.status !== 'Closed' && !isHR && !isAccountant
  const canResolve = (isAdmin || isManager || isAgent) && (ticket.status !== 'Resolved' && ticket.status !== 'Closed')
  const canClose = (isAdmin || isManager) || (isCustomer && ticket.status === 'Resolved')
  const canEscalate = !ticket.is_escalated && (isAdmin || isManager || isAgent)
  const canAssign = isAdmin || isManager

  const isSLABreached = ticket.deadline && new Date(ticket.deadline) < new Date() && ticket.status !== 'Closed' && ticket.status !== 'Resolved'

  return (
    <div className="ticket-detail-page" style={{ background: 'var(--bg)', minHeight: '100vh', padding: '32px' }}>
      {/* 🟢 TOP ACTION BAR */}
      <div className="ticket-header-actions animate-fade-in">
        <button onClick={() => navigate('/tickets')} className="back-btn-modern">
          <Icon name="chevronLeft" />
          <span>Back to Dashboard</span>
        </button>
        
        <div className="action-group-premium">
          {isSLABreached && (
            <div className="sla-alert-banner">
              <Icon name="clock" size={16} />
              <span>SLA BREACHED: IMMEDIATE ACTION REQUIRED</span>
            </div>
          )}
          
          {canManage && (
            <button onClick={() => navigate(`/tickets/${id}/edit`)} className="crm-btn-premium secondary">
              <Icon name="edit" size={16} />
              <span>Edit Details</span>
            </button>
          )}

          {canResolve && (
            <button onClick={handleResolve} className="crm-btn-premium success">
              <Icon name="check" size={16} />
              <span>Mark as Resolved</span>
            </button>
          )}

          {canClose && (
            <button onClick={() => updateStatus(ticket.status === 'Closed' ? 'Open' : 'Closed')} className="crm-btn-premium danger">
              <Icon name={ticket.status === 'Closed' ? 'activity' : 'check'} size={16} />
              <span>{ticket.status === 'Closed' ? 'Reopen Ticket' : 'Finalize & Close'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 🟠 MAIN CONTENT GRID */}
      <div className="ticket-main-grid">
        
        {/* LEFT COLUMN: INTEL & CHAT */}
        <div className="ticket-content-column">
          
          {/* TICKET HERO CARD */}
          <div className="ticket-hero-card shadow-soft">
            <div className="hero-status-strip" style={{ background: getStatusColor(ticket.status) }} />
            <div className="hero-content">
              <div className="hero-meta">
                <span className="ticket-id-badge">{ticket.ticket_id}</span>
                <span className="category-tag">{ticket.category} {ticket.sub_category ? `/ ${ticket.sub_category}` : ''}</span>
              </div>
              <h1 className="ticket-main-title">{ticket.subject}</h1>
              <div className="ticket-description-box">
                <p>{ticket.description}</p>
              </div>
            </div>
          </div>

          {/* CONVERSATION THREAD */}
          <div className="resolution-card shadow-soft">
            <div className="card-header-premium">
              <Icon name="mail" size={18} />
              <h3>Resolution & Communication</h3>
            </div>
            
            <div className="thread-container custom-scrollbar">
              {/* Original Post */}
              <div className="thread-item system">
                <div className="thread-icon"><Icon name="plus" size={12} /></div>
                <div className="thread-body">
                  <span className="thread-meta">TICKET INITIALIZED • {new Date(ticket.created_at).toLocaleString()}</span>
                  <p>{ticket.description}</p>
                </div>
              </div>

              {/* Messages & Notes */}
              {[
                ...(ticket.messages || []).map(m => ({ ...m, type: 'message' })),
                ...(ticket.notes || []).map(n => ({ ...n, type: 'note', sender_name: n.author_name, sender_role: 'Internal', text: n.text }))
              ].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).map((msg, idx) => {
                const isOwn = String(msg.sender_id?._id || msg.sender_id || '') === String(user?.id || user?._id || '');
                const isNote = msg.type === 'note';
                return (
                  <div key={idx} className={`thread-item ${isOwn ? 'own' : ''} ${isNote ? 'internal' : ''}`}>
                    <div className="thread-avatar">
                      {msg.sender_name?.charAt(0) || 'U'}
                    </div>
                    <div className="thread-bubble shadow-sm">
                      <div className="bubble-header">
                        <span className="sender-name">{msg.sender_name}</span>
                        <span className="sender-tag">{isNote ? 'INTERNAL NOTE' : msg.sender_role}</span>
                      </div>
                      <p>{msg.text}</p>
                      <span className="bubble-time">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {canReply ? (
              <form className="thread-reply-area" onSubmit={handleReply}>
                <textarea 
                  placeholder="Type your response or internal note..." 
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                />
                <div className="reply-actions">
                  <div className="reply-tools">
                    <button type="button" className="tool-btn" title="Attach File"><Icon name="columns" size={14} /></button>
                    <button type="button" className="tool-btn" title="Templates"><Icon name="list" size={14} /></button>
                  </div>
                  <button type="submit" className="crm-btn-premium" disabled={sendingReply || !replyText.trim()}>
                    <Icon name="activity" size={16} />
                    <span>{sendingReply ? 'Sending...' : 'Send Response'}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="locked-thread-notice">
                <Icon name="shield" size={24} />
                <p>This communication node is synchronized and locked. No further inputs permitted.</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: METADATA & TIMELINE */}
        <div className="ticket-sidebar-column">
          
          {/* CUSTOMER CARD */}
          <div className="sidebar-card shadow-soft">
            <div className="card-header-premium">
              <Icon name="user" size={18} />
              <h3>Customer Intelligence</h3>
            </div>
            <div className="customer-detail-body">
              <div className="cust-avatar-large">
                {ticket.customer_id?.name?.charAt(0) || 'C'}
              </div>
              <div className="cust-info-main">
                <h4 className="cust-name-text">{ticket.customer_id?.name || 'Unknown Client'}</h4>
                <p className="cust-email-text">{ticket.customer_id?.email || 'No email provided'}</p>
              </div>
              <div className="cust-stats-grid">
                <div className="cust-stat">
                  <span className="label">Contact</span>
                  <span className="value">{ticket.customer_id?.phone || 'N/A'}</span>
                </div>
                <div className="cust-stat">
                  <span className="label">Company</span>
                  <span className="value">{ticket.customer_id?.company_name || 'Individual'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* SYSTEM CONTROL CARD */}
          <div className="sidebar-card shadow-soft">
            <div className="card-header-premium">
              <Icon name="settings" size={18} />
              <h3>Operational Control</h3>
            </div>
            <div className="control-list">
              <div className="control-item">
                <div className="control-label">STATUS</div>
                <div className="control-input" onClick={(e) => e.stopPropagation()}>
                   <SearchableSelect 
                     value={ticket.status}
                     onChange={(val) => updateStatus(val)}
                     options={STATUS_OPTIONS}
                     disabled={!canManage}
                   />
                </div>
              </div>
              <div className="control-item">
                <div className="control-label">PRIORITY</div>
                <div className="control-input">
                   <SearchableSelect 
                     value={ticket.priority}
                     onChange={(val) => supportApi.update(id, { priority: val }).then(() => loadData())}
                     options={PRIORITY_OPTIONS}
                     disabled={!canManage}
                   />
                </div>
              </div>
              <div className="control-item">
                <div className="control-label">ASSIGNED TO</div>
                <div className="control-input">
                   <SearchableSelect 
                     value={ticket.assigned_to?._id || ticket.assigned_to?.id || ''}
                     onChange={(val) => assignTicket(val)}
                     options={[
                       { value: '', label: 'Unassigned' },
                       ...teamMembers.map(m => ({ value: m.id || m._id, label: m.name }))
                     ]}
                     disabled={!canAssign}
                   />
                </div>
              </div>
            </div>
          </div>

          {/* TIMELINE SECTION */}
          <div className="sidebar-card shadow-soft">
            <div className="card-header-premium">
              <Icon name="activity" size={18} />
              <h3>Activity Timeline</h3>
            </div>
            <div className="timeline-container custom-scrollbar">
              {(ticket.history || []).slice().reverse().map((h, i) => (
                <div key={i} className="timeline-node">
                  <div className="node-marker" />
                  <div className="node-content">
                    <div className="node-title">{h.action}</div>
                    <div className="node-desc">{h.details}</div>
                    <div className="node-meta">By {h.performed_by_name} • {new Date(h.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
              <div className="timeline-node start">
                <div className="node-marker" />
                <div className="node-content">
                  <div className="node-title">Ticket Registered</div>
                  <div className="node-meta">{new Date(ticket.created_at).toLocaleDateString()}</div>
                </div>
              </div>
            </div>
          </div>

          {/* ATTACHMENTS CARD */}
          {ticket.attachments?.length > 0 && (
            <div className="sidebar-card shadow-soft">
              <div className="card-header-premium">
                <Icon name="columns" size={18} />
                <h3>Digital Assets</h3>
              </div>
              <div className="assets-grid">
                {ticket.attachments.map((at, idx) => (
                  <a key={idx} href={at.url} target="_blank" rel="noopener noreferrer" className="asset-link shadow-sm">
                    <Icon name="image" size={24} />
                    <span className="asset-name">{at.name}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* SLA & DATES */}
          <div className="sidebar-card shadow-soft highlight">
            <div className="date-info-stack">
              <div className="date-item">
                <label>REGISTERED ON</label>
                <span>{new Date(ticket.created_at).toLocaleString()}</span>
              </div>
              <div className="date-item">
                <label>EXPECTED RESOLUTION</label>
                <span className={isSLABreached ? 'text-danger' : ''}>
                  {ticket.expected_resolution_date ? new Date(ticket.expected_resolution_date).toLocaleString() : 'N/A'}
                </span>
              </div>
              {ticket.closed_at && (
                <div className="date-item">
                  <label>CLOSED ON</label>
                  <span>{new Date(ticket.closed_at).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      <style>{`
        .ticket-detail-page { max-width: 1600px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px; }
        .ticket-header-actions { display: flex; justify-content: space-between; align-items: center; }
        .action-group-premium { display: flex; align-items: center; gap: 12px; }
        .sla-alert-banner { background: var(--danger); color: white; padding: 10px 20px; border-radius: 12px; font-weight: 800; font-size: 0.75rem; display: flex; align-items: center; gap: 8px; animation: pulse 2s infinite; }
        
        .ticket-main-grid { display: grid; grid-template-columns: 1fr 400px; gap: 32px; align-items: start; }
        .ticket-content-column { display: flex; flex-direction: column; gap: 32px; }
        .ticket-sidebar-column { display: flex; flex-direction: column; gap: 24px; position: sticky; top: 32px; }

        /* Hero Card */
        .ticket-hero-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 20px; overflow: hidden; position: relative; }
        .hero-status-strip { height: 6px; width: 100%; }
        .hero-content { padding: 32px; }
        .hero-meta { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
        .ticket-id-badge { background: var(--primary-soft); color: var(--primary); font-weight: 900; font-size: 0.75rem; padding: 4px 12px; border-radius: 100px; }
        .category-tag { color: var(--text-dimmed); font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
        .ticket-main-title { font-size: 2rem; font-weight: 800; color: var(--text); margin-bottom: 20px; }
        .ticket-description-box { background: var(--bg-surface); border: 1px solid var(--border-subtle); padding: 24px; border-radius: 16px; line-height: 1.8; color: var(--text-muted); font-size: 1rem; }

        /* Cards */
        .sidebar-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 20px; padding: 24px; }
        .sidebar-card.highlight { background: var(--bg-surface); border-color: var(--primary-border); }
        .card-header-premium { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; color: var(--text); }
        .card-header-premium h3 { font-size: 0.9rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin: 0; }

        /* Thread */
        .resolution-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 20px; padding: 0; overflow: hidden; }
        .thread-container { padding: 32px; max-height: 600px; overflow-y: auto; display: flex; flex-direction: column; gap: 24px; background: var(--bg-surface); }
        .thread-item { display: flex; gap: 16px; align-items: flex-start; }
        .thread-item.own { flex-direction: row-reverse; }
        .thread-avatar { width: 36px; height: 36px; border-radius: 10px; background: var(--bg-card); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.8rem; color: var(--primary); }
        .thread-bubble { max-width: 80%; background: var(--bg-card); border: 1px solid var(--border); padding: 16px 20px; border-radius: 16px; position: relative; }
        .own .thread-bubble { background: var(--primary-soft); border-color: var(--primary-border); }
        .internal .thread-bubble { background: var(--warning-soft); border-color: var(--warning-border); }
        .bubble-header { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 8px; align-items: center; }
        .sender-name { font-weight: 800; font-size: 0.8rem; color: var(--text); }
        .sender-tag { font-size: 0.6rem; font-weight: 900; text-transform: uppercase; color: var(--text-dimmed); background: var(--bg-surface); padding: 2px 6px; border-radius: 4px; }
        .bubble-time { font-size: 0.65rem; color: var(--text-dimmed); margin-top: 8px; display: block; text-align: right; font-weight: 600; }
        
        .thread-reply-area { padding: 24px 32px; background: var(--bg-card); border-top: 1px solid var(--border); }
        .thread-reply-area textarea { width: 100%; min-height: 100px; background: var(--bg-surface); border: 1px solid var(--border-strong); border-radius: 12px; padding: 16px; color: var(--text); font-size: 0.95rem; resize: none; outline: none; transition: border-color 0.2s; }
        .thread-reply-area textarea:focus { border-color: var(--primary); }
        .reply-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; }
        .reply-tools { display: flex; gap: 8px; }
        .tool-btn { width: 36px; height: 36px; border-radius: 8px; background: var(--bg-surface); border: 1px solid var(--border-strong); color: var(--text-dimmed); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
        .tool-btn:hover { background: var(--bg-hover); color: var(--primary); border-color: var(--primary); }

        /* Customer Details */
        .customer-detail-body { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 16px; }
        .cust-avatar-large { width: 72px; height: 72px; border-radius: 20px; background: var(--primary-soft); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: 900; border: 1px solid var(--primary-border); }
        .cust-name-text { font-size: 1.2rem; font-weight: 800; color: var(--text); margin: 0; }
        .cust-email-text { font-size: 0.85rem; color: var(--text-dimmed); margin: 0; }
        .cust-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; width: 100%; margin-top: 8px; }
        .cust-stat { background: var(--bg-surface); border: 1px solid var(--border-strong); padding: 12px; border-radius: 12px; display: flex; flex-direction: column; gap: 4px; }
        .cust-stat .label { font-size: 0.65rem; font-weight: 800; color: var(--text-dimmed); text-transform: uppercase; }
        .cust-stat .value { font-size: 0.8rem; font-weight: 700; color: var(--text); }

        /* Controls */
        .control-list { display: flex; flex-direction: column; gap: 16px; }
        .control-item { display: flex; flex-direction: column; gap: 6px; }
        .control-label { font-size: 0.7rem; font-weight: 800; color: var(--text-dimmed); letter-spacing: 0.05em; }
        .control-input { width: 100%; }

        /* Timeline */
        .timeline-container { display: flex; flex-direction: column; gap: 0; max-height: 400px; overflow-y: auto; padding-left: 12px; }
        .timeline-node { position: relative; padding-left: 24px; padding-bottom: 24px; border-left: 2px solid var(--border-strong); }
        .timeline-node.start { border-left-color: transparent; }
        .node-marker { position: absolute; left: -7px; top: 0; width: 12px; height: 12px; border-radius: 50%; background: var(--bg-card); border: 2px solid var(--primary); }
        .node-title { font-size: 0.85rem; font-weight: 800; color: var(--text); line-height: 1; margin-bottom: 4px; }
        .node-desc { font-size: 0.75rem; color: var(--text-dimmed); line-height: 1.4; }
        .node-meta { font-size: 0.65rem; font-weight: 600; color: var(--text-muted); margin-top: 6px; }

        /* Assets */
        .assets-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .asset-link { background: var(--bg-surface); border: 1px solid var(--border-strong); padding: 12px; border-radius: 12px; display: flex; flex-direction: column; align-items: center; gap: 8px; text-decoration: none; transition: all 0.2s; }
        .asset-link:hover { border-color: var(--primary); transform: translateY(-2px); }
        .asset-name { font-size: 0.7rem; font-weight: 700; color: var(--text); text-align: center; width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        /* SLA */
        .date-info-stack { display: flex; flex-direction: column; gap: 16px; }
        .date-item { display: flex; flex-direction: column; gap: 4px; }
        .date-item label { font-size: 0.65rem; font-weight: 800; color: var(--text-dimmed); }
        .date-item span { font-size: 0.85rem; font-weight: 700; color: var(--text); }

        .text-danger { color: var(--danger) !important; }

        @media (max-width: 1100px) {
          .ticket-main-grid { grid-template-columns: 1fr; }
          .ticket-sidebar-column { position: static; }
        }
      `}</style>
    </div>
  )

  function getStatusColor(status) {
    switch (status) {
      case 'Open': return '#3b82f6';
      case 'In Progress': return '#f59e0b';
      case 'Waiting for Customer': return '#ec4899';
      case 'Resolved': return '#10b981';
      case 'Closed': return '#64748b';
      default: return 'var(--primary)';
    }
  }
}
