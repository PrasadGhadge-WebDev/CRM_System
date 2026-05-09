import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { activitiesApi } from '../../../services/activities'
import { Icon } from '../../../layouts/icons'
import PageHeader from '../../../components/PageHeader'
import ModernSearchBar from '../../../components/ModernSearchBar'
import { 
  FiTarget, 
  FiClock, 
  FiCheckCircle, 
  FiRefreshCw, 
  FiActivity, 
  FiChevronLeft, 
  FiChevronRight 
} from 'react-icons/fi'

export default function FollowupsModule() {
  // Pagination & Filter State: Activity History
  const [actPage, setActPage] = useState(1)
  const [actTotal, setActTotal] = useState(0)
  const [actStatus, setActStatus] = useState('')
  const [actType, setActType] = useState('')
  const [q, setQ] = useState('')

  // Pagination & Filter State: Follow-up History
  const [fuPage, setFuPage] = useState(1)
  const [fuTotal, setFuTotal] = useState(0)
  const [fuStatus, setFuStatus] = useState('')
  const [fuMode, setFuMode] = useState('')
  
  const [dateRangeType, setDateRangeType] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [followUps, setFollowUps] = useState([])
  const [generalActivities, setGeneralActivities] = useState([])

  const getDates = () => {
    let sDate = startDate
    let eDate = endDate
    const now = new Date()
    now.setHours(0,0,0,0)

    if (dateRangeType === 'today') {
      sDate = now.toISOString()
      eDate = new Date(new Date().setHours(23,59,59,999)).toISOString()
    } else if (dateRangeType === 'yesterday') {
      const y = new Date(now)
      y.setDate(y.getDate() - 1)
      sDate = y.toISOString()
      const yEnd = new Date(y)
      yEnd.setHours(23,59,59,999)
      eDate = yEnd.toISOString()
    } else if (dateRangeType === 'week') {
      const w = new Date(now)
      w.setDate(w.getDate() - 7)
      sDate = w.toISOString()
    } else if (dateRangeType === 'month') {
      const m = new Date(now)
      m.setMonth(m.getMonth() - 1)
      sDate = m.toISOString()
    }
    return { sDate, eDate }
  }

  const loadGeneralActivities = async () => {
    const { sDate, eDate } = getDates()
    try {
      const params = {
        related_type: 'Lead',
        page: actPage,
        limit: 5,
        status: actStatus,
        activity_type: actType,
        q,
        startDate: sDate,
        endDate: eDate
      }
      const res = await activitiesApi.list(params)
      setGeneralActivities(res.data?.items || res.items || [])
      setActTotal(res.data?.total || res.total || 0)
    } catch (error) {}
  }

  const loadFollowUps = async () => {
    const { sDate, eDate } = getDates()
    try {
      const params = {
        related_type: 'Lead',
        page: fuPage,
        limit: 5,
        status: fuStatus,
        activity_type: 'follow-up',
        follow_up_mode: fuMode,
        q,
        startDate: sDate,
        endDate: eDate
      }
      const res = await activitiesApi.list(params)
      setFollowUps(res.data?.items || res.items || [])
      setFuTotal(res.data?.total || res.total || 0)
    } catch (error) {}
  }

  useEffect(() => {
    loadGeneralActivities()
  }, [actPage, actStatus, actType, q, dateRangeType, startDate, endDate])

  useEffect(() => {
    loadFollowUps()
  }, [fuPage, fuStatus, fuMode, q, dateRangeType, startDate, endDate])

  return (
    <div className="followups-module-v3">
      <div className="v3-container">
        <PageHeader
          title="Intelligence Hub"
          description="Track every interaction and follow-up in real-time"
          backTo={null}
        />

        {/* 1. METRICS OVERVIEW */}
        <div className="v3-stats-row">
          <div className="v3-stat-card blue">
            <div className="icon"><FiTarget /></div>
            <div className="content">
               <span className="label">Total Activities</span>
               <span className="value">{actTotal}</span>
            </div>
          </div>
          <div className="v3-stat-card orange">
            <div className="icon"><FiClock /></div>
            <div className="content">
               <span className="label">Pending Follow-ups</span>
               <span className="value">{fuTotal}</span>
            </div>
          </div>
          <div className="v3-stat-card green">
            <div className="icon"><FiCheckCircle /></div>
            <div className="content">
               <span className="label">Success Rate</span>
               <span className="value">84%</span>
            </div>
          </div>
        </div>

        {/* 2. COMMAND BAR */}
        <div className="v3-command-bar premium-glass">
          <div className="search-cluster">
            <ModernSearchBar 
              value={q} 
              onChange={e => { setQ(e.target.value); setActPage(1); setFuPage(1); }} 
              placeholder="Search by lead name, note, or subject..." 
            />
          </div>
          
          <div className="filter-cluster">
            <div className="segmented-select">
              <select 
                className="minimal-select" 
                value={dateRangeType} 
                onChange={(e) => { setDateRangeType(e.target.value); setActPage(1); setFuPage(1); }}
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            {dateRangeType === 'custom' && (
              <div className="custom-date-range animate-slide-in">
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                <span className="to">to</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            )}

            {(q || dateRangeType !== 'all') && (
              <button className="v3-icon-btn reset" onClick={() => { setQ(''); setDateRangeType('all'); setStartDate(''); setEndDate(''); }}>
                <FiRefreshCw />
              </button>
            )}
          </div>
        </div>

        {/* 3. MAIN CONTENT GRID */}
        <div className="v3-grid">
          {/* ACTIVITY HISTORY TABLE */}
          <div className="v3-panel">
            <div className="panel-header">
              <div className="title-cluster">
                <FiActivity className="text-primary" />
                <h3>Lead Activity History</h3>
              </div>
              <div className="filter-group">
                <select className="pill-select" value={actType} onChange={e => { setActType(e.target.value); setActPage(1); }}>
                  <option value="">All Events</option>
                  <option value="call">Calls</option>
                  <option value="Meeting">Meetings</option>
                  <option value="follow-up">Follow-ups</option>
                </select>
                <select className="pill-select" value={actStatus} onChange={e => { setActStatus(e.target.value); setActPage(1); }}>
                  <option value="">Status</option>
                  <option value="completed">Done</option>
                  <option value="planned">Planned</option>
                </select>
              </div>
            </div>

            <div className="panel-body">
               <table className="v3-premium-table">
                 <thead>
                   <tr>
                     <th>Activity</th>
                     <th>Lead Entity</th>
                     <th>Summary</th>
                     <th>Timestamp</th>
                   </tr>
                 </thead>
                 <tbody>
                   {generalActivities.map(a => (
                     <tr key={a.id || a._id}>
                       <td>
                          <span className={`v3-tag ${a.activity_type?.toLowerCase()}`}>
                            {a.activity_type || 'Update'}
                          </span>
                       </td>
                       <td>
                          {a.related_to ? (
                            <Link to={`/leads/${a.related_to.id || a.related_to._id || a.related_to}`} className="v3-link">
                              {a.related_to.name || 'Anonymous Lead'}
                            </Link>
                          ) : <span className="muted">-</span>}
                       </td>
                       <td className="note-cell">{a.description}</td>
                       <td>
                          <div className="v3-date">
                             <span className="main">{new Date(a.activity_date || a.created_at).toLocaleDateString()}</span>
                             <span className="sub">{new Date(a.activity_date || a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                       </td>
                     </tr>
                   ))}
                   {generalActivities.length === 0 && (
                     <tr><td colSpan="4" className="v3-empty">No activity records found.</td></tr>
                   )}
                 </tbody>
               </table>
               
               {actTotal > 5 && (
                 <div className="v3-pagination">
                    <button className="pag-nav" disabled={actPage <= 1} onClick={() => setActPage(p => p - 1)}><FiChevronLeft /></button>
                    <span className="pag-count">{actPage} / {Math.ceil(actTotal / 5)}</span>
                    <button className="pag-nav" disabled={actPage >= Math.ceil(actTotal / 5)} onClick={() => setActPage(p => p + 1)}><FiChevronRight /></button>
                 </div>
               )}
            </div>
          </div>

          {/* FOLLOW-UP HISTORY TABLE */}
          <div className="v3-panel">
            <div className="panel-header">
              <div className="title-cluster">
                <FiClock className="text-warning" />
                <h3>Follow-up Timeline</h3>
              </div>
              <div className="filter-group">
                <select className="pill-select" value={fuMode} onChange={e => { setFuMode(e.target.value); setFuPage(1); }}>
                  <option value="">Modes</option>
                  <option value="Call">Call</option>
                  <option value="Meeting">Meet</option>
                  <option value="WhatsApp">WA</option>
                </select>
              </div>
            </div>

            <div className="panel-body">
               <table className="v3-premium-table">
                 <thead>
                   <tr>
                     <th>Schedule</th>
                     <th>Lead</th>
                     <th>Status</th>
                     <th>Details</th>
                   </tr>
                 </thead>
                 <tbody>
                   {followUps.map(f => (
                     <tr key={f.id || f._id}>
                       <td>
                          <div className="v3-date">
                             <span className="main">{new Date(f.status === 'planned' ? (f.due_date || f.activity_date) : (f.activity_date || f.created_at)).toLocaleDateString()}</span>
                             <span className="sub">{new Date(f.status === 'planned' ? (f.due_date || f.activity_date) : (f.activity_date || f.created_at)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                       </td>
                       <td>
                          {f.related_to ? (
                            <Link to={`/leads/${f.related_to.id || f.related_to._id || f.related_to}`} className="v3-link">
                              {f.related_to.name}
                            </Link>
                          ) : '-'}
                       </td>
                       <td>
                          {(() => {
                            let status = f.status;
                            const overdue = status === 'planned' && f.due_date && new Date(f.due_date) < new Date();
                            return (
                              <span className={`v3-pill ${overdue ? 'overdue' : status}`}>
                                {overdue ? 'Overdue' : status}
                              </span>
                            )
                          })()}
                       </td>
                       <td className="note-cell">{f.description}</td>
                     </tr>
                   ))}
                   {followUps.length === 0 && (
                     <tr><td colSpan="4" className="v3-empty">No follow-ups recorded.</td></tr>
                   )}
                 </tbody>
               </table>
               
               {fuTotal > 5 && (
                 <div className="v3-pagination">
                    <button className="pag-nav" disabled={fuPage <= 1} onClick={() => setFuPage(p => p - 1)}><FiChevronLeft /></button>
                    <span className="pag-count">{fuPage} / {Math.ceil(fuTotal / 5)}</span>
                    <button className="pag-nav" disabled={fuPage >= Math.ceil(fuTotal / 5)} onClick={() => setFuPage(p => p + 1)}><FiChevronRight /></button>
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .followups-module-v3 {
          padding: 32px;
          min-height: 100vh;
          background: var(--bg);
        }
        .v3-container {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 32px;
        }
        
        /* Stats Cards */
        .v3-stats-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
        }
        .v3-stat-card {
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 20px;
          box-shadow: inset 4px 0 0 var(--card-accent), var(--shadow-sm);
          transition: 0.3s;
        }
        .v3-stat-card:hover { transform: translateY(-4px); border-color: var(--primary); box-shadow: inset 4px 0 0 var(--card-accent), var(--shadow-md); }
        .v3-stat-card .icon {
          width: 56px; height: 56px; border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          font-size: 24px;
        }
        .v3-stat-card.blue .icon { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
        .v3-stat-card.orange .icon { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
        .v3-stat-card.green .icon { background: rgba(16, 185, 129, 0.1); color: #10b981; }
        
        .v3-stat-card .content { display: flex; flex-direction: column; }
        .v3-stat-card .label { font-size: 0.8rem; font-weight: 700; color: var(--text-dimmed); text-transform: uppercase; letter-spacing: 0.05em; }
        .v3-stat-card .value { font-size: 1.8rem; font-weight: 800; color: var(--text); }

        /* Command Bar */
        .v3-command-bar {
          padding: 16px 24px;
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          flex-wrap: wrap;
        }
        .premium-glass {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 12px 40px -12px rgba(0,0,0,0.3);
        }
        .search-cluster { flex: 1; min-width: 300px; }
        .filter-cluster { display: flex; align-items: center; gap: 16px; }
        .minimal-select {
          background: transparent; border: 1px solid var(--border);
          color: var(--text); padding: 8px 16px; border-radius: 12px;
          font-weight: 600; font-size: 0.9rem; cursor: pointer; outline: none;
        }
        .v3-icon-btn {
          width: 40px; height: 40px; border-radius: 12px;
          background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border);
          color: var(--text-muted); cursor: pointer; transition: 0.2s;
          display: flex; align-items: center; justify-content: center;
        }
        .v3-icon-btn:hover { background: var(--bg-hover); color: var(--primary); border-color: var(--primary); }

        /* Grid & Panels */
        .v3-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 32px;
        }
        .v3-panel {
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 24px;
          overflow: hidden;
          box-shadow: inset 4px 0 0 var(--card-accent), var(--shadow-sm);
        }
        .panel-header {
          padding: 24px 28px;
          border-bottom: 1px solid var(--border);
          display: flex; align-items: center; justify-content: space-between;
          background: rgba(255, 255, 255, 0.01);
        }
        .title-cluster { display: flex; align-items: center; gap: 16px; }
        .title-cluster h3 { font-size: 1.1rem; font-weight: 800; margin: 0; color: var(--text); }
        .filter-group { display: flex; gap: 12px; }
        .pill-select {
          background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border);
          color: var(--text-muted); padding: 4px 14px; border-radius: 50px;
          font-size: 0.75rem; font-weight: 700; cursor: pointer; outline: none;
        }
        .pill-select:focus { border-color: var(--primary); color: var(--text); }

        /* Premium Table */
        .v3-premium-table { width: 100%; border-collapse: collapse; }
        .v3-premium-table th {
          text-align: left; padding: 16px 28px; font-size: 0.7rem; font-weight: 800;
          color: var(--text-dimmed); text-transform: uppercase; letter-spacing: 0.1em;
          border-bottom: 1px solid var(--border);
        }
        .v3-premium-table td { padding: 20px 28px; border-bottom: 1px solid var(--border); font-size: 0.9rem; }
        .v3-premium-table tr:last-child td { border-bottom: none; }
        .v3-premium-table tr:hover { background: rgba(255, 255, 255, 0.02); }

        .v3-tag {
          padding: 4px 12px; border-radius: 8px; font-size: 0.75rem; font-weight: 800;
          text-transform: capitalize; border: 1px solid transparent;
        }
        .v3-tag.call { background: rgba(59, 130, 246, 0.1); color: #3b82f6; border-color: rgba(59, 130, 246, 0.2); }
        .v3-tag.meeting { background: rgba(245, 158, 11, 0.1); color: #f59e0b; border-color: rgba(245, 158, 11, 0.2); }
        .v3-tag.follow-up { background: rgba(16, 185, 129, 0.1); color: #10b981; border-color: rgba(16, 185, 129, 0.2); }

        .v3-link { color: var(--primary); font-weight: 700; text-decoration: none; }
        .v3-link:hover { text-decoration: underline; }
        .note-cell { color: var(--text-muted); font-size: 0.85rem; line-height: 1.6; max-width: 400px; }

        .v3-date { display: flex; flex-direction: column; gap: 2px; }
        .v3-date .main { font-weight: 700; color: var(--text); }
        .v3-date .sub { font-size: 0.75rem; color: var(--text-dimmed); }

        .v3-pill {
          padding: 4px 12px; border-radius: 50px; font-size: 0.7rem; font-weight: 800;
          text-transform: uppercase; letter-spacing: 0.05em; border: 1px solid transparent;
        }
        .v3-pill.completed { background: rgba(255, 255, 255, 0.05); color: var(--text-dimmed); }
        .v3-pill.planned { background: rgba(59, 130, 246, 0.1); color: #3b82f6; border-color: rgba(59, 130, 246, 0.2); }
        .v3-pill.overdue { background: rgba(239, 68, 68, 0.1); color: #ef4444; border-color: rgba(239, 68, 68, 0.2); animation: v3-pulse 2s infinite; }
        
        @keyframes v3-pulse {
          0% { opacity: 1; }
          50% { opacity: 0.6; }
          100% { opacity: 1; }
        }

        .v3-empty { text-align: center; padding: 60px; color: var(--text-dimmed); font-style: italic; }
        .v3-pagination { display: flex; align-items: center; justify-content: center; gap: 20px; padding: 24px; border-top: 1px solid var(--border); }
        .pag-nav {
          width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--border);
          background: transparent; color: var(--text); cursor: pointer; display: flex; align-items: center; justify-content: center;
        }
        .pag-nav:hover:not(:disabled) { background: var(--primary); border-color: var(--primary); color: white; }
        .pag-nav:disabled { opacity: 0.3; cursor: not-allowed; }
        .pag-count { font-size: 0.85rem; font-weight: 700; color: var(--text-muted); }

        @media (max-width: 900px) {
          .followups-module-v3 { padding: 16px; }
          .v3-command-bar { flex-direction: column; align-items: stretch; }
          .panel-header { flex-direction: column; align-items: flex-start; gap: 16px; }
        }
      `}</style>
    </div>
  )
}
