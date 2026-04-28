import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { settingsApi } from '../../../services/settings.js'
import { Icon } from '../../../layouts/icons.jsx'

export default function CustomerSettingsTab() {
  const [types, setTypes] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    settingsApi.get()
      .then(res => {
        setTypes(res.customerTypes || [])
        setCategories(res.customerCategories || [])
      })
      .catch(e => toast.error('Failed to load customer settings'))
      .finally(() => setLoading(false))
  }, [])

  const saveSettings = async (newTypes, newCats) => {
    setSaving(true)
    try {
      await settingsApi.update({ customerTypes: newTypes, customerCategories: newCats })
      toast.success('Settings updated successfully')
    } catch (e) {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleAddType = () => setTypes([...types, 'New Type'])
  const handleRemoveType = (idx) => setTypes(types.filter((_, i) => i !== idx))
  const handleTypeChange = (idx, val) => {
    const next = [...types]; next[idx] = val; setTypes(next)
  }

  const handleAddCategory = () => setCategories([...categories, 'New Category'])
  const handleRemoveCategory = (idx) => setCategories(categories.filter((_, i) => i !== idx))
  const handleCategoryChange = (idx, val) => {
    const next = [...categories]; next[idx] = val; setCategories(next)
  }

  if (loading) return <div className="center padding40 muted">Loading customer settings...</div>

  return (
    <div className="stack gap-32">
      <div className="grid2 gap-24">
        {/* CUSTOMER TYPES */}
        <div className="glass-panel intel-form-card">
          <div className="card-header-premium">
            <Icon name="users" />
            <h3>Customer Types</h3>
          </div>
          <div className="card-body-premium stack gap-16">
            <p className="text-xs muted">Define different classifications for your clients (e.g. Enterprise, Individual).</p>
            <div className="stack gap-8">
              {types.map((type, idx) => (
                <div key={idx} className="flex gap-8 items-center">
                  <input 
                    className="input-premium" 
                    value={type} 
                    onChange={e => handleTypeChange(idx, e.target.value)} 
                  />
                  <button className="action-btn-mini danger" onClick={() => handleRemoveType(idx)}>
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              ))}
              <button className="btn-premium action-vibrant" onClick={handleAddType}>
                <Icon name="plus" size={14} />
                <span>Add Type</span>
              </button>
            </div>
          </div>
        </div>

        {/* CUSTOMER CATEGORIES */}
        <div className="glass-panel intel-form-card">
          <div className="card-header-premium">
            <Icon name="filter" />
            <h3>Customer Categories</h3>
          </div>
          <div className="card-body-premium stack gap-16">
            <p className="text-xs muted">Segmentation for reporting and filtering (e.g. Retail, Wholesale).</p>
            <div className="stack gap-8">
              {categories.map((cat, idx) => (
                <div key={idx} className="flex gap-8 items-center">
                  <input 
                    className="input-premium" 
                    value={cat} 
                    onChange={e => handleCategoryChange(idx, e.target.value)} 
                  />
                  <button className="action-btn-mini danger" onClick={() => handleRemoveCategory(idx)}>
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              ))}
              <button className="btn-premium action-vibrant" onClick={handleAddCategory}>
                <Icon name="plus" size={14} />
                <span>Add Category</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="form-action-footer">
        <button 
          className="btn-premium action-vibrant" 
          disabled={saving}
          onClick={() => saveSettings(types, categories)}
        >
          {saving ? <div className="spinner-mini" /> : <Icon name="check" size={16} />}
          <span>Save Intelligence Parameters</span>
        </button>
      </div>

      <style>{`
        .card-header-premium { display: flex; align-items: center; gap: 12px; padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .card-header-premium h3 { margin: 0; font-size: 0.95rem; font-weight: 800; }
        .card-body-premium { padding: 20px; }
        .form-action-footer { margin-top: 12px; padding: 20px; background: rgba(15, 23, 42, 0.4); border-radius: 20px; display: flex; justify-content: flex-end; }
      `}</style>
    </div>
  )
}
