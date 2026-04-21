import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { leadSourcesApi } from '../../../services/leadSources'
import { Icon } from '../../../layouts/icons.jsx'
import { confirmToast } from '../../../utils/confirmToast.jsx'
import LeadSourceFormModal from '../components/LeadSourceFormModal.jsx'

export default function LeadSourcesTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  useEffect(() => {
    loadSources()
  }, [])

  async function loadSources() {
    try {
      setLoading(true)
      const data = await leadSourcesApi.list()
      setItems(Array.isArray(data) ? data : [])
    } catch (e) {
      toast.error('Failed to load sources')
    } finally {
      setLoading(false)
    }
  }

  async function onDelete(source) {
    const confirmed = await confirmToast(`Are you sure you want to delete "${source.name}"?`, {
      confirmLabel: 'Move to Trash',
      type: 'danger'
    })
    if (!confirmed) return

    try {
      await leadSourcesApi.remove(source._id || source.id)
      toast.success('Record moved to Trash successfully')
      setItems(prev => prev.filter(i => (i._id || i.id) !== (source._id || source.id)))
    } catch (e) {
      toast.error(e.message || 'Delete failed')
    }
  }

  function handleAdd() {
    setEditingItem(null)
    setIsModalOpen(true)
  }

  function handleEdit(source) {
    setEditingItem(source)
    setIsModalOpen(true)
  }

  return (
    <div className="stack gap-20">
      <div className="row">
        <div>
          <h3 style={{ margin: 0 }}>Lead Sources Management</h3>
          <p className="muted text-small">Define acquisition channels and track their performance/cost</p>
        </div>
        <button className="btn primary" onClick={handleAdd}>
          <Icon name="plus" /> Add New Source
        </button>
      </div>

      <div className="tableWrap shadow-sm">
        <table className="table">
          <thead>
            <tr>
              <th>SOURCE NAME</th>
              <th>CATEGORY</th>
              <th className="text-right">AVG. COST</th>
              <th className="text-center">LEADS</th>
              <th className="text-center">DEFAULT</th>
              <th className="text-center">STATUS</th>
              <th className="text-right">ACTION</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="center p-40 muted">Loading sources...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan="7" className="center p-40 muted">No lead sources defined yet.</td></tr>
            ) : (
              items.map((item) => (
                <tr key={item._id || item.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                  </td>
                  <td>
                    <span className={`badge ${item.category === 'Paid' ? 'danger' : item.category === 'Organic' ? 'success' : 'info'} small`}>
                      {item.category}
                    </span>
                  </td>
                  <td className="text-right">
                    ₹{item.cost_per_lead?.toLocaleString() || 0}
                  </td>
                  <td className="text-center">
                    <span className="badge muted small">{item.leads_count || 0}</span>
                  </td>
                  <td className="text-center">
                    {item.is_default && <span className="badge success small">DEFAULT</span>}
                  </td>
                  <td className="text-center">
                    <span className={`badge ${item.status === 'active' ? 'success' : 'muted'} small`}>
                      {item.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="tableActions">
                      <button className="iconBtn small" onClick={() => handleEdit(item)}><Icon name="edit" /></button>
                      <button className="iconBtn text-danger small" onClick={() => onDelete(item)}><Icon name="trash" /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <LeadSourceFormModal
          source={editingItem}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false)
            loadSources()
          }}
        />
      )}

      <div 
        className="card" 
        style={{ 
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.05))',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          padding: '16px'
        }}
      >
         <div style={{ color: 'var(--primary)', display: 'flex' }}>
           <Icon name="info" size={20} />
         </div>
         <span className="text-small" style={{ color: 'var(--text-main)', opacity: 0.9 }}>
           Lead sources help you track <strong>ROI</strong> on marketing campaigns and pre-fill the Lead Form for faster entry.
         </span>
      </div>
    </div>
  )
}
