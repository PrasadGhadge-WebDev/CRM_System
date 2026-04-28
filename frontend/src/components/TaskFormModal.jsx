import { useState, useEffect, useRef } from 'react'
import { activitiesApi } from '../services/activities'
import { usersApi } from '../services/users'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'
import { Icon } from '../layouts/icons.jsx'

export default function TaskFormModal({ isOpen, onClose, onSave, task = null, isFollowUp = false, leadName = '' }) {
  const [model, setModel] = useState({
    activity_type: 'task',
    description: '',
    due_date: '',
    status: 'planned',
    related_to: null,
    related_type: null,
  })
  const [saving, setSaving] = useState(false)
  const [users, setUsers] = useState([])
  const { user } = useAuth()
  const firstInputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      const filter = user.role === 'Admin' ? { limit: 100 } : { manager_id: user.id, limit: 100 }
      usersApi.list(filter).then(res => {
        const team = res.items?.filter(u => u.status === 'active') || []
        if (!team.some(t => t.id === user.id)) team.push(user)
        setUsers(team)
      }).catch(() => {})
    }
  }, [isOpen, user])

  useEffect(() => {
    if (isOpen && firstInputRef.current) {
      // Small delay to ensure the modal is fully rendered
      setTimeout(() => {
        firstInputRef.current.focus()
      }, 100)
    }
  }, [isOpen])

  useEffect(() => {
    if (task) {
      setModel({
        activity_type: task.activity_type || 'task',
        description: task.description || '',
        due_date: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '',
        status: task.status || 'planned',
        related_to: task.related_to?.id || task.related_to || null,
        related_type: task.related_type || null,
        assigned_to: task.assigned_to?.id || task.assigned_to || user.id,
      })
    } else {
      setModel({
        activity_type: 'task',
        description: '',
        due_date: new Date().toISOString().split('T')[0],
        status: 'planned',
        related_to: null,
        related_type: null,
        assigned_to: user.id
      })
    }
  }, [task, isOpen, user.id])

  if (!isOpen) return null

  async function handleSubmit(e) {
    e.preventDefault()
    if (!model.description.trim()) {
      toast.error('Action taken is required')
      return
    }
    if (!model.due_date) {
      toast.error('Please select a follow-up date')
      return
    }
    if (!model.assigned_to) {
      toast.error('Please select an agent')
      return
    }

    setSaving(true)
    try {
      if (task?.id) {
        await activitiesApi.update(task.id, model)
        toast.success('Follow-up updated')
      } else {
        await activitiesApi.create(model)
        toast.success('Follow-up scheduled')
      }
      onSave()
      onClose()
    } catch (err) {
      toast.error('Sync failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modalOverlay" onClick={onClose} style={{ zIndex: 3000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '60px' }}>
      <div className="modalContent crmContent" onClick={(e) => e.stopPropagation()} style={{ padding: 0, maxWidth: '760px', borderRadius: '22px', boxShadow: '0 30px 80px rgba(0,0,0,0.35)' }}>
        <div className="crm-form-card" style={{ padding: '28px 34px', background: 'rgba(8, 15, 33, 0.98)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="row align-center" style={{ justifyContent: 'space-between', marginBottom: 24, paddingBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="stack gap-4">
              <span className="crm-form-kicker" style={{ color: '#84c0ff', fontSize: '0.78rem', fontWeight: '800', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{isFollowUp ? 'Follow-up Scheduler' : 'Activity Hub'}</span>
              <h3 className="crm-form-section-title" style={{ margin: 0, fontSize: '1.75rem', fontWeight: '900', color: '#f8fafc' }}>
                {isFollowUp ? (task?.id ? 'Edit Follow-up' : 'Add Follow-up') : (task ? 'Edit Task' : 'New Activity')}
              </h3>
            </div>
            <button className="btn small secondary" onClick={onClose} style={{ borderRadius: '14px', padding: '10px 14px', minWidth: '48px', textAlign: 'center' }}>&times;</button>
          </div>

          <form className="crm-form" onSubmit={handleSubmit} style={{ gap: '22px' }}>
            {isFollowUp && (
              <div className="crm-field full-width" style={{ marginBottom: '4px' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '8px', display: 'block' }}>Lead</label>
                <div className="crm-input-shell" style={{ background: '#111b34', border: '1px solid rgba(148,163,184,0.14)', borderRadius: '18px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Icon name="user" />
                  <input
                    className="crm-input"
                    value={leadName || ''}
                    readOnly
                    style={{ background: 'transparent', border: 'none', outline: 'none', color: '#f8fafc', fontWeight: '700', width: '100%' }}
                  />
                </div>
              </div>
            )}

            <div className="crm-form-grid-2" style={{ gap: '18px' }}>
              <div className="crm-field">
                <label style={{ fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '8px', display: 'block' }}>Mode</label>
                <div className="crm-input-shell" style={{ background: '#111b34', border: '1px solid rgba(148,163,184,0.14)', borderRadius: '18px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Icon name="reports" />
                  <select
                    className="crm-select"
                    value={model.activity_type}
                    onChange={(e) => setModel({ ...model, activity_type: e.target.value })}
                    style={{ background: 'transparent', border: 'none', outline: 'none', color: '#f8fafc', width: '100%' }}
                  >
                    <option value="task">Task</option>
                    <option value="call">Call</option>
                    <option value="meeting">Meeting</option>
                    <option value="email">Email</option>
                  </select>
                </div>
              </div>
              <div className="crm-field">
                <label style={{ fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '8px', display: 'block' }}>Status</label>
                <div className="crm-input-shell" style={{ background: '#111b34', border: '1px solid rgba(148,163,184,0.14)', borderRadius: '18px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Icon name="activity" />
                  <select
                    className="crm-select"
                    value={model.status}
                    onChange={(e) => setModel({ ...model, status: e.target.value })}
                    style={{ background: 'transparent', border: 'none', outline: 'none', color: '#f8fafc', width: '100%' }}
                  >
                    <option value="planned">Planned</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="crm-field full-width">
              <label style={{ fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '8px', display: 'block' }}>Action Taken</label>
              <div className="crm-input-shell" style={{ borderRadius: '20px', padding: '14px 18px', background: '#0f172a', border: '1px solid rgba(148,163,184,0.14)' }}>
                <Icon name="edit" />
                <textarea
                  ref={firstInputRef}
                  className="crm-input"
                  rows={5}
                  value={model.description}
                  onChange={(e) => setModel({ ...model, description: e.target.value })}
                  placeholder="What was discussed?"
                  style={{ minHeight: '140px', resize: 'vertical', background: 'transparent', border: 'none', outline: 'none', color: '#f8fafc', width: '100%' }}
                />
              </div>
            </div>

            <div className="crm-form-grid-2" style={{ gap: '18px' }}>
              <div className="crm-field">
                <label style={{ fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '8px', display: 'block' }}>Next Follow-up</label>
                <div className="crm-input-shell" style={{ borderRadius: '18px', padding: '14px 18px', background: '#111b34', border: '1px solid rgba(148,163,184,0.14)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Icon name="calendar" />
                  <input
                    className="crm-input"
                    type="date"
                    value={model.due_date}
                    onChange={(e) => setModel({ ...model, due_date: e.target.value })}
                    style={{ border: 'none', outline: 'none', background: 'transparent', color: '#f8fafc', width: '100%' }}
                  />
                </div>
              </div>
              <div className="crm-field">
                <label style={{ fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '8px', display: 'block' }}>Agent</label>
                <div className="crm-input-shell" style={{ background: '#111b34', border: '1px solid rgba(148,163,184,0.14)', borderRadius: '18px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Icon name="user" />
                  <select
                    className="crm-select"
                    value={model.assigned_to || user.id}
                    onChange={(e) => setModel({ ...model, assigned_to: e.target.value })}
                    style={{ background: 'transparent', border: 'none', outline: 'none', color: '#f8fafc', width: '100%' }}
                  >
                    <option value={user.id}>Self</option>
                    {users.filter(u => u.id !== user.id).map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="crm-form-actions" style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
              <button type="button" className="btn secondary" onClick={onClose} style={{ borderRadius: '16px', padding: '12px 24px', border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(255,255,255,0.04)', color: '#f8fafc' }}>Close</button>
              <button type="submit" className="btn primary" disabled={saving} style={{ borderRadius: '16px', padding: '12px 26px', background: '#3b82f6', color: 'var(--text)', fontWeight: '700' }}>
                {saving ? 'Saving...' : (isFollowUp ? 'Save Follow-up' : 'Record Activity')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
