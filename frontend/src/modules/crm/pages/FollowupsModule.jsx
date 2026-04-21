import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { activitiesApi } from '../../../services/activities'
import { Icon } from '../../../layouts/icons'
import PageHeader from '../../../components/PageHeader'

export default function FollowupsModule() {
  // Pagination & Filter State: Activity History
  const [actPage, setActPage] = useState(1)
  const [actTotal, setActTotal] = useState(0)
  const [actStatus, setActStatus] = useState('')
  const [actType, setActType] = useState('')

  // Pagination & Filter State: Follow-up History
  const [fuPage, setFuPage] = useState(1)
  const [fuTotal, setFuTotal] = useState(0)
  const [fuStatus, setFuStatus] = useState('')
  const [fuMode, setFuMode] = useState('')

  const [followUps, setFollowUps] = useState([])
  const [generalActivities, setGeneralActivities] = useState([])

  const loadGeneralActivities = async () => {
    try {
      const params = {
        // fetching globally, so no related_to filter
        related_type: 'Lead',
        page: actPage,
        limit: 5,
        status: actStatus,
        activity_type: actType
      }
      const res = await activitiesApi.list(params)
      setGeneralActivities(res.data?.items || res.items || [])
      setActTotal(res.data?.total || res.total || 0)
    } catch (error) {
      console.error('Error loading general activities:', error)
    }
  }

  const loadFollowUps = async () => {
    try {
      const params = {
        // fetching globally
        related_type: 'Lead',
        page: fuPage,
        limit: 5,
        status: fuStatus,
        activity_type: 'follow-up',
        follow_up_mode: fuMode
      }
      const res = await activitiesApi.list(params)
      setFollowUps(res.data?.items || res.items || [])
      setFuTotal(res.data?.total || res.total || 0)
    } catch (error) {
      console.error('Error loading follow-ups:', error)
    }
  }

  useEffect(() => {
    loadGeneralActivities()
  }, [actPage, actStatus, actType])

  useEffect(() => {
    loadFollowUps()
  }, [fuPage, fuStatus, fuMode])

  return (
    <div className="followups-module-container stack">
      <PageHeader
        title="Follow-ups & Activities"
        backTo="/dashboard"
      />

      <div className="lead-v2-card full-width history-v2 premium-glass-panel mb-24">
        <div className="card-v2-header flex-between flex-wrap gap-12">
          <div className="flex-center-gap">
            <Icon name="activity" />
            <h3>LEAD ACTIVITY HISTORY</h3>
          </div>
          <div className="header-controls-v3">
             <div className="filter-chip-group">
                <select className="glass-select-mini" value={actType} onChange={e => { setActType(e.target.value); setActPage(1); }}>
                  <option value="">All Types</option>
                  <option value="Lead Created">Lead Created</option>
                  <option value="Meeting">Meeting</option>
                  <option value="call">Call</option>
                  <option value="follow-up">Follow-up</option>
                </select>
                <select className="glass-select-mini" value={actStatus} onChange={e => { setActStatus(e.target.value); setActPage(1); }}>
                  <option value="">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="planned">Planned</option>
                </select>
             </div>
             <div className="header-meta-v3">
               <span>{actTotal} Total</span>
             </div>
          </div>
        </div>
        <div className="card-v2-body overflow-x">
           <table className="premium-table-v3">
             <thead>
               <tr>
                 <th>Event</th>
                 <th>Lead</th>
                 <th>Description</th>
                 <th>Date</th>
                 <th>By</th>
               </tr>
             </thead>
             <tbody>
                {generalActivities.map(a => (
                  <tr key={a.id}>
                    <td className="w-150">
                      <span className={`event-tag-v3 ${a.activity_type?.replace(' ', '-').toLowerCase()}`}>
                        {a.activity_type}
                      </span>
                    </td>
                    <td>
                      {a.related_to ? (
                        <Link to={`/leads/${a.related_to.id || a.related_to._id || a.related_to}`} className="lead-link">
                          {a.related_to.name || a.related_to.title || 'View Lead'}
                        </Link>
                      ) : '-'}
                    </td>
                    <td className="note-cell">{a.description}</td>
                    <td>
                      <div className="date-wrap-v3">
                        <span className="d-day">{new Date(a.activity_date || a.created_at).toLocaleDateString()}</span>
                        <span className="d-time">{new Date(a.activity_date || a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td>
                      <div className="user-info-v3">
                        <span className="u-name">{a.completed_by?.name || a.created_by?.name || 'System'}</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {generalActivities.length === 0 && (
                  <tr><td colSpan="5" className="center-empty-v3">No activities found matching filters.</td></tr>
                )}
             </tbody>
           </table>
           
           {actTotal > 5 && (
             <div className="pagination-v3">
                <button className="pag-btn" disabled={actPage <= 1} onClick={() => setActPage(p => p - 1)}>
                  <Icon name="chevronLeft" size={16} />
                </button>
                <span className="pag-info">Page <strong>{actPage}</strong> of {Math.ceil(actTotal / 5)}</span>
                <button className="pag-btn" disabled={actPage >= Math.ceil(actTotal / 5)} onClick={() => setActPage(p => p + 1)}>
                  <Icon name="chevronRight" size={16} />
                </button>
             </div>
           )}
        </div>
      </div>

      <div className="lead-v2-card full-width history-v2 premium-glass-panel">
        <div className="card-v2-header flex-between flex-wrap gap-12">
          <div className="flex-center-gap">
            <Icon name="activity" />
            <h3>FOLLOW-UP HISTORY</h3>
          </div>
          <div className="header-controls-v3">
             <div className="filter-chip-group">
                <select className="glass-select-mini" value={fuMode} onChange={e => { setFuMode(e.target.value); setFuPage(1); }}>
                  <option value="">All Modes</option>
                  <option value="Call">Call</option>
                  <option value="Meeting">Meeting</option>
                  <option value="Email">Email</option>
                  <option value="WhatsApp">WhatsApp</option>
                </select>
                <select className="glass-select-mini" value={fuStatus} onChange={e => { setFuStatus(e.target.value); setFuPage(1); }}>
                  <option value="">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="planned">Planned</option>
                </select>
             </div>
             <div className="header-meta-v3">
               <span>{fuTotal} Records</span>
             </div>
          </div>
        </div>
        <div className="card-v2-body overflow-x">
           <table className="premium-table-v3">
             <thead>
               <tr>
                 <th>Date</th>
                 <th>Lead</th>
                 <th>Mode</th>
                 <th>Status</th>
                 <th>Note</th>
                 <th>Handled By</th>
               </tr>
             </thead>
             <tbody>
               {followUps.map(f => (
                 <tr key={f.id}>
                   <td className="date-cell">
                      <div className="date-wrap-v3">
                         <span className="d-day">
                           {new Date(f.status === 'planned' ? (f.due_date || f.activity_date) : (f.activity_date || f.created_at)).toLocaleDateString()}
                         </span>
                         <span className="d-time">
                           {new Date(f.status === 'planned' ? (f.due_date || f.activity_date) : (f.activity_date || f.created_at)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                         </span>
                      </div>
                   </td>
                   <td>
                      {f.related_to ? (
                        <Link to={`/leads/${f.related_to.id || f.related_to._id || f.related_to}`} className="lead-link">
                          {f.related_to.name || f.related_to.title || 'View Lead'}
                        </Link>
                      ) : '-'}
                   </td>
                   <td>
                      <span className="mode-tag-v3">{f.follow_up_mode || f.activity_type}</span>
                   </td>
                   <td>
                      {(() => {
                        let displayStatus = f.status;
                        const isOverdue = f.status === 'planned' && f.due_date && new Date(f.due_date) < new Date();
                        if (isOverdue) displayStatus = 'overdue';
                        
                        return (
                          <span className={`status-pill-v3 ${displayStatus}`}>
                             <span className="dot" />
                             {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
                          </span>
                        );
                      })()}
                   </td>
                   <td className="note-cell">{f.description}</td>
                   <td>
                      {(() => {
                        const person = f.status === 'completed' 
                          ? (f.completed_by || f.created_by || f.assigned_to)
                          : (f.assigned_to || f.created_by);
                        return (
                          <div className="user-info-v3">
                             <span className="u-avatar">{(person?.name || 'U').charAt(0)}</span>
                             <span className="u-name">{person?.name || 'System'}</span>
                          </div>
                        );
                      })()}
                   </td>
                 </tr>
               ))}
               {followUps.length === 0 && (
                 <tr><td colSpan="6" className="center-empty-v3">No follow-ups matching current filters.</td></tr>
               )}
             </tbody>
           </table>
           
           {fuTotal > 5 && (
             <div className="pagination-v3">
                <button className="pag-btn" disabled={fuPage <= 1} onClick={() => setFuPage(p => p - 1)}>
                  <Icon name="chevronLeft" size={16} />
                </button>
                <span className="pag-info">Page <strong>{fuPage}</strong> of {Math.ceil(fuTotal / 5)}</span>
                <button className="pag-btn" disabled={fuPage >= Math.ceil(fuTotal / 5)} onClick={() => setFuPage(p => p + 1)}>
                  <Icon name="chevronRight" size={16} />
                </button>
             </div>
           )}
        </div>
      </div>
      <style>{`
        .followups-module-container {
          padding: 24px;
        }
        .lead-v2-card {
          background: var(--bg-surface);
          border-radius: 12px;
          border: 1px solid var(--border);
          overflow: hidden;
        }
        .premium-glass-panel {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .mb-24 { margin-bottom: 24px; }
        .card-v2-header {
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          align-items: center;
        }
        .flex-between { justify-content: space-between; }
        .flex-wrap { flex-wrap: wrap; }
        .gap-12 { gap: 12px; }
        .flex-center-gap { display: flex; align-items: center; gap: 14px; }
        .card-v2-header h3 { font-size: 0.9rem; font-weight: 800; margin: 0; color: var(--text); letter-spacing: 0.05em; text-transform: uppercase;}
        
        .header-controls-v3 { display: flex; align-items: center; gap: 16px; }
        .filter-chip-group { display: flex; gap: 8px; }
        .glass-select-mini {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--text);
          font-size: 0.75rem;
          font-weight: 700;
          padding: 4px 12px;
          border-radius: 50px;
          cursor: pointer;
          outline: none;
        }
        .glass-select-mini:focus { border-color: var(--primary); }
        .header-meta-v3 { font-size: 0.75rem; color: var(--text-muted); font-weight: 700; background: rgba(255, 255, 255, 0.05); padding: 4px 12px; border-radius: 50px; }

        .overflow-x { overflow-x: auto; }
        
        .premium-table-v3 { width: 100%; border-collapse: separate; border-spacing: 0 8px; }
        .premium-table-v3 th { text-align: left; padding: 12px 16px; font-size: 0.7rem; color: var(--primary); font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; }
        .premium-table-v3 tr { background: rgba(255, 255, 255, 0.02); transition: all 0.2s; }
        .premium-table-v3 tr:hover { background: rgba(255, 255, 255, 0.05); transform: scale(1.002); }
        .premium-table-v3 td { padding: 16px; font-size: 0.88rem; border-top: 1px solid rgba(255, 255, 255, 0.05); border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
        .premium-table-v3 td:first-child { border-left: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px 0 0 12px; }
        .premium-table-v3 td:last-child { border-right: 1px solid rgba(255, 255, 255, 0.05); border-radius: 0 12px 12px 0; }

        .date-wrap-v3 { display: flex; flex-direction: column; gap: 2px; }
        .d-day { font-weight: 700; color: var(--text); }
        .d-time { font-size: 0.75rem; color: var(--text-dimmed); }

        .mode-tag-v3 { background: rgba(59, 130, 246, 0.08); color: var(--primary); padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; text-transform: capitalize; border: 1px solid rgba(59, 130, 246, 0.1); }
        
        .status-pill-v3 { display: inline-flex; align-items: center; gap: 8px; padding: 4px 12px; border-radius: 50px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; border: 1px solid transparent; }
        .status-pill-v3 .dot { width: 6px; height: 6px; border-radius: 50%; }
        
        .status-pill-v3.planned { background: rgba(59, 130, 246, 0.08); color: var(--primary); border-color: rgba(59, 130, 246, 0.2); }
        .status-pill-v3.planned .dot { background: var(--primary); box-shadow: 0 0 8px var(--primary); }

        .status-pill-v3.overdue { background: rgba(239, 68, 68, 0.08); color: #ef4444; border-color: rgba(239, 68, 68, 0.2); }
        .status-pill-v3.overdue .dot { background: #ef4444; box-shadow: 0 0 10px #ef4444; animation: pulse-red 2s infinite; }
        
        @keyframes pulse-red {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        .status-pill-v3.completed { background: rgba(148, 163, 184, 0.08); color: var(--text-muted); border-color: rgba(148, 163, 184, 0.2); }
        .status-pill-v3.completed .dot { background: var(--text-muted); }

        .note-cell { color: var(--text-dimmed); font-size: 0.85rem; line-height: 1.5; max-width: 300px; }
        
        .user-info-v3 { display: flex; align-items: center; gap: 10px; }
        .u-avatar { width: 28px; height: 28px; background: var(--primary); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 900; }
        .u-name { font-weight: 600; font-size: 0.85rem; color: var(--text); }

        .center-empty-v3 { text-align: center; padding: 40px; color: var(--text-dimmed); font-size: 0.9rem; font-style: italic; }

        .pagination-v3 { display: flex; align-items: center; justify-content: center; gap: 20px; padding: 24px 0 8px; }
        .pag-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--text);
          width: 32px; height: 32px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s;
        }
        .pag-btn:hover:not(:disabled) { background: var(--primary); color: white; transform: scale(1.1); }
        .pag-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .pag-info { font-size: 0.85rem; color: var(--text-muted); }
        .pag-info strong { color: var(--text); }

        .event-tag-v3 {
           font-size: 0.7rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em;
           padding: 4px 10px; border-radius: 4px;
        }
        .event-tag-v3.lead-created { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
        .event-tag-v3.call { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
        .event-tag-v3.meeting { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
        .event-tag-v3.follow-up { background: rgba(16, 185, 129, 0.1); color: #10b981; }

        .w-150 { width: 150px; }
        .lead-link { color: var(--primary); text-decoration: none; font-weight: 600; }
        .lead-link:hover { text-decoration: underline; }
      `}</style>
    </div>
  )
}
