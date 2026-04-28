import { useCallback, useEffect, useState, useRef } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { supportApi } from '../../../services/workflow.js'
import { usersApi } from '../../../services/users.js'
import PageHeader from '../../../components/PageHeader.jsx'
import { Icon } from '../../../layouts/icons.jsx'
import { useAuth } from '../../../context/AuthContext.jsx'

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' }
]

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' }
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
    if (newStatus === 'closed' && !isAdmin && !isManager) {
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
  const canReply = ticket.status !== 'closed'

  return (
    <div className="ticket-immersive-layout">
      <PageHeader 
        title={`#${ticket.ticket_id}: ${ticket.subject}`} 
        backTo="/tickets"
        actions={
          <div className="flex gap-12">
            {canManage && (
              <button onClick={() => updateStatus(ticket.status === 'closed' ? 'open' : 'closed')} className={`btn-premium ${ticket.status === 'closed' ? 'action-vibrant' : 'action-danger'}`}>
                <Icon name={ticket.status === 'closed' ? 'activity' : 'check'} />
                <span>{ticket.status === 'closed' ? 'Reopen Ticket' : 'Close Ticket'}</span>
              </button>
            )}
            {!ticket.is_escalated && (isAdmin || isEmployee) && (
              <button onClick={handleEscalate} className="btn-premium action-warning" disabled={escalating}>
                <Icon name="bell" />
                <span>{escalating ? 'Escalating...' : 'Escalate'}</span>
              </button>
            )}
          </div>
        }
      />

      <div className="ticket-grid">
        {/* Main Conversation Column */}
        <div className="ticket-conversation card-premium">
          <div className="chat-header">
            <div className="chat-meta">
              <span className={`status-pill ${ticket.status}`}>{ticket.status}</span>
              <span className={`priority-pill ${ticket.priority}`}>{ticket.priority} Priority</span>
              <span className="date-pill">Created on {new Date(ticket.created_at).toLocaleDateString()}</span>
            </div>
            <div className="chat-subject">{ticket.subject}</div>
          </div>

          <div className="messages-scroll">
             <div className="message-node system-node">
                <div className="message-content">
                   <div className="message-label">First Message</div>
                   <div className="message-text">{ticket.description}</div>
                   <div className="message-time">{new Date(ticket.created_at).toLocaleString()}</div>
                </div>
             </div>

             {ticket.messages?.map((msg, idx) => (
               <div key={idx} className={`message-node ${String(msg.sender_id?._id || msg.sender_id) === String(user.id) ? 'self-node' : 'other-node'}`}>
                  <div className="message-content">
                    <div className="message-author">
                      {msg.sender_name} <span className="author-role">({msg.sender_role})</span>
                    </div>
                    <div className="message-text">{msg.text}</div>
                    <div className="message-time">{new Date(msg.created_at).toLocaleString()}</div>
                  </div>
               </div>
             ))}
             <div ref={chatEndRef} />
          </div>

          {canReply && (
            <form className="chat-footer" onSubmit={handleReply}>
              <textarea 
                placeholder="Type your reply here..." 
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(e); } }}
              />
              <button className="btn-send" disabled={sendingReply || !replyText.trim()}>
                <Icon name="activity" />
                <span>{sendingReply ? '...' : 'Send'}</span>
              </button>
            </form>
          )}
          {ticket.status === 'closed' && (
            <div className="chat-closed-notice">
               <Icon name="check" />
               <span>This ticket is closed. No further replies are permitted.</span>
            </div>
          )}
        </div>

        {/* Sidebar Info Column */}
        <div className="ticket-sidebar stack gap-20">
          <section className="card-premium">
            <div className="sidebar-section-header">Customer Details</div>
            <div className="sidebar-body">
               <div className="profile-hero">
                  <div className="profile-avatar">{(ticket.customer_id?.name || ticket.user_customer_id?.name || 'U').charAt(0)}</div>
                  <div className="profile-info">
                     <div className="profile-name">{ticket.customer_id?.name || ticket.user_customer_id?.name}</div>
                     <div className="profile-role">{ticket.user_customer_id ? 'System User' : 'Customer'}</div>
                  </div>
               </div>
               {ticket.customer_id && (
                 <Link to={`/customers/${ticket.customer_id._id}`} className="btn-secondary-outline full-width margin-top-12">View Customer</Link>
               )}
            </div>
          </section>

          <section className="card-premium">
             <div className="sidebar-section-header">Assignment</div>
             <div className="sidebar-body stack gap-12">
                <div className="intel-field">
                   <label>Assigned To</label>
                   <select 
                     className="select-premium" 
                     value={ticket.assigned_to?._id || ''} 
                     disabled={!canManage}
                     onChange={(e) => assignTicket(e.target.value)}
                   >
                     <option value="">Unassigned</option>
                     {teamMembers.map(m => (
                       <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                     ))}
                   </select>
                </div>
                {ticket.assigned_to && (
                  <div className="assignee-display">
                     <Icon name="user" />
                     <span>{ticket.assigned_to.name} is handling this.</span>
                  </div>
                )}
             </div>
          </section>

          <section className="card-premium">
             <div className="sidebar-section-header">Change Status</div>
             <div className="sidebar-body flex-wrap gap-8">
                {STATUS_OPTIONS.map(opt => (
                  <button 
                    key={opt.value} 
                    className={`status-btn ${ticket.status === opt.value ? 'active' : ''}`}
                    onClick={() => updateStatus(opt.value)}
                    disabled={opt.value === 'closed' && !canManage}
                  >
                    {opt.label}
                  </button>
                ))}
             </div>
          </section>
        </div>
      </div>

      <style>{`
        .ticket-immersive-layout { display: flex; flex-direction: column; height: calc(100vh - 100px); padding-bottom: 20px; }
        .ticket-grid { display: grid; grid-template-columns: 1fr 300px; gap: 24px; flex: 1; overflow: hidden; margin-top: 24px; }
        
        .ticket-conversation { display: flex; flex-direction: column; background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); border-radius: 24px; overflow: hidden; }
        .chat-header { padding: 24px; border-bottom: 1px solid var(--border-subtle); background: rgba(255,255,255,0.02); }
        .chat-meta { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
        .status-pill { padding: 6px 14px; border-radius: 999px; font-size: 0.7rem; font-weight: 900; text-transform: uppercase; background: rgba(59,130,246,0.1); color: #3b82f6; border: 1px solid rgba(59,130,246,0.2); }
        .status-pill.closed { background: rgba(16,185,129,0.1); color: #10b981; border-color: rgba(16,185,129,0.2); }
        .priority-pill { padding: 6px 14px; border-radius: 999px; font-size: 0.7rem; font-weight: 900; text-transform: uppercase; background: rgba(255,255,255,0.05); color: var(--text-dimmed); border: 1px solid rgba(255,255,255,0.1); }
        .priority-pill.high, .priority-pill.urgent { background: rgba(239,68,68,0.1); color: #ef4444; border-color: rgba(239,68,68,0.2); }
        .date-pill { margin-left: auto; font-size: 0.8rem; color: var(--text-dimmed); font-weight: 600; }
        .chat-subject { font-size: 1.4rem; font-weight: 900; color: white; line-height: 1.2; }

        .messages-scroll { flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 24px; background: rgba(0,0,0,0.1); }
        .message-node { display: flex; max-width: 85%; }
        .system-node { align-self: center; max-width: 95%; width: 100%; }
        .other-node { align-self: flex-start; }
        .self-node { align-self: flex-end; }
        
        .message-content { background: rgba(255,255,255,0.03); padding: 20px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.05); position: relative; width: 100%; }
        .self-node .message-content { background: rgba(59,130,246,0.08); border-color: rgba(59,130,246,0.2); }
        .system-node .message-content { background: rgba(255,255,255,0.01); border-style: dashed; padding: 16px; }
        
        .message-label { font-size: 0.65rem; font-weight: 900; text-transform: uppercase; color: var(--primary); margin-bottom: 8px; letter-spacing: 0.05em; }
        .message-author { font-size: 0.9rem; font-weight: 800; margin-bottom: 6px; color: white; }
        .author-role { font-weight: 600; font-size: 0.75rem; color: var(--text-dimmed); }
        .message-text { font-size: 1rem; line-height: 1.6; white-space: pre-wrap; color: var(--text-muted); }
        .message-time { font-size: 0.7rem; color: var(--text-dimmed); margin-top: 12px; text-align: right; font-weight: 600; }

        .chat-footer { padding: 24px; background: rgba(255,255,255,0.02); border-top: 1px solid var(--border-subtle); display: flex; gap: 16px; align-items: stretch; }
        .chat-footer textarea { flex: 1; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; color: white; padding: 16px; min-height: 80px; max-height: 200px; resize: none; font-size: 1rem; outline: none; line-height: 1.5; transition: border-color 0.2s; }
        .chat-footer textarea:focus { border-color: var(--primary); }
        .btn-send { background: var(--primary); color: white; border: none; padding: 0 28px; border-radius: 16px; font-weight: 800; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s; min-width: 100px; }
        .btn-send:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-send:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.1); box-shadow: 0 8px 20px rgba(59,130,246,0.3); }

        .chat-closed-notice { padding: 32px; text-align: center; color: var(--text-dimmed); background: rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; gap: 12px; font-weight: 700; }

        .sidebar-section-header { padding: 18px 20px; border-bottom: 1px solid var(--border-subtle); font-size: 0.65rem; font-weight: 900; text-transform: uppercase; color: var(--text-dimmed); letter-spacing: 0.08em; }
        .sidebar-body { padding: 24px; }
        .profile-hero { display: flex; gap: 14px; align-items: center; }
        .profile-avatar { width: 48px; height: 48px; border-radius: 14px; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1.4rem; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
        .profile-name { font-weight: 800; font-size: 1.1rem; color: white; }
        .profile-role { font-size: 0.8rem; color: var(--text-dimmed); font-weight: 600; }
        
        .intel-field label { display: block; font-size: 0.65rem; font-weight: 900; color: var(--text-dimmed); text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.05em; }
        .select-premium { width: 100%; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; color: white; padding: 12px; outline: none; font-weight: 700; cursor: pointer; }
        .assignee-display { display: flex; align-items: center; gap: 10px; margin-top: 16px; font-size: 0.85rem; color: #10b981; font-weight: 700; }
        
        .status-btn { flex: 1; min-width: calc(50% - 8px); background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 10px; padding: 8px 12px; color: var(--text-muted); font-size: 0.75rem; font-weight: 800; cursor: pointer; text-transform: uppercase; transition: all 0.2s; }
        .status-btn.active { background: var(--primary); color: white; border-color: var(--primary); box-shadow: 0 4px 10px rgba(59,130,246,0.2); }
        .status-btn:hover:not(.active) { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.1); }
        .full-width { width: 100%; }
        .btn-secondary-outline { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); color: var(--text-muted); padding: 10px; border-radius: 12px; cursor: pointer; text-align: center; text-decoration: none; display: block; font-weight: 800; font-size: 0.85rem; transition: all 0.2s; }
        .btn-secondary-outline:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.2); color: white; }
      `}</style>
    </div>
  )
}
