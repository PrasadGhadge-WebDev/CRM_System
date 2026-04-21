import { useCallback, useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { supportApi } from '../../../services/workflow.js'
import { usersApi } from '../../../services/users.js'
import PageHeader from '../../../components/PageHeader.jsx'
import { Icon } from '../../../layouts/icons.jsx'
import { useAuth } from '../../../context/AuthContext.jsx'
import { useToastFeedback } from '../../../utils/useToastFeedback.js'

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
  const isAccountant = user?.role === 'Accountant'
  const isEmployee = user?.role === 'Employee'
  
  const [ticket, setTicket] = useState(null)
  const [teamMembers, setTeamMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [escalating, setEscalating] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [solutionLocal, setSolutionLocal] = useState('')
  
  useToastFeedback({ error })

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [ticketData, usersData] = await Promise.all([
        supportApi.get(id),
        usersApi.list({ limit: 100 })
      ])
      setTicket(ticketData)
      setSolutionLocal(ticketData.solution || '')
      setTeamMembers(Array.isArray(usersData) ? usersData : usersData.items || [])
    } catch {
      setError('Failed to load intelligence data')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function updateTicket(payload, successMessage) {
    try {
      await supportApi.update(id, payload)
      toast.success(successMessage || 'Intelligence updated')
      loadData()
    } catch (err) {
      const msg = err.response?.data?.message || 'Strategic update failed'
      toast.error(msg)
    }
  }

  async function handleStatusChange(newStatus) {
    if (newStatus === 'closed' && !isAdmin && !isManager) {
      toast.warning('Verification Required: Only Admins or Managers can finalize and Close tickets.')
      return
    }

    if (newStatus === 'resolved' && !solutionLocal.trim()) {
      const sol = window.prompt('A Technical Solution is required for resolution. Please provide details:')
      if (!sol) return
      await updateTicket({ status: newStatus, solution: sol }, 'Ticket resolved with solution')
    } else {
      await updateTicket({ status: newStatus }, 'Status reconfigured')
    }
  }

  async function handleAddNote(e) {
    e.preventDefault()
    if (!noteText.trim()) return
    setAddingNote(true)
    try {
      await supportApi.addNote(id, noteText)
      toast.success('Internal note registered')
      setNoteText('')
      loadData()
    } catch {
      toast.error('Failed to register note')
    } finally {
      setAddingNote(false)
    }
  }

  async function handleSaveSolution() {
    if (!solutionLocal.trim()) return
    await updateTicket({ solution: solutionLocal }, 'Technical Solution updated')
  }

  async function handleDelete() {
    if (!window.confirm('Are you sure you want to permanently decommission this ticket?')) return
    try {
      await supportApi.remove(id)
      toast.success('Ticket decommissioned successfully')
      navigate('/tickets')
    } catch {
      toast.error('Failed to decommission ticket')
    }
  }

  async function handleEscalate() {
    const reason = window.prompt('Please provide a specific reason for escalation to management:')
    if (!reason) return
    
    setEscalating(true)
    try {
      await supportApi.escalate(id, reason)
      toast.success('Ticket escalated successfully to management')
      loadData()
    } catch (err) {
      toast.error('Escalation failed')
    } finally {
      setEscalating(false)
    }
  }

  if (loading) return <div className="center padding60"><div className="loader-premium" /></div>
  if (error) return <div className="alert-premium error">{error}</div>
  if (!ticket) return <div className="center padding60 muted">Signal lost. Ticket not found.</div>

  const isBillingTicket = ticket.category === 'Billing'
  const canUpdateStatus = isAdmin || isManager || (isAccountant && isBillingTicket) || (isEmployee && String(ticket.assigned_to?._id || ticket.assigned_to) === String(user.id))

  return (
    <div className="stack gap-32 ticket-detail-container">
      <PageHeader 
        title={`${ticket.ticket_id || 'PROVISIONING'}: ${ticket.subject}`} 
        backTo="/tickets" 
        actions={
          <div className="flex gap-12">
            {!ticket.is_escalated && isEmployee && (
              <button 
                onClick={handleEscalate} 
                className="btn-premium action-warning"
                disabled={escalating}
              >
                <Icon name="bell" />
                <span>{escalating ? 'Escalating...' : 'Escalate to Manager'}</span>
              </button>
            )}
            <Link to={`/tickets/${id}/edit`} className="btn-premium action-secondary">
              <Icon name="edit" />
              <span>Modify</span>
            </Link>
            {isAdmin && (
              <button onClick={handleDelete} className="btn-premium action-danger">
                <Icon name="trash" />
                <span>Decommission</span>
              </button>
            )}
          </div>
        }
      />

      {ticket.is_escalated && (
        <div className="alert-escalated shadow-vibrant">
           <div className="flex items-center gap-16">
             <div className="escalation-icon-shell">
               <Icon name="bell" size={24} />
             </div>
             <div className="flex1">
               <div className="strong" style={{ fontSize: '1.1rem' }}>Escalation Protocol Active</div>
               <div className="muted">{ticket.escalation_reason || 'No specific reason provided.'}</div>
             </div>
             <div className="text-right muted small">
               <div>Escalated by {ticket.escalated_by?.name || 'Authorized Personnel'}</div>
               <div>{ticket.escalated_at ? new Date(ticket.escalated_at).toLocaleString() : ''}</div>
             </div>
           </div>
        </div>
      )}

      {isBillingTicket && (
        <div className="alert-billing shadow-vibrant-info">
           <div className="flex items-center gap-16">
             <div className="billing-icon-shell">
               <Icon name="reports" size={24} />
             </div>
             <div className="flex1">
               <div className="strong" style={{ fontSize: '1.1rem' }}>Financial Category: Billing Intelligence</div>
               <div className="muted">This ticket is classified as a financial signal. Accountants have priority resolution authority.</div>
             </div>
             {isAccountant && <span className="premium-badge-info">Active Handling</span>}
           </div>
        </div>
      )}

      {isEmployee && String(ticket.assigned_to?._id || ticket.assigned_to) === String(user.id) && (
        <div className="quick-execution-tray animate-fade-in">
           <div className="tray-label">Quick Strategic Actions</div>
           <div className="flex gap-16">
              {ticket.status === 'open' && (
                <button 
                  className="btn-premium action-vibrant flex1" 
                  onClick={() => handleStatusChange('in-progress')}
                >
                  <Icon name="activity" />
                  <span>Start Strategic Work</span>
                </button>
              )}
              {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                <button 
                  className="btn-premium action-success flex1" 
                  onClick={() => handleStatusChange('resolved')}
                >
                  <Icon name="check" />
                  <span>Finalize & Resolve</span>
                </button>
              )}
           </div>
        </div>
      )}

      <div className="grid-main-side">
        <div className="intel-main-column stack gap-32">
          <section className="card-premium">
            <div className="card-header-premium border-bottom">
              <div className="card-title-premium">
                <Icon name="bell" />
                <h3>Signal Overview</h3>
              </div>
              <span className={`status-badge status-${ticket.status.replace('-', '')}`}>
                {ticket.status}
              </span>
            </div>
            <div className="card-body-premium">
              <div className="intelligence-field full-width">
                <label>Context / Description</label>
                <div className="intelligence-value long-text">
                  {ticket.description || 'No descriptive signal available.'}
                </div>
              </div>
            </div>
          </section>

          <section className="card-premium">
             <div className="card-header-premium border-bottom">
               <div className="card-title-premium">
                 <Icon name="reports" />
                 <h3>Technical Solution</h3>
               </div>
               {ticket.status !== 'resolved' && ticket.status !== 'closed' && solutionLocal && (
                 <button className="btn-save-solution" onClick={handleSaveSolution}>Save Draft</button>
               )}
             </div>
             <div className="card-body-premium">
               <textarea 
                  className="textarea-premium" 
                  placeholder={canUpdateStatus ? "Document the final tactical solution here..." : "No solution documented yet."}
                  value={solutionLocal}
                  onChange={(e) => setSolutionLocal(e.target.value)}
                  disabled={!canUpdateStatus}
               />
             </div>
          </section>

          <section className="card-premium">
             <div className="card-header-premium border-bottom">
               <div className="card-title-premium">
                 <Icon name="activity" />
                 <h3>Incident Timeline & Internal Notes</h3>
               </div>
             </div>
             <div className="card-body-premium stack gap-24">
                <div className="timeline-shell">
                   {ticket.notes && ticket.notes.length > 0 ? (
                     ticket.notes.map((note, idx) => (
                       <div key={idx} className="timeline-node">
                          <div className="node-dot"></div>
                          <div className="node-content">
                             <div className="node-header">
                               <span className="node-author text-vibrant">{note.author_name}</span>
                               <span className="node-date muted">{new Date(note.created_at).toLocaleString()}</span>
                             </div>
                             <div className="node-text">{note.text}</div>
                          </div>
                       </div>
                     ))
                   ) : (
                     <div className="muted padding20 center">No internal notes registered for this incident.</div>
                   )}
                </div>

                <form className="note-form flex gap-12 items-start" onSubmit={handleAddNote}>
                  <div className="flex1">
                    <textarea 
                      className="textarea-premium compact" 
                      placeholder="Add an internal note or troubleshoot step..."
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                    />
                  </div>
                  <button className="btn-premium action-vibrant" disabled={addingNote || !noteText.trim()}>
                    <Icon name="plus" />
                    <span>{addingNote ? 'Adding...' : 'Note'}</span>
                  </button>
                </form>
             </div>
          </section>
        </div>

        <aside className="intel-side-column stack gap-32">
           <section className="card-premium">
             <div className="card-header-premium border-bottom">
               <div className="card-title-premium">
                 <Icon name="dashboard" />
                 <h3>Strategic Control</h3>
               </div>
             </div>
             <div className="card-body-premium stack gap-20">
               <div className="intelligence-field">
                 <label>Criticality Level</label>
                 <select
                   className="select-premium"
                   disabled={!canUpdateStatus}
                   value={ticket.priority}
                   onChange={(e) => updateTicket({ priority: e.target.value }, 'Priority level shifted')}
                 >
                   {PRIORITY_OPTIONS.map(opt => (
                     <option key={opt.value} value={opt.value}>{opt.label}</option>
                   ))}
                 </select>
               </div>

               <div className="intelligence-field">
                 <label>Configuration Status</label>
                 <select
                   className="select-premium vibrant-select"
                   disabled={!canUpdateStatus}
                   value={ticket.status}
                   onChange={(e) => handleStatusChange(e.target.value)}
                 >
                   {STATUS_OPTIONS.map(opt => (
                     <option 
                        key={opt.value} 
                        value={opt.value}
                        disabled={opt.value === 'closed' && !isAdmin && !isManager}
                     >
                        {opt.label} {opt.value === 'closed' && !isAdmin && !isManager ? '(Verify Required)' : ''}
                     </option>
                   ))}
                 </select>
                 {!isAdmin && !isManager && ticket.status === 'resolved' && (
                   <div className="muted xsmall margin-top-4">Final verification by Manager required for closure.</div>
                 )}
               </div>

               <div className="intelligence-field">
                 <label>Personnel Assignment</label>
                 <select
                   className="select-premium"
                   disabled={!isAdmin && !isManager}
                   value={ticket.assigned_to?._id || ticket.assigned_to?.id || ''}
                   onChange={(e) => updateTicket({ assigned_to: e.target.value }, 'Personnel reallocated')}
                 >
                   <option value="">Unassigned Pool</option>
                   {teamMembers.map(m => (
                     <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                   ))}
                 </select>
               </div>

               <div className="intelligence-field">
                 <label>Classification</label>
                 <div className="intelligence-value">
                   <span className={`premium-chip ${isBillingTicket ? 'billing-chip' : ''}`}>{ticket.category || 'General'}</span>
                 </div>
               </div>
               
               <div className="border-top padding-top-12">
                 <div className="intelligence-field">
                    <label>Capture Date</label>
                    <div className="intelligence-value muted small">
                      {new Date(ticket.created_at).toLocaleString()}
                    </div>
                 </div>
               </div>
             </div>
           </section>

           <section className="card-premium">
              <div className="card-header-premium border-bottom">
                <div className="card-title-premium">
                   <Icon name="user" />
                   <h3>Entity Profile</h3>
                </div>
              </div>
              <div className="card-body-premium">
                <div className="intelligence-field">
                   <label>Customer Name</label>
                   <div className="intelligence-value text-vibrant">
                      {ticket.customer_id?.name || 'Unknown Entity'}
                   </div>
                </div>
                <div className="margin-top-12">
                   <Link to={`/customers/${ticket.customer_id?._id || ticket.customer_id?.id}`} className="btn-premium action-secondary full-width">
                      View Profile
                   </Link>
                </div>
              </div>
           </section>
        </aside>
      </div>

      <style>{`
        .ticket-detail-container { padding-bottom: 60px; }
        .grid-main-side { display: grid; grid-template-columns: 1fr 320px; gap: 32px; align-items: start; }
        @media (max-width: 1280px) { .grid-main-side { grid-template-columns: 1fr; } .intel-side-column { order: -1; } }
        
        .card-premium { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 24px; overflow: hidden; box-shadow: var(--shadow-xl); }
        .card-header-premium { display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; background: rgba(255, 255, 255, 0.02); }
        .card-title-premium { display: flex; align-items: center; gap: 10px; }
        .card-title-premium h3 { margin: 0; font-size: 0.85rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; }
        .card-title-premium svg { color: var(--primary); opacity: 0.8; }
        .card-body-premium { padding: 24px; }
        
        .intelligence-field label { display: block; font-size: 0.72rem; font-weight: 800; color: var(--text-dimmed); text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.08em; }
        .intelligence-value { font-weight: 600; color: white; font-size: 1.05rem; }
        .long-text { line-height: 1.6; font-weight: 400; color: var(--text-muted); white-space: pre-wrap; font-size: 0.95rem; }
        
        .select-premium { width: 100%; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border); border-radius: 12px; color: white; padding: 12px 14px; font-weight: 600; outline: none; transition: all 0.2s; cursor: pointer; }
        .select-premium:focus:not(:disabled) { border-color: var(--primary); background: rgba(255, 255, 255, 0.05); }
        .vibrant-select { border-color: rgba(59, 130, 246, 0.3); color: var(--primary); }
        .select-premium:disabled { opacity: 0.5; cursor: not-allowed; }
        .xsmall { font-size: 0.65rem; }
        
        .textarea-premium { width: 100%; min-height: 120px; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border); border-radius: 16px; color: white; padding: 16px; font-size: 0.95rem; resize: vertical; line-height: 1.5; outline: none; }
        .textarea-premium:focus:not(:disabled) { border-color: var(--primary); background: rgba(255, 255, 255, 0.04); }
        .textarea-premium.compact { min-height: 48px; border-radius: 12px; }
        .textarea-premium:disabled { opacity: 0.7; }

        .btn-save-solution { background: transparent; border: 1px solid var(--primary); color: var(--primary); padding: 4px 12px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .btn-save-solution:hover { background: var(--primary); color: white; }

        .timeline-shell { position: relative; padding-left: 32px; margin-bottom: 24px; }
        .timeline-shell::before { content: ''; position: absolute; left: 11px; top: 0; bottom: 0; width: 2px; background: var(--border); }
        .timeline-node { position: relative; margin-bottom: 24px; }
        .node-dot { position: absolute; left: -26px; top: 6px; width: 10px; height: 10px; border-radius: 50%; background: var(--border); border: 2px solid var(--bg-surface); z-index: 2; }
        .timeline-node:last-child { margin-bottom: 0; }
        .node-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
        .node-author { font-weight: 700; font-size: 0.85rem; }
        .node-date { font-size: 0.7rem; }
        .node-text { font-size: 0.9rem; color: var(--text-muted); line-height: 1.4; background: rgba(255, 255, 255, 0.02); padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border); }
        
        .premium-chip { background: var(--bg-elevated); color: var(--primary); padding: 4px 12px; border-radius: 8px; font-size: 0.8rem; font-weight: 700; border: 1px solid rgba(59, 130, 246, 0.2); }
        .billing-chip { color: #0ea5e9; border-color: rgba(14, 165, 233, 0.3); background: rgba(14, 165, 233, 0.05); }

        .alert-escalated { background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(17, 24, 39, 0.95)); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 20px; padding: 20px 24px; position: relative; overflow: hidden; margin-bottom: 24px; }
        .alert-billing { background: linear-gradient(135deg, rgba(14, 165, 233, 0.1), rgba(17, 24, 39, 0.95)); border: 1px solid rgba(14, 165, 233, 0.3); border-radius: 20px; padding: 20px 24px; position: relative; overflow: hidden; margin-bottom: 24px; }
        
        .escalation-icon-shell { width: 48px; height: 48px; border-radius: 14px; background: rgba(239, 68, 68, 0.15); color: #ef4444; display: flex; align-items: center; justify-content: center; animation: pulse-red 2s infinite; }
        .billing-icon-shell { width: 48px; height: 48px; border-radius: 14px; background: rgba(14, 165, 233, 0.15); color: #0ea5e9; display: flex; align-items: center; justify-content: center; }
        
        .status-badge { display: inline-flex; padding: 6px 14px; border-radius: 999px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }
        .status-badge.status-open { background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }
        .status-badge.status-inprogress { background: rgba(139, 92, 246, 0.15); color: #a78bfa; border: 1px solid rgba(139, 92, 246, 0.3); }
        .status-badge.status-resolved { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }

        .loader-premium { width: 40px; height: 40px; border: 4px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .quick-execution-tray { background: rgba(59, 130, 246, 0.05); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 20px; padding: 24px; margin-bottom: 24px; }
        .tray-label { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; color: var(--primary); margin-bottom: 12px; letter-spacing: 0.1em; }
        .success-text { color: #10b981; }
        .action-success { background: #10b981; color: white; box-shadow: 0 0 15px rgba(16, 185, 129, 0.3); }
        .action-success:hover { background: #059669; }
      `}</style>
    </div>
  )
}
