import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../../../layouts/icons.jsx'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import StatusBadge from '../../../components/StatusBadge.jsx'
import ConfirmationModal from '../../../components/ConfirmationModal.jsx'
import { toast } from 'react-toastify'
import { leadsApi } from '../../../services/leads.js'
import FollowupModal from '../../../components/FollowupModal.jsx'

/* ─────────────────────────────────────────────
   Column definitions
───────────────────────────────────────────── */
const COLUMNS = [
  {
     value: 'new',
     label: 'New',
     color: '#3b82f6',
     rgb: '59,130,246',
     emoji: '🔵',
   },
   {
     value: 'contacted',
     label: 'Contacted',
     color: '#fbbf24',
     rgb: '251,191,36',
     emoji: '🟡',
   },
  {
    value: 'qualified',
    label: 'Qualified',
    color: '#8b5cf6',
    rgb: '139,92,246',
    emoji: '✅',
  },
  {
    value: 'negotiation',
    label: 'Negotiation',
    color: '#fb923c',
    rgb: '251,146,60',
    emoji: '🤝',
  },
  {
    value: 'won',
    label: 'Won',
    color: '#22c55e',
    rgb: '34,197,94',
    emoji: '🏆',
  },
  {
    value: 'lost',
    label: 'Lost',
    color: '#ef4444',
    rgb: '239,68,68',
    emoji: '❌',
  },
]

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function _formatCurrency(val, currency = 'INR') {
  if (!val) return '—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(val)
}

function formatDate(val) {
  if (!val) return '—'
  return new Date(val).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  })
}

/* ─────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────── */
function Avatar({ name }) {
  const initial = (name || '?').charAt(0).toUpperCase()
  return <span className="kb2-avatar">{initial}</span>
}

function InfoRow({ icon, text, mono }) {
  if (!text) return null
  return (
    <div className="kb2-info-row">
      <span className="kb2-info-icon">{icon}</span>
      <span className={`kb2-info-text${mono ? ' mono' : ''}`}>{text}</span>
    </div>
  )
}

function LeadCard({ lead, index, col, onFollowUp, onDelete }) {
  const navigate = useNavigate()

  return (
    <Draggable draggableId={lead.id || lead._id} index={index}>
      {(provided, snapshot) => (
        <div
          className={`kb2-card${snapshot.isDragging ? ' dragging' : ''}${lead.converted_at ? ' converted' : ''}`}
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{
            ...provided.draggableProps.style,
            borderLeftColor: col.color,
          }}
        >
          {/* ── Card Header ── */}
          <div className="kb2-card-header">
            <div className="kb2-card-id-row">
              {lead.source && (
                <StatusBadge 
                  status={lead.source} 
                  color="#6366f1"
                  className="kb2-source-badge"
                />
              )}
            </div>
          </div>

          {/* ── Name + Avatar ── */}
          <div className="kb2-card-name-row">
            <Avatar name={lead.name} />
            <div>
              <div className="kb2-card-name">{lead.name || 'Unnamed Lead'}</div>
            </div>
          </div>

          {/* ── Contact details ── */}
          <div className="kb2-card-details">
            <InfoRow icon="✉️" text={lead.email} />
            <InfoRow icon="📱" text={lead.phone} />
          </div>

          {/* ── Deal + Assigned ── */}
          <div className="kb2-card-meta">
            <div className="kb2-card-assignee" style={{ marginLeft: 'auto' }}>
              {lead.assignedTo?.name
                ? <>👤 {lead.assignedTo.name}</>
                : <span className="kb2-card-unassigned">Unassigned</span>}
            </div>
          </div>

          {/* ── Dates ── */}
          <div className="kb2-card-dates">
            <span className="kb2-date-chip">
              🗓 {formatDate(lead.created_at)}
            </span>
            {lead.nextFollowupDate && (
               <span
                 className={`kb2-date-chip follow-up${new Date(lead.nextFollowupDate) < new Date() ? ' overdue' : ''}`}
               >
                 ⏰ {formatDate(lead.nextFollowupDate)}
               </span>
             )}
          </div>

          {/* ── Actions ── */}
          <div className="kb2-card-actions">
            <button
              className="kb2-act-btn edit"
              title="Edit lead"
              onClick={(e) => {
                e.stopPropagation()
                navigate(`/leads/${lead.id || lead._id}/edit`)
              }}
            >
              ✏️ Edit
            </button>
            <button
               className="kb2-act-btn call"
               title="Schedule follow-up"
               onClick={(e) => {
                 e.stopPropagation()
                 onFollowUp?.(lead)
               }}
             >
               📞 Follow-up
             </button>
             <button
               className="kb2-act-btn del"
               title="Delete lead"
               onClick={(e) => {
                 e.stopPropagation()
                  onDelete?.(lead.id || lead._id)
                }}
              >
               🗑️ Delete
             </button>
          </div>
        </div>
      )}
    </Draggable>
  )
}

function KanbanColumn({ col, leads, onFollowUp, onDelete }) {
  const navigate = useNavigate()

  return (
    <div className="kb2-col" style={{ '--col-color': col.color, '--col-rgb': col.rgb }}>
      {/* ── Column header ── */}
      <div className="kb2-col-header">
        <div className="kb2-col-title-row">
          <span
            className="kb2-col-dot"
            style={{ background: col.color, boxShadow: `0 0 0 3px rgba(${col.rgb},0.2)` }}
          />
          <span className="kb2-col-emoji">{col.emoji}</span>
          <h3 className="kb2-col-title">{col.label}</h3>
          <span className="kb2-col-count">{leads.length}</span>
        </div>
      </div>

      {/* ── Droppable area ── */}
      <Droppable droppableId={col.value}>
        {(provided, snapshot) => (
          <div
            className={`kb2-col-body${snapshot.isDraggingOver ? ' over' : ''}`}
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {leads.map((lead, idx) => (
               <LeadCard
                 key={lead.id || lead._id}
                  lead={lead}
                  index={idx}
                  col={col}
                  onFollowUp={onFollowUp}
                  onDelete={onDelete}
                />
              ))}
            {provided.placeholder}

            {leads.length === 0 && !snapshot.isDraggingOver && (
              <div className="kb2-empty">
                <span>{col.emoji}</span>
                <p>No {col.label.toLowerCase()} leads</p>
                <span>Drag cards here</span>
              </div>
            )}
          </div>
        )}
      </Droppable>

      {/* ── Add Lead button per column ── */}
      <div className="kb2-col-footer">
        <button
          className="kb2-add-btn"
          onClick={() => navigate(`/leads/new?status=${col.value}`)}
          title={`Add new lead to ${col.label}`}
        >
          <span>+</span>
          Add {col.label} Lead
        </button>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Main export
───────────────────────────────────────────── */
export default function LeadsKanban({ leads = [], loading, onStatusChange, onRefresh, stages = [] }) {
  const [isFUModalOpen, setIsFUModalOpen] = useState(false)
  const [followUpLead, setFollowUpLead] = useState(null)
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const handleFollowUpRequest = (lead) => {
    setFollowUpLead(lead)
    setIsFUModalOpen(true)
  }

  const handleDeleteRequest = (id) => {
    setDeleteId(id)
    setIsDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    try {
      setDeleteLoading(true)
      await leadsApi.remove(deleteId)
      toast.success('Lead moved to trash')
      onRefresh?.()
    } catch {
      toast.error('Delete failed')
    } finally {
      setDeleteLoading(false)
      setIsDeleteModalOpen(false)
      setDeleteId(null)
    }
  }

  /* Merge dynamic stage colors/labels from DB into COLUMNS defaults */
  const resolvedCols = COLUMNS.map(col => {
    const dbStage = stages.find(
      s => String(s.value).toLowerCase() === col.value
    )
    return dbStage
      ? { ...col, label: dbStage.label || dbStage.value || col.label, color: dbStage.color || col.color }
      : col
  })

  function handleDragEnd(result) {
    if (!result.destination) return
    const { source, destination, draggableId } = result
    if (source.droppableId !== destination.droppableId) {
      onStatusChange?.(draggableId, destination.droppableId)
    }
  }

  const getLeadsByStage = (colValue) =>
    leads.filter(l => String(l.status || 'new').toLowerCase() === colValue)

  if (loading) {
    return (
      <div className="kb2-loading">
        <div className="kb2-spinner" />
        <span>Loading pipeline...</span>
      </div>
    )
  }

  return (
    <div className="kb2-wrapper">
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="kb2-board">
          {resolvedCols.map(col => (
            <KanbanColumn
              key={col.value}
              col={col}
              leads={getLeadsByStage(col.value)}
              onFollowUp={handleFollowUpRequest}
              onDelete={handleDeleteRequest}
            />
          ))}
        </div>
      </DragDropContext>

      {/* ── Modals ── */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        loading={deleteLoading}
        type="danger"
        title="Move to Trash"
        message="Are you sure you want to move this lead to the trash?"
        confirmLabel="Move to Trash"
      />

      {isFUModalOpen && followUpLead && (
        <FollowupModal 
          isOpen={isFUModalOpen}
          onClose={() => setIsFUModalOpen(false)}
          onSave={() => onRefresh?.()}
          lead={followUpLead}
        />
      )}

      {/* ── All styles ── */}
      <style>{`
        /* ── Wrapper / Board ───────────────────────── */
        .kb2-wrapper {
          overflow-x: auto;
          padding: 0 0 24px;
          scrollbar-width: thin;
          scrollbar-color: var(--border) transparent;
        }
        .kb2-wrapper::-webkit-scrollbar { height: 6px; }
        .kb2-wrapper::-webkit-scrollbar-track { background: transparent; }
        .kb2-wrapper::-webkit-scrollbar-thumb {
          background: var(--border-strong);
          border-radius: 99px;
        }

        .kb2-board {
          display: flex;
          gap: 16px;
          min-width: max-content;
          align-items: flex-start;
          padding: 4px 2px 8px;
        }

        /* ── Column ────────────────────────────────── */
        .kb2-col {
          width: 290px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border);
          border-radius: 20px;
          overflow: hidden;
          backdrop-filter: blur(12px);
          box-shadow: 0 4px 24px rgba(0,0,0,0.12);
          max-height: 80vh;
        }

        .kb2-col-header {
          padding: 14px 16px 10px;
          border-bottom: 1px solid var(--border);
          background: linear-gradient(
            180deg,
            rgba(var(--col-rgb), 0.06) 0%,
            transparent 100%
          );
          flex-shrink: 0;
        }

        .kb2-col-title-row {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 5px;
        }

        .kb2-col-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .kb2-col-emoji {
          font-size: 0.95rem;
          line-height: 1;
        }

        .kb2-col-title {
          margin: 0;
          font-size: 0.82rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text);
          flex: 1;
        }

        .kb2-col-count {
          background: rgba(var(--col-rgb), 0.14);
          color: var(--col-color);
          border: 1px solid rgba(var(--col-rgb), 0.25);
          border-radius: 99px;
          font-size: 0.68rem;
          font-weight: 800;
          padding: 2px 8px;
          min-width: 22px;
          text-align: center;
        }

        .kb2-col-value {
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--text-muted);
          padding-left: 25px;
        }

        /* ── Column body (cards area) ──────────────── */
        .kb2-col-body {
          flex: 1;
          overflow-y: auto;
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 9px;
          min-height: 120px;
          transition: background 0.2s ease;
          scrollbar-width: thin;
          scrollbar-color: var(--border) transparent;
        }
        .kb2-col-body::-webkit-scrollbar { width: 3px; }
        .kb2-col-body::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 99px;
        }

        .kb2-col-body.over {
          background: rgba(var(--col-rgb), 0.05);
        }

        /* ── Column Footer ─────────────────────────── */
        .kb2-col-footer {
          padding: 10px;
          border-top: 1px solid var(--border);
          flex-shrink: 0;
        }

        .kb2-add-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 10px;
          border: 1px dashed rgba(var(--col-rgb), 0.4);
          background: rgba(var(--col-rgb), 0.04);
          color: var(--col-color);
          font-size: 0.76rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .kb2-add-btn span {
          font-size: 1.1rem;
          line-height: 1;
          font-weight: 800;
        }

        .kb2-add-btn:hover {
          background: rgba(var(--col-rgb), 0.10);
          border-color: rgba(var(--col-rgb), 0.65);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(var(--col-rgb), 0.15);
        }

        /* ── Lead Card ─────────────────────────────── */
        .kb2-card {
          background: var(--bg-surface);
          border: 1px solid var(--border-strong);
          border-left: 3px solid var(--border);
          border-radius: 13px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 9px;
          cursor: grab;
          user-select: none;
          transition:
            transform 0.18s cubic-bezier(0.4,0,0.2,1),
            border-color 0.18s,
            box-shadow 0.18s,
            background 0.18s;
        }

        .kb2-card:hover {
          background: var(--bg-elevated);
          border-color: rgba(var(--col-rgb, 59,130,246), 0.5);
          transform: translateY(-2px);
          box-shadow:
            0 8px 24px rgba(0,0,0,0.25),
            0 0 0 1px rgba(var(--col-rgb, 59,130,246), 0.12);
        }

        .kb2-card.dragging {
          cursor: grabbing;
          transform: scale(1.03) rotate(1.5deg);
          box-shadow:
            0 20px 48px rgba(0,0,0,0.45),
            0 0 0 2px rgba(var(--col-rgb, 59,130,246), 0.4);
          background: var(--bg-elevated);
          border-color: var(--primary);
          z-index: 9999;
        }

        .kb2-card.converted {
          border-left-color: #22c55e !important;
          opacity: 0.85;
        }

        /* Card sections */
        .kb2-card-header { display: flex; flex-direction: column; gap: 4px; }

        .kb2-card-id-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
        }

        .kb2-card-id {
          font-size: 0.62rem;
          font-weight: 800;
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          color: var(--primary);
          background: var(--primary-soft);
          border: 1px solid var(--primary-2);
          padding: 1px 7px;
          border-radius: 5px;
          letter-spacing: 0.06em;
        }

        .kb2-card-source {
          font-size: 0.58rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--text-dimmed);
          background: rgba(255,255,255,0.04);
          border: 1px solid var(--border);
          padding: 1px 6px;
          border-radius: 4px;
        }

        .kb2-card-name-row {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .kb2-avatar {
          width: 32px;
          height: 32px;
          border-radius: 9px;
          background: linear-gradient(135deg, var(--primary-soft), rgba(139,92,246,0.12));
          border: 1px solid var(--primary-2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.88rem;
          color: var(--primary);
          flex-shrink: 0;
        }

        .kb2-card-name {
          font-size: 0.86rem;
          font-weight: 700;
          color: var(--text);
          line-height: 1.2;
        }

        .kb2-card-company {
          font-size: 0.7rem;
          color: var(--text-dimmed);
          margin-top: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 180px;
        }

        .kb2-card-details {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 6px 0;
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }

        .kb2-info-row {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .kb2-info-icon { font-size: 0.7rem; flex-shrink: 0; }

        .kb2-info-text {
          font-size: 0.72rem;
          color: var(--text-dimmed);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 210px;
        }

        .kb2-info-text.mono { font-family: monospace; }

        .kb2-card-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
        }

        .kb2-card-value {
          font-size: 0.88rem;
          font-weight: 800;
          letter-spacing: -0.02em;
        }

        .kb2-card-assignee {
          font-size: 0.69rem;
          color: var(--text-muted);
          font-weight: 600;
          text-align: right;
        }

        .kb2-card-unassigned {
          color: var(--text-dimmed);
          font-style: italic;
          font-weight: 500;
        }

        .kb2-card-dates {
          display: flex;
          align-items: center;
          gap: 5px;
          flex-wrap: wrap;
        }

        .kb2-date-chip {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 0.62rem;
          font-weight: 600;
          color: var(--text-dimmed);
          background: rgba(255,255,255,0.04);
          border: 1px solid var(--border);
          border-radius: 5px;
          padding: 2px 6px;
        }

        .kb2-date-chip.follow-up {
          color: var(--primary);
          background: var(--primary-soft);
          border-color: var(--primary-2);
        }

        .kb2-date-chip.follow-up.overdue {
          color: #f87171;
          background: rgba(239,68,68,0.1);
          border-color: rgba(239,68,68,0.25);
        }

        .kb2-card-actions {
          display: flex;
          gap: 6px;
          padding-top: 6px;
          border-top: 1px solid var(--border);
        }

        .kb2-act-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 5px 8px;
          border-radius: 7px;
          border: 1px solid var(--border);
          background: rgba(255,255,255,0.03);
          color: var(--text-muted);
          font-size: 0.7rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.18s ease;
          white-space: nowrap;
        }

        .kb2-act-btn:hover { transform: translateY(-1px); color: var(--text); }

        .kb2-act-btn.edit:hover {
          background: var(--primary);
          border-color: var(--primary);
          box-shadow: 0 4px 10px rgba(59,130,246,0.3);
        }

        .kb2-act-btn.call:hover {
          background: #fbbf24;
          border-color: #fbbf24;
          box-shadow: 0 4px 10px rgba(251,191,36,0.3);
        }

        .kb2-act-btn.del:hover {
          background: #ef4444;
          border-color: #ef4444;
          box-shadow: 0 4px 10px rgba(239,68,68,0.3);
        }

        .kb2-act-btn.view {
          flex: 0 0 auto;
          padding: 5px 8px;
        }

        .kb2-act-btn.view:hover {
          background: var(--bg-elevated);
          border-color: var(--border-strong);
          color: var(--text);
        }

        /* ── Empty state ────────────────────────────── */
        .kb2-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 32px 12px;
          color: var(--text-dimmed);
          opacity: 0.45;
          text-align: center;
        }

        .kb2-empty span:first-child { font-size: 1.6rem; }

        .kb2-empty p {
          margin: 0;
          font-size: 0.78rem;
          font-weight: 600;
        }

        .kb2-empty span:last-child {
          font-size: 0.65rem;
          font-style: italic;
        }

        /* ── Loading state ──────────────────────────── */
        .kb2-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          padding: 80px 20px;
          color: var(--text-dimmed);
        }

        .kb2-spinner {
          width: 28px;
          height: 28px;
          border: 2.5px solid var(--border);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: kb2-spin 0.75s linear infinite;
        }

        @keyframes kb2-spin { to { transform: rotate(360deg); } }

        /* ── Light mode overrides ───────────────────── */
        body:not(.dark) .kb2-col { background: rgba(255,255,255,0.7); }
        body:not(.dark) .kb2-card { background: #ffffff; }
        body:not(.dark) .kb2-card:hover { background: #f8fafc; }
      `}</style>
    </div>
  )
}
