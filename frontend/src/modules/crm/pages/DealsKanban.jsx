import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../../../layouts/icons.jsx'
import { useAuth } from '../../../context/AuthContext'

const STAGES = ['New', 'Qualified', 'Proposal', 'Won']

const STAGE_COLORS = {
  'New': 'info',
  'Qualified': 'purple',
  'Proposal': 'blue',
  'Won': 'success'
}

export default function DealsKanban({ deals = [], loading, onStatusChange }) {
  const { user } = useAuth()
  const [draggedId, setDraggedId] = useState(null)
  
  const isAccountant = user?.role === 'Accountant'
  const canMove = !isAccountant

  const dealsByStage = STAGES.reduce((acc, stage) => {
    acc[stage] = deals.filter(d => d.stage === stage)
    return acc
  }, {})

  const handleDragStart = (id) => {
    if (!canMove) return
    setDraggedId(id)
  }

  const handleDragOver = (e) => {
    if (!canMove) return
    e.preventDefault()
  }

  const handleDrop = (stage) => {
    if (!canMove || !draggedId) return
    onStatusChange(draggedId, stage)
    setDraggedId(null)
  }

  if (loading && deals.length === 0) {
    return (
      <div className="kanban-loader">
        <div className="spinner-medium" />
        <span>Optimizing pipeline view...</span>
      </div>
    )
  }

  return (
    <div className="kanban-container">
      <div className="kanban-board">
        {STAGES.map(stage => (
          <div 
            key={stage} 
            className={`kanban-column stage-${STAGE_COLORS[stage]}`}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(stage)}
          >
            <div className="kanban-column-header">
              <div className="kanban-column-title">
                <span className="dot" />
                <h3>{stage}</h3>
                <span className="count">{dealsByStage[stage].length}</span>
              </div>
              <div className="kanban-column-total">
                ₹{dealsByStage[stage].reduce((sum, d) => sum + (d.value || 0), 0).toLocaleString()}
              </div>
            </div>

            <div className="kanban-cards-stack">
              {dealsByStage[stage].map(deal => (
                <div 
                  key={deal.id} 
                  className="kanban-card"
                  draggable
                  onDragStart={() => handleDragStart(deal.id)}
                >
                  <div className="card-top">
                    <Link to={`/deals/${deal.id}`} className="card-title">
                      {deal.name}
                    </Link>
                    <span className={`priority-tag ${deal.priority?.toLowerCase()}`}>
                      {deal.priority}
                    </span>
                  </div>

                  <div className="card-client">
                    <Icon name="user" size={12} />
                    <span>{deal.customer_id?.name || 'Unknown Client'}</span>
                  </div>

                  <div className="card-footer">
                    <div className="card-value">₹{(deal.value || 0).toLocaleString()}</div>
                    <div className="card-meta">
                      <div className="card-assignee" title={deal.assigned_to?.name}>
                        {(deal.assigned_to?.name || 'U').charAt(0)}
                      </div>
                      <div className="card-probability" title="Probability">
                        {deal.probability || 0}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {dealsByStage[stage].length === 0 && (
                <div className="kanban-empty-slot">
                  <span>Drop deal here</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .kanban-container { overflow-x: auto; padding: 20px 0; min-height: calc(100vh - 280px); }
        .kanban-board { display: flex; gap: 20px; padding-bottom: 20px; min-width: max-content; }
        .kanban-column { width: 280px; display: flex; flex-direction: column; gap: 16px; border-radius: 20px; background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); padding: 12px; }
        
        .kanban-column-header { display: flex; flex-direction: column; gap: 4px; padding: 4px 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .kanban-column-title { display: flex; align-items: center; gap: 10px; }
        .kanban-column-title .dot { width: 8px; height: 8px; border-radius: 50%; }
        .kanban-column-title h3 { margin: 0; font-size: 0.85rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-dimmed); }
        .kanban-column-title .count { background: rgba(255,255,255,0.05); padding: 2px 8px; border-radius: 99px; font-size: 0.7rem; font-weight: 900; color: var(--text); }
        .kanban-column-total { font-size: 0.9rem; font-weight: 900; color: var(--text); opacity: 0.8; }

        .stage-info .dot { background: #3b82f6; }
        .stage-warning .dot { background: #eab308; }
        .stage-purple .dot { background: #a855f7; }
        .stage-blue .dot { background: #0ea5e9; }
        .stage-orange .dot { background: #f97316; }
        .stage-success .dot { background: #22c55e; }
        .stage-danger .dot { background: #ef4444; }

        .kanban-cards-stack { display: flex; flex-direction: column; gap: 12px; min-height: 200px; }
        .kanban-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 16px; cursor: grab; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: var(--shadow-sm); }
        .kanban-card:hover { transform: translateY(-4px); border-color: var(--primary); box-shadow: var(--shadow-lg); }
        .kanban-card:active { cursor: grabbing; opacity: 0.8; }

        .card-top { display: flex; justify-content: space-between; align-items: start; gap: 12px; margin-bottom: 12px; }
        .card-title { font-size: 0.9rem; font-weight: 800; color: var(--text); text-decoration: none; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .card-title:hover { color: var(--primary); }
        
        .priority-tag { font-size: 0.6rem; font-weight: 900; text-transform: uppercase; padding: 2px 8px; border-radius: 6px; }
        .priority-tag.high { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
        .priority-tag.medium { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
        .priority-tag.low { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }

        .card-client { display: flex; align-items: center; gap: 6px; font-size: 0.75rem; color: var(--text-dimmed); margin-bottom: 16px; }
        .card-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.05); }
        .card-value { font-size: 1rem; font-weight: 900; color: var(--text); }
        
        .card-meta { display: flex; align-items: center; gap: 10px; }
        .card-assignee { width: 24px; height: 24px; border-radius: 8px; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 900; }
        .card-probability { font-size: 0.7rem; font-weight: 800; color: var(--text-dimmed); }

        .kanban-empty-slot { border: 2px dashed rgba(255,255,255,0.05); border-radius: 16px; height: 100px; display: flex; align-items: center; justify-content: center; color: var(--text-dimmed); font-size: 0.8rem; font-weight: 600; opacity: 0.5; }
        
        .kanban-loader { display: flex; flex-direction: column; align-items: center; gap: 20px; padding: 100px 0; color: var(--text-dimmed); }
      `}</style>
    </div>
  )
}
