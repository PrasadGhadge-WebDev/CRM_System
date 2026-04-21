import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { leadSourcesApi } from '../../../services/leadSources'
import { Icon } from '../../../layouts/icons.jsx'

const CATEGORIES = ['Paid', 'Organic', 'Referral', 'Direct'];

export default function LeadSourceFormModal({ source, onClose, onSuccess }) {
  const isEdit = !!source
  const [loading, setLoading] = useState(false)
  const [model, setModel] = useState({
    name: '',
    category: 'Direct',
    cost_per_lead: 0,
    is_default: false,
    status: 'active'
  })

  useEffect(() => {
    if (source) {
      setModel({
        name: source.name || '',
        category: source.category || 'Direct',
        cost_per_lead: source.cost_per_lead || 0,
        is_default: !!source.is_default,
        status: source.status || 'active'
      })
    }
  }, [source])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!model.name.trim()) {
      toast.warn('Name is required')
      return
    }

    setLoading(true)
    try {
      await leadSourcesApi.save({
        ...model,
        id: source?._id || source?.id,
      })
      toast.success(isEdit ? 'Source updated' : 'Source created')
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
          <h3 style={{ margin: 0 }}>{isEdit ? 'Edit Lead Source' : 'Add New Source'}</h3>
          <button className="iconBtn" onClick={onClose}><Icon name="close" /></button>
        </div>

        <form className="crm-modal-body stack gap-20" onSubmit={handleSubmit}>
          <div className="stack tiny-gap">
            <label className="text-small muted" style={{ fontWeight: 600 }}>Source Name *</label>
            <input
              className="input"
              value={model.name}
              onChange={e => setModel(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Google Ads, Facebook"
              required
            />
          </div>

          <div className="row gap-20">
            <div className="stack tiny-gap" style={{ flex: 1 }}>
              <label className="text-small muted" style={{ fontWeight: 600 }}>Category</label>
              <select 
                className="input" 
                value={model.category} 
                onChange={e => setModel(p => ({ ...p, category: e.target.value }))}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            
            <div className="stack tiny-gap" style={{ width: '120px' }}>
               <label className="text-small muted" style={{ fontWeight: 600 }}>Avg. Cost (₹)</label>
               <input
                 className="input"
                 type="number"
                 value={model.cost_per_lead}
                 onChange={e => setModel(p => ({ ...p, cost_per_lead: Number(e.target.value) }))}
               />
            </div>
          </div>

          <div className="row justify-between align-center">
             <label className="row tiny-gap align-center pointer">
               <input 
                 type="checkbox" 
                 checked={model.is_default} 
                 onChange={e => setModel(p => ({ ...p, is_default: e.target.checked }))} 
               />
               <span className="text-small">Set as Default Source</span>
             </label>

             <div className="row align-center gap-8">
                <span className="text-small muted">Status:</span>
                <select 
                  className="input small" 
                  style={{ width: '100px' }}
                  value={model.status} 
                  onChange={e => setModel(p => ({ ...p, status: e.target.value }))}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
             </div>
          </div>

          <div className="tableActions" style={{ marginTop: '10px' }}>
            <button className="btn secondary" type="button" onClick={onClose} disabled={loading}>Cancel</button>
            <button className="btn primary" type="submit" disabled={loading}>
              {loading ? 'Saving...' : (isEdit ? 'Update Source' : 'Create Source')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
