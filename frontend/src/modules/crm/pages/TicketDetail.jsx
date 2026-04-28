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
    <div className="crm-fullscreen-shell">
      <PageHeader 
        title={`#${ticket.ticket_id}: ${ticket.subject}`} 
        backTo="/tickets"
        actions={
          <div className="flex gap-12">
            {canManage && (
              <button onClick={() => updateStatus(ticket.status === 'closed' ? 'open' : 'closed')} className={`crm-btn-premium ${ticket.status === 'closed' ? 'vibrant' : 'danger'}`}>
                <Icon name={ticket.status === 'closed' ? 'activity' : 'check'} />
                <span>{ticket.status === 'closed' ? 'Reopen Ticket' : 'Close Ticket'}</span>
              </button>
            )}
            {!ticket.is_escalated && (isAdmin || isEmployee) && (
              <button onClick={handleEscalate} className="crm-btn-premium vibrant" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }} disabled={escalating}>
                <Icon name="bell" />
                <span>{escalating ? 'Escalating...' : 'Escalate'}</span>
              </button>
            )}
          </div>
        }
      />

      <div className="crm-detail-grid" style={{ marginTop: '32px', height: 'calc(100vh - 250px)' }}>
        {/* Main Conversation Column */}
        <div className="crm-detail-main" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="crm-detail-card" style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: 0, overflow: 'hidden' }}>
            <div className="chat-header" style={{ padding: '24px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="flex align-center gap-12 margin-bottom-12">
                <span className={`status-pill ${ticket.status}`}>{ticket.status}</span>
                <span className="hero-meta-chip">{ticket.priority} Priority</span>
                <span className="muted" style={{ marginLeft: 'auto', fontSize: '0.8rem' }}>Opened on {new Date(ticket.created_at).toLocaleDateString()}</span>
              </div>
              <h2 className="crm-hero-name" style={{ fontSize: '1.6rem', margin: 0 }}>{ticket.subject}</h2>
            </div>

            <div className="messages-scroll" style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', background: 'rgba(0,0,0,0.1)' }}>
               <div className="message-node system-node">
                  <div className="message-content">
                     <div className="message-label">Problem Intelligence</div>
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
              <form className="chat-footer" onSubmit={handleReply} style={{ padding: '24px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '16px' }}>
                <textarea 
                  className="crm-input"
                  style={{ flex: 1, minHeight: '80px', maxHeight: '200px', resize: 'none' }}
                  placeholder="Type your response intelligence..." 
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(e); } }}
                />
                <button className="crm-btn-premium vibrant" disabled={sendingReply || !replyText.trim()} style={{ height: 'auto', padding: '0 32px' }}>
                  <Icon name="activity" />
                  <span>{sendingReply ? '...' : 'Send'}</span>
                </button>
              </form>
            )}
            {ticket.status === 'closed' && (
              <div className="center padding-32 muted" style={{ background: 'rgba(0,0,0,0.2)', borderTop: '1px solid var(--border-subtle)' }}>
                 <Icon name="check" size={20} style={{ color: 'var(--primary)', marginBottom: '8px' }} />
                 <div style={{ fontWeight: 800 }}>Resolution Synchronized</div>
                 <div style={{ fontSize: '0.85rem' }}>This communication node is locked. No further inputs are permitted.</div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Info Column */}
        <aside className="crm-detail-side">
          <section className="crm-detail-card accent-card">
            <div className="crm-detail-card-header">
              <div className="crm-detail-card-title">
                <Icon name="user" />
                <h3>Customer Intel</h3>
              </div>
            </div>
            <div className="crm-detail-card-body">
               <div className="profile-hero" style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '20px' }}>
                  <div className="crm-hero-avatar" style={{ width: '48px', height: '48px', borderRadius: '14px' }}>
                    {(ticket.customer_id?.name || ticket.user_customer_id?.name || 'U').charAt(0)}
                  </div>
                  <div>
                     <div style={{ fontWeight: 800, color: 'var(--text)' }}>{ticket.customer_id?.name || ticket.user_customer_id?.name}</div>
                     <div className="muted" style={{ fontSize: '0.8rem' }}>{ticket.user_customer_id ? 'System Member' : 'Institutional Client'}</div>
                  </div>
               </div>
               {ticket.customer_id && (
                 <Link to={`/customers/${ticket.customer_id._id}`} className="crm-btn-premium glass full-width" style={{ justifyContent: 'center' }}>
                   <span>Analyze Profile</span>
                 </Link>
               )}
            </div>
          </section>

          <section className="crm-detail-card">
             <div className="crm-detail-card-header">
                <div className="crm-detail-card-title">
                   <Icon name="settings" />
                   <h3>Ownership</h3>
                </div>
             </div>
             <div className="crm-detail-card-body">
                <div className="crm-intel-field">
                   <label>Designated Handler</label>
                   <select 
                     className="crm-input" 
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
                  <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', fontSize: '0.85rem', fontWeight: 800 }}>
                     <Icon name="check" size={14} />
                     <span>Active assignment synchronization.</span>
                  </div>
                )}
             </div>
          </section>

          <section className="crm-detail-card">
             <div className="crm-detail-card-header">
                <div className="crm-detail-card-title">
                   <Icon name="activity" />
                   <h3>Status Protocol</h3>
                </div>
             </div>
             <div className="crm-detail-card-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {STATUS_OPTIONS.map(opt => (
                    <button 
                      key={opt.value} 
                      className={`crm-btn-premium ${ticket.status === opt.value ? 'vibrant' : 'glass'}`}
                      style={{ padding: '8px 4px', fontSize: '0.7rem', justifyContent: 'center' }}
                      onClick={() => updateStatus(opt.value)}
                      disabled={opt.value === 'closed' && !canManage}
                    >
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
             </div>
          </section>
        </aside>
      </div>

      <style>{`
        .messages-scroll::-webkit-scrollbar { width: 6px; }
        .messages-scroll::-webkit-scrollbar-track { background: transparent; }
        .messages-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .messages-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

        .message-node { display: flex; max-width: 85%; }
        .system-node { align-self: center; max-width: 95%; width: 100%; }
        .other-node { align-self: flex-start; }
        .self-node { align-self: flex-end; }
        
        .message-content { background: rgba(255,255,255,0.03); padding: 20px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.05); position: relative; width: 100%; }
        .self-node .message-content { background: rgba(59,130,246,0.08); border-color: rgba(59,130,246,0.2); }
        .system-node .message-content { background: rgba(255,255,255,0.01); border-style: dashed; padding: 16px; }
        
        .message-label { font-size: 0.65rem; font-weight: 900; text-transform: uppercase; color: var(--primary); margin-bottom: 8px; letter-spacing: 0.05em; }
        .message-author { font-size: 0.9rem; font-weight: 800; margin-bottom: 6px; color: var(--text); }
        .author-role { font-weight: 600; font-size: 0.75rem; color: var(--text-dimmed); }
        .message-text { font-size: 0.95rem; line-height: 1.6; white-space: pre-wrap; color: var(--text-muted); }
        .message-time { font-size: 0.7rem; color: var(--text-dimmed); margin-top: 12px; text-align: right; font-weight: 600; }

        .status-pill.open { background: rgba(59,130,246,0.1); color: #3b82f6; border-color: rgba(59,130,246,0.2); }
        .status-pill.closed { background: rgba(16,185,129,0.1); color: #10b981; border-color: rgba(16,185,129,0.2); }
        .status-pill.in-progress { background: rgba(245,158,11,0.1); color: #f59e0b; border-color: rgba(245,158,11,0.2); }
        .status-pill.resolved { background: rgba(139,92,246,0.1); color: #8b5cf6; border-color: rgba(139,92,246,0.2); }
      `}</style>
    </div>
  )
}
