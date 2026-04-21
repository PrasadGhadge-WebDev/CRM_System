import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { statusesApi } from '../../../services/statuses.js'
import { Icon } from '../../../layouts/icons.jsx'

export default function StatusFormModal({ type, status, onClose, onSuccess }) {
  const isEdit = !!status
  const [loading, setLoading] = useState(false)
  const [model, setModel] = useState({
    name: '',
    color: '#3b82f6',
    is_default: false,
    status: 'active'
  })

  useEffect(() => {
    if (status) {
      setModel({
        name: status.name || '',
        color: status.color || '#3b82f6',
        is_default: !!status.is_default,
        status: status.status || 'active'
      })
    }
  }, [status])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!model.name.trim()) {
      toast.warn('Name is required')
      return
    }

    setLoading(true)
    try {
      await statusesApi.save({
        ...model,
        id: status?._id || status?.id,
        type: type // Passed from parent tab
      })
      toast.success(isEdit ? 'Status updated' : 'Status created')
      onSuccess()
    } catch (err) {
      toast.error(err.message || 'Operation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="crm-modal-overlay">
      <div className="crm-modal card" style={{ maxWidth: '450px', width: '90%' }}>
        <div className="crm-modal-header">
          <h3 style={{ margin: 0 }}>{isEdit ? 'Edit Status' : 'Add New Status'}</h3>
          <button className="iconBtn" onClick={onClose}><Icon name="close" /></button>
        </div>

        <form className="crm-modal-body stack gap-20" onSubmit={handleSubmit}>
          <div className="stack tiny-gap">
            <label className="text-small muted" style={{ fontWeight: 600 }}>Status Name *</label>
            <input
              className="input"
              value={model.name}
              onChange={e => setModel(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Qualified, Contacted"
              required
            />
          </div>

          <div className="row gap-20">
            <div className="stack tiny-gap" style={{ flex: 1 }}>
              <label className="text-small muted" style={{ fontWeight: 600 }}>Color Code</label>
              <div className="row tiny-gap">
                <input
                  type="color"
                  value={model.color}
                  onChange={e => setModel(p => ({ ...p, color: e.target.value }))}
                  style={{ width: '40px', height: '36px', padding: '2px', cursor: 'pointer', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
                />
                <input
                  className="input"
                  style={{ flex: 1 }}
                  value={model.color}
                  onChange={e => setModel(p => ({ ...p, color: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="stack tiny-gap">
               <label className="text-small muted" style={{ fontWeight: 600 }}>Status</label>
               <select 
                 className="input" 
                 value={model.status} 
                 onChange={e => setModel(p => ({ ...p, status: e.target.value }))}
               >
                 <option value="active">Active</option>
                 <option value="inactive">Inactive</option>
               </select>
            </div>
          </div>

          <label className="row tiny-gap" style={{ cursor: 'pointer', alignSelf: 'flex-start' }}>
            <input 
              type="checkbox" 
              checked={model.is_default} 
              onChange={e => setModel(p => ({ ...p, is_default: e.target.checked }))} 
            />
            <span className="text-small">Set as Default Status</span>
          </label>

          <div className="tableActions" style={{ marginTop: '10px' }}>
            <button className="btn secondary" type="button" onClick={onClose} disabled={loading}>Cancel</button>
            <button className="btn primary" type="submit" disabled={loading}>
              {loading ? 'Saving...' : (isEdit ? 'Update Status' : 'Create Status')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
