import { useState } from 'react'
import PageHeader from '../../../components/PageHeader.jsx'
import RolesTab from './RolesTab.jsx'
import StatusesTab from './StatusesTab.jsx'
import LeadSourcesTab from './LeadSourcesTab.jsx'
import { Icon } from '../../../layouts/icons.jsx'

const TABS = [
  { id: 'general', label: 'General', icon: 'settings' },
  { id: 'roles', label: 'Roles', icon: 'user' },
  { id: 'statuses', label: 'Statuses', icon: 'filter' },
  { id: 'sources', label: 'Lead Sources', icon: 'plus' },
  { id: 'security', label: 'Security', icon: 'lock' },
]

export default function Settings() {
  const [activeTab, setActiveTab] = useState('roles')

  return (
    <div className="stack">
      <PageHeader 
        title="Settings" 
        subtitle="Manage your system configurations and security policies" 
      />

      <div className="crm-tabs-row" style={{ display: 'flex', gap: '8px', marginBottom: 'var(--space-lg)', borderBottom: '1px solid var(--border)', paddingBottom: '2px' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`btn ${activeTab === tab.id ? 'primary' : 'ghost'}`}
            style={{ 
              borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
              padding: '10px 24px',
              height: 'auto',
              borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : 'none'
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            <Icon name={tab.icon} size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="crm-settings-content">
        {activeTab === 'general' && (
          <div className="card crmPanel" style={{ textAlign: 'center', padding: '60px' }}>
            <div className="muted">General settings coming soon...</div>
          </div>
        )}

        {activeTab === 'roles' && <RolesTab />}

        {activeTab === 'statuses' && <StatusesTab />}

        {activeTab === 'sources' && <LeadSourcesTab />}

        {activeTab === 'security' && (
          <div className="card crmPanel" style={{ textAlign: 'center', padding: '60px' }}>
            <div className="muted">Security settings coming soon...</div>
          </div>
        )}
      </div>
    </div>
  )
}
