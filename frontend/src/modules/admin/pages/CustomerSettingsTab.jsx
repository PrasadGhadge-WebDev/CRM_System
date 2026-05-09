import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { settingsApi } from '../../../services/settings.js'
import { Icon } from '../../../layouts/icons.jsx'
import PageHeader from '../../../components/PageHeader.jsx'

const DEFAULT_CATEGORIES = [
  { id: 'cat-1', name: 'Enterprise', type: 'Customer', status: 'Active', description: 'Large account segmentation for strategic clients.' },
  { id: 'cat-2', name: 'Travel', type: 'Expense', status: 'Active', description: 'Employee reimbursement and field travel claims.' },
  { id: 'cat-3', name: 'Technical', type: 'Ticket', status: 'Active', description: 'Support requests related to bugs and product issues.' },
]

const EMPTY_FORM = { name: '', type: 'Customer', status: 'Active', description: '' }

export default function CustomerSettingsTab() {
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    loadCategories()
  }, [])

  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return categories
    return categories.filter(item =>
      item.name.toLowerCase().includes(q) ||
      item.type.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q),
    )
  }, [categories, query])

  async function loadCategories() {
    try {
      setLoading(true)
      const data = await settingsApi.get()
      const incoming = data?.customerCategories || DEFAULT_CATEGORIES
      const normalized = incoming.map((item, index) => (
        typeof item === 'string'
          ? { id: `legacy-${index}`, name: item, type: 'Customer', status: 'Active', description: 'Legacy category migrated from previous settings.' }
          : {
              id: item.id || `cat-${index + 1}`,
              name: item.name || `Category ${index + 1}`,
              type: item.type || 'Customer',
              status: item.status || 'Active',
              description: item.description || '',
            }
      ))
      setCategories(normalized)
    } catch (e) {
      toast.error('Failed to load categories')
      setCategories(DEFAULT_CATEGORIES)
    } finally {
      setLoading(false)
    }
  }

  async function persist(nextCategories, successMessage) {
    try {
      setSaving(true)
      await settingsApi.update({ customerCategories: nextCategories })
      setCategories(nextCategories)
      toast.success(successMessage)
    } catch (e) {
      toast.error('Failed to save categories')
    } finally {
      setSaving(false)
    }
  }

  async function handleAdd() {
    if (!form.name.trim()) {
      toast.info('Category name is required')
      return
    }

    const nextCategories = [
      ...categories,
      { ...form, id: Date.now().toString(), name: form.name.trim(), description: form.description.trim() },
    ]

    await persist(nextCategories, 'Category added')
    setForm(EMPTY_FORM)
  }

  async function handleRemove(id) {
    await persist(categories.filter(item => item.id !== id), 'Category removed')
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-60 text-dimmed">
        <Icon name="refresh" size={32} className="animate-spin" />
        <span className="mt-16 font-900 tracking-widest uppercase">Loading Categories...</span>
      </div>
    )
  }

  return (
    <div className="categories-pane">
      <PageHeader
        title="Categories"
        description="Manage reusable system categories for customers, expenses, tickets, and deal classifications."
      />

      <div className="categories-layout">
        <section className="settings-card">
          <div className="card-topline">
            <div>
              <h3>Create Category</h3>
              <p>Define a category, assign its module type, and keep it active or archived.</p>
            </div>
            <div className="mini-chip">
              <Icon name="users" size={12} />
              <span>Global taxonomy</span>
            </div>
          </div>

          <div className="categories-form-grid">
            <div className="field-group">
              <label>Category Name</label>
              <input
                type="text"
                className="input-v9"
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Government, Travel, Technical"
              />
            </div>
            <div className="field-group">
              <label>Type</label>
              <select className="input-v9" value={form.type} onChange={e => setForm(prev => ({ ...prev, type: e.target.value }))}>
                <option value="Customer">Customer</option>
                <option value="Expense">Expense</option>
                <option value="Ticket">Ticket</option>
                <option value="Deal">Deal</option>
              </select>
            </div>
            <div className="field-group">
              <label>Status</label>
              <select className="input-v9" value={form.status} onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))}>
                <option value="Active">Active</option>
                <option value="Disabled">Disabled</option>
              </select>
            </div>
            <div className="field-group full-width">
              <label>Description</label>
              <textarea
                className="input-v9 textarea-v9"
                value={form.description}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Short explanation for admins and operators"
              />
            </div>
          </div>

          <div className="card-actions">
            <button className="btn secondary" onClick={() => setForm(EMPTY_FORM)} disabled={saving}>
              Reset
            </button>
            <button className="btn primary" onClick={handleAdd} disabled={saving}>
              {saving ? 'Saving...' : 'Add Category'}
            </button>
          </div>
        </section>

        <section className="settings-card">
          <div className="card-topline">
            <div>
              <h3>Saved Categories</h3>
              <p>Search and review categories currently available across the CRM.</p>
            </div>
          </div>

          <div className="search-row">
            <Icon name="search" size={14} />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search categories..." />
          </div>

          <div className="categories-list-grid">
            {filteredCategories.map((cat) => (
              <div key={cat.id} className="category-tag-card">
                <div className="cat-meta">
                  <span className="cat-name">{cat.name}</span>
                  <span className="cat-type">{cat.type}</span>
                  <span className={`cat-status ${cat.status.toLowerCase()}`}>{cat.status}</span>
                </div>
                <p>{cat.description || 'No description provided.'}</p>
                <button className="remove-cat-btn" onClick={() => handleRemove(cat.id)} disabled={saving}>
                  Remove
                </button>
              </div>
            ))}
            {filteredCategories.length === 0 && (
              <div className="empty-state">No categories match your search.</div>
            )}
          </div>
        </section>
      </div>

      <style>{`
        .categories-pane { display: flex; flex-direction: column; gap: 24px; }
        .categories-layout { display: grid; grid-template-columns: 0.95fr 1.05fr; gap: 24px; }
        .settings-card {
          background: var(--bg-card); padding: 24px; border-radius: 20px; border: 1px solid var(--border);
          box-shadow: inset 4px 0 0 var(--card-accent), var(--shadow-sm);
        }
        .card-topline { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
        .card-topline h3 { margin: 0 0 6px; color: var(--text); }
        .card-topline p { margin: 0; color: var(--text-muted); font-size: 0.9rem; line-height: 1.6; }
        .mini-chip {
          display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 999px;
          background: color-mix(in srgb, var(--primary) 10%, transparent); color: var(--primary);
          border: 1px solid color-mix(in srgb, var(--primary) 24%, transparent); font-size: 11px; font-weight: 800;
        }
        .categories-form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
        .field-group { display: flex; flex-direction: column; gap: 8px; }
        .field-group label { font-size: 12px; font-weight: 800; color: var(--text-dimmed); text-transform: uppercase; letter-spacing: 0.06em; }
        .field-group.full-width { grid-column: 1 / -1; }
        .input-v9 {
          width: 100%; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 12px;
          padding: 12px 14px; color: var(--text); font-size: 14px; outline: none;
        }
        .input-v9:focus { border-color: var(--primary); }
        .textarea-v9 { min-height: 110px; resize: vertical; }
        .card-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 18px; }
        .search-row {
          display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 14px;
          background: var(--bg-surface); border: 1px solid var(--border); margin-bottom: 18px;
        }
        .search-row input { width: 100%; border: none; background: transparent; outline: none; color: var(--text); }
        .categories-list-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
        .category-tag-card {
          background: color-mix(in srgb, var(--bg-card) 88%, var(--bg-surface) 12%);
          border: 1px solid var(--border); padding: 16px; border-radius: 16px;
          box-shadow: inset 4px 0 0 var(--card-accent), var(--shadow-sm);
          display: flex; flex-direction: column; gap: 12px;
        }
        .cat-meta { display: flex; flex-direction: column; gap: 6px; }
        .cat-name { font-size: 15px; font-weight: 800; color: var(--text); }
        .cat-type { font-size: 12px; font-weight: 700; color: var(--primary); }
        .cat-status { width: fit-content; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 800; }
        .cat-status.active { background: rgba(16, 185, 129, 0.12); color: #10b981; }
        .cat-status.disabled { background: rgba(239, 68, 68, 0.12); color: #ef4444; }
        .category-tag-card p { margin: 0; color: var(--text-muted); line-height: 1.6; font-size: 0.88rem; }
        .remove-cat-btn {
          align-self: flex-start; background: transparent; border: 1px solid var(--border); border-radius: 10px;
          color: var(--text-muted); padding: 8px 12px; cursor: pointer; font-weight: 700;
        }
        .remove-cat-btn:hover:not(:disabled) { border-color: var(--danger); color: var(--danger); }
        .empty-state { grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-dimmed); font-size: 14px; }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 960px) {
          .categories-layout, .categories-form-grid { grid-template-columns: 1fr; }
          .field-group.full-width { grid-column: auto; }
        }
      `}</style>
    </div>
  )
}
