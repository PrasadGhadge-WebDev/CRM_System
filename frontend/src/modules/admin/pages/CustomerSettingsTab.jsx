import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { settingsApi } from '../../../services/settings.js'
import { Icon } from '../../../layouts/icons.jsx'

export default function CustomerSettingsTab() {
  const [categories, setCategories] = useState([])
  const [newCategory, setNewCategory] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCategories()
  }, [])

  async function loadCategories() {
    try {
      setLoading(true)
      const data = await settingsApi.get()
      setCategories(data?.customerCategories || ['Enterprise', 'Individual', 'Government', 'Non-Profit'])
    } catch (e) { toast.error('Failed to load categories') } finally { setLoading(false) }
  }

  const handleAdd = async () => {
    if (!newCategory.trim()) return
    const updated = [...categories, newCategory.trim()]
    try {
      await settingsApi.update({ customerCategories: updated })
      setCategories(updated)
      setNewCategory('')
      toast.success('Category added')
    } catch (e) { toast.error('Save failed') }
  }

  const handleRemove = async (index) => {
    const updated = categories.filter((_, i) => i !== index)
    try {
      await settingsApi.update({ customerCategories: updated })
      setCategories(updated)
      toast.success('Category removed')
    } catch (e) { toast.error('Action failed') }
  }

  return (
    <div className="categories-pane">
      <div className="section-header-row">
        <h2 className="heading-bold">Client Categories</h2>
        <p style={{ color: '#9CA3AF', fontSize: '14px', margin: 0 }}>Define segmentation nodes for your customer database.</p>
      </div>

      <div className="settings-card">
        <div className="add-category-row">
          <input 
            type="text" className="input-v9" placeholder="Enter new category name..." 
            value={newCategory} onChange={e => setNewCategory(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleAdd()}
          />
          <button className="btn-primary-v9" onClick={handleAdd}>Add Category</button>
        </div>

        <div className="categories-list-grid">
          {categories.map((cat, i) => (
            <div key={i} className="category-tag-card">
              <span className="cat-name">{cat}</span>
              <button className="remove-cat-btn" onClick={() => handleRemove(i)}>×</button>
            </div>
          ))}
          {categories.length === 0 && !loading && (
            <div className="empty-state">No categories defined. Add one above to begin segmentation.</div>
          )}
        </div>
      </div>

      <style>{`
        .categories-pane { display: flex; flex-direction: column; gap: 24px; }
        .section-header-row { margin-bottom: 8px; }
        .heading-bold { font-size: 20px; font-weight: 700; color: #FFFFFF; margin-bottom: 8px; }

        .settings-card { background: #1A1D2B; padding: 24px; border-radius: 10px; border: 1px solid #2D3040; }
        
        .add-category-row { display: flex; gap: 12px; margin-bottom: 32px; }
        .input-v9 { flex: 1; background: #1F2232; border: 1px solid #2D3040; border-radius: 8px; padding: 12px; color: #FFFFFF; font-size: 14px; outline: none; }
        .input-v9:focus { border-color: #3B82F6; }
        
        .btn-primary-v9 { background: #3B82F6; color: #FFFFFF; border: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; }

        .categories-list-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
        .category-tag-card { 
          background: #1F2232; border: 1px solid #2D3040; padding: 14px 20px; border-radius: 8px; 
          display: flex; justify-content: space-between; align-items: center; transition: 0.2s;
        }
        .category-tag-card:hover { border-color: #3B82F6; background: rgba(59, 130, 246, 0.05); }
        .cat-name { font-size: 14px; font-weight: 700; color: #FFFFFF; }
        
        .remove-cat-btn { background: none; border: none; color: #6B7280; font-size: 20px; cursor: pointer; line-height: 1; }
        .remove-cat-btn:hover { color: #EF4444; }

        .empty-state { grid-column: 1 / -1; text-align: center; padding: 40px; color: #6B7280; font-size: 14px; }
      `}</style>
    </div>
  )
}
