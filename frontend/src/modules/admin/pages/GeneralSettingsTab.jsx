import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { settingsApi } from '../../../services/settings.js'
import { Icon } from '../../../layouts/icons.jsx'
import PageHeader from '../../../components/PageHeader.jsx'

const DEFAULT_MODEL = {
  companyName: 'My CRM',
  companyEmail: 'admin@mycrm.com',
  companyLogo: '',
  currency: 'INR',
  dateFormat: 'DD/MM/YYYY',
  timezone: 'Asia/Kolkata',
  language: 'English',
  themeMode: 'System',
  itemsPerPage: 25,
  sessionTimeout: 30,
}

export default function GeneralSettingsTab() {
  const [model, setModel] = useState(DEFAULT_MODEL)
  const [initialModel, setInitialModel] = useState(DEFAULT_MODEL)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(model) !== JSON.stringify(initialModel),
    [model, initialModel],
  )

  async function loadSettings() {
    try {
      setLoading(true)
      const data = await settingsApi.get()
      const normalized = {
        companyName: data.companyName || 'My CRM',
        companyEmail: data.companyEmail || data.businessEmail || 'admin@mycrm.com',
        companyLogo: data.companyLogo || '',
        currency: data.currency || 'INR',
        dateFormat: data.dateFormat || 'DD/MM/YYYY',
        timezone: data.timezone || 'Asia/Kolkata',
        language: data.language || 'English',
        themeMode: data.themeMode || 'System',
        itemsPerPage: Number(data.itemsPerPage || 25),
        sessionTimeout: Number(data.sessionTimeout || 30),
      }
      setModel(normalized)
      setInitialModel(normalized)
    } catch (e) {
      toast.error('Failed to load general settings')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!hasUnsavedChanges) {
      toast.info('No changes detected')
      return
    }

    try {
      setSaving(true)
      await settingsApi.update(model)
      setInitialModel(model)
      toast.success('General settings saved successfully')
    } catch (e) {
      toast.error('Failed to save general settings')
    } finally {
      setSaving(false)
    }
  }

  function handleReset() {
    setModel(initialModel)
  }

  function updateField(key, value) {
    setModel(prev => ({ ...prev, [key]: value }))
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-60 text-dimmed">
        <Icon name="refresh" size={32} className="animate-spin" />
        <span className="mt-16 font-900 tracking-widest">LOADING SETTINGS...</span>
      </div>
    )
  }

  return (
    <div className="crm-settings-view content-fade-in">
      <PageHeader
        title="General Settings"
        description="Global company controls for branding, locale, currency, display behavior, and system-wide defaults."
        actions={
          <div className="settings-actions">
            <button className="btn secondary" onClick={handleReset} disabled={!hasUnsavedChanges || saving}>
              Reset Defaults
            </button>
            <button className="btn-save-premium" disabled={saving} onClick={handleSave}>
              <Icon name="check" size={16} />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        }
      />

      {hasUnsavedChanges && (
        <div className="unsaved-banner">
          <Icon name="info" size={14} />
          <span>You have unsaved changes. Save to apply them across the CRM.</span>
        </div>
      )}

      <div className="settings-stack">
        <section className="premium-settings-card">
          <div className="p-card-header">
            <Icon name="settings" size={18} />
            <span className="p-card-label">Institution Identity</span>
          </div>
          <div className="p-card-body">
            <div className="p-field-group">
              <label>Institution Name</label>
              <input type="text" className="p-input" value={model.companyName} onChange={e => updateField('companyName', e.target.value)} />
            </div>
            <div className="p-field-group">
              <label>System Email</label>
              <input type="email" className="p-input" value={model.companyEmail} onChange={e => updateField('companyEmail', e.target.value)} />
            </div>
            <div className="p-field-group">
              <label>Company Logo URL</label>
              <input type="text" className="p-input" value={model.companyLogo} onChange={e => updateField('companyLogo', e.target.value)} placeholder="Optional logo asset URL" />
            </div>
          </div>
        </section>

        <section className="premium-settings-card">
          <div className="p-card-header">
            <Icon name="billing" size={18} />
            <span className="p-card-label">Regional Defaults</span>
          </div>
          <div className="p-card-body">
            <div className="p-field-group">
              <label>Default Currency</label>
              <select className="p-select" value={model.currency} onChange={e => updateField('currency', e.target.value)}>
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
            <div className="p-field-group">
              <label>Date Format</label>
              <select className="p-select" value={model.dateFormat} onChange={e => updateField('dateFormat', e.target.value)}>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
            <div className="p-field-group">
              <label>Timezone</label>
              <select className="p-select" value={model.timezone} onChange={e => updateField('timezone', e.target.value)}>
                <option value="Asia/Kolkata">Asia/Kolkata</option>
                <option value="Europe/London">Europe/London</option>
                <option value="America/New_York">America/New_York</option>
              </select>
            </div>
            <div className="p-field-group">
              <label>Language</label>
              <select className="p-select" value={model.language} onChange={e => updateField('language', e.target.value)}>
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Marathi">Marathi</option>
              </select>
            </div>
          </div>
        </section>

        <section className="premium-settings-card">
          <div className="p-card-header">
            <Icon name="dashboard" size={18} />
            <span className="p-card-label">Display & Experience</span>
          </div>
          <div className="p-card-body">
            <div className="p-field-group">
              <label>Theme Mode</label>
              <select className="p-select" value={model.themeMode} onChange={e => updateField('themeMode', e.target.value)}>
                <option value="System">System</option>
                <option value="Light">Light</option>
                <option value="Dark">Dark</option>
              </select>
            </div>
            <div className="p-field-group">
              <label>Items Per Page</label>
              <select className="p-select" value={model.itemsPerPage} onChange={e => updateField('itemsPerPage', Number(e.target.value))}>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </section>

        <section className="premium-settings-card">
          <div className="p-card-header">
            <Icon name="shield" size={18} />
            <span className="p-card-label">Security Defaults</span>
          </div>
          <div className="p-card-body">
            <div className="p-field-group">
              <label>Session Timeout (minutes)</label>
              <input type="number" className="p-input" value={model.sessionTimeout} onChange={e => updateField('sessionTimeout', Number(e.target.value || 0))} />
            </div>
            <div className="settings-note-card">
              <strong>Admin Scope</strong>
              <p>
                Changes here affect invoices, payments, date rendering, theme behavior, and UI defaults
                across the CRM for every role.
              </p>
            </div>
          </div>
        </section>
      </div>

      <div className="sticky-save-bar">
        <span>{hasUnsavedChanges ? 'Changes are ready to publish system-wide.' : 'All settings are synchronized.'}</span>
        <button className="btn-save-premium" disabled={saving || !hasUnsavedChanges} onClick={handleSave}>
          <Icon name="check" size={16} />
          <span>{saving ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </div>

      <style>{`
        .crm-settings-view { display: flex; flex-direction: column; width: 100%; margin: 0 auto; }
        .settings-actions { display: flex; align-items: center; gap: 12px; }
        .unsaved-banner {
          margin-top: 18px; padding: 12px 16px; border-radius: 14px; border: 1px solid color-mix(in srgb, var(--warning) 30%, var(--border));
          background: color-mix(in srgb, var(--warning) 10%, var(--bg-card)); color: var(--text);
          display: inline-flex; align-items: center; gap: 10px; width: fit-content; font-size: 0.9rem; font-weight: 600;
        }
        .settings-stack {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
          gap: 24px;
          margin-top: 24px;
        }
        .premium-settings-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 22px;
          padding: 28px;
          box-shadow: inset 4px 0 0 var(--card-accent), var(--shadow-sm);
          transition: all 0.25s ease;
        }
        .premium-settings-card:hover {
          border-color: var(--primary);
          box-shadow: inset 4px 0 0 var(--card-accent), var(--shadow-md);
        }
        .p-card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 22px; color: var(--primary); }
        .p-card-label { font-size: 12px; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; }
        .p-card-body { display: flex; flex-direction: column; gap: 18px; }
        .p-field-group { display: flex; flex-direction: column; gap: 10px; }
        .p-field-group label { font-size: 13px; font-weight: 700; color: var(--text-muted); }
        .p-input, .p-select {
          width: 100%; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 12px;
          padding: 12px 16px; color: var(--text); font-size: 14px; outline: none; transition: all 0.2s ease;
        }
        .p-input:focus, .p-select:focus { border-color: var(--primary); background: var(--bg-card); }
        .settings-note-card {
          border-radius: 16px; padding: 16px; background: color-mix(in srgb, var(--primary) 7%, var(--bg-card));
          border: 1px solid color-mix(in srgb, var(--primary) 20%, var(--border));
        }
        .settings-note-card strong { display: block; margin-bottom: 6px; color: var(--text); }
        .settings-note-card p { margin: 0; color: var(--text-muted); line-height: 1.6; font-size: 0.9rem; }
        .btn-save-premium {
          background: var(--primary); color: white; border: none; padding: 12px 22px; border-radius: 12px;
          font-weight: 800; font-size: 14px; display: inline-flex; align-items: center; gap: 10px; cursor: pointer; transition: all 0.2s ease;
          box-shadow: 0 8px 16px -4px rgba(var(--primary-rgb), 0.35);
        }
        .btn-save-premium:hover:not(:disabled) { background: var(--primary-hover); transform: translateY(-1px); }
        .btn-save-premium:disabled { opacity: 0.6; cursor: not-allowed; }
        .sticky-save-bar {
          position: sticky; bottom: 16px; margin-top: 24px; padding: 14px 18px; border-radius: 18px;
          background: color-mix(in srgb, var(--bg-card) 88%, var(--bg-surface) 12%);
          border: 1px solid var(--border); box-shadow: inset 4px 0 0 var(--card-accent), var(--shadow-md);
          display: flex; align-items: center; justify-content: space-between; gap: 16px; z-index: 10;
        }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .content-fade-in { animation: fadeIn 0.5s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 720px) {
          .settings-actions, .sticky-save-bar { flex-direction: column; align-items: stretch; }
        }
      `}</style>
    </div>
  )
}
