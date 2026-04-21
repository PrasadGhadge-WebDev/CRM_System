import { useEffect, useState } from 'react'
import { notesApi } from '../services/notes'
import { activitiesApi } from '../services/activities'
import { toast } from 'react-toastify'
import { useToastFeedback } from '../utils/useToastFeedback.js'
import { Icon } from '../layouts/icons.jsx'

export default function Timeline({ relatedId, relatedType }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [noteText, setNoteText] = useState('')
  const [activityType, setActivityType] = useState('call')
  const [activityDesc, setActivityDesc] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [showActivityForm, setShowActivityForm] = useState(false)
  useToastFeedback({ error })

  useEffect(() => {
    loadTimeline()
  }, [relatedId, relatedType])

  async function loadTimeline() {
    setLoading(true)
    try {
      const [notesRes, activitiesRes] = await Promise.all([
        notesApi.list({ related_to: relatedId, related_type: relatedType }),
        activitiesApi.list({ related_to: relatedId, related_type: relatedType }),
      ])

      const notes = notesRes.items || []
      const activities = activitiesRes.items || []

      const combined = [
        ...notes.map((n) => ({ ...n, type: 'note', date: new Date(n.created_at) })),
        ...activities.map((a) => ({ ...a, type: 'activity', date: new Date(a.activity_date) })),
      ].sort((a, b) => b.date - a.date)

      setItems(combined)
    } catch (err) {
      setError('Failed to load timeline')
    } finally {
      setLoading(false)
    }
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
      loadTimeline()
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
      })
      toast.success(`${activityType.charAt(0).toUpperCase() + activityType.slice(1)} logged`)
      setActivityDesc('')
      setDueDate('')
      setShowActivityForm(false)
      loadTimeline()
    } catch (err) {
      toast.error('Failed to add activity')
    }
  }

  return (
    <div className="timeline-orchestrator-wrap">
      <div className="orchestrator-header">
        <div className="header-title-wrap">
          <Icon name="reports" />
          <h3>Activity Intelligence & Timeline</h3>
        </div>
        <button 
          className={`btn-premium ${showActivityForm ? 'action-secondary' : 'action-vibrant'}`} 
          onClick={() => setShowActivityForm(!showActivityForm)}
        >
          <Icon name={showActivityForm ? 'close' : 'plus'} />
          <span>{showActivityForm ? 'Cancel Entry' : 'Log New Activity'}</span>
        </button>
      </div>

      {showActivityForm && (
        <form className="glass-form-card animate-slide-down" onSubmit={handleAddActivity}>
          <div className="form-grid-modern">
            <div className="input-group-premium">
              <label>Interaction Type</label>
              <div className="select-wrap-premium">
                <select value={activityType} onChange={(e) => setActivityType(e.target.value)}>
                  <option value="call">📞 Phone Call</option>
                  <option value="meeting">🤝 Face-to-Face Meeting</option>
                  <option value="email">📧 Email Correspondence</option>
                  <option value="task">✅ Task/Follow-up</option>
                </select>
              </div>
            </div>
            <div className="input-group-premium grow">
              <label>Activity Summary</label>
              <input
                value={activityDesc}
                onChange={(e) => setActivityDesc(e.target.value)}
                placeholder="Briefly describe the outcome..."
              />
            </div>
            <div className="input-group-premium">
              <label>Execution Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          <div className="form-footer-premium">
             <button className="btn-premium action-primary">Publish Activity Record</button>
          </div>
        </form>
      )}

      <div className="quick-note-integrated">
        <Icon name="notes" className="note-icon-dimmed" />
        <form className="note-form-row" onSubmit={handleAddNote}>
          <input
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Drop a quick strategic note..."
          />
          <button className="btn-minimal-vibrant">Save Note</button>
        </form>
      </div>

      {error && <div className="alert glass-alert error">{error}</div>}

      {loading ? (
        <div className="timeline-loading">
          <div className="spinner-small" />
          <span>Synchronizing history...</span>
        </div>
      ) : (
        <div className="activity-visual-timeline">
          {items.map((item) => {
            const isNote = item.type === 'note';
            const iconMap = {
              call: '📞',
              meeting: '🤝',
              email: '📧',
              task: '✅'
            };
            
            return (
              <div key={item.id} className={`timeline-moment-card ${item.type}`}>
                 <div className="moment-marker-hex">
                    <span className="moment-icon">{isNote ? '📝' : (iconMap[item.activity_type] || '📅')}</span>
                 </div>
                 <div className="moment-content-glass">
                   <div className="moment-meta">
                     <span className="moment-category">
                       {isNote ? 'INTERNAL NOTE' : item.activity_type.toUpperCase()}
                     </span>
                     <span className="moment-timestamp">{item.date.toLocaleString()}</span>
                   </div>
                   <div className="moment-body">
                     {isNote ? item.note : item.description}
                   </div>
                   {item.due_date && (
                     <div className="moment-attachment-chip">
                       <Icon name="dashboard" />
                       <span>Target Completion: {new Date(item.due_date).toLocaleDateString()}</span>
                     </div>
                   )}
                 </div>
              </div>
            );
          })}
          {!items.length && (
            <div className="timeline-empty-state">
              <Icon name="search" />
              <p>No historical interactions recorded for this entity.</p>
            </div>
          )}
        </div>
      )}

      <style>{`
        .timeline-orchestrator-wrap { position: relative; }
        .orchestrator-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
        .header-title-wrap { display: flex; align-items: center; gap: 12px; }
        .header-title-wrap h3 { margin: 0; font-size: 1.1rem; font-weight: 800; color: white; }
        .header-title-wrap svg { color: var(--primary); }

        .glass-form-card { background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border); border-radius: 20px; padding: 24px; margin-bottom: 24px; box-shadow: var(--shadow-lg); backdrop-filter: blur(10px); }
        .form-grid-modern { display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 20px; }
        .input-group-premium { display: flex; flex-direction: column; gap: 8px; flex: 1; min-width: 200px; }
        .input-group-premium.grow { flex: 2; }
        .input-group-premium label { font-size: 0.72rem; font-weight: 800; color: var(--text-dimmed); text-transform: uppercase; letter-spacing: 0.05em; }
        .input-group-premium input, .select-wrap-premium select { background: rgba(0,0,0,0.2); border: 1px solid var(--border); border-radius: 12px; padding: 12px 16px; color: white; font-size: 0.95rem; outline: none; transition: all 0.2s ease; }
        .input-group-premium input:focus, .select-wrap-premium select:focus { border-color: var(--primary); background: rgba(0,0,0,0.3); }
        .select-wrap-premium select { width: 100%; cursor: pointer; appearance: none; }
        
        .quick-note-integrated { display: flex; align-items: center; gap: 16px; background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: 16px; padding: 8px 16px; margin-bottom: 32px; box-shadow: var(--shadow-sm); }
        .note-icon-dimmed { color: var(--text-dimmed); opacity: 0.5; }
        .note-form-row { display: flex; align-items: center; gap: 12px; flex: 1; }
        .note-form-row input { background: transparent; border: none; font-size: 0.95rem; color: white; flex: 1; outline: none; }
        .btn-minimal-vibrant { background: var(--primary-soft); color: var(--primary); border: 1px solid var(--primary-2); padding: 6px 14px; border-radius: 10px; font-weight: 800; font-size: 0.75rem; cursor: pointer; transition: all 0.2s ease; }
        .btn-minimal-vibrant:hover { background: var(--primary); color: white; }

        .activity-visual-timeline { position: relative; padding-left: 32px; }
        .activity-visual-timeline::before { content: ''; position: absolute; left: 15px; top: 0; bottom: 0; width: 2px; background: linear-gradient(to bottom, var(--primary), transparent); opacity: 0.3; }
        
        .timeline-moment-card { position: relative; margin-bottom: 32px; }
        .moment-marker-hex { position: absolute; left: -47px; top: 0; width: 32px; height: 32px; background: var(--bg-surface); border: 2px solid var(--border); border-radius: 10px; display: flex; align-items: center; justify-content: center; z-index: 1; box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
        .moment-content-glass { background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border); border-radius: 20px; padding: 20px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .timeline-moment-card:hover .moment-content-glass { background: rgba(255, 255, 255, 0.04); border-color: rgba(59, 130, 246, 0.3); transform: translateX(5px); }
        
        .moment-meta { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .moment-category { font-size: 0.68rem; font-weight: 900; color: var(--primary); letter-spacing: 0.1em; }
        .moment-timestamp { font-size: 0.72rem; color: var(--text-dimmed); font-weight: 600; }
        .moment-body { font-size: 0.98rem; line-height: 1.6; color: var(--text-muted); white-space: pre-wrap; }
        
        .moment-attachment-chip { display: inline-flex; align-items: center; gap: 8px; background: rgba(14, 165, 233, 0.1); border: 1px solid rgba(14, 165, 233, 0.2); border-radius: 8px; padding: 6px 12px; margin-top: 14px; font-size: 0.75rem; font-weight: 700; color: #38bdf8; }
        .moment-attachment-chip svg { width: 14px; height: 14px; }

        .btn-premium.action-primary { background: var(--primary); color: white; }
        .btn-premium.action-secondary { background: rgba(255, 255, 255, 0.1); color: var(--text); border-color: var(--border); }
        
        .timeline-loading, .timeline-empty-state { padding: 60px 20px; display: flex; flex-direction: column; align-items: center; gap: 16px; color: var(--text-dimmed); text-align: center; }
        .animate-slide-down { animation: slideDown 0.3s ease-out; }
        @keyframes slideDown { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  )
}
