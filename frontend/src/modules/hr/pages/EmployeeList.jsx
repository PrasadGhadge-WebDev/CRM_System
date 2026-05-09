import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../../../layouts/icons'
import { api } from '../../../services/api'
import { toast } from 'react-toastify'
import { useAuth } from '../../../context/AuthContext'
import ModernSearchBar from '../../../components/ModernSearchBar.jsx'
import UserForm from '../../admin/pages/UserForm.jsx'

export default function EmployeeList() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20

  const [showAddForm, setShowAddForm] = useState(false)
  const [editingEmployeeId, setEditingEmployeeId] = useState(null)

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get(`/api/users?q=${q}&department=${deptFilter}&role=${roleFilter}&page=${page}&limit=${limit}`)
      setEmployees(res.items || [])
      setTotal(res.total || 0)
    } catch (err) {
      toast.error('Failed to load employee database')
    } finally {
      setLoading(false)
    }
  }, [q, deptFilter, roleFilter, page])

  useEffect(() => {
    fetchEmployees()
  }, [fetchEmployees])

  const toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    try {
      await api.put(`/api/users/${id}`, { status: newStatus })
      toast.success(`Employee status updated to ${newStatus}`)
      fetchEmployees()
    } catch (err) {
      toast.error('Status update failed')
    }
  }

  const activeCount = employees.filter(e => e.status === 'active').length
  const inactiveCount = employees.filter(e => e.status === 'inactive').length

  return (
    <div className="stack crmContent">
      <section className="crm-fullscreen-shell">
        <div className="users-page-header">
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div>
                <h1 className="users-title">Employee List</h1>
                <p className="users-subtitle">Manage your team and employees here.</p>
              </div>
              <button className="btn-premium action-vibrant" onClick={() => setShowAddForm(true)}>
                <Icon name="plus" />
                <span>Add Employee</span>
              </button>
           </div>
        </div>

        <div className="crm-stats-bar-compact overflow-x-auto pb-8">
           <div className="stat-pill-mini clickable" onClick={() => { setRoleFilter(''); setDeptFilter(''); }}>
              <span className="stat-pill-label">ALL EMPLOYEES</span>
              <span className="stat-pill-value total">{total}</span>
           </div>
           <div className="stat-pill-mini">
              <span className="stat-pill-label">ACTIVE</span>
              <span className="stat-pill-value success">{activeCount}</span>
           </div>
           <div className="stat-pill-mini">
              <span className="stat-pill-label">INACTIVE</span>
              <span className="stat-pill-value danger">{inactiveCount}</span>
           </div>
        </div>

        <div className="unified-action-bar">
          <div className="search-filter-group">
            <div className="searchWrap glass-panel" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px', padding: '0 16px', borderRadius: '12px', height: '42px', border: '1px solid var(--border)' }}>
              <Icon name="search" size={16} />
              <input 
                placeholder="Search ID, Name or Email..." 
                value={q} 
                onChange={e => { setQ(e.target.value); setPage(1); }} 
                style={{ background: 'transparent', border: 'none', color: 'var(--text)', outline: 'none', width: '100%' }}
              />
            </div>
            <div className="filter-group-premium" style={{ display: 'flex', gap: '12px' }}>
              <select className="crm-input filter-select" value={deptFilter} onChange={e => { setDeptFilter(e.target.value); setPage(1); }} style={{ width: '160px', height: '42px', borderRadius: '12px' }}>
                 <option value="">All Departments</option>
                 <option value="IT">IT & Tech</option>
                 <option value="Sales">Sales</option>
                 <option value="HR">Human Resources</option>
                 <option value="Finance">Finance</option>
              </select>
              <select className="crm-input filter-select" value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }} style={{ width: '160px', height: '42px', borderRadius: '12px' }}>
                 <option value="">All Roles</option>
                 <option value="Employee">Employee</option>
                 <option value="Manager">Manager</option>
                 <option value="Accountant">Accountant</option>
                 <option value="HR">HR</option>
              </select>
            </div>
          </div>
        </div>

        <div className="crm-table-wrap shadow-soft" style={{ background: 'var(--bg-card)', borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--border)' }}>
          <div className="crm-table-scroll">
            <table className="crm-table">
              <thead style={{ background: 'var(--bg-surface)' }}>
                <tr>
                  <th style={{ width: '80px' }}>ID</th>
                  <th style={{ minWidth: '240px' }}>EMPLOYEE NAME</th>
                  <th>DEPARTMENT</th>
                  <th>ROLE</th>
                  <th>STATUS</th>
                  <th>JOINING DATE</th>
                  <th className="text-right" style={{ width: '140px' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                   <tr><td colSpan="7" className="text-center p-24"><div className="spinner-medium" /></td></tr>
                ) : employees.length ? employees.map(emp => (
                  <tr key={emp.id} className="crm-table-row">
                    <td><span className="font-numeric-bold text-xs" style={{ color: 'var(--primary)' }}>{emp.employee_id || '---'}</span></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="payee-avatar-mini" style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--primary), #818cf8)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>{emp.name?.charAt(0)}</div>
                        <div className="stack gap-0">
                          <span className="font-bold">{emp.name}</span>
                          <span className="text-xs muted">{emp.email}</span>
                        </div>
                      </div>
                    </td>
                    <td><span className="text-xs font-bold">{emp.department || 'General'}</span></td>
                    <td><span className="status-pill-modern" style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 800, background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>{emp.role}</span></td>
                    <td>
                       <span className={`status-pill-modern ${emp.status === 'active' ? 'success' : 'danger'}`} style={{ 
                         padding: '4px 10px', 
                         borderRadius: '8px', 
                         fontSize: '0.65rem', 
                         fontWeight: 800, 
                         background: emp.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                         color: emp.status === 'active' ? '#10b981' : '#ef4444'
                       }}>
                          {emp.status?.toUpperCase()}
                       </span>
                    </td>
                    <td><span className="text-xs muted font-bold">{emp.joining_date ? new Date(emp.joining_date).toLocaleDateString() : '---'}</span></td>
                    <td className="text-right">
                       <div className="crm-action-group" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button className="modern-action-btn" onClick={() => navigate(`/hr/employees/${emp.id}`)} title="View Profile"><Icon name="user" size={14} /></button>
                          <button className="modern-action-btn" onClick={() => setEditingEmployeeId(emp.id)} title="Edit Details"><Icon name="edit" size={14} /></button>
                          <button className={`modern-action-btn ${emp.status === 'active' ? 'danger' : 'success'}`} onClick={() => toggleStatus(emp.id, emp.status)} title={emp.status === 'active' ? 'Deactivate' : 'Activate'}>
                             <Icon name={emp.status === 'active' ? 'close' : 'check'} size={14} />
                          </button>
                       </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="7" className="text-center p-24 muted">No employee records found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {showAddForm && (
        <UserForm 
          onCancel={() => setShowAddForm(false)} 
          onSuccess={() => { setShowAddForm(false); fetchEmployees(); }}
        />
      )}

      {editingEmployeeId && (
        <UserForm 
          userId={editingEmployeeId}
          mode="edit"
          onCancel={() => setEditingEmployeeId(null)}
          onSuccess={() => { setEditingEmployeeId(null); fetchEmployees(); }}
        />
      )}

      <style>{`
        .users-page-header { margin-bottom: 24px; }
        .users-title { font-size: 2rem; font-weight: 900; color: var(--text); margin: 0; }
        .users-subtitle { color: var(--text-dimmed); font-size: 0.95rem; margin: 4px 0 0 0; }
        
        .crm-stats-bar-compact { display: flex; gap: 16px; margin-bottom: 24px; padding-bottom: 16px; }
        .stat-pill-mini { --stat-accent: var(--card-accent); display: flex; flex-direction: column; min-width: 120px; background: color-mix(in srgb, var(--bg-card) 88%, var(--bg-surface) 12%); border: 1px solid var(--border-strong); padding: 14px 18px; border-radius: 16px; gap: 6px; box-shadow: inset 4px 0 0 var(--stat-accent), 0 10px 24px rgba(var(--text-rgb), 0.06); transition: all 0.25s ease; }
        .crm-stats-bar-compact .stat-pill-mini:nth-child(1) { --stat-accent: #3b82f6; }
        .crm-stats-bar-compact .stat-pill-mini:nth-child(2) { --stat-accent: #10b981; }
        .crm-stats-bar-compact .stat-pill-mini:nth-child(3) { --stat-accent: #ef4444; }
        .stat-pill-label { font-size: 0.65rem; font-weight: 800; color: var(--text-dimmed); text-transform: uppercase; letter-spacing: 0.05em; }
        .stat-pill-value { font-size: 1.2rem; font-weight: 900; color: var(--text); }
        .stat-pill-value.success { color: #10b981; }
        .stat-pill-value.danger { color: #ef4444; }
        .stat-pill-mini.clickable { cursor: pointer; transition: all 0.25s ease; }
        .stat-pill-mini.clickable:hover { transform: translateY(-2px); border-color: var(--stat-accent); box-shadow: inset 4px 0 0 var(--stat-accent), 0 14px 30px color-mix(in srgb, var(--stat-accent) 20%, rgba(var(--text-rgb), 0.08)); }

        .unified-action-bar { margin-bottom: 24px; }
        .search-filter-group { display: flex; gap: 16px; align-items: center; }

        .crm-table { width: 100%; border-collapse: separate; border-spacing: 0; }
        .crm-table th { text-align: left; padding: 16px; font-size: 0.7rem; font-weight: 800; color: var(--text-dimmed); text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--border-subtle); }
        .crm-table td { padding: 16px; border-bottom: 1px solid var(--border-subtle); vertical-align: middle; transition: background 0.2s; }
        .crm-table-row:hover td { background: var(--bg-surface); }
        
        .modern-action-btn { 
          width: 32px; 
          height: 32px; 
          border-radius: 10px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          border: 1px solid var(--border); 
          background: var(--bg-card); 
          color: var(--text-dimmed); 
          cursor: pointer; 
          transition: all 0.2s;
        }
        .modern-action-btn:hover { border-color: var(--primary); color: var(--primary); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(99, 102, 241, 0.1); }
        .modern-action-btn.danger:hover { border-color: #ef4444; color: #ef4444; }
        .modern-action-btn.success:hover { border-color: #10b981; color: #10b981; }
      `}</style>
    </div>
  )
}
