import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { rolesApi } from '../../../services/roles.js'
import { Icon } from '../../../layouts/icons.jsx'
import { confirmToast } from '../../../utils/confirmToast.jsx'
import RoleFormModal from '../components/RoleFormModal.jsx'

export default function RolesTab() {
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState(null)

  useEffect(() => {
    loadRoles()
  }, [])

  async function loadRoles() {
    try {
      setLoading(true)
      const data = await rolesApi.list()
      setRoles(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e.message || 'Failed to load roles')
    } finally {
      setLoading(false)
    }
  }

  async function onDelete(role) {
    if (role.is_system_role) {
      toast.warn('System roles cannot be deleted')
      return
    }

    const confirmed = await confirmToast(`Are you sure you want to delete "${role.name}" Role?`, {
      type: 'danger',
      confirmLabel: 'Delete Role'
    })
    if (!confirmed) return

    try {
      await rolesApi.remove(role.id)
      toast.success('Role deleted successfully')
      setRoles(prev => prev.filter(r => r.id !== role.id))
    } catch (e) {
      toast.error(e.message || 'Deletion failed')
    }
  }

  function handleAdd() {
    setEditingRole(null)
    setIsModalOpen(true)
  }

  function handleEdit(role) {
    setEditingRole(role)
    setIsModalOpen(true)
  }

  if (loading) return <div className="muted p-20">Loading roles...</div>

  return (
    <div className="stack gap-20">
      <div className="row">
        <div>
          <h3 style={{ margin: 0 }}>Roles Management</h3>
          <p className="muted text-small">Configure specialized access levels and module permissions</p>
        </div>
        <button className="btn primary" onClick={handleAdd}>
          <Icon name="plus" /> Add New Role
        </button>
      </div>

      {error ? <div className="alert error">{error}</div> : null}

      <div className="tableWrap">
        <table className="table">
          <thead>
            <tr>
              <th>ROLE NAME</th>
              <th>PERMISSIONS</th>
              <th className="text-center">USERS</th>
              <th>STATUS</th>
              <th className="text-right">ACTION</th>
            </tr>
          </thead>
          <tbody>
            {roles.map(role => (
              <tr key={role.id}>
                <td>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{role.name}</div>
                  <div className="extra-small muted">{new Date(role.created_at).toLocaleDateString()}</div>
                </td>
                <td className="mobile-hide">
                  <div className="text-small muted">{role.description || '—'}</div>
                </td>
                <td>
                  <div style={{ fontSize: '0.85rem' }}>
                    {role.is_system_role || role.permissions?.length >= 12 ? (
                      <span className="badge success x-small" style={{ fontWeight: 700 }}>ALL ACCESS</span>
                    ) : (
                      <div className="row tiny-gap wrap">
                        {role.permissions?.slice(0, 3).map(p => (
                          <span key={p} className="badge secondary x-small" style={{ fontSize: '0.65rem' }}>{p}</span>
                        ))}
                        {role.permissions?.length > 3 && (
                          <span className="muted text-small">+{role.permissions.length - 3} more</span>
                        )}
                      </div>
                    )}
                  </div>
                </td>
                <td className="text-center">
                  <span style={{ fontWeight: 600 }}>{role.userCount || 0}</span>
                </td>
                <td>
                  <span className={`badge-modern ${role.status === 'active' ? 'success' : 'danger'}`}>
                    <span className="badge-dot"></span>
                    {role.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="text-right">
                  <div className="tableActions row reverse grow-0 tiny-gap">
                    {role.is_system_role ? (
                      <div className="iconBtn small locked" style={{ cursor: 'default', opacity: 0.6 }} title="System Role (Locked)">
                        <Icon name="lock" size={14} />
                      </div>
                    ) : (
                      <>
                        <button className="iconBtn text-danger small" onClick={() => onDelete(role)} title="Delete Role">
                          <Icon name="trash" />
                        </button>
                        <button className="iconBtn small" onClick={() => handleEdit(role)} title="Edit Role">
                          <Icon name="edit" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <RoleFormModal 
          role={editingRole} 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={() => {
            setIsModalOpen(false)
            loadRoles()
          }}
        />
      )}
    </div>
  )
}
