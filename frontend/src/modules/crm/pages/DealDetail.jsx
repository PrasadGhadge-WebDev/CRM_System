import { useEffect, useState, useCallback } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { dealsApi } from '../../../services/deals'
import { Icon } from '../../../layouts/icons.jsx'
import Timeline from '../../../components/Timeline.jsx'
import AttachmentManager from '../../../components/AttachmentManager.jsx'
import PageHeader from '../../../components/PageHeader.jsx'
import InteractionLogger from '../../../components/InteractionLogger.jsx'
import { useAuth } from '../../../context/AuthContext'
import { useToastFeedback } from '../../../utils/useToastFeedback.js'

export default function DealDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user } = useAuth()
  const [deal, setDeal] = useState(null)
  const isManagement = user?.role === 'Admin' || user?.role === 'Manager'
  const isAssigned = deal && String(deal.assigned_to?.id || deal.assigned_to) === String(user?.id)
  const canEdit = isManagement || isAssigned
  const canDelete = isManagement
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isEditingValue, setIsEditingValue] = useState(false)
  const [newValue, setNewValue] = useState('')
  useToastFeedback({ error })

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [dealData, historyData] = await Promise.all([
        dealsApi.get(id),
        dealsApi.getHistory(id)
      ])
      setDeal(dealData)
      setHistory(historyData.items || historyData || [])
    } catch {
      setError('Failed to load deal details')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function updateStatus(newStage) {
    try {
      await dealsApi.update(id, { stage: newStage })
      toast.success(`Deal marked as ${newStage}`)
      loadData()
    } catch {
      toast.error('Failed to update stage')
    }
  }

  async function handleValueUpdate() {
    try {
      if (isNaN(newValue) || newValue === '') return
      await dealsApi.update(id, { value: Number(newValue) })
      toast.success('Deal value updated')
      setIsEditingValue(false)
      loadData()
    } catch {
      toast.error('Failed to update value')
    }
  }


  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to move this deal to trash?')) return
    try {
      await dealsApi.remove(id)
      toast.success('Deal moved to trash')
      navigate('/deals')
    } catch {
      toast.error('Failed to delete deal')
    }
  }

  if (loading) return <div className="muted">Loading...</div>
  if (error) return <div className="alert error">{error}</div>
  if (!deal) return <div className="muted">Deal not found.</div>

  return (
    <div className="stack gap-24">
      <PageHeader
        title="Revenue Pipeline"
        backTo="/deals"
        actions={
          <div className="action-group">
            {canEdit && (
              <Link className="btn-premium action-secondary" to={`/deals/${id}/edit`}>
                <Icon name="edit" />
                <span>Edit Opportunity</span>
              </Link>
            )}
            {canDelete && (
              <button className="btn-premium action-danger" onClick={handleDelete}>
                <Icon name="trash" />
                <span>Archive Deal</span>
              </button>
            )}
          </div>
        }
      />

      <section className="user-hero-shell">
        <div className="hero-glow hero-glow-a" />
        <div className="hero-glow hero-glow-b" />

        <div className="hero-topline">
          <span className={`status-pill badge-${(deal.stage || 'New').toLowerCase()}`}>
            {deal.stage || 'New'}
          </span>
          <span className="hero-meta-chip">Deal ID: {id.slice(-6).toUpperCase()}</span>
          <span className="hero-meta-chip">Priority: {deal.priority || 'Medium'}</span>
        </div>

        <div className="hero-main-row">
          <div className="hero-avatar-modern" aria-hidden="true" style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)' }}>
            <Icon name="deals" size={32} />
          </div>

          <div className="hero-copy">
            <h1 className="hero-name-modern">{deal.name || 'Unnamed Deal'}</h1>
            <div className="hero-subline">
              <div className="hero-subline-item">
                <Icon name="user" />
                <span style={{ cursor: 'pointer' }} onClick={() => navigate(`/customers/${deal.customer_id?._id || deal.customer_id?.id}`)}>
                  {deal.customer_id?.name || 'Loading customer...'}
                </span>
              </div>
              <div className="hero-divider" />
              <div className="hero-subline-item">
                <Icon name="calendar" />
                <span>Exp. Close: {deal.expected_close_date ? new Date(deal.expected_close_date).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div className="hero-divider" />
              <div className="hero-subline-item">
                <Icon name="user" />
                <span>Owner: {deal.assigned_to?.name || 'Unassigned'}</span>
              </div>
            </div>
          </div>

          <div className="hero-side-stack">
            <div className="hero-stat-card">
              <span className="hero-stat-label">Deal Value</span>
              <span className="hero-stat-value">₹{(deal.value || 0).toLocaleString()}</span>
            </div>
            <div className="hero-stat-card">
              <span className="hero-stat-label">Lifecycle Status</span>
              <span className="hero-stat-value uppercase">{deal.lifecycle_status || 'Active'}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="pipeline-stepper card glass-panel padding24" style={{ borderRadius: '24px' }}>
        <div className="row justify-between align-center margin-bottom-20">
          <h4 className="muted uppercase tracking-widest small margin0 font-bold">Sales Progress Path</h4>
          <div className="extra-small muted">Click node to advance stage</div>
        </div>
         <div className="stepper-track row justify-between gap-10">
            {['New', 'Contacted', 'Negotiation', 'Won', 'Lost'].map((stageName, idx) => {
               const isActive = deal.stage === stageName;
               const isCompleted = ['Won', 'Lost'].includes(deal.stage) ? 
                   (['Won','Lost'].indexOf(deal.stage) >= idx || ['New','Contacted','Negotiation'].includes(stageName)) :
                   (['New','Contacted','Negotiation','Won','Lost'].indexOf(deal.stage) >= idx);
               
               const terminal = ['Won', 'Lost'].includes(stageName);

               return (
                  <div 
                    key={stageName} 
                    className={`stepper-item stack align-center flex-1 ${isActive ? 'active' : ''} ${isCompleted && !isActive ? 'completed' : ''}`}
                    onClick={() => updateStatus(stageName)}
                    style={{ cursor: 'pointer' }}
                  >
                     <div className="stepper-node">
                        {stageName === 'Won' ? <Icon name="check" /> : stageName === 'Lost' ? <Icon name="x" /> : idx + 1}
                     </div>
                     <span className="stepper-label">{stageName}</span>
                  </div>
               )
            })}
         </div>
      </section>

      <div className="hero-stats-row">
        <div className="stat-panel success">
          <div className="icon-wrap"><Icon name="deals" /></div>
          <div className="stat-content">
            <div className="label">Amount (₹)</div>
            {isEditingValue ? (
              <div className="row gap4 center" style={{ marginTop: '5px' }}>
                <input 
                  type="number" 
                  className="input-minimal" 
                  autoFocus
                  style={{ width: '100px', padding: '4px 8px', borderRadius: '4px' }}
                  value={newValue}
                  onChange={e => setNewValue(e.target.value)}
                />
                <button className="btn-icon small success" onClick={handleValueUpdate}><Icon name="check" /></button>
                <button className="btn-icon small muted" onClick={() => setIsEditingValue(false)}><Icon name="x" /></button>
              </div>
            ) : (
              <div className="value row center gap8">
                <span>{deal.currency} {deal.value?.toLocaleString()}</span>
                <button 
                  className="btn-ghost small" 
                  onClick={() => {
                    setNewValue(deal.value)
                    setIsEditingValue(true)
                  }}
                  title="Discuss Price"
                >
                  <Icon name="edit" />
                </button>
              </div>
            )}
          </div>

        </div>
        <div className="stat-panel primary">
          <div className="icon-wrap"><Icon name="check" /></div>
          <div className="stat-content">
            <div className="label">Current Stage</div>
            <div className="value" style={{ fontSize: '20px' }}><span className={`status-badge ${(deal.stage || 'New').toLowerCase().replace(' ', '-')}`}>{deal.stage || 'New'}</span></div>
          </div>
        </div>
        <div className="stat-panel warning">
          <div className="icon-wrap"><Icon name="users" /></div>
          <div className="stat-content">
            <div className="label">Assigned To</div>
            <div className="value" style={{ fontSize: '18px' }}>{deal.assigned_to?.name || 'Unassigned'}</div>
          </div>
        </div>
      </div>

      <div className="grid2">
        <div className="card glass-panel stack" style={{ padding: '24px' }}>
          <h4 className="muted uppercase tracking-widest small">Deal Information</h4>
          <div className="kv" style={{ marginTop: 15 }}>
            <div className="k">Customer</div>
            <div className="v">
              {deal.customer_id?.name ? (
                  <Link to={`/customers/${deal.customer_id.id}`} className="link" style={{ fontSize: '16px', fontWeight: '600' }}>{deal.customer_id.name}</Link>
              ) : '-'}
            </div>
          </div>
          <div className="kv">
            <div className="k">Expected Close</div>
            <div className="v">{deal.expected_close_date ? new Date(deal.expected_close_date).toLocaleDateString('en-GB') : '-'}</div>
          </div>
          {deal.description && (
            <div className="kv" style={{ marginTop: 15 }}>
              <div className="k">Notes</div>
              <div className="v" style={{ whiteSpace: 'pre-wrap', background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px' }}>{deal.description}</div>
            </div>
          )}
        </div>

        <div className="card glass-panel stack" style={{ padding: '24px' }}>
           <h4 className="muted uppercase tracking-widest small">Log Interaction</h4>
           <div style={{ marginTop: 15 }}>
              <InteractionLogger 
                relatedId={id} 
                relatedType="Deal" 
                onNoteAdded={() => loadData()}
              />
           </div>
        </div>
      </div>

      <Timeline relatedId={id} relatedType="Deal" />
      
      <div className="card glass-panel stack" style={{ padding: '24px' }}>
        <h4 className="muted uppercase tracking-widest small">Audit Log</h4>
        <div className="tableWrap" style={{ marginTop: 15 }}>
          <table className="table premium-table small">
            <thead>
              <tr>
                <th>Date</th>
                <th>User</th>
                <th>Action</th>
                <th>Field</th>
                <th>Old Value</th>
                <th>New Value</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td>{new Date(h.created_at).toLocaleString()}</td>
                  <td>{h.user_id?.name || 'System'}</td>
                  <td>{h.action}</td>
                  <td>{h.field || '-'}</td>
                  <td>{String(h.old_value || '-')}</td>
                  <td>{String(h.new_value || '-')}</td>
                </tr>
              ))}
              {!history.length && (
                <tr><td colSpan="6" className="muted center padding">No history found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AttachmentManager relatedId={id} relatedType="Deal" />
      
      <style>{`
        .context-note-bubble { background: rgba(15, 23, 42, 0.4); padding: 16px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); font-size: 0.92rem; line-height: 1.6; color: var(--text-muted); font-style: italic; }
        
        .pipeline-stepper { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); }
        .stepper-track { position: relative; margin: 20px 0; }
        .stepper-track::after { content: ''; position: absolute; top: 15px; left: 0; right: 0; height: 2px; background: rgba(255,255,255,0.1); z-index: 0; }
        .stepper-item { position: relative; z-index: 1; transition: all 0.3s ease; }
        .stepper-node { width: 32px; height: 32px; border-radius: 50%; background: #1e293b; border: 2px solid rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; color: var(--text-muted); margin-bottom: 8px; transition: all 0.3s ease; }
        .stepper-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); font-weight: 600; }
        
        .stepper-item.active .stepper-node { border-color: var(--primary); color: var(--primary); box-shadow: 0 0 15px rgba(37, 99, 235, 0.3); transform: scale(1.1); }
        .stepper-item.active .stepper-label { color: var(--primary); }
        
        .stepper-item.completed .stepper-node { background: var(--primary); border-color: var(--primary); color: white; }
        .stepper-item.completed .stepper-label { color: var(--text); }
        
        .stepper-item .stepper-node[name="check"] { background: #10b981; border-color: #10b981; }
        .stepper-item .stepper-node[name="x"] { background: #ef4444; border-color: #ef4444; }

        .badge-new { background: rgba(59, 130, 246, 0.1); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.2); }
        .badge-contacted { background: rgba(234, 179, 8, 0.1); color: #eab308; border: 1px solid rgba(234, 179, 8, 0.2); }
        .badge-negotiation { background: rgba(249, 115, 22, 0.1); color: #f97316; border: 1px solid rgba(249, 115, 22, 0.2); }
        .badge-won { background: rgba(34, 197, 94, 0.1); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.2); }
        .badge-lost { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }
      `}</style>
    </div>
  )
}
