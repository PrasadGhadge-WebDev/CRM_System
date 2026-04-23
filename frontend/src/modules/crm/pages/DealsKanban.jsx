import { Link } from 'react-router-dom'
import { Icon } from '../../../layouts/icons.jsx'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'

export default function DealsKanban({ deals, loading, onStatusChange }) {
  const stages = ['New', 'Contacted', 'Negotiation', 'Won', 'Lost']

  const getDealsByStage = (stage) => deals.filter(d => (d.stage || 'New') === stage)

  if (loading) return <div className="padding40 center muted">Syncing Sales Pipeline...</div>

  const handleDragEnd = (result) => {
    if (!result.destination) return
    const { source, destination, draggableId } = result
    if (source.droppableId !== destination.droppableId) {
      if (onStatusChange) {
        onStatusChange(draggableId, destination.droppableId)
      }
    }
  }

  return (
    <div className="kanban-wrapper">
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="kanban-board">
          {stages.map(stage => {
            const stageDeals = getDealsByStage(stage)
            const totalValue = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0)
            
            return (
              <div key={stage} className={`kanban-column ${stage.toLowerCase()}`}>
                <div className="kanban-column-header">
                  <div className="kanban-column-title">
                    <span className={`kanban-indicator bg-${stage.toLowerCase()}`}></span>
                    <h3>{stage}</h3>
                  </div>
                  <div className="kanban-column-stats">
                    <span className="kanban-deal-count">{stageDeals.length} Opportunities</span>
                    <span className="kanban-deal-value">₹{totalValue.toLocaleString()}</span>
                  </div>
                </div>
                
                <Droppable droppableId={stage}>
                  {(provided, snapshot) => (
                    <div 
                      className={`kanban-column-content ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                    >
                      {stageDeals.map((deal, index) => (
                        <Draggable key={deal.id} draggableId={deal.id} index={index}>
                          {(provided, snapshot) => (
                            <Link 
                              to={`/deals/${deal.id}`} 
                              className={`kanban-card card ${snapshot.isDragging ? 'is-dragging' : ''}`}
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <div className="kanban-card-id">{deal.readable_id || 'DL-PENDING'}</div>
                              <div className="kanban-card-title">{(deal.name || '').replace(/Deal for\s+/i, '')}</div>
                              <div className="kanban-card-customer">
                                <Icon name="user" size={12} />
                                <span>{deal.customer_id?.name || 'Unknown Client'}</span>
                              </div>
                              <div className="kanban-card-footer">
                                <div className="kanban-card-value">₹{(deal.value || 0).toLocaleString()}</div>
                                {deal.priority === 'High' && <span className="kanban-priority-tag">HIGH</span>}
                              </div>
                            </Link>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            )
          })}
        </div>
      </DragDropContext>

      <style>{`
        .kanban-wrapper { overflow-x: auto; padding-bottom: 20px; margin: 0 -24px; padding: 0 24px; }
        .kanban-board { display: flex; gap: 20px; min-width: 1400px; padding: 10px 0; }
        .kanban-column { flex: 0 0 300px; background: rgba(255, 255, 255, 0.02); border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.05); display: flex; flex-direction: column; max-height: 80vh; }
        .kanban-column-header { padding: 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
        .kanban-column-title { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
        .kanban-column-title h3 { margin: 0; font-size: 0.9rem; font-weight: 800; text-transform: uppercase; color: white; }
        
        .kanban-indicator { width: 8px; height: 8px; border-radius: 50%; }
        .bg-new { background: #3b82f6; box-shadow: 0 0 10px #3b82f660; }
        .bg-contacted { background: #eab308; box-shadow: 0 0 10px #eab30860; }
        .bg-negotiation { background: #f97316; box-shadow: 0 0 10px #f9731660; }
        .bg-won { background: #22c55e; box-shadow: 0 0 10px #22c55e60; }
        .bg-lost { background: #ef4444; box-shadow: 0 0 10px #ef444460; }

        .kanban-column-stats { display: flex; justify-content: space-between; align-items: center; }
        .kanban-deal-count { font-size: 0.7rem; color: var(--text-dimmed); font-weight: 700; }
        .kanban-deal-value { font-size: 0.8rem; color: white; font-weight: 800; }

        .kanban-column-content { padding: 16px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 12px; min-height: 200px; }
        .kanban-column-content.dragging-over { background: rgba(255, 255, 255, 0.03); border-radius: 0 0 20px 20px; }

        .kanban-card { background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; padding: 16px; text-decoration: none; color: inherit; transition: all 0.2s; }
        .kanban-card:hover { border-color: var(--primary); transform: translateY(-2px); background: rgba(255,255,255,0.06); }
        .kanban-card.is-dragging { transform: scale(1.05) rotate(2deg); box-shadow: 0 20px 40px rgba(0,0,0,0.4); border-color: var(--primary); }
        
        .kanban-card-id { font-family: monospace; font-size: 0.65rem; font-weight: 800; color: #3b82f6; background: #3b82f615; padding: 2px 6px; border-radius: 4px; width: fit-content; margin-bottom: 8px; }
        .kanban-card-title { font-weight: 700; font-size: 0.9rem; color: white; margin-bottom: 8px; }
        .kanban-card-customer { display: flex; align-items: center; gap: 6px; font-size: 0.75rem; color: var(--text-dimmed); }
        .kanban-card-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 12px; }
        .kanban-card-value { font-weight: 800; font-size: 0.85rem; color: white; }
        .kanban-priority-tag { font-size: 0.6rem; font-weight: 900; color: #ef4444; background: #ef444420; padding: 2px 6px; border-radius: 4px; }
      `}</style>
    </div>
  )
}
