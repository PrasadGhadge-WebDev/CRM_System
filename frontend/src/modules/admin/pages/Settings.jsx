import { useState } from 'react'
import GeneralSettingsTab from './GeneralSettingsTab.jsx'
import StatusesTab from './StatusesTab.jsx'
import LeadSourcesTab from './LeadSourcesTab.jsx'
import RolesTab from './RolesTab.jsx'
import CustomerSettingsTab from './CustomerSettingsTab.jsx'
import { Icon } from '../../../layouts/icons.jsx'

/**
 * CRM Settings Module (Premium Suite)
 * Synchronized with global crmContent design tokens.
 */
export default function Settings() {
  const [activeTab, setActiveTab] = useState('general')

  return (
    <div className="crmContent leadsFullscreenShell" style={{ padding: 0 }}>
      <div className="crm-settings-master-wrapper">
        {/* LEFT SIDEBAR: Standardized CRM Navigation */}
        <aside className="crm-settings-sidebar">
          <div className="sidebar-brand-shell">
            <div className="brand-icon-box">
              <Icon name="settings" size={20} />
            </div>
            <h2 className="brand-title-gradient">INTELLIGENCE</h2>
          </div>
          
          <nav className="sidebar-scroller">
            <div className="nav-node-group">
              <span className="nav-node-label">SYSTEM CONTROL</span>
              <div className="nav-node-divider" />
              <button className={`nav-node-link ${activeTab === 'general' ? 'active' : ''}`} onClick={() => setActiveTab('general')}>
                <Icon name="settings" size={16} />
                <span>General</span>
              </button>
              <button className={`nav-node-link ${activeTab === 'roles' ? 'active' : ''}`} onClick={() => setActiveTab('roles')}>
                <Icon name="shield" size={16} />
                <span>Permissions</span>
              </button>
              <button className={`nav-node-link ${activeTab === 'customers' ? 'active' : ''}`} onClick={() => setActiveTab('customers')}>
                <Icon name="users" size={16} />
                <span>Categories</span>
              </button>
            </div>

            <div className="nav-node-group" style={{ marginTop: '32px' }}>
              <span className="nav-node-label">OPERATIONAL NODES</span>
              <div className="nav-node-divider" />
              <button className={`nav-node-link ${activeTab === 'lead-statuses' ? 'active' : ''}`} onClick={() => setActiveTab('lead-statuses')}>
                <Icon name="filter" size={16} />
                <span>Lead Statuses</span>
              </button>
              <button className={`nav-node-link ${activeTab === 'lead-sources' ? 'active' : ''}`} onClick={() => setActiveTab('lead-sources')}>
                <Icon name="plus" size={16} />
                <span>Lead Sources</span>
              </button>
            </div>
          </nav>

          <div className="sidebar-bottom-anchor">
            <span className="anchor-text">v3.0 ENTERPRISE</span>
          </div>
        </aside>

        {/* RIGHT CONTENT: Standardized CRM Content Surface */}
        <main className="crm-settings-main">
          <div className="main-surface-scroller">
            <div className="view-fade-in">
              {activeTab === 'general' && <GeneralSettingsTab />}
              {activeTab === 'roles' && <RolesTab />}
              {activeTab === 'customers' && <CustomerSettingsTab />}
              {activeTab === 'lead-statuses' && <StatusesTab />}
              {activeTab === 'lead-sources' && <LeadSourcesTab />}
            </div>
          </div>
        </main>
      </div>

      <style>{`
        .crm-settings-master-wrapper {
          display: flex;
          height: 100vh;
          width: 100%;
          background: var(--bg);
          overflow: hidden;
        }

        /* Sidebar Styling synchronized with CRM Premium */
        .crm-settings-sidebar {
          width: 280px;
          height: 100vh;
          background: var(--bg-surface);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          z-index: 100;
        }

        .sidebar-brand-shell { padding: 40px 32px 32px 32px; display: flex; align-items: center; gap: 16px; }
        .brand-icon-box { color: var(--primary); display: flex; align-items: center; }
        .brand-title-gradient { 
          font-size: 15px; font-weight: 900; letter-spacing: 0.15em; margin: 0;
          background: linear-gradient(90deg, var(--primary) 0%, #a78bfa 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }

        .sidebar-scroller { flex: 1; padding: 0 16px; overflow: hidden; }
        .nav-node-group { display: flex; flex-direction: column; gap: 4px; }
        .nav-node-label { font-size: 11px; font-weight: 800; color: var(--text-dimmed); letter-spacing: 0.08em; padding-left: 16px; }
        .nav-node-divider { height: 1px; background: var(--border); margin: 8px 16px 16px 16px; opacity: 0.5; }

        .nav-node-link {
          display: flex; align-items: center; gap: 14px; padding: 12px 16px; border: none; background: transparent;
          color: var(--text-muted); font-size: 14px; font-weight: 700; border-radius: 12px; cursor: pointer; transition: 0.2s;
        }
        .nav-node-link:hover { background: var(--bg-hover); color: var(--text); transform: translateX(4px); }
        .nav-node-link.active { background: var(--primary); color: white; box-shadow: 0 8px 20px -8px var(--primary); }

        .sidebar-bottom-anchor { padding: 32px; border-top: 1px solid var(--border); text-align: center; }
        .anchor-text { font-size: 10px; font-weight: 900; color: var(--text-dimmed); opacity: 0.4; letter-spacing: 0.1em; }

        /* Main Content Surface */
        .crm-settings-main { flex: 1; height: 100vh; overflow: hidden; display: flex; flex-direction: column; }
        .main-surface-scroller { flex: 1; overflow-y: auto; scroll-behavior: smooth; }
        .view-fade-in { padding: 40px 60px 100px 60px; max-width: 1300px; width: 100%; animation: fadeIn 0.4s ease-out; }

        /* Hide Back Button in Settings context as per request */
        .crm-settings-main .btn-modern-back { display: none !important; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        @media (max-width: 1100px) {
          .crm-settings-master-wrapper { flex-direction: column; height: auto; overflow: auto; }
          .crm-settings-sidebar { width: 100%; height: auto; border-right: none; border-bottom: 1px solid var(--border); }
          .crm-settings-main { height: auto; overflow: visible; }
        }
      `}</style>
    </div>
  )
}
