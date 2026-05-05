import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { Icon } from '../../../layouts/icons.jsx'
import PageHeader from '../../../components/PageHeader.jsx'
import { settingsApi } from '../../../services/settings.js'

export default function LeadSourcesTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ name: '', status: 'Active', order: 1 })
  const [initialForm, setInitialForm] = useState(null)

  useEffect(() => {
    loadSources()
  }, [])

  async function loadSources() {
    try {
      setLoading(true)
      const data = await settingsApi.get()
      setItems(data?.leadSources || [])
    } catch (e) {
      toast.error('Failed to load acquisition channels')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    
    if (editingId && initialForm && JSON.stringify(form) === JSON.stringify(initialForm)) {
      return toast.info('No changes detected')
    }

    try {
      let newList
      if (editingId) {
        newList = items.map(x => x.id === editingId ? { ...form, id: x.id, leadsCount: x.leadsCount } : x)
      } else {
        newList = [...items, { ...form, id: Date.now().toString(), leadsCount: 0 }]
      }
      
      await settingsApi.update({ leadSources: newList })
      toast.success('Acquisition nodes synchronized')
      setIsModalOpen(false)
      loadSources()
    } catch (e) {
      toast.error('Failed to sync sources')
    }
  }

  const handleDelete = async (id) => {
    const newList = items.filter(x => x.id !== id)
    try {
      await settingsApi.update({ leadSources: newList })
      toast.success('Source removed')
      loadSources()
    } catch (e) {
      toast.error('Cannot remove source')
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-60 text-dimmed">
      <Icon name="refresh" size={32} className="animate-spin" />
      <span className="mt-16 font-900 tracking-widest uppercase">Fetching Channels...</span>
    </div>
  )

  return (
    <div className="crm-sources-module content-fade-in">
      <PageHeader 
        title="Lead Sources" 
        description="Manage acquisition channels and institutional attribution nodes."
        actions={
          <button className="crm-btn-premium vibrant" onClick={() => { setEditingId(null); setForm({ name: '', status: 'Active', order: items.length + 1 }); setIsModalOpen(true); }}>
            <Icon name="plus" size={16} />
            <span>New Source</span>
          </button>
        }
      />

      <div className="crm-table-wrap shadow-soft" style={{ marginTop: '32px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="crm-table-scroll">
          <table className="crm-table">
            <thead style={{ background: 'var(--bg-elevated)' }}>
              <tr>
                <th style={{ width: '60px' }}>#</th>
                <th>CHANNEL NAME</th>
                <th style={{ width: '180px' }}>OPERATIONAL STATUS</th>
                <th style={{ width: '100px' }}>ORDER</th>
                <th>ATTRIBUTION COUNT</th>
                <th className="text-right" style={{ width: '120px' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {items.map((source, index) => (
                <tr key={source.id} className="crm-table-row">
                  <td><span className="text-dimmed font-900">{index + 1}</span></td>
                  <td><span className="font-800" style={{ color: 'var(--text)' }}>{source.name}</span></td>
                  <td>
                    <span className={`crm-status-pill-modern ${source.status === 'Active' ? 'status-active' : 'status-inactive'}`}>
                      <div className="status-dot" />
                      {(source.status || 'Active').toUpperCase()}
                    </span>
                  </td>
                  <td><span className="text-muted font-700">{source.order}</span></td>
                  <td>
                    <div className="flex items-center gap-8 text-dimmed">
                      <Icon name="users" size={12} />
                      <span className="font-800">{source.leadsCount || 0}</span>
                    </div>
                  </td>
                  <td className="text-right">
                    <div className="crm-action-group">
                      <button className="modern-action-btn" onClick={() => { 
                        setEditingId(source.id); 
                        setForm(source); 
                        setInitialForm(source);
                        setIsModalOpen(true); 
                      }}>
                        <Icon name="edit" size={14} />
                      </button>
                      <button className="modern-action-btn danger" onClick={() => handleDelete(source.id)}>
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="intel-card modal-panel-premium" style={{ width: '400px' }}>
            <h3 className="userFormTitle" style={{ marginBottom: '24px', fontSize: '20px' }}>{editingId ? 'Edit Channel' : 'New Channel'}</h3>
            <form onSubmit={handleSave} className="stack gap-20">
              <div className="input-field-v4">
                <label>Channel Name</label>
                <input className="input-premium" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="input-field-v4">
                <label>Status</label>
                <select className="input-premium" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="flex justify-end gap-12" style={{ marginTop: '12px' }}>
                <button type="button" className="crm-btn-premium glass" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="crm-btn-premium vibrant">Save Channel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .crm-sources-module { display: flex; flex-direction: column; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(var(--bg-rgb), 0.6); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-panel-premium { box-shadow: var(--shadow-xl); border: 1px solid var(--border); }
        
        .crm-table th {
            padding: 12px 16px !important;
            font-size: 0.7rem !important;
            font-weight: 800 !important;
            color: var(--primary) !important;
            letter-spacing: 0.1em !important;
            text-transform: uppercase !important;
            border-bottom: 2px solid var(--border-strong) !important;
            opacity: 0.9;
        }
        .crm-table-row { transition: background 0.2s ease; cursor: pointer; border-bottom: 1px solid var(--border-strong) !important; }
        .crm-table-row:hover { background: var(--bg-hover) !important; }
        .crm-table-row td { padding: 12px 16px !important; }

        .crm-action-group { display: flex; gap: 8px; justify-content: flex-end; }
        .modern-action-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--border-strong); background: var(--bg-card); color: var(--text-dimmed); display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; cursor: pointer; }
        .modern-action-btn:hover { color: var(--primary); border-color: var(--primary); transform: translateY(-1px); }
        .modern-action-btn.danger:hover { background: var(--bg-hover); color: var(--danger); border-color: var(--danger); }

        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .content-fade-in { animation: fadeIn 0.4s ease-out; }
      `}</style>
    </div>
  )
}
