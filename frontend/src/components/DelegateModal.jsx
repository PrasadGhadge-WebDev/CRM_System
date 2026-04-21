import { useEffect, useState } from 'react'
import { Icon } from '../layouts/icons.jsx'
import { leadsApi } from '../services/leads.js'
import { supportApi } from '../services/workflow.js'
import { toast } from 'react-toastify'

/**
 * DelegateModal
 * Allows a Manager to assign unassigned work (Leads/Tickets) to a specific staff member.
 */
export default function DelegateModal({ employee, onConfirm, onCancel }) {
  const [loading, setLoading] = useState(true)
  const [unassignedLeads, setUnassignedLeads] = useState([])
  const [unassignedTickets, setUnassignedTickets] = useState([])
  const [selectedWork, setSelectedWork] = useState({ type: '', id: '' })
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    async function fetchUnassigned() {
      setLoading(true)
      try {
        const [leads, tickets] = await Promise.all([
          leadsApi.list({ assignedTo: 'unassigned', limit: 50 }),
          supportApi.list({ assigned_to: null, limit: 50 })
        ])
        setUnassignedLeads(leads.items || [])
        setUnassignedTickets(Array.isArray(tickets) ? tickets : tickets.items || [])
      } catch (err) {
        toast.error('Failed to load unassigned inventory')
      } finally {
        setLoading(false)
      }
    }
    fetchUnassigned()
  }, [])

  const handleAssign = async () => {
    if (!selectedWork.id) return
    setProcessing(true)
    try {
      if (selectedWork.type === 'lead') {
        await leadsApi.assign(selectedWork.id, { user_id: employee.id })
      } else {
        await supportApi.update(selectedWork.id, { assigned_to: employee.id })
      }
      toast.success(`Work assigned to ${employee.name}`)
      onConfirm()
    } catch (err) {
      toast.error('Delegation failed')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="modal-overlay animate-fade-in" onClick={onCancel}>
      <div className="modal-content delegate-modal animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-icon-shell">
            <Icon name="users" />
          </div>
          <div className="header-text">
            <h3>Delegate to {employee.name}</h3>
            <p className="subtitle">Select an unassigned item to push to this staff member</p>
          </div>
          <button className="close-btn" onClick={onCancel}>
            <Icon name="close" />
          </button>
        </div>

        <div className="modal-body-premium scrollable">
          {loading ? (
            <div className="center-loader padding40">
              <div className="spinner-mini" />
              <span>Scanning inventory...</span>
            </div>
          ) : (
            <>
              <div className="work-section">
                <div className="section-label">
                  <Icon name="search" /> <span>Available Leads ({unassignedLeads.length})</span>
                </div>
                <div className="work-grid">
                  {unassignedLeads.map(lead => (
                    <div 
                      key={lead.id} 
                      className={`work-card ${selectedWork.id === lead.id ? 'active' : ''}`}
                      onClick={() => setSelectedWork({ type: 'lead', id: lead.id })}
                    >
                      <div className="work-dot lead" />
                      <div className="work-info">
                        <span className="work-name">{lead.name}</span>
                        <span className="work-sub">{lead.source || 'General'}</span>
                      </div>
                      {selectedWork.id === lead.id && <Icon name="check" className="checked-icon" />}
                    </div>
                  ))}
                  {!unassignedLeads.length && <p className="empty-hint">No unassigned leads found.</p>}
                </div>
              </div>

              <div className="work-section">
                <div className="section-label">
                  <Icon name="bell" /> <span>Unassigned Tickets ({unassignedTickets.length})</span>
                </div>
                <div className="work-grid">
                  {unassignedTickets.map(ticket => (
                    <div 
                      key={ticket.id} 
                      className={`work-card ${selectedWork.id === ticket.id ? 'active' : ''}`}
                      onClick={() => setSelectedWork({ type: 'ticket', id: ticket.id })}
                    >
                      <div className="work-dot ticket" />
                      <div className="work-info">
                        <span className="work-name">{ticket.subject}</span>
                        <span className="work-sub">{ticket.ticket_id} • {ticket.priority}</span>
                      </div>
                      {selectedWork.id === ticket.id && <Icon name="check" className="checked-icon" />}
                    </div>
                  ))}
                  {!unassignedTickets.length && <p className="empty-hint">No unassigned tickets found.</p>}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer-premium">
          <button className="btn-premium secondary" onClick={onCancel} disabled={processing}>Cancel</button>
          <button 
            className="btn-premium primary" 
            onClick={handleAssign} 
            disabled={!selectedWork.id || processing}
          >
            {processing ? 'Processing...' : `Assign to ${employee.name.split(' ')[0]}`}
          </button>
        </div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 24px;
        }

        .delegate-modal {
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 24px;
          width: 100%;
          max-width: 600px;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        .modal-header {
          padding: 24px 32px;
          border-bottom: 1px solid var(--border);
          display: flex;
          gap: 20px;
          align-items: center;
        }

        .header-icon-shell {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: rgba(var(--primary-rgb), 0.1);
          color: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.3rem;
        }

        .header-text h3 { margin: 0; font-size: 1.2rem; }
        .subtitle { margin: 4px 0 0; font-size: 0.85rem; color: var(--text-dimmed); }

        .modal-body-premium {
          padding: 32px;
          overflow-y: auto;
          flex: 1;
        }

        .work-section { margin-bottom: 32px; }
        .section-label {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.7rem;
          font-weight: 800;
          text-transform: uppercase;
          color: var(--text-dimmed);
          margin-bottom: 16px;
          letter-spacing: 0.05em;
        }

        .work-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }

        .work-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px 16px;
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--border);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }

        .work-card:hover {
          background: rgba(255,255,255,0.06);
          border-color: var(--primary-soft);
        }

        .work-card.active {
          background: rgba(var(--primary-rgb), 0.08);
          border-color: var(--primary);
        }

        .work-dot { width: 8px; height: 8px; border-radius: 50%; }
        .work-dot.lead { background: #10b981; }
        .work-dot.ticket { background: #f59e0b; }

        .work-info { display: flex; flex-direction: column; }
        .work-name { font-weight: 700; color: white; font-size: 0.9rem; }
        .work-sub { font-size: 0.75rem; color: var(--text-dimmed); }

        .checked-icon { position: absolute; right: 16px; color: var(--primary); font-size: 1.2rem; }

        .empty-hint { font-size: 0.85rem; color: var(--text-muted); font-style: italic; }

        .modal-footer-premium {
          padding: 24px 32px;
          border-top: 1px solid var(--border);
          display: flex;
          justify-content: flex-end;
          gap: 16px;
        }

        .center-loader { display: flex; flex-direction: column; align-items: center; gap: 12px; color: var(--text-dimmed); }
        .spinner-mini { width: 20px; height: 20px; border: 2px solid rgba(255,255,255,0.1); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .close-btn { background: transparent; border: none; color: var(--text-dimmed); cursor: pointer; }
      `}</style>
    </div>
  )
}
