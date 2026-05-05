import { useEffect, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'react-toastify'
import { rolesApi } from '../../../services/roles.js'
import { Icon } from '../../../layouts/icons.jsx'
import PageHeader from '../../../components/PageHeader.jsx'
import Pagination from '../../../components/Pagination.jsx'

const MODULE_LIST = [
  'Dashboard', 'Leads', 'Contacts', 'Deals', 'Tasks', 
  'Calendar', 'Reports', 'Invoices', 'Settings', 'Users'
]

const PERM_TYPES = ['View', 'Edit', 'Create', 'Delete']

const SAMPLE_ROLES = [
  { id: '1', name: 'Super Admin', description: 'Full system access', status: 'active', permissions: [] },
  { id: '2', name: 'Admin', description: 'Settings & users access', status: 'active', permissions: [] },
  { id: '3', name: 'Manager', description: 'Team & reports access', status: 'active', permissions: [] },
  { id: '4', name: 'Sales Executive', description: 'Leads & deals', status: 'active', permissions: [] },
  { id: '5', name: 'Support Agent', description: 'Tickets & support', status: 'active', permissions: [] },
  { id: '6', name: 'Viewer', description: 'Read-only access', status: 'inactive', permissions: [] },
  { id: '7', name: 'Accountant', description: 'Invoices & payments', status: 'active', permissions: [] },
]

export default function RolesTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [isViewOnly, setIsViewOnly] = useState(false)
  
  const [selectedIds, setSelectedIds] = useState([])
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [appliedFilters, setAppliedFilters] = useState({ q: '', status: 'All' })

  const [form, setForm] = useState({ 
    name: '', 
    description: '', 
    permissions: {}, 
    globalPerms: { export: false, import: false, reports: false, manageUsers: false },
    status: 'Active' 
  })
  const [initialForm, setInitialForm] = useState(null)

  useEffect(() => { loadRoles() }, [])

  async function loadRoles() {
    try {
      setLoading(true)
      const data = await rolesApi.list()
      const roles = Array.isArray(data) ? data : (data?.data || [])
      const finalItems = roles.length > 0 ? roles : SAMPLE_ROLES
      setItems(finalItems)
      setTotal(finalItems.length)
    } catch (e) { 
      toast.error('Failed to load access nodes')
      setItems(SAMPLE_ROLES)
      setTotal(SAMPLE_ROLES.length)
    } finally { setLoading(false) }
  }

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesQ = item.name.toLowerCase().includes(appliedFilters.q.toLowerCase())
      const matchesStatus = appliedFilters.status === 'All' || item.status.toLowerCase() === appliedFilters.status.toLowerCase()
      return matchesQ && matchesStatus
    })
  }, [items, appliedFilters])

  const handleApplyFilters = () => {
    setAppliedFilters({ q: searchQuery, status: statusFilter })
    setPage(1)
  }

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(filteredItems.map(item => String(item.id || item._id)))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectRow = (id, checked) => {
    if (checked) {
      setSelectedIds(prev => [...prev, String(id)])
    } else {
      setSelectedIds(prev => prev.filter(i => i !== String(id)))
    }
  }

  const isAllSelected = filteredItems.length > 0 && selectedIds.length === filteredItems.length

  const handleSave = async (e) => {
    if (e) e.preventDefault()
    if (isViewOnly) { setIsModalOpen(false); return }

    const flattenedPermissions = []
    Object.entries(form.permissions).forEach(([mod, perms]) => {
      perms.forEach(p => flattenedPermissions.push(`${mod}.${p}`))
    })
    Object.entries(form.globalPerms).forEach(([key, val]) => {
      if (val) flattenedPermissions.push(`global.${key}`)
    })

    const payload = {
      name: form.name,
      description: form.description,
      permissions: flattenedPermissions,
      status: form.status.toLowerCase()
    }

    if (editingId && initialForm) {
      if (JSON.stringify(form) === JSON.stringify(initialForm)) {
        return toast.info('No changes detected')
      }
    }

    try {
      if (editingId && !String(editingId).startsWith('sample')) {
        await rolesApi.update(editingId, payload)
      } else {
        await rolesApi.create(payload)
      }
      toast.success('Access node synchronized')
      setIsModalOpen(false)
      loadRoles()
    } catch (err) { 
      toast.error(err.response?.data?.message || 'Role synchronization failed') 
    }
  }

  const handleEdit = (role, viewOnly = false) => {
    setEditingId(role.id || role._id)
    setIsViewOnly(viewOnly)
    const perms = Array.isArray(role.permissions) ? role.permissions : []
    const permissions = {}
    const globalPerms = { export: false, import: false, reports: false, manageUsers: false }
    
    perms.forEach(p => {
      const [mod, action] = p.split('.')
      if (mod === 'global') {
        if (globalPerms.hasOwnProperty(action)) globalPerms[action] = true
      } else {
        if (!permissions[mod]) permissions[mod] = []
        permissions[mod].push(action)
      }
    })

    const nextForm = {
      name: role.name,
      description: role.description || '',
      permissions,
      globalPerms,
      status: role.status ? (role.status.charAt(0).toUpperCase() + role.status.slice(1)) : 'Active'
    }
    setForm(nextForm)
    setInitialForm(nextForm)
    setIsModalOpen(true)
  }

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this institutional role? This action cannot be undone.')) {
      try {
        if (!String(id).startsWith('1') && !String(id).startsWith('sample')) {
          await rolesApi.remove(id)
        }
        toast.success('Access node removed')
        loadRoles()
      } catch (e) {
        toast.error(e.response?.data?.message || 'Failed to remove role')
      }
    }
  }

  const handleDeleteSelected = async () => {
    if (confirm(`Delete ${selectedIds.length} selected roles?`)) {
      try {
        await Promise.all(selectedIds.filter(id => !id.startsWith('sample')).map(id => rolesApi.remove(id)))
        toast.success('Selection removed')
        setSelectedIds([])
        loadRoles()
      } catch (e) {
        toast.error('Partial failure in bulk deletion')
      }
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-60 text-dimmed">
      <Icon name="refresh" size={32} className="animate-spin" />
      <span className="mt-16 font-900 tracking-widest uppercase">Fetching Roles...</span>
    </div>
  )

  const modalContent = isModalOpen && (
    <div className="crm-modal-portal-overlay">
      <div className="crm-modal-sheet animate-sheet-in" style={{ maxWidth: '1000px' }}>
        <div className="crm-modal-sheet-header">
          <div className="sheet-title-area">
            <h2 className="sheet-title">{isViewOnly ? 'View Role' : editingId ? 'Update Role' : 'Add New Role'}</h2>
            <p className="sheet-subtitle">{isViewOnly ? `Viewing permissions for ${form.name}` : editingId ? `Editing permissions for ${form.name}` : 'Initialize a new institutional role'}</p>
          </div>
        </div>

        <form className="crm-modal-sheet-body custom-scrollbar" onSubmit={handleSave}>
          <div className="sheet-content-container">
            <fieldset disabled={isViewOnly} style={{ border: 'none', padding: 0, margin: 0 }}>
              <section className="form-sheet-section">
                <div className="form-sheet-section-header">
                  <Icon name="user" />
                  <span>Identity & Scope</span>
                </div>
                <div className="form-sheet-grid">
                  <div className="sheet-field full-width">
                    <label>Role Designation</label>
                    <input
                      className="crm-input"
                      autoFocus
                      required
                      value={form.name}
                      onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="e.g., Senior Sales Lead"
                    />
                  </div>
                  <div className="sheet-field full-width">
                    <label>Operational Description</label>
                    <textarea
                      className="crm-input"
                      style={{ minHeight: '80px' }}
                      value={form.description}
                      onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                      placeholder="Briefly summarize the access scope of this role..."
                    />
                  </div>
                </div>
              </section>

              <section className="form-sheet-section">
                <div className="form-sheet-section-header">
                  <Icon name="shield" />
                  <span>Modular Permission Matrix</span>
                </div>
                <div className="permissions-matrix-grid">
                  {MODULE_LIST.map(mod => (
                    <div key={mod} className="matrix-card">
                      <div className="matrix-card-title">{mod.toUpperCase()}</div>
                      <div className="matrix-card-options">
                        {PERM_TYPES.map(type => (
                          <label key={type} className="matrix-option">
                            <input 
                              type="checkbox"
                              checked={(form.permissions[mod] || []).includes(type)}
                              onChange={() => togglePermission(mod, type)}
                            />
                            <span>{type}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="form-sheet-section no-border">
                <div className="form-sheet-section-header">
                  <Icon name="settings" />
                  <span>Institutional Overrides</span>
                </div>
                <div className="global-overrides-container">
                  <div className="overrides-grid">
                    {Object.keys(form.globalPerms).map(key => (
                      <label key={key} className="matrix-option global">
                        <input 
                          type="checkbox" 
                          checked={form.globalPerms[key]} 
                          onChange={e => setForm(p => ({ ...p, globalPerms: { ...p.globalPerms, [key]: e.target.checked } }))}
                        />
                        <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                      </label>
                    ))}
                  </div>

                  <div className="sheet-status-box">
                    <span className="text-xs font-900 text-dimmed">STATUS</span>
                    <button 
                      type="button" 
                      className={`sheet-toggle-btn ${form.status === 'Active' ? 'active' : ''}`}
                      onClick={() => !isViewOnly && setForm(p => ({ ...p, status: p.status === 'Active' ? 'Inactive' : 'Active' }))}
                    >
                      {form.status?.toUpperCase()}
                    </button>
                  </div>
                </div>
              </section>
            </fieldset>
          </div>
        </form>

        <div className="crm-modal-sheet-footer">
          <p className="footer-hint">Synchronize roles across all nodes.</p>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button className="crm-btn-premium glass" onClick={() => setIsModalOpen(false)}>{isViewOnly ? 'Close' : 'Cancel'}</button>
            {!isViewOnly && (
              <button className="crm-btn-premium vibrant" onClick={handleSave}>
                {editingId ? 'Update Role' : 'Create Role'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="crm-roles-module content-fade-in" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)', minHeight: '100vh', padding: '24px', fontFamily: 'Inter, sans-serif' }}>
      <PageHeader 
        title="Access Permissions" 
        description="Define institutional hierarchy and data visibility protocols."
        actions={
          <button className="role-add-btn-v7" onClick={() => { 
            setEditingId(null); 
            setIsViewOnly(false);
            setForm({ 
              name: '', description: '', permissions: {}, 
              globalPerms: { export: false, import: false, reports: false, manageUsers: false },
              status: 'Active' 
            }); 
            setIsModalOpen(true); 
          }}>
            <Icon name="plus" size={16} />
            <span>Add New Role</span>
          </button>
        }
      />

      <div className="role-top-action-bar">
        <div className="search-filter-group-v7">
          <div className="crm-search-bar-modern" style={{ maxWidth: '400px' }}>
            <input 
              type="text" 
              placeholder="Search Role..." 
              className="crm-search-input"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <button className="search-action-icon" onClick={handleApplyFilters}>
              <Icon name="search" />
            </button>
          </div>
          <select 
            className="filter-select-v7"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="All">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button className="btn-apply-v7" onClick={handleApplyFilters}>Apply</button>
        </div>
        
        {selectedIds.length > 0 && (
          <button className="btn-delete-selected-v7" onClick={handleDeleteSelected}>
            <Icon name="trash" size={14} />
            <span>Delete Selected ({selectedIds.length})</span>
          </button>
        )}
      </div>

      <div className="role-table-container-v7">
        <div className="crm-table-scroll">
          <table className="crm-table-v7">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input type="checkbox" checked={isAllSelected} onChange={e => handleSelectAll(e.target.checked)} />
                </th>
                <th style={{ width: '25%' }}>Role Name</th>
                <th style={{ width: '40%' }}>Description/Scope</th>
                <th style={{ width: '15%' }}>Status</th>
                <th className="text-right" style={{ width: '15%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((role, index) => {
                const id = String(role.id || role._id)
                const isSelected = selectedIds.includes(id)
                return (
                  <tr 
                    key={id} 
                    className={`role-row-v7 ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleEdit(role, false)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={isSelected} onChange={e => handleSelectRow(id, e.target.checked)} />
                    </td>
                    <td><span className="role-name-text">{role.name}</span></td>
                    <td><span className="role-desc-text">{role.description}</span></td>
                    <td>
                      <span className={`role-badge-v7 ${role.status.toLowerCase()}`}>
                        <div className="badge-dot-v7" />
                        {role.status.charAt(0).toUpperCase() + role.status.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="text-right" onClick={e => e.stopPropagation()}>
                      <div className="role-actions-group-v7">
                        <button className="action-icon-btn-v7 edit" onClick={() => handleEdit(role, false)} title="Edit Role"><Icon name="edit" size={14} /></button>
                        <button className="action-icon-btn-v7 delete" onClick={() => handleDelete(id)} title="Delete Role"><Icon name="trash" size={14} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="role-footer-v7">
        <div className="pagination-info-v7">
          Showing {Math.min((page - 1) * limit + 1, total)} to {Math.min(page * limit, total)} of {total} entries
        </div>
        <div style={{ transform: 'scale(0.9)', transformOrigin: 'right' }}>
          <Pagination 
            page={page} 
            limit={limit} 
            total={total} 
            onPageChange={setPage} 
            onLimitChange={setLimit} 
          />
        </div>
      </div>

      {isModalOpen && createPortal(modalContent, document.body)}

      <style>{`
        .crm-roles-module { font-size: 14px; }
        
        .role-add-btn-v7 {
          background: #3B82F6; color: white; border: none; border-radius: 8px; 
          padding: 10px 20px; font-weight: 700; font-size: 14px; display: flex; 
          align-items: center; gap: 8px; cursor: pointer; transition: 0.2s;
        }
        .role-add-btn-v7:hover { background: #2563EB; }

        .role-top-action-bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; margin-top: 32px; gap: 20px; }
        .search-filter-group-v7 { display: flex; align-items: center; gap: 12px; flex: 1; }
        
        .crm-search-bar-modern {
          display: flex;
          align-items: center;
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 0 4px 0 16px;
          height: 42px;
          transition: all 0.2s;
          flex: 1;
        }
        .crm-search-bar-modern:focus-within {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px var(--primary-soft);
        }
        .crm-search-input {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--text);
          font-size: 14px;
          outline: none;
        }
        .search-action-icon {
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--primary);
          color: white;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: 0.2s;
        }
        .search-action-icon:hover {
          background: var(--primary-hover);
          transform: scale(1.05);
        }

        
        .filter-select-v7 { 
          background: var(--bg-surface); border: 1px solid var(--border); color: var(--text); border-radius: 10px; 
          padding: 0 12px; height: 42px; outline: none; font-size: 14px; min-width: 140px;
        }
        
        .btn-apply-v7 {
          background: var(--primary); color: white; border: none; border-radius: 10px; 
          padding: 0 20px; height: 42px; font-weight: 700; cursor: pointer;
        }
        
        .btn-delete-selected-v7 {
          background: #EF4444; color: white; border: none; border-radius: 10px; 
          padding: 0 20px; height: 42px; font-weight: 700; display: flex; align-items: center; gap: 8px; cursor: pointer;
        }

        .role-table-container-v7 { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
        .crm-table-v7 { width: 100%; border-collapse: collapse; }
        .crm-table-v7 th { 
          background: var(--bg-surface); color: var(--text-muted); text-align: left; padding: 14px 16px; 
          font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;
          border-bottom: 1px solid var(--border);
        }
        .crm-table-v7 td { padding: 14px 16px; border-bottom: 1px solid var(--border); }
        
        .role-row-v7 { transition: background 0.2s; }
        .role-row-v7:hover { background: var(--bg-hover); }
        .role-row-v7.selected { background: var(--primary-soft); }
        
        .role-name-text { font-weight: 700; color: var(--text); }
        .role-desc-text { color: var(--text-muted); }
        
        .role-badge-v7 { 
          display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 99px; font-size: 12px; font-weight: 700;
        }
        .role-badge-v7.active { background: var(--primary-soft); color: var(--primary); }
        .role-badge-v7.active .badge-dot-v7 { width: 6px; height: 6px; border-radius: 50%; background: var(--primary); }
        
        .role-badge-v7.inactive { background: var(--bg-surface); color: var(--text-muted); }
        .role-badge-v7.inactive .badge-dot-v7 { width: 6px; height: 6px; border-radius: 50%; background: var(--text-dimmed); }

        .role-actions-group-v7 { display: flex; align-items: center; justify-content: flex-end; gap: 10px; }
        .action-icon-btn-v7 { 
          width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; 
          border: none; border-radius: 8px; cursor: pointer; transition: 0.2s; background: transparent;
        }
        .action-icon-btn-v7.view { color: var(--primary); }
        .action-icon-btn-v7.view:hover { background: var(--primary-soft); }
        .action-icon-btn-v7.edit { color: var(--warning); }
        .action-icon-btn-v7.edit:hover { background: color-mix(in srgb, var(--warning) 12%, transparent); }
        .action-icon-btn-v7.delete { color: var(--danger); }
        .action-icon-btn-v7.delete:hover { background: color-mix(in srgb, var(--danger) 12%, transparent); }

        .role-footer-v7 { display: flex; align-items: center; justify-content: space-between; margin-top: 24px; }
        .pagination-info-v7 { color: var(--text-muted); font-size: 13px; font-weight: 500; }

        .permissions-matrix-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 20px;
          margin-top: 16px;
        }
        .matrix-card {
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 16px;
          transition: all 0.2s;
        }
        .matrix-card:hover {
          border-color: var(--primary);
          box-shadow: var(--shadow-md);
        }
        .matrix-card-title {
          font-size: 11px;
          font-weight: 900;
          color: var(--primary);
          margin-bottom: 12px;
          letter-spacing: 0.1em;
        }
        .matrix-card-options {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .matrix-option {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
          cursor: pointer;
        }
        .matrix-option input {
          width: 16px;
          height: 16px;
          accent-color: var(--primary);
          cursor: pointer;
        }
        .global-overrides-container {
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 24px;
          margin-top: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 32px;
        }
        .overrides-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 24px;
        }
        .matrix-option.global {
          font-size: 14px;
          font-weight: 700;
        }
        .sheet-status-box {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 120px;
        }
        .sheet-toggle-btn {
          height: 40px;
          padding: 0 20px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: var(--bg-card);
          color: var(--text-muted);
          font-weight: 800;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .sheet-toggle-btn.active {
          background: var(--primary-soft);
          color: var(--primary);
          border-color: var(--primary);
        }

        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .content-fade-in { animation: fadeIn 0.4s ease-out; }
      `}</style>
    </div>
  )
}
