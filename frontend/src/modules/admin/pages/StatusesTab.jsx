import { useEffect, useState } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { toast } from 'react-toastify'
import { statusesApi } from '../../../services/statuses.js'
import { Icon } from '../../../layouts/icons.jsx'
import { confirmToast } from '../../../utils/confirmToast.jsx'
import StatusFormModal from '../components/StatusFormModal.jsx'

const STATUS_TYPES = [
  { id: 'lead', label: 'Lead Statuses' },
  { id: 'customer', label: 'Customer Statuses' },
  { id: 'deal', label: 'Deal Statuses' },
]

export default function StatusesTab() {
  const [type, setType] = useState('lead')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  useEffect(() => {
    loadStatuses()
  }, [type])

  async function loadStatuses() {
    try {
      setLoading(true)
      const data = await statusesApi.list(type)
      setItems(Array.isArray(data) ? data : [])
    } catch (e) {
      toast.error('Failed to load statuses')
    } finally {
      setLoading(false)
    }
  }

  async function onDragEnd(result) {
    if (!result.destination) return
    if (result.destination.index === result.source.index) return

    const newItems = Array.from(items)
    const [reorderedItem] = newItems.splice(result.source.index, 1)
    newItems.splice(result.destination.index, 0, reorderedItem)

    setItems(newItems)

    try {
      // Prepare bulk update for backend
      const updates = newItems.map((item, index) => ({
        id: item._id || item.id,
        order: index
      }))
      await statusesApi.reorder(updates)
    } catch (e) {
      toast.error('Failed to save new order')
      loadStatuses() // Revert to server state
    }
  }

  async function onDelete(status) {
    const confirmed = await confirmToast(`Are you sure you want to delete "${status.name}"?`, {
      confirmLabel: 'Move to Trash',
      type: 'danger'
    })
    if (!confirmed) return

    try {
      await statusesApi.remove(status._id || status.id)
      toast.success('Record moved to Trash successfully')
      setItems(prev => prev.filter(i => (i._id || i.id) !== (status._id || status.id)))
    } catch (e) {
      toast.error(e.message || 'Delete failed')
    }
  }

  function handleAdd() {
    setEditingItem(null)
    setIsModalOpen(true)
  }

  function handleEdit(status) {
    setEditingItem(status)
    setIsModalOpen(true)
  }

  return (
    <div className="stack gap-20">
      <div className="row">
        <div>
          <h3 style={{ margin: 0 }}>Lifeline Status Management</h3>
          <p className="muted text-small">Configure pipeline stages and visual indicators for Lead/Customer/Deal</p>
        </div>
        <button className="btn primary" onClick={handleAdd}>
          <Icon name="plus" /> Add New Status
        </button>
      </div>

      <div className="filters">
        <select 
          className="input" 
          style={{ width: '240px' }}
          value={type}
          onChange={e => setType(e.target.value)}
        >
          {STATUS_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="muted p-20">Loading...</div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="statuses">
            {(provided) => (
              <div 
                className="tableWrap"
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}></th>
                      <th>STATUS NAME</th>
                      <th>COLOR</th>
                      <th className="text-center">DEFAULT</th>
                      <th className="text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(items) && items.map((status, index) => (
                      <Draggable key={status._id || status.id} draggableId={status._id || status.id} index={index}>
                        {(provided, snapshot) => (
                          <tr
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            style={{
                              ...provided.draggableProps.style,
                              background: snapshot.isDragging ? 'var(--bg-elevated)' : 'transparent',
                              display: snapshot.isDragging ? 'table' : 'table-row'
                            }}
                          >
                            <td {...provided.dragHandleProps}>
                              <Icon name="menu" size={14} style={{ opacity: 0.3 }} />
                            </td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{status.name}</div>
                            </td>
                            <td>
                              <div className="row tiny-gap">
                                <div style={{ 
                                  width: '12px', 
                                  height: '12px', 
                                  borderRadius: '50%', 
                                  background: status.color 
                                }} />
                                <span className="text-small muted">{status.color}</span>
                              </div>
                            </td>
                            <td className="text-center">
                              {status.is_default && <span className="badge success small">DEFAULT</span>}
                            </td>
                            <td className="text-right">
                              <div className="tableActions">
                                <button className="iconBtn small" onClick={() => handleEdit(status)}><Icon name="edit" /></button>
                                <button className="iconBtn text-danger small" onClick={() => onDelete(status)}><Icon name="trash" /></button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </tbody>
                </table>
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {isModalOpen && (
        <StatusFormModal
          type={type}
          status={editingItem}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false)
            loadStatuses()
          }}
        />
      )}

      <div className="alert info">
        <Icon name="info" />
        <span>You can drag and drop statuses to reorder how they appear in the module dropdowns.</span>
      </div>
    </div>
  )
}
