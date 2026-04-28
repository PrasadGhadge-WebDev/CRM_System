import { useState } from 'react'
import PageHeader from '../../../components/PageHeader.jsx'
import RolesTab from './RolesTab.jsx'
import StatusesTab from './StatusesTab.jsx'
import LeadSourcesTab from './LeadSourcesTab.jsx'
import { Icon } from '../../../layouts/icons.jsx'
import CustomerSettingsTab from './CustomerSettingsTab.jsx'
import '../../../styles/leadsList.css'

const TABS = [
  { id: 'customers', label: 'Clients', icon: 'users' },
  { id: 'roles', label: 'Access Control', icon: 'shield' },
  { id: 'statuses', label: 'Lifecycle Status', icon: 'filter' },
  { id: 'sources', label: 'Lead Channels', icon: 'plus' },
  { id: 'general', label: 'System Core', icon: 'settings' },
  { id: 'security', label: 'Encryptions', icon: 'lock' },
]

export default function Settings() {
  const [activeTab, setActiveTab] = useState('customers')

  return (
    <div className="stack leadsListPage crmContent">
      <section className="leadsFullscreenShell">
        <PageHeader 
          title="Intelligence Configurator" 
          description="Global parameter management, security protocols, and institutional governance." 
        />

        <div className="glass-panel intelligence-tab-bar">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`tab-intel ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon name={tab.icon} size={14} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="intelligence-settings-stage page-enter">
          {activeTab === 'general' && (
            <div className="glass-panel empty-intel-state">
              <Icon name="settings" size={48} />
              <h3>System Core Parameters</h3>
              <p className="muted">Global configuration nodes are currently under maintenance by Root Authority.</p>
            </div>
          )}

          {activeTab === 'roles' && <RolesTab />}
          {activeTab === 'customers' && <CustomerSettingsTab />}
          {activeTab === 'statuses' && <StatusesTab />}
          {activeTab === 'sources' && <LeadSourcesTab />}

          {activeTab === 'security' && (
            <div className="glass-panel empty-intel-state">
              <Icon name="lock" size={48} />
              <h3>Security Protocols</h3>
              <p className="muted">Multi-factor encryption and firewall policies are synchronized with external security nodes.</p>
            </div>
          )}
        </div>
      </section>

      <style>{`
        .intelligence-tab-bar { display: flex; background: rgba(255, 255, 255, 0.03); padding: 4px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); margin: 32px 0; overflow-x: auto; gap: 4px; }
        .tab-intel { flex: 1; min-width: 140px; display: flex; align-items: center; justify-content: center; gap: 10px; padding: 12px; border-radius: 12px; font-size: 0.75rem; font-weight: 800; color: var(--text-dimmed); background: transparent; border: none; cursor: pointer; transition: all 0.2s ease; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; }
        .tab-intel:hover { color: var(--text); background: rgba(255,255,255,0.02); }
        .tab-intel.active { background: var(--primary); color: white; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }
        .empty-intel-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100px 40px; text-align: center; border-radius: 24px; }
        .empty-intel-state svg { opacity: 0.1; margin-bottom: 24px; color: var(--primary); }
        .empty-intel-state h3 { font-size: 1.1rem; font-weight: 800; margin-bottom: 8px; }
        .empty-intel-state p { font-size: 0.85rem; max-width: 400px; margin: 0 auto; }
      `}</style>
    </div>
  )
}
