import { useState, useEffect } from 'react'
import { Icon } from '../../../layouts/icons.jsx'
import { customersApi } from '../../../services/customers.js'
import { usersApi } from '../../../services/users.js'
import { dealsApi } from '../../../services/deals.js'
import { toast } from 'react-toastify'

const STAGES = ['New', 'Qualified', 'Proposal', 'Won', 'Lost']

export default function DealModal({ deal, isOpen, onClose, onSave, customerId }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    customer_id: customerId || '',
    value: 0,
    stage: 'New',
    assigned_to: '',
    expected_close_date: '',
    description: '',
    lost_reason: ''
  })

  const [customers, setCustomers] = useState([])
  const [employees, setEmployees] = useState([])

  useEffect(() => {
    if (isOpen) {
      loadInitialData()
      if (deal) {
        setFormData({
          name: deal.name || '',
          customer_id: deal.customer_id?.id || deal.customer_id || customerId || '',
          value: deal.value || 0,
          stage: deal.stage || 'New',
          assigned_to: deal.assigned_to?.id || deal.assigned_to || '',
          expected_close_date: deal.expected_close_date ? new Date(deal.expected_close_date).toISOString().split('T')[0] : '',
          description: deal.description || '',
          lost_reason: deal.lost_reason || ''
        })
      } else {
        setFormData(prev => ({ ...prev, customer_id: customerId || '', stage: 'New' }))
      }
    }
  }, [isOpen, deal, customerId])

  async function loadInitialData() {
    try {
      const [cRes, uRes] = await Promise.all([
        customersApi.list({ limit: 'all' }),
        usersApi.list({ limit: 'all' })
      ])
      setCustomers(cRes.items || cRes || [])
      setEmployees(uRes.items || uRes || [])
    } catch (err) {
      console.error('Failed to load selection data')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      let savedDeal
      if (deal?.id) {
        savedDeal = await dealsApi.update(deal.id, formData)
        toast.success('Deal updated')
      } else {
        savedDeal = await dealsApi.create(formData)
        toast.success('Deal created')
      }
      onSave(savedDeal)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-shell glass-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Icon name="deals" className="primary-text" />
            <h2>{deal ? 'Edit Deal' : 'Create Deal'}</h2>
          </div>
          <button className="close-btn" onClick={onClose}><Icon name="plus" style={{ transform: 'rotate(45deg)' }} /></button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-field full-width">
              <label>Deal Name</label>
              <input 
                type="text" 
                placeholder="e.g. New Website Project" 
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
                autoFocus
              />
            </div>

            <div className="form-field">
              <label>Customer Name</label>
              <select 
                value={formData.customer_id}
                onChange={e => setFormData({ ...formData, customer_id: e.target.value })}
                required
                disabled={!!customerId}
              >
                <option value="">Select a customer...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="form-field">
              <label>Amount (₹)</label>
              <input 
                type="number" 
                value={formData.value}
                onChange={e => setFormData({ ...formData, value: Number(e.target.value) })}
                required
              />
            </div>

            <div className="form-field">
              <label>Deal Stage</label>
              <select 
                value={formData.stage}
                onChange={e => setFormData({ ...formData, stage: e.target.value })}
              >
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="form-field">
              <label>Assign to</label>
              <select 
                value={formData.assigned_to}
                onChange={e => setFormData({ ...formData, assigned_to: e.target.value })}
                required
              >
                <option value="">Select staff...</option>
                {employees.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>

            {formData.stage === 'Lost' && (
              <div className="form-field full-width">
                <label>Reason for Loss</label>
                <textarea 
                  placeholder="Why was the deal closed?..."
                  value={formData.lost_reason}
                  onChange={e => setFormData({ ...formData, lost_reason: e.target.value })}
                  required
                />
              </div>
            )}

            <div className="form-field full-width">
              <label>Notes</label>
              <textarea 
                placeholder="Enter any additional details here..."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-save" disabled={loading}>
              {loading ? <div className="spinner-mini" /> : <Icon name="check" />}
              <span>{deal ? 'Save Changes' : 'Create Deal'}</span>
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); display: flex; align-items: flex-start; justify-content: center; z-index: 2000; padding: 60px 24px; }
        .modal-shell { width: 100%; max-width: 760px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 32px; box-shadow: var(--shadow-2xl); display: flex; flex-direction: column; animation: modal-reveal 0.4s cubic-bezier(0.16, 1, 0.3, 1); position: relative; overflow: hidden; }
        .modal-shell::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, var(--primary), #a78bfa, var(--primary)); }
        
        @keyframes modal-reveal { from { transform: translateY(-40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        
        .modal-header { padding: 32px; border-bottom: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center; background: linear-gradient(to bottom, rgba(255,255,255,0.02), transparent); }
        .modal-title { display: flex; align-items: center; gap: 16px; }
        .modal-title h2 { margin: 0; font-size: 1.6rem; font-weight: 900; color: var(--text); letter-spacing: -0.02em; }
        .modal-title svg { color: var(--primary); font-size: 1.5rem; }
        
        .close-btn { width: 32px; height: 32px; border-radius: 10px; background: var(--bg-surface); border: 1px solid var(--border); color: var(--text-dimmed); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
        .close-btn:hover { background: rgba(239, 68, 68, 0.1); color: #f87171; border-color: rgba(239, 68, 68, 0.2); transform: rotate(90deg); }

        .modal-form { padding: 32px; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
        .full-width { grid-column: 1 / -1; }
        
        .form-field { display: flex; flex-direction: column; gap: 10px; }
        .form-field label { font-size: 0.7rem; font-weight: 900; color: var(--text-dimmed); text-transform: uppercase; letter-spacing: 0.1em; }
        .form-field input, .form-field select, .form-field textarea { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 14px; padding: 14px 18px; color: var(--text); font-size: 0.95rem; outline: none; transition: 0.2s; font-weight: 600; }
        .form-field input:focus, .form-field select:focus, .form-field textarea:focus { border-color: var(--primary); background: var(--bg-hover); box-shadow: 0 0 0 4px var(--primary-soft); }
        .form-field textarea { min-height: 100px; resize: none; line-height: 1.6; }

        .modal-actions { display: flex; justify-content: flex-end; gap: 16px; padding-top: 24px; border-top: 1px solid var(--border-subtle); }
        .btn-cancel { background: transparent; border: 1px solid var(--border); color: var(--text-muted); padding: 12px 28px; border-radius: 14px; font-weight: 800; cursor: pointer; transition: 0.2s; }
        .btn-cancel:hover { background: var(--bg-hover); color: var(--text); }
        .btn-save { background: var(--primary); color: white; border: none; padding: 12px 36px; border-radius: 14px; font-weight: 900; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: 0.3s; box-shadow: 0 8px 20px var(--primary-soft); }
        .btn-save:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 28px var(--primary-soft); filter: brightness(1.1); }
        .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }

        .spinner-mini { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
