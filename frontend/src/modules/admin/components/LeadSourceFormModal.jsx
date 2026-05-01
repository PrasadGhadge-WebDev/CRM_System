import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { leadSourcesApi } from '../../../services/leadSources'
import { Icon } from '../../../layouts/icons.jsx'

export default function LeadSourceFormModal({ source, onClose, onSuccess }) {
  const isEdit = !!source
  const [loading, setLoading] = useState(false)
  const [model, setModel] = useState({
    name: '',
    order: 0,
    color: '#3b82f6',
    is_default: false,
    status: 'active'
  })

  useEffect(() => {
    if (source) {
      setModel({
        name: source.name || '',
        order: source.order || 0,
        color: source.color || '#3b82f6',
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
      toast.success(isEdit ? 'Source parameters updated' : 'Lead channel initialized')
      onSuccess()
    } catch (err) {
      toast.error(err.message || 'Operation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="crm-modal-portal-overlay">
      <div className="crm-modal-sheet animate-sheet-in" style={{ maxWidth: '450px' }}>
        <div className="crm-modal-sheet-header">
           <div className="sheet-title-area">
             <h2 className="sheet-title">{isEdit ? 'Modify Acquisition Node' : 'Initialize Acquisition Node'}</h2>
             <p className="sheet-subtitle">Configure lead source identity and priority metrics</p>
           </div>
        </div>

        <form className="crm-modal-sheet-body stack gap-20" onSubmit={handleSubmit}>
          <div className="sheet-field">
            <label>Channel Identity *</label>
            <input
              className="input-premium"
              value={model.name}
              onChange={e => setModel(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Google Ads, WhatsApp"
              required
            />
          </div>

          <div className="row gap-20">
            <div className="sheet-field" style={{ flex: 1 }}>
               <label>Display Priority</label>
               <input
                 className="input-premium"
                 type="number"
                 value={model.order || 0}
                 onChange={e => setModel(p => ({ ...p, order: Number(e.target.value) }))}
               />
            </div>
            <div className="sheet-field" style={{ width: '120px' }}>
               <label>Visual Token</label>
               <input
                 className="input-premium"
                 type="color"
                 style={{ padding: '4px', height: '44px' }}
                 value={model.color || '#3b82f6'}
                 onChange={e => setModel(p => ({ ...p, color: e.target.value }))}
               />
            </div>
          </div>

          <div className="row justify-between align-center" style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: '16px' }}>
             <label className="row tiny-gap align-center pointer font-800 text-xs">
                <input 
                  type="checkbox" 
                  checked={model.status === 'active'} 
                  onChange={e => setModel(p => ({ ...p, status: e.target.checked ? 'active' : 'inactive' }))} 
                />
                <span>OPERATIONAL</span>
             </label>

             <label className="row tiny-gap align-center pointer font-800 text-xs">
                <input 
                  type="checkbox" 
                  checked={model.is_default} 
                  onChange={e => setModel(p => ({ ...p, is_default: e.target.checked }))} 
                />
                <span>SYSTEM DEFAULT</span>
             </label>
          </div>
        </form>

        <div className="crm-modal-sheet-footer">
          <div className="flex gap-16 justify-end w-100">
            <button className="crm-btn-premium glass" type="button" onClick={onClose} disabled={loading}>Cancel</button>
            <button className="crm-btn-premium vibrant" type="submit" onClick={handleSubmit} disabled={loading}>
              {loading ? <div className="spinner-mini" /> : (isEdit ? 'Sync Node' : 'Initialize')}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .sheet-field { display: flex; flex-direction: column; gap: 8px; }
        .sheet-field label { font-size: 0.75rem; font-weight: 700; color: var(--text-dimmed); text-transform: uppercase; letter-spacing: 0.05em; }
        .w-100 { width: 100%; }
        .font-800 { font-weight: 800; }
        .text-xs { font-size: 0.75rem; }
      `}</style>
    </div>
  )
}
