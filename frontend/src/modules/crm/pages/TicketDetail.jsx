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
    <div className="user-profile-container" style={{ background: 'var(--bg)', minHeight: '100vh', padding: '32px' }}>
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Link to="/tickets" className="crm-btn-premium" style={{ background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)', padding: '8px 16px', fontSize: '0.85rem', boxShadow: 'var(--shadow-sm)', borderRadius: '8px' }}>
          <span>← Back</span>
        </Link>
        <div style={{ display: 'flex', gap: '12px' }}>
          {canManage && (
            <button onClick={() => updateStatus(ticket.status === 'closed' ? 'open' : 'closed')} className="crm-btn-premium" style={{ background: ticket.status === 'closed' ? 'var(--success)' : 'var(--danger)', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '8px' }}>
              <Icon name={ticket.status === 'closed' ? 'activity' : 'check'} />
              <span>{ticket.status === 'closed' ? 'Reopen Ticket' : 'Close Ticket'}</span>
            </button>
          )}
          {!ticket.is_escalated && (isAdmin || isEmployee) && (
            <button onClick={handleEscalate} className="crm-btn-premium" style={{ background: '#f59e0b', color: '#ffffff', border: 'none', padding: '8px 24px', borderRadius: '8px' }} disabled={escalating}>
              <Icon name="bell" />
              <span>{escalating ? 'Escalating...' : 'Escalate'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Profile Header Card */}
      <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '32px', marginBottom: '24px', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--primary-soft)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 700, flexShrink: 0, boxShadow: 'inset 0 0 0 1px var(--primary-soft)' }}>
             {(ticket.subject || 'T').charAt(0).toUpperCase()}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>{ticket.subject}</h1>
              <span style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', padding: '2px 12px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 600, border: '1px solid var(--border)' }}>
                {ticket.status.toUpperCase()}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: ticket.priority === 'urgent' ? 'var(--danger)' : '#f59e0b', fontWeight: 600, marginLeft: '4px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: ticket.priority === 'urgent' ? 'var(--danger)' : '#f59e0b' }} />
                <span>{ticket.priority.toUpperCase()} PRIORITY</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', color: 'var(--text-dimmed)', fontSize: '0.9rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Icon name="user" size={14} />
                <span>{ticket.customer_id?.name || ticket.user_customer_id?.name || 'Unknown Client'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Icon name="activity" size={14} />
                <span>ID: #{ticket.ticket_id}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ height: '1px', background: 'var(--border)', margin: '24px 0' }} />

        {/* Time Stats Row */}
        <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <Icon name="clock" size={16} style={{ color: 'var(--text-dimmed)' }} />
             <span style={{ fontSize: '0.9rem', color: 'var(--text-dimmed)' }}>Opened On:</span>
             <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>{new Date(ticket.created_at).toLocaleString()}</span>
           </div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <Icon name="clock" size={16} style={{ color: 'var(--text-dimmed)' }} />
             <span style={{ fontSize: '0.9rem', color: 'var(--text-dimmed)' }}>Handler:</span>
             <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary)' }}>{ticket.assigned_to?.name || 'Unassigned'}</span>
           </div>
        </div>
      </section>

      {/* Main Grid */}
      <div className="crm-profile-grid-desktop" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        
        {/* Ticket Intel Card */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>Ticket Intelligence</h3>
          </div>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Current Status</label>
                <div style={{ color: 'var(--text)', fontWeight: 500 }}>{ticket.status.toUpperCase()}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Priority Level</label>
                <div style={{ color: ticket.priority === 'urgent' ? 'var(--danger)' : 'var(--text)', fontWeight: 700 }}>{ticket.priority.toUpperCase()}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Ticket ID</label>
                <div style={{ color: 'var(--text)', fontWeight: 500 }}>#{ticket.ticket_id}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Escalated</label>
                <div style={{ color: ticket.is_escalated ? 'var(--danger)' : 'var(--success)', fontWeight: 700 }}>{ticket.is_escalated ? 'YES' : 'NO'}</div>
              </div>
            </div>
            <div style={{ marginTop: '20px' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Original Request</label>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.6' }}>{ticket.description}</div>
            </div>
          </div>
        </div>

        {/* Support Context Card */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>Support Snapshot</h3>
          </div>
          <div style={{ padding: '0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--border)' }}>
              <div style={{ padding: '20px 24px', borderRight: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dimmed)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🧑💼</span> Assigned Handler
                </div>
                <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                   {canManage ? (
                      <select 
                        style={{ width: '100%', border: 'none', background: 'transparent', fontWeight: 700, color: 'var(--primary)', padding: 0, cursor: 'pointer', outline: 'none' }}
                        value={ticket.assigned_to?._id || ''} 
                        onChange={(e) => assignTicket(e.target.value)}
                      >
                        <option value="">Unassigned</option>
                        {teamMembers.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                   ) : (ticket.assigned_to?.name || 'Unassigned')}
                </div>
              </div>
              <div style={{ padding: '20px 24px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dimmed)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🔌</span> Connectivity
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)', fontWeight: 700 }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)' }} />
                  Live Sync
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              <div style={{ padding: '20px 24px', borderRight: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dimmed)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>👤</span> Customer
                </div>
                <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                   {ticket.customer_id ? (
                      <Link to={`/customers/${ticket.customer_id._id}`} style={{ color: 'var(--primary)' }}>{ticket.customer_id.name}</Link>
                   ) : (ticket.user_customer_id?.name || 'N/A')}
                </div>
              </div>
              <div style={{ padding: '20px 24px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dimmed)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>⏱️</span> Priority Action
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                   {STATUS_OPTIONS.slice(0, 3).map(opt => (
                      <button 
                        key={opt.value} 
                        onClick={() => updateStatus(opt.value)}
                        style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: ticket.status === opt.value ? 'var(--primary)' : 'var(--bg-card)', color: ticket.status === opt.value ? '#ffffff' : 'var(--text-dimmed)', fontWeight: 700 }}
                      >
                        {opt.label}
                      </button>
                   ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conversation Area */}
      <div style={{ marginTop: '24px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
           <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>Resolution Thread</h3>
        </div>
        
        <div style={{ padding: '24px', background: 'var(--bg-surface)', minHeight: '300px', maxHeight: '500px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
           <div style={{ alignSelf: 'flex-start', maxWidth: '80%', background: 'var(--bg-card)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dimmed)', fontWeight: 800, marginBottom: '4px' }}>ORIGINAL REQUEST</div>
              <div style={{ color: 'var(--text)', lineHeight: '1.6' }}>{ticket.description}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-dimmed)', opacity: 0.6, marginTop: '8px', textAlign: 'right' }}>{new Date(ticket.created_at).toLocaleString()}</div>
           </div>

            {ticket.messages?.map((msg, idx) => {
              const isOwn = String(msg.sender_id?._id || msg.sender_id || '') === String(user?.id || user?._id || '');
              return (
                <div key={idx} style={{ alignSelf: isOwn ? 'flex-end' : 'flex-start', maxWidth: '80%', background: isOwn ? 'var(--primary-soft)' : 'var(--bg-card)', padding: '16px', borderRadius: '12px', border: '1px solid', borderColor: isOwn ? 'var(--primary-soft)' : 'var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>{msg.sender_name} <span style={{ color: 'var(--text-dimmed)', fontWeight: 400 }}>({msg.sender_role})</span></div>
                  <div style={{ color: 'var(--text)', lineHeight: '1.6' }}>{msg.text}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-dimmed)', opacity: 0.6, marginTop: '8px', textAlign: 'right' }}>{new Date(msg.created_at).toLocaleString()}</div>
               </div>
              );
            })}
           <div ref={chatEndRef} />
        </div>

        {canReply ? (
          <form onSubmit={handleReply} style={{ padding: '24px', borderTop: '1px solid var(--border)', display: 'flex', gap: '16px' }}>
            <textarea 
               style={{ flex: 1, minHeight: '80px', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', resize: 'none' }}
               placeholder="Type your response intelligence..." 
               value={replyText}
               onChange={(e) => setReplyText(e.target.value)}
            />
            <button className="crm-btn-premium" style={{ background: 'var(--primary)', color: '#ffffff', border: 'none', height: 'fit-content', padding: '12px 32px' }} disabled={sendingReply || !replyText.trim()}>
               <span>{sendingReply ? '...' : 'Send'}</span>
            </button>
          </form>
        ) : (
          <div style={{ padding: '32px', textAlign: 'center', background: 'var(--bg-surface)', color: 'var(--text-dimmed)' }}>
             <Icon name="check" size={24} style={{ color: 'var(--success)', marginBottom: '8px' }} />
             <div style={{ fontWeight: 800 }}>Resolution Synchronized</div>
             <div style={{ fontSize: '0.85rem' }}>This communication node is locked. No further inputs are permitted.</div>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 900px) {
          .crm-profile-grid-desktop {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
