import { Link } from 'react-router-dom'
import { Icon } from '../../../layouts/icons.jsx'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'

export default function DealsKanban({ deals, loading, onStatusChange }) {
  const stages = ['New', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost']

  const getDealsByStage = (stage) => deals.filter(d => (d.status || 'New') === stage)

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
                    <span className="kanban-deal-count">{stageDeals.length} Deals</span>
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
                              className={`kanban-card card shadow-vibrant-soft ${snapshot.isDragging ? 'is-dragging' : ''}`}
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{
                                ...provided.draggableProps.style,
                                cursor: 'grab'
                              }}
                            >
                              <div className="kanban-card-id">{deal.readable_id || 'DL-PENDING'}</div>
                              <div className="kanban-card-title">{deal.name}</div>
                              <div className="kanban-card-customer">
                                <Icon name="user" size={12} />
                                <span>{deal.customer_id?.name || 'Unknown Client'}</span>
                              </div>
                              <div className="kanban-card-footer">
                                <div className="kanban-card-value">₹{(deal.value || 0).toLocaleString()}</div>
                                {deal.assigned_to && (
                                  <div className="kanban-card-assigned" title={deal.assigned_to.name}>
                                    {deal.assigned_to.name.charAt(0)}
                                  </div>
                                )}
                              </div>
                            </Link>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {stageDeals.length === 0 && !snapshot.isDraggingOver && (
                        <div className="kanban-empty">Drop deals here</div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            )
          })}
        </div>
      </DragDropContext>

      <style>{`
        .kanban-wrapper {
          overflow-x: auto;
          padding-bottom: 20px;
          margin: 0 -24px;
          padding: 0 24px;
        }
        .kanban-board {
          display: flex;
          gap: 20px;
          min-width: 1400px;
          padding: 10px 0;
        }
        .kanban-column {
          flex: 0 0 300px;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          flex-direction: column;
          max-height: 80vh;
        }
        .kanban-column-header {
          padding: 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          background: rgba(255, 255, 255, 0.01);
          border-radius: 16px 16px 0 0;
        }
        .kanban-column-title {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }
        .kanban-column-title h3 {
          margin: 0;
          font-size: 1rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: white;
        }
        .kanban-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .bg-new { background: #60a5fa; box-shadow: 0 0 10px rgba(96,165,250,0.5); }
        .bg-qualified { background: #a78bfa; box-shadow: 0 0 10px rgba(167,139,250,0.5); }
        .bg-proposal { background: #fbbf24; box-shadow: 0 0 10px rgba(251,191,36,0.5); }
        .bg-negotiation { background: #f472b6; box-shadow: 0 0 10px rgba(244,114,182,0.5); }
        .bg-won { background: #34d399; box-shadow: 0 0 10px rgba(52,211,153,0.5); }
        .bg-lost { background: #f87171; box-shadow: 0 0 10px rgba(248,113,113,0.5); }

        .kanban-column-stats {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .kanban-deal-count { font-size: 0.75rem; color: var(--text-dimmed); font-weight: 600; }
        .kanban-deal-value { font-size: 0.85rem; color: white; font-weight: 700; }

        .kanban-column-content {
          padding: 16px;
          overflow-y: auto;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-height: 150px;
          transition: background-color 0.2s ease;
        }
        .kanban-column-content.dragging-over {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 0 0 16px 16px;
        }
        .kanban-column-content::-webkit-scrollbar { width: 4px; }
        .kanban-column-content::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }

        .kanban-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 16px;
          text-decoration: none;
          color: inherit;
          display: flex;
          flex-direction: column;
          gap: 10px;
          user-select: none;
        }
        .kanban-card:hover { border-color: var(--primary); }
        .kanban-card.is-dragging {
          transform: scale(1.05);
          box-shadow: 0 15px 30px -10px rgba(59, 130, 246, 0.4);
          background: rgba(59, 130, 246, 0.1);
          border-color: var(--primary);
          z-index: 100;
        }
        .kanban-card-id {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.65rem;
          font-weight: 800;
          color: var(--primary);
          background: rgba(59, 130, 246, 0.1);
          padding: 2px 6px;
          border-radius: 4px;
          width: fit-content;
        }
        .kanban-card-title {
          font-weight: 700;
          font-size: 0.95rem;
          color: white;
          line-height: 1.4;
        }
        .kanban-card-customer {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.8rem;
          color: var(--text-dimmed);
        }
        .kanban-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 5px;
        }
        .kanban-card-value {
          font-weight: 800;
          font-size: 0.9rem;
          color: white;
        }
        .kanban-card-assigned {
          width: 24px;
          height: 24px;
          background: var(--primary);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          font-weight: 900;
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.3);
        }
        .kanban-empty {
          text-align: center;
          padding: 40px 20px;
          font-size: 0.8rem;
          color: var(--text-dimmed);
          font-style: italic;
          opacity: 0.5;
        }

        /* Shadow utilities */
        .shadow-vibrant-soft {
           box-shadow: 0 4px 15px -5px rgba(0,0,0,0.3);
        }
      `}</style>
    </div>
  )
}
