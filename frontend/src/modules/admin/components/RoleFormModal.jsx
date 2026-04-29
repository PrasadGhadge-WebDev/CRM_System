import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'react-toastify'
import { rolesApi } from '../../../services/roles.js'
import { Icon } from '../../../layouts/icons.jsx'

const MODULE_PERMISSIONS = [
  'leads', 'customers', 'deals', 'tickets', 'users', 'reports', 'tasks', 'billing', 'trash', 'settings', 'attendance', 'notifications'
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

  const modalContent = (
    <div className="crm-modal-portal-overlay">
      <div className="crm-modal-sheet animate-sheet-in" style={{ maxWidth: '600px' }}>
        <div className="crm-modal-sheet-header">
          <div className="sheet-title-area">
            <h2 className="sheet-title">{isEdit ? 'Update Role' : 'Add New Role'}</h2>
            <p className="sheet-subtitle">Define access levels and module permissions for your team</p>
          </div>
        </div>

        <form className="crm-modal-sheet-body custom-scrollbar" onSubmit={handleSubmit}>
          <div className="sheet-content-container">
            {/* Basic Info */}
            <section className="form-sheet-section">
              <div className="form-sheet-section-header">
                <Icon name="shield" />
                <span>Basic Configuration</span>
              </div>
              <div className="form-sheet-grid" style={{ gridTemplateColumns: '1fr' }}>
                <div className="sheet-field">
                  <label>Role Identity *</label>
                  <input
                    className="crm-input"
                    value={model.name}
                    onChange={e => setModel(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Sales Head, Tech Lead"
                    required
                    disabled={role?.is_system_role}
                    autoFocus
                  />
                  {role?.is_system_role && <p className="footer-hint" style={{ marginTop: '4px', fontStyle: 'normal' }}>System role names cannot be modified.</p>}
                </div>

                <div className="sheet-field">
                  <label>Role Description</label>
                  <textarea
                    className="crm-input"
                    style={{ minHeight: '80px' }}
                    value={model.description}
                    onChange={e => setModel(p => ({ ...p, description: e.target.value }))}
                    placeholder="What this role does..."
                  />
                </div>
              </div>
            </section>

            {/* Permissions */}
            <section className="form-sheet-section">
              <div className="form-sheet-section-header">
                <Icon name="briefcase" />
                <span>Module Permissions</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'var(--bg-surface)', padding: '24px', borderRadius: '24px', border: '2px solid rgba(0,0,0,0.1)' }}>
                {MODULE_PERMISSIONS.map(p => (
                  <label key={p} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', textTransform: 'capitalize', fontSize: '0.85rem', fontWeight: 600 }}>
                    <input 
                      type="checkbox" 
                      checked={model.permissions.includes(p)}
                      onChange={() => togglePermission(p)}
                    />
                    <span>{p}</span>
                  </label>
                ))}
              </div>
            </section>

            {/* Status */}
            <section className="form-sheet-section no-border">
              <div className="form-sheet-section-header">
                <Icon name="info" />
                <span>Operational Status</span>
              </div>
              <div style={{ display: 'flex', gap: '32px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input type="radio" checked={model.status === 'active'} onChange={() => setModel(p => ({ ...p, status: 'active' }))} />
                  <span>Active</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input type="radio" checked={model.status === 'inactive'} onChange={() => setModel(p => ({ ...p, status: 'inactive' }))} />
                  <span>Inactive</span>
                </label>
              </div>
            </section>
          </div>
        </form>

        <div className="crm-modal-sheet-footer">
          <p className="footer-hint">All fields are securely encrypted.</p>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button className="crm-btn-premium glass" type="button" onClick={onClose}>Cancel</button>
            <button className="crm-btn-premium vibrant" type="submit" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Saving...' : (isEdit ? 'Update Role' : 'Create Role')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
