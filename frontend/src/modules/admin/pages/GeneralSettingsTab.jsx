import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { settingsApi } from '../../../services/settings.js'
import { Icon } from '../../../layouts/icons.jsx'
import PageHeader from '../../../components/PageHeader.jsx'

export default function GeneralSettingsTab() {
  const [model, setModel] = useState({
    companyName: '',
    dateFormat: 'DD/MM/YYYY',
    currency: 'Indian Rupee (₹)',
    timezone: 'Asia/Kolkata (IST)',
    language: 'English',
    itemsPerPage: 25,
    sessionTimeout: 30
  })
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      setLoading(true)
      const data = await settingsApi.get()
      if (data) {
        setModel({
          companyName: data.companyName || 'My CRM',
          dateFormat: data.dateFormat || 'DD/MM/YYYY',
          currency: data.currency || 'Indian Rupee (₹)',
          timezone: data.timezone || 'Asia/Kolkata (IST)',
          language: data.language || 'English',
          itemsPerPage: data.itemsPerPage || 25,
          sessionTimeout: data.sessionTimeout || 30
        })
      }
    } catch (e) {
      toast.error('Failed to load institutional core')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e) => {
    if (e) e.preventDefault()
    try {
      setSaving(true)
      await settingsApi.update(model)
      toast.success('Institutional protocols synchronized')
    } catch (e) {
      toast.error('Synchronization failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-60 text-dimmed">
      <Icon name="refresh" size={32} className="animate-spin" />
      <span className="mt-16 font-900 tracking-widest">LOADING CORE...</span>
    </div>
  )

  return (
    <div className="crm-settings-view content-fade-in">
      <PageHeader 
        title="General Settings" 
        description="Configure institutional identity and global operational protocols."
        actions={
          <button className="btn-save-premium" disabled={saving} onClick={handleSave}>
            <Icon name="check" size={16} />
            <span>{saving ? 'Syncing...' : 'Save Changes'}</span>
          </button>
        }
      />

      <div className="settings-stack">
        <div className="premium-settings-card">
          <div className="p-card-header">
            <Icon name="settings" size={18} />
            <span className="p-card-label">INSTITUTIONAL IDENTITY</span>
          </div>
          <div className="p-card-body">
            <div className="p-field-group">
              <label>Institutional Name</label>
              <input 
                type="text" className="p-input" 
                value={model.companyName} onChange={e => setModel(p => ({ ...p, companyName: e.target.value }))} 
              />
            </div>
            <div className="p-field-group">
              <label>Default Currency</label>
              <select className="p-select" value={model.currency} onChange={e => setModel(p => ({ ...p, currency: e.target.value }))}>
                <option value="Indian Rupee (₹)">Indian Rupee (₹)</option>
                <option value="US Dollar ($)">US Dollar ($)</option>
                <option value="Euro (€)">Euro (€)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="premium-settings-card">
          <div className="p-card-header">
            <Icon name="calendar" size={18} />
            <span className="p-card-label">TEMPORAL PROTOCOLS</span>
          </div>
          <div className="p-card-body">
            <div className="p-field-group">
              <label>Date Format Protocol</label>
              <select className="p-select" value={model.dateFormat} onChange={e => setModel(p => ({ ...p, dateFormat: e.target.value }))}>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
            <div className="p-field-group">
              <label>System Time Zone</label>
              <select className="p-select" value={model.timezone} onChange={e => setModel(p => ({ ...p, timezone: e.target.value }))}>
                <option value="Asia/Kolkata (IST)">Asia/Kolkata (IST)</option>
                <option value="America/New_York">America/New_York</option>
                <option value="Europe/London">Europe/London</option>
              </select>
            </div>
          </div>
        </div>

        <div className="premium-settings-card">
          <div className="p-card-header">
            <Icon name="dashboard" size={18} />
            <span className="p-card-label">SYSTEM PARAMETERS</span>
          </div>
          <div className="p-card-body">
            <div className="p-field-group">
              <label>Default Interface Language</label>
              <select className="p-select" value={model.language} onChange={e => setModel(p => ({ ...p, language: e.target.value }))}>
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
              </select>
            </div>
            <div className="p-field-group">
              <label>Items Per Node</label>
              <select className="p-select" value={model.itemsPerPage} onChange={e => setModel(p => ({ ...p, itemsPerPage: Number(e.target.value) }))}>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        <div className="premium-settings-card">
          <div className="p-card-header">
            <Icon name="shield" size={18} />
            <span className="p-card-label">SECURITY OVERRIDE</span>
          </div>
          <div className="p-card-body">
            <div className="p-field-group">
              <label>Session Timeout (minutes)</label>
              <input 
                type="number" className="p-input" 
                value={model.sessionTimeout} onChange={e => setModel(p => ({ ...p, sessionTimeout: Number(e.target.value) }))} 
              />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .crm-settings-view { display: flex; flex-direction: column; width: 100%; max-width: 900px; margin: 0 auto; }
        .settings-stack { display: flex; flex-direction: column; gap: 32px; margin-top: 40px; }
        
        .premium-settings-card { 
          background: rgba(26, 29, 43, 0.6); 
          border: 1px solid rgba(45, 48, 64, 0.8); 
          border-radius: 16px; 
          padding: 32px;
          transition: all 0.3s ease;
        }
        .premium-settings-card:hover {
          border-color: var(--primary);
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.1);
          background: rgba(26, 29, 43, 0.8);
        }

        .p-card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 28px; color: var(--primary); }
        .p-card-label { font-size: 12px; font-weight: 900; letter-spacing: 0.1em; }
        
        .p-card-body { display: flex; flex-direction: column; gap: 24px; }
        
        .p-field-group { display: flex; flex-direction: column; gap: 10px; }
        .p-field-group label { font-size: 13px; font-weight: 700; color: #9CA3AF; }
        
        .p-input, .p-select {
          width: 100%;
          background: rgba(31, 34, 50, 0.8);
          border: 1px solid #2D3040;
          border-radius: 8px;
          padding: 12px 16px;
          color: white;
          font-size: 14px;
          outline: none;
          transition: 0.2s;
        }
        .p-input:focus, .p-select:focus { border-color: var(--primary); background: #1F2232; }

        .btn-save-premium {
          background: var(--primary);
          color: white;
          border: none;
          padding: 12px 28px;
          border-radius: 12px;
          font-weight: 800;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 8px 16px -4px rgba(59, 130, 246, 0.3);
        }
        .btn-save-premium:hover {
          background: var(--primary-hover);
          transform: translateY(-2px);
          box-shadow: 0 12px 20px -4px rgba(59, 130, 246, 0.4);
        }

        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .content-fade-in { animation: fadeIn 0.5s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}
