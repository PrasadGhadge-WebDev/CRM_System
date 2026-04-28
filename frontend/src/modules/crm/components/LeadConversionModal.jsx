import { useState, useEffect } from 'react'
import { usersApi } from '../../../services/users.js'
import { leadSourcesApi } from '../../../services/leadSources.js'
import { customersApi } from '../../../services/customers.js'
import { Icon } from '../../../layouts/icons.jsx'
import { toast } from 'react-toastify'
import { useAuth } from '../../../context/AuthContext.jsx'

export default function LeadConversionModal({ isOpen, lead, onClose, onConverted }) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'Admin'
  const [employees, setEmployees] = useState([])
  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    assigned_to: '',
    source: '',
    initial_note: ''
  })

  useEffect(() => {
    if (!isOpen || !lead) return
    setLoading(true)
    Promise.all([
      usersApi.list({ limit: 'all' }),
      leadSourcesApi.list()
    ]).then(([uRes, sRes]) => {
      setEmployees(uRes.items || [])
      setSources(sRes || [])
      setForm({
        assigned_to: lead.assignedTo?._id || lead.assignedTo?.id || lead.assignedTo || '',
        source: lead.source || '',
        initial_note: `Lead changed to customer. Lead ID: ${lead.leadId}`
      })
    }).finally(() => setLoading(false))
  }, [isOpen, lead])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.assigned_to || !form.source) {
      return toast.warn('Please select user and source')
    }

    setSaving(true)
    try {
      const res = await customersApi.convertLead({
        lead_id: lead.id || lead._id,
        assigned_to: form.assigned_to,
        source: form.source,
        initial_note: form.initial_note
      })
      toast.success('Lead converted successfully')
      onConverted(res)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not convert lead')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className={`modal-overlay-premium ${isAdmin ? 'admin-header-open' : ''}`}>
      <div className="modal-content-glass">
        <form onSubmit={handleSubmit} className="conversion-form-shell">
          <div className="conversion-header-vibrant">
             <div className="header-glow" />
             <div className="header-main">
                <div className="header-icon-box">
                  <Icon name="check" size={24} />
                </div>
                <div className="header-text">
                  <h2>Convert Lead</h2>
                  <p>Convert <strong>{lead?.name}</strong> to customer.</p>
                </div>
             </div>
          </div>

          <div className="conversion-body">
            <div className="conversion-field">
              <label>Assigned User</label>
              <div className="select-wrap-modern">
                <select 
                  className="input-premium-select"
                  value={form.assigned_to}
                  onChange={e => setForm({...form, assigned_to: e.target.value})}
                  required
                >
                  <option value="">Select user</option>
                  {employees.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                </select>
                <div className="select-arrow"><Icon name="chevron-down" size={12} /></div>
              </div>
            </div>

            <div className="conversion-field">
              <label>Source</label>
              <div className="select-wrap-modern">
                <select 
                  className="input-premium-select"
                  value={form.source}
                  onChange={e => setForm({...form, source: e.target.value})}
                  required
                >
                  <option value="">Select source</option>
                  {sources.map(s => <option key={s.id || s.name} value={s.name}>{s.name}</option>)}
                </select>
                <div className="select-arrow"><Icon name="chevron-down" size={12} /></div>
              </div>
            </div>

            <div className="conversion-field">
              <label>Note</label>
              <textarea 
                className="textarea-premium"
                placeholder="Add a short note"
                value={form.initial_note}
                onChange={e => setForm({...form, initial_note: e.target.value})}
              />
            </div>
          </div>

          <div className="conversion-footer">
            <button type="button" onClick={onClose} className="btn-modern-ghost">Cancel</button>
            <button 
              type="submit" 
              disabled={saving}
              className="btn-modern-vibrant"
            >
              {saving ? 'Saving...' : 'Convert'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .modal-overlay-premium { position: fixed; inset: 0; z-index: 1000; background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; padding: 20px; animation: modalFadeIn 0.3s ease; }
        .modal-overlay-premium.admin-header-open { align-items: flex-start; padding-top: 72px; }
        .modal-content-glass { width: 100%; max-width: 520px; background: var(--bg-surface); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 28px; overflow: hidden; box-shadow: 0 24px 48px rgba(0, 0, 0, 0.5); animation: modalZoomIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        
        .conversion-form-shell { display: flex; flex-direction: column; }
        .conversion-header-vibrant { position: relative; padding: 32px; background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(147, 51, 234, 0.1)); border-bottom: 1px solid rgba(255, 255, 255, 0.05); overflow: hidden; }
        .header-glow { position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%); pointer-events: none; }
        .header-main { display: flex; align-items: center; gap: 20px; position: relative; z-index: 1; }
        .header-icon-box { width: 48px; height: 48px; background: var(--primary); color: white; border-radius: 14px; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 16px rgba(59, 130, 246, 0.4); }
        .header-text h2 { margin: 0; font-size: 1.5rem; font-weight: 900; color: var(--text); }
        .header-text p { margin: 4px 0 0; font-size: 0.9rem; color: var(--text-dimmed); }
        .header-text strong { color: var(--text); }

        .conversion-body { padding: 32px; display: grid; gap: 24px; }
        .conversion-field label { display: block; font-size: 0.72rem; font-weight: 800; color: var(--text-dimmed); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 10px; }
        
        .select-wrap-modern { position: relative; }
        .input-premium-select { width: 100%; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 12px; padding: 12px 16px; color: var(--text); font-size: 0.95rem; outline: none; appearance: none; cursor: pointer; transition: all 0.2s ease; }
        .input-premium-select:focus { border-color: var(--primary); background: rgba(255, 255, 255, 0.08); }
        .input-premium-select option { background: var(--bg-surface); color: var(--text); }
        .select-arrow { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); pointer-events: none; color: var(--text-dimmed); }
        
        .textarea-premium { width: 100%; min-height: 100px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 12px 16px; color: var(--text); font-size: 0.95rem; outline: none; resize: none; transition: all 0.2s ease; }
        .textarea-premium:focus { border-color: var(--primary); background: rgba(255, 255, 255, 0.08); }

        .conversion-footer { padding: 24px 32px; background: rgba(0, 0, 0, 0.2); border-top: 1px solid rgba(255, 255, 255, 0.05); display: flex; justify-content: flex-end; gap: 16px; }
        .btn-modern-ghost { background: none; border: none; color: var(--text-muted); font-weight: 700; font-size: 0.9rem; cursor: pointer; transition: color 0.2s ease; }
        .btn-modern-ghost:hover { color: var(--text); }
        .btn-modern-vibrant { background: var(--primary); color: white; border: none; border-radius: 12px; padding: 12px 28px; font-weight: 800; font-size: 0.9rem; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 8px 16px rgba(59, 130, 246, 0.2); }
        .btn-modern-vibrant:hover { transform: translateY(-2px); filter: brightness(1.1); }
        .btn-modern-vibrant:disabled { opacity: 0.5; transform: none; cursor: not-allowed; }

        @media (max-width: 768px) {
          .modal-overlay-premium.admin-header-open { padding-top: 20px; }
        }

        @keyframes modalFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalZoomIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>
    </div>
  )
}
