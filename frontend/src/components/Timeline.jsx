import { useEffect, useState } from 'react'
import { notesApi } from '../services/notes'
import { activitiesApi } from '../services/activities'
import { toast } from 'react-toastify'
import { useToastFeedback } from '../utils/useToastFeedback.js'
import { Icon } from '../layouts/icons.jsx'
import { getSocket } from '../utils/socket'
import { useAuth } from '../context/AuthContext'

export default function Timeline({ relatedId, relatedType, defaultView = 'feed' }) {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [noteText, setNoteText] = useState('')
  const [activityType, setActivityType] = useState('call')
  const [activityDesc, setActivityDesc] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [showActivityForm, setShowActivityForm] = useState(false)
  
  const [filter, setFilter] = useState('all') 
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [viewMode, setViewMode] = useState(defaultView)

  useToastFeedback({ error })

  useEffect(() => {
    const socket = getSocket()
    if (socket && user?.company_id) {
       socket.emit('joinCompany', user.company_id)
       
       socket.on('NEW_ACTIVITY', (data) => {
         if (String(data.related_to) === String(relatedId)) {
           const act = data.activity
           setItems(prev => [
             { ...act, type: 'activity', date: new Date(act.activity_date || act.created_at) },
             ...prev
           ].sort((a, b) => b.date - a.date))
         }
       })
    }
    return () => {
      if (socket) socket.off('NEW_ACTIVITY')
    }
  }, [relatedId, user?.company_id])

  useEffect(() => {
    setPage(1)
    setItems([])
    loadTimeline(1, true)
  }, [relatedId, relatedType, filter])

  async function loadTimeline(pageNum = 1, isInitial = false) {
    if (isInitial) setLoading(true)
    else setLoadingMore(true)
    try {
      const promises = []
      const fetchLimit = 5
      
      if (filter === 'all' || filter === 'note') {
        promises.push(notesApi.list({ related_to: relatedId, related_type: relatedType, page: pageNum, limit: fetchLimit }))
      } else {
        promises.push(Promise.resolve({ items: [] }))
      }

      if (filter === 'all' || filter === 'activity' || filter === 'call' || filter === 'status') {
        const actParams = { related_to: relatedId, related_type: relatedType, page: pageNum, limit: fetchLimit }
        if (filter === 'call') actParams.activity_type = 'call'
        if (filter === 'status') actParams.activity_type = 'Status Changed'
        
        promises.push(activitiesApi.list(actParams))
      } else {
        promises.push(Promise.resolve({ items: [] }))
      }

      const [notesRes, activitiesRes] = await Promise.all(promises)

      const notes = notesRes.items || []
      const activities = activitiesRes.items || []

      const newItems = [
        ...notes.map((n) => ({ ...n, type: 'note', date: new Date(n.created_at) })),
        ...activities.map((a) => ({ ...a, type: 'activity', date: new Date(a.activity_date || a.created_at) })),
      ].sort((a, b) => b.date - a.date)

      if (isInitial) {
        setItems(newItems)
      } else {
        setItems(prev => [...prev, ...newItems].sort((a, b) => b.date - a.date))
      }

      setHasMore(notes.length === fetchLimit || activities.length === fetchLimit)
    } catch (err) {
      setError('Failed to load timeline')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  function handleLoadMore() {
    const next = page + 1
    setPage(next)
    loadTimeline(next)
  }

  async function handleAddNote(e) {
    e.preventDefault()
    if (!noteText.trim()) return
    try {
      await notesApi.create({
        note: noteText,
        related_to: relatedId,
        related_type: relatedType,
      })
      toast.success('Note added')
      setNoteText('')
      setPage(1)
      loadTimeline(1, true)
    } catch (err) {
      toast.error('Failed to add note')
    }
  }

  async function handleAddActivity(e) {
    e.preventDefault()
    if (!activityDesc.trim()) return
    try {
      await activitiesApi.create({
        activity_type: activityType,
        description: activityDesc,
        due_date: dueDate || undefined,
        status: dueDate ? 'planned' : 'completed',
        related_to: relatedId,
        related_type: relatedType,
        category: 'manual',
        color_code: activityType === 'call' ? 'blue' : 'gray'
      })
      toast.success(`${activityType.charAt(0).toUpperCase() + activityType.slice(1)} logged`)
      setActivityDesc('')
      setDueDate('')
      setShowActivityForm(false)
      setPage(1)
      loadTimeline(1, true)
    } catch (err) {
      toast.error('Failed to add activity')
    }
  }

  const cleanDescription = (desc) => {
    if (!desc) return '';
    if (desc.includes('[Follow-up]') && desc.includes('Note:')) {
      return desc.split('Note:')[1].trim();
    }
    return desc;
  };

  return (
    <div className="timeline-orchestrator-wrap">
      <div className="orchestrator-header">
        <div className="header-title-wrap">
          <Icon name="reports" />
          <h3>Activity Hub</h3>
        </div>
        <div className="header-actions-row">
          <div className="view-mode-toggle">
            <button className={viewMode === 'feed' ? 'active' : ''} onClick={() => setViewMode('feed')}>
              <Icon name="dashboard" size={14} />
              <span>Feed</span>
            </button>
            <button className={viewMode === 'table' ? 'active' : ''} onClick={() => setViewMode('table')}>
              <Icon name="reports" size={14} />
              <span>Table</span>
            </button>
          </div>
          <div className="filter-segmented-control">
             <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All</button>
             <button className={filter === 'note' ? 'active' : ''} onClick={() => setFilter('note')}>Notes</button>
             <button className={filter === 'call' ? 'active' : ''} onClick={() => setFilter('call')}>Calls</button>
             <button className={filter === 'status' ? 'active' : ''} onClick={() => setFilter('status')}>Changes</button>
          </div>
          <button 
            className={`btn-premium ${showActivityForm ? 'action-secondary' : 'action-vibrant'}`} 
            onClick={() => setShowActivityForm(!showActivityForm)}
          >
            <Icon name={showActivityForm ? 'close' : 'plus'} />
            <span>Log Activity</span>
          </button>
        </div>
      </div>

      {showActivityForm && (
        <form className="glass-form-card animate-slide-down" onSubmit={handleAddActivity}>
          <div className="form-grid-modern">
            <div className="input-group-premium">
              <label>Interaction Type</label>
              <div className="select-wrap-premium">
                <select value={activityType} onChange={(e) => setActivityType(e.target.value)}>
                  <option value="call">📞 Phone Call</option>
                  <option value="meeting">🤝 Meeting</option>
                  <option value="email">📧 Email</option>
                  <option value="task">✅ Task</option>
                </select>
              </div>
            </div>
            <div className="input-group-premium grow">
              <label>Outcome / Notes</label>
              <input
                value={activityDesc}
                onChange={(e) => setActivityDesc(e.target.value)}
                placeholder="What happened?..."
              />
            </div>
            <div className="input-group-premium">
              <label>Schedule Next</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          <div className="form-footer-premium">
             <button className="btn-premium action-primary">Publish Activity</button>
          </div>
        </form>
      )}

      {error && <div className="alert glass-alert error">{error}</div>}

      {loading ? (
        <div className="timeline-loading">
          <div className="spinner-small" />
          <span>Syncing history...</span>
        </div>
      ) : (
        <div className="activity-content-area">
          {viewMode === 'feed' ? (
            <div className="activity-visual-timeline">
              {items.map((item) => {
                const isNote = item.type === 'note';
                const iconMap = { call: '📞', meeting: '🤝', email: '📧', task: '✅', 'follow-up': '🔁' };
                const outcomeColor = item.status_after_call === 'Converted' || item.status_after_call === 'Interested' ? '🟢' : '🔴';
                const content = cleanDescription(isNote ? item.note : item.description);

                return (
                  <div key={item.id} className={`timeline-moment-card ${item.type}`}>
                    <div className="moment-marker-hex">
                      <span className="moment-icon">{isNote ? '📝' : (iconMap[item.activity_type] || '📅')}</span>
                    </div>
                    <div className="moment-content-glass">
                      <div className="moment-meta">
                        <div className="moment-tag-wrap">
                          <span className={`moment-badge ${item.category || (isNote ? 'manual' : 'system')}`}>
                            {item.category === 'system' ? 'AUTO' : 'USER'}
                          </span>
                          <span className={`moment-category color-${item.color_code || 'gray'}`}>
                            {isNote ? 'NOTE' : item.activity_type.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="moment-body-structured">
                        <div className="moment-user-row">
                          <span className="user-avatar-mini">{item.created_by?.name?.charAt(0) || 'S'}</span>
                          <span className="user-name">{item.created_by?.name || 'System'}</span>
                        </div>
                        <div className="moment-main-activity">
                          <span className="activity-label">
                             {isNote ? 'Strategist Insight' : `${item.activity_type.charAt(0).toUpperCase() + item.activity_type.slice(1)} Recorded`}
                          </span>
                        </div>
                        {item.status_after_call && (
                          <div className="moment-outcome-row">
                            <span className="outcome-label">OUTCOME:</span>
                            <span className="outcome-val">{outcomeColor} {item.status_after_call}</span>
                          </div>
                        )}
                        {content && (
                          <div className="moment-note-bubble">
                            <span className="note-text">"{content}"</span>
                          </div>
                        )}
                        {item.due_date && (
                          <div className="moment-schedule-row">
                            <div className="schedule-item">
                              <Icon name="dashboard" />
                              <span className="val">Next: {new Date(item.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                            </div>
                            <span className="schedule-sep">|</span>
                            <div className="schedule-item">
                              <Icon name="reports" />
                              <span className="val">{new Date(item.due_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        )}
                        {!item.due_date && (
                          <div className="moment-time-row">
                            <Icon name="plus" />
                            <span className="val">{new Date(item.date).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="activity-table-container animate-slide-down">
              <table className="premium-activity-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Staff</th>
                    <th>Outcome / Note</th>
                    <th>Next Schedule</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const isNote = item.type === 'note';
                    const iconMap = { call: '📞', meeting: '🤝', email: '📧', task: '✅', 'follow-up': '🔁' };
                    const content = cleanDescription(isNote ? item.note : item.description);
                    const outcomeColorClass = item.status_after_call === 'Converted' || item.status_after_call === 'Interested' ? 'success' : 'danger';
                    
                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="cell-date">
                            <strong>{new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</strong>
                            <span className="muted">{new Date(item.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </td>
                        <td>
                          <div className="cell-type">
                            <span>{isNote ? '📝' : (iconMap[item.activity_type] || '📅')}</span>
                            <span className="type-label">{isNote ? 'Note' : item.activity_type}</span>
                          </div>
                        </td>
                        <td>
                          <div className="cell-staff">
                            <div className="avatar-xs">{item.created_by?.name?.charAt(0) || 'S'}</div>
                            <span>{item.created_by?.name || 'System'}</span>
                          </div>
                        </td>
                        <td>
                          <div className="cell-content">
                            {item.status_after_call && (
                              <span className={`outcome-badge ${outcomeColorClass}`}>{item.status_after_call}</span>
                            )}
                            <p className="note-text-row">{content || '—'}</p>
                          </div>
                        </td>
                        <td>
                          {item.due_date ? (
                            <div className="cell-next">
                              <Icon name="bell" size={12} />
                              <span>{new Date(item.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                            </div>
                          ) : <span className="muted">None</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!items.length && (
            <div className="timeline-empty-state">
              <Icon name="search" />
              <p>No historical interactions recorded for this filter.</p>
            </div>
          )}

          {hasMore && (
            <div className="load-more-wrap">
               <button className="crm-btn-premium glass load-more-btn" onClick={handleLoadMore} disabled={loadingMore}>
                 {loadingMore ? <div className="spinner-mini" /> : <Icon name="plus" />}
                 <span>{loadingMore ? 'Fetching...' : 'Load Older History'}</span>
               </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        .timeline-orchestrator-wrap { position: relative; }
        .orchestrator-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; gap: 20px; flex-wrap: wrap; border-bottom: 1px solid var(--border); padding-bottom: 16px; }
        .header-title-wrap { display: flex; align-items: center; gap: 12px; }
        .header-title-wrap h3 { margin: 0; font-size: 1.15rem; font-weight: 800; color: white; letter-spacing: -0.02em; }
        .header-title-wrap svg { color: var(--primary); width: 20px; height: 20px; }
        .header-actions-row { display: flex; align-items: center; gap: 16px; }

        .view-mode-toggle { display: flex; background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 12px; padding: 3px; }
        .view-mode-toggle button { background: transparent; border: none; color: var(--text-dimmed); padding: 8px 14px; border-radius: 9px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 0.75rem; font-weight: 800; transition: 0.2s; }
        .view-mode-toggle button.active { background: var(--primary); color: white; box-shadow: 0 4px 10px var(--primary-soft); }
        .view-mode-toggle button:hover:not(.active) { color: white; background: rgba(255,255,255,0.05); }

        .filter-segmented-control { display: flex; background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 12px; padding: 3px; }
        .filter-segmented-control button { background: transparent; border: none; color: var(--text-muted); font-size: 0.72rem; font-weight: 800; padding: 8px 12px; border-radius: 9px; cursor: pointer; transition: 0.2s; }
        .filter-segmented-control button.active { background: rgba(255,255,255,0.1); color: var(--primary); }

        .activity-table-container { background: rgba(255,255,255,0.01); border: 1px solid var(--border); border-radius: 20px; overflow: hidden; margin-top: 24px; }
        .premium-activity-table { width: 100%; border-collapse: collapse; }
        .premium-activity-table th { text-align: left; padding: 16px 20px; background: rgba(255,255,255,0.03); font-size: 0.65rem; font-weight: 900; color: var(--text-dimmed); text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid var(--border); }
        .premium-activity-table td { padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.03); vertical-align: middle; }
        
        .cell-date { display: flex; flex-direction: column; gap: 4px; }
        .cell-date strong { font-size: 0.9rem; color: white; font-weight: 800; }
        .cell-date .muted { font-size: 0.7rem; color: var(--text-dimmed); }

        .cell-type { display: flex; align-items: center; gap: 10px; }
        .cell-type span { font-size: 1.1rem; }
        .type-label { font-size: 0.85rem; font-weight: 700; color: white; text-transform: capitalize; }

        .cell-staff { display: flex; align-items: center; gap: 10px; }
        .avatar-xs { width: 24px; height: 24px; background: var(--primary-soft); color: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 900; }
        .cell-staff span { font-size: 0.85rem; font-weight: 600; color: var(--text-muted); }

        .cell-content { display: flex; flex-direction: column; gap: 8px; }
        .outcome-badge { display: inline-flex; width: fit-content; padding: 4px 10px; border-radius: 6px; font-size: 0.6rem; font-weight: 900; text-transform: uppercase; }
        .outcome-badge.success { background: rgba(16, 185, 129, 0.1); color: #10b981; }
        .outcome-badge.danger { background: rgba(239, 68, 68, 0.1); color: #f87171; }
        .note-text-row { margin: 0; font-size: 0.9rem; color: var(--text-muted); font-style: italic; opacity: 0.8; }

        .cell-next { display: flex; align-items: center; gap: 8px; color: #fbbf24; font-weight: 800; font-size: 0.8rem; }

        .activity-visual-timeline { position: relative; padding-left: 44px; margin-top: 24px; }
        .activity-visual-timeline::before { content: ''; position: absolute; left: 21px; top: 0; bottom: 0; width: 2px; background: var(--border); opacity: 0.5; }
        
        .timeline-moment-card { position: relative; margin-bottom: 40px; }
        .moment-marker-hex { position: absolute; left: -36px; top: 0; width: 26px; height: 26px; background: var(--bg-surface); border: 2px solid var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; z-index: 1; box-shadow: 0 0 0 4px var(--bg); transition: all 0.3s ease; }
        .timeline-moment-card:hover .moment-marker-hex { transform: scale(1.2); background: var(--primary); }
        .moment-marker-hex .moment-icon { font-size: 0.8rem; }
        
        .moment-content-glass { background: var(--bg-card); border: 1px solid var(--border); border-radius: 24px; padding: 24px; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: var(--shadow-sm); position: relative; }
        .timeline-moment-card:hover .moment-content-glass { border-color: var(--primary); transform: translateX(8px); box-shadow: var(--shadow-lg); }
        
        .moment-meta { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .moment-badge { font-size: 0.55rem; font-weight: 900; padding: 4px 8px; border-radius: 6px; letter-spacing: 0.08em; text-transform: uppercase; }
        .moment-badge.system { background: var(--primary-soft); color: var(--primary); }
        .moment-badge.manual { background: rgba(167, 139, 250, 0.1); color: #a78bfa; }

        .moment-category { font-size: 0.7rem; font-weight: 900; letter-spacing: 0.12em; color: var(--text-dimmed); }
        .moment-category.color-green { color: var(--success); }
        .moment-category.color-yellow { color: var(--warning); }
        .moment-category.color-blue { color: var(--primary); }

        .moment-body-structured { display: flex; flex-direction: column; gap: 14px; }
        
        .moment-user-row { display: flex; align-items: center; gap: 12px; }
        .user-avatar-mini { width: 24px; height: 24px; background: var(--primary); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 900; }
        .user-name { font-size: 1rem; font-weight: 800; color: var(--text); }
        
        .moment-main-activity { display: flex; align-items: center; gap: 12px; }
        .activity-icon-bubble { width: 32px; height: 32px; background: var(--bg-surface); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1rem; }
        .activity-label { font-size: 0.95rem; font-weight: 800; color: var(--text-muted); }

        .moment-outcome-row { display: flex; align-items: center; gap: 10px; margin-left: 44px; padding: 4px 0; }
        .outcome-label { color: var(--text-dimmed); font-size: 0.7rem; font-weight: 900; letter-spacing: 0.05em; }
        .outcome-val { color: var(--text); font-size: 0.95rem; font-weight: 800; display: flex; align-items: center; gap: 8px; }

        .moment-note-bubble { background: var(--bg-surface); padding: 16px 20px; border-radius: 18px; border: 1px solid var(--border); margin-left: 44px; position: relative; max-width: 90%; }
        .note-text { font-size: 0.95rem; color: var(--text-muted); line-height: 1.6; font-style: italic; font-weight: 500; }

        .moment-schedule-row { display: flex; align-items: center; gap: 20px; background: var(--primary-soft); padding: 12px 20px; border-radius: 16px; border: 1px solid var(--primary-soft); margin-top: 8px; }
        .schedule-item { display: flex; align-items: center; gap: 10px; }
        .schedule-item svg { width: 16px; height: 16px; color: var(--primary); }
        .schedule-item .val { font-size: 0.88rem; font-weight: 800; color: var(--primary); }
        .schedule-sep { color: var(--primary); opacity: 0.2; font-weight: 300; font-size: 1.2rem; }

        .moment-time-row { display: flex; align-items: center; gap: 10px; opacity: 0.6; font-size: 0.78rem; margin-top: 6px; color: var(--text-dimmed); margin-left: 44px; font-weight: 700; }
        .moment-time-row svg { width: 14px; height: 14px; }

        .load-more-btn { min-width: 220px; margin: 20px auto; display: flex; justify-content: center; }

        .btn-premium.action-primary { background: var(--primary); color: white; }
        .btn-premium.action-vibrant { background: var(--primary); color: white; box-shadow: 0 4px 14px 0 var(--primary-soft); }
        
        .timeline-loading, .timeline-empty-state { padding: 80px 20px; color: var(--text-dimmed); text-align: center; }
        .animate-slide-down { animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes slideDown { from { transform: translateY(-16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  )
}
