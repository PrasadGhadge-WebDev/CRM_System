import { useEffect, useState } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { toast } from 'react-toastify'
import { Icon } from '../../../layouts/icons.jsx'
import PageHeader from '../../../components/PageHeader.jsx'
import { statusesApi } from '../../../services/statuses.js'

export default function StatusesTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState({ name: '', order: 1, color: '#3B82F6', isFinal: false, type: 'lead' })
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    loadStatuses()
  }, [])

  async function loadStatuses() {
    try {
      setLoading(true)
      const data = await statusesApi.list('lead')
      setItems(data)
    } catch (e) {
      toast.error('Failed to load pipeline stages')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      await statusesApi.save({ ...form, id: editingId })
      toast.success('Pipeline stage synchronized')
      setIsModalOpen(false)
      loadStatuses()
    } catch (e) {
      toast.error('Failed to save stage')
    }
  }

  const handleDelete = async (id) => {
    try {
      await statusesApi.remove(id)
      toast.success('Stage removed from pipeline')
      loadStatuses()
    } catch (e) {
      toast.error('Cannot remove stage while it has active leads')
    }
  }

  const onDragEnd = async (res) => {
    if (!res.destination) return
    const next = Array.from(items)
    const [moved] = next.splice(res.source.index, 1)
    next.splice(res.destination.index, 0, moved)
    
    const updates = next.map((x, i) => ({ id: x.id, order: i + 1 }))
    setItems(next) 
    try {
      await statusesApi.reorder(updates)
      toast.success('Reordering synchronized')
    } catch (e) {
      toast.error('Reordering failed to sync')
      loadStatuses()
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-60 text-dimmed">
      <Icon name="refresh" size={32} className="animate-spin" />
      <span className="mt-16 font-900 tracking-widest uppercase">Syncing Pipeline...</span>
    </div>
  )

  return (
    <div className="crm-statuses-module content-fade-in">
      <PageHeader 
        title="Lead Statuses" 
        description="Sequence institutional lead pipeline stages and operational nodes."
        actions={
          <button className="crm-btn-premium vibrant" onClick={() => { setEditingId(null); setForm({ name: '', order: items.length + 1, color: '#3B82F6', isFinal: false, type: 'lead' }); setIsModalOpen(true); }}>
            <Icon name="plus" size={16} />
            <span>Add Stage</span>
          </button>
        }
      />

      <div className="crm-table-wrap shadow-soft" style={{ marginTop: '32px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="crm-table-scroll">
          <table className="crm-table">
            <thead style={{ background: 'var(--bg-elevated)' }}>
              <tr>
                <th style={{ width: '60px' }}>RANK</th>
                <th>DESIGNATION</th>
                <th>STATUS NODE</th>
                <th style={{ width: '120px' }}>TYPE</th>
                <th className="text-right" style={{ width: '120px' }}>ACTIONS</th>
              </tr>
            </thead>
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="statuses">
                {(provided) => (
                  <tbody {...provided.droppableProps} ref={provided.innerRef}>
                    {items.map((item, index) => (
                      <Draggable key={item.id} draggableId={item.id} index={index}>
                        {(p, s) => (
                          <tr ref={p.innerRef} {...p.draggableProps} className={`crm-table-row ${s.isDragging ? 'dragging' : ''}`}>
                            <td {...p.dragHandleProps}>
                              <div className="flex items-center gap-10">
                                <Icon name="menu" size={12} />
                                <span className="text-dimmed font-900">{index + 1}</span>
                              </div>
                            </td>
                            <td><span className="text-white font-800">{item.name}</span></td>
                            <td>
                              <span className="status-badge" style={{ '--pill-color': item.color }}>
                                {item.name.toUpperCase()}
                              </span>
                            </td>
                            <td>
                              <span className={`crm-status-pill-modern ${item.isFinal ? 'status-active' : 'status-pending'}`}>
                                <div className="status-dot" />
                                {item.isFinal ? 'TERMINAL' : 'FLUID'}
                              </span>
                            </td>
                            <td className="text-right">
                              <div className="crm-action-group">
                                <button className="modern-action-btn" onClick={() => { setEditingId(item.id); setForm(item); setIsModalOpen(true); }}>
                                  <Icon name="edit" size={14} />
                                </button>
                                <button className="modern-action-btn danger" onClick={() => handleDelete(item.id)}>
                                  <Icon name="trash" size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </tbody>
                )}
              </Droppable>
            </DragDropContext>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="intel-card modal-panel-premium" style={{ width: '400px' }}>
            <h3 className="userFormTitle" style={{ marginBottom: '24px', fontSize: '20px' }}>{editingId ? 'Edit Stage' : 'New Stage'}</h3>
            <form onSubmit={handleSave} className="stack gap-20">
              <div className="input-field-v4">
                <label>Designation Name</label>
                <input className="input-premium" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="input-field-v4">
                <label>Node Color</label>
                <input type="color" className="input-premium" style={{ height: '44px', padding: '4px' }} value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} />
              </div>
              <div className="flex items-center gap-10">
                <input type="checkbox" checked={form.isFinal} onChange={e => setForm(p => ({ ...p, isFinal: e.target.checked }))} />
                <label className="text-sm font-700">Terminal Node (Won/Lost)</label>
              </div>
              <div className="flex justify-end gap-12" style={{ marginTop: '12px' }}>
                <button type="button" className="crm-btn-premium glass" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="crm-btn-premium vibrant">Save Node</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .crm-statuses-module { display: flex; flex-direction: column; }
        .crm-table-row.dragging { background: var(--primary) !important; opacity: 0.8; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-panel-premium { box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
        
        .crm-table th {
            padding: 12px 16px !important;
            font-size: 0.7rem !important;
            font-weight: 800 !important;
            color: var(--primary) !important;
            letter-spacing: 0.1em !important;
            text-transform: uppercase !important;
            border-bottom: 2px solid var(--border-strong) !important;
            opacity: 0.9;
        }
        .crm-table-row { transition: background 0.2s ease; cursor: pointer; border-bottom: 1px solid var(--border-strong) !important; }
        .crm-table-row:hover { background: var(--bg-hover) !important; }
        .crm-table-row td { padding: 12px 16px !important; }

        .crm-action-group { display: flex; gap: 8px; justify-content: flex-end; }
        .modern-action-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--border-strong); background: var(--bg-card); color: var(--text-dimmed); display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; cursor: pointer; }
        .modern-action-btn:hover { color: var(--primary); border-color: var(--primary); transform: translateY(-1px); }
        .modern-action-btn.danger:hover { background: var(--bg-hover); color: var(--danger); border-color: var(--danger); }

        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .content-fade-in { animation: fadeIn 0.4s ease-out; }
      `}</style>
    </div>
  )
}
