import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { rolesApi } from '../../../services/roles.js'
import { Icon } from '../../../layouts/icons.jsx'

const MODULE_PERMISSIONS = [
  'leads', 'customers', 'deals', 'tickets', 'users', 'reports', 'tasks', 'followups', 'billing', 'trash', 'settings', 'notifications'
]

export default function RoleFormModal({ role, onClose, onSuccess }) {
  const isEdit = !!role
  const [loading, setLoading] = useState(false)
  const [model, setModel] = useState({
    name: '',
    description: '',
    permissions: [],
    status: 'active'
  })

  useEffect(() => {
    if (role) {
      setModel({
        name: role.name || '',
        description: role.description || '',
        permissions: role.permissions || [],
        status: role.status || 'active'
      })
    }
  }, [role])

  function togglePermission(p) {
    setModel(prev => {
      const exists = prev.permissions.includes(p)
      const next = exists 
        ? prev.permissions.filter(x => x !== p)
        : [...prev.permissions, p]
      return { ...prev, permissions: next }
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!model.name.trim()) {
      toast.warn('Role name is required')
      return
    }

    setLoading(true)
    try {
      if (isEdit) {
        await rolesApi.update(role.id, model)
        toast.success('Role updated successfully')
      } else {
        await rolesApi.create(model)
        toast.success('Role created successfully')
      }
      onSuccess()
    } catch (err) {
      toast.error(err.message || 'Operation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="crm-modal-overlay">
      <div className="crm-modal card" style={{ maxWidth: '600px', width: '90%' }}>
        <div className="crm-modal-header">
          <h3 style={{ margin: 0 }}>{isEdit ? 'Edit Role' : 'Add New Role'}</h3>
          <button className="iconBtn" onClick={onClose}><Icon name="close" /></button>
        </div>

        <form className="crm-modal-body stack gap-20" onSubmit={handleSubmit}>
          <div className="stack tiny-gap">
            <label className="text-small muted" style={{ fontWeight: 600 }}>Role Name *</label>
            <input
              className="input"
              value={model.name}
              onChange={e => setModel(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Sales Head, Tech Lead"
              required
              disabled={role?.is_system_role}
            />
            {role?.is_system_role && <span className="extra-small muted">System role names cannot be modified.</span>}
          </div>

          <div className="stack tiny-gap">
            <label className="text-small muted" style={{ fontWeight: 600 }}>Description</label>
            <textarea
              className="input"
              style={{ minHeight: '80px', resize: 'vertical' }}
              value={model.description}
              onChange={e => setModel(p => ({ ...p, description: e.target.value }))}
              placeholder="What this role does..."
            />
          </div>

          <div className="stack tiny-gap">
            <label className="text-small muted" style={{ fontWeight: 600 }}>Module Permissions</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '200px', overflowY: 'auto', padding: '8px', background: 'rgba(0,0,0,0.1)', borderRadius: 'var(--radius-md)' }}>
              {MODULE_PERMISSIONS.map(p => (
                <label key={p} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '4px', textTransform: 'capitalize' }}>
                  <input 
                    type="checkbox" 
                    checked={model.permissions.includes(p)}
                    onChange={() => togglePermission(p)}
                  />
                  <span className="text-small">{p}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="row">
            <label className="text-small muted" style={{ fontWeight: 600 }}>Status</label>
            <div style={{ display: 'flex', gap: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input type="radio" checked={model.status === 'active'} onChange={() => setModel(p => ({ ...p, status: 'active' }))} />
                <span className="text-small">Active</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input type="radio" checked={model.status === 'inactive'} onChange={() => setModel(p => ({ ...p, status: 'inactive' }))} />
                <span className="text-small">Inactive</span>
              </label>
            </div>
          </div>

          <div className="tableActions" style={{ marginTop: '10px' }}>
            <button className="btn secondary" type="button" onClick={onClose} disabled={loading}>Cancel</button>
            <button className="btn primary" type="submit" disabled={loading}>
              {loading ? 'Saving...' : (isEdit ? 'Update Role' : 'Create Role')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
