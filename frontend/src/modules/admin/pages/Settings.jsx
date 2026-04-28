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
    <div className="crm-fullscreen-shell">
      <PageHeader 
        title="Intelligence Configurator" 
        description="Global parameter management, security protocols, and institutional governance." 
      />

      <div className="crm-hub-nav">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`crm-hub-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <Icon name={tab.icon} size={14} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="crm-detail-grid page-enter">
        <div className="crm-detail-main">
          {activeTab === 'general' && (
            <div className="crm-detail-card center padding-60">
              <Icon name="settings" size={64} style={{ opacity: 0.2, color: 'var(--primary)', marginBottom: '24px' }} />
              <h3 className="hero-name-modern" style={{ fontSize: '1.5rem' }}>System Core Parameters</h3>
              <p className="muted" style={{ maxWidth: '450px', margin: '0 auto' }}>Global configuration nodes are currently under maintenance by Root Authority.</p>
            </div>
          )}

          {activeTab === 'roles' && <RolesTab />}
          {activeTab === 'customers' && <CustomerSettingsTab />}
          {activeTab === 'statuses' && <StatusesTab />}
          {activeTab === 'sources' && <LeadSourcesTab />}

          {activeTab === 'security' && (
            <div className="crm-detail-card center padding-60">
              <Icon name="lock" size={64} style={{ opacity: 0.2, color: 'var(--primary)', marginBottom: '24px' }} />
              <h3 className="hero-name-modern" style={{ fontSize: '1.5rem' }}>Security Protocols</h3>
              <p className="muted" style={{ maxWidth: '450px', margin: '0 auto' }}>Multi-factor encryption and firewall policies are synchronized with external security nodes.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
