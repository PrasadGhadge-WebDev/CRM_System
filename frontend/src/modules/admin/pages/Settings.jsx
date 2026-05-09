import { useState, useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
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
  const location = useLocation()
  const [activeTab, setActiveTab] = useState('general')
  const [settingsQuery, setSettingsQuery] = useState('')

  const navSections = useMemo(() => ([
    {
      label: 'SYSTEM CONTROL',
      items: [
        { id: 'general', label: 'General', icon: 'settings', blurb: 'Company, currency, language, theme' },
        { id: 'roles', label: 'Permissions', icon: 'shield', blurb: 'Admin-only RBAC and access control' },
        { id: 'customers', label: 'Categories', icon: 'users', blurb: 'Expense, deal, ticket, and client groups' },
      ],
    },
    {
      label: 'OPERATIONAL NODES',
      items: [
        { id: 'lead-statuses', label: 'Lead Statuses', icon: 'filter', blurb: 'Pipeline stages from New to Won/Lost' },
        { id: 'lead-sources', label: 'Lead Sources', icon: 'plus', blurb: 'Attribution channels like Website and Ads' },
      ],
    },
  ]), [])

  const visibleSections = useMemo(() => {
    const q = settingsQuery.trim().toLowerCase()
    if (!q) return navSections

    return navSections
      .map(section => ({
        ...section,
        items: section.items.filter(item =>
          item.label.toLowerCase().includes(q) || item.blurb.toLowerCase().includes(q),
        ),
      }))
      .filter(section => section.items.length > 0)
  }, [navSections, settingsQuery])

  const overviewCards = [
    { label: 'Admin Access', value: '2 Roles', tone: 'blue', meta: 'Admin and Super Admin only' },
    { label: 'Core Areas', value: '5 Modules', tone: 'green', meta: 'General, RBAC, Categories, Statuses, Sources' },
    { label: 'Global Effect', value: 'System-wide', tone: 'amber', meta: 'Changes apply across CRM flows' },
    { label: 'Security Layer', value: 'RBAC', tone: 'violet', meta: 'Permissions control by role' },
  ]

  useEffect(() => {
    if (location.pathname.endsWith('/roles')) {
      setActiveTab('roles')
    }
  }, [location.pathname])

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

          <div className="settings-search-shell">
            <div className="settings-search-box">
              <Icon name="search" size={14} />
              <input
                value={settingsQuery}
                onChange={(e) => setSettingsQuery(e.target.value)}
                placeholder="Search settings..."
              />
            </div>
            <div className="settings-access-chip">
              <Icon name="shield" size={12} />
              <span>Admin / Super Admin</span>
            </div>
          </div>
          
          <nav className="sidebar-scroller">
            {visibleSections.map((section, sectionIndex) => (
              <div className="nav-node-group" key={section.label} style={{ marginTop: sectionIndex === 0 ? 0 : '32px' }}>
                <span className="nav-node-label">{section.label}</span>
                <div className="nav-node-divider" />
                {section.items.map(item => (
                  <button
                    key={item.id}
                    className={`nav-node-link ${activeTab === item.id ? 'active' : ''}`}
                    onClick={() => setActiveTab(item.id)}
                  >
                    <Icon name={item.icon} size={16} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            ))}
            {visibleSections.length === 0 && (
              <div className="settings-empty-search">
                <Icon name="search" size={16} />
                <span>No settings match your search.</span>
              </div>
            )}
          </nav>

          <div className="sidebar-bottom-anchor">
            <span className="anchor-text">v3.0 ENTERPRISE</span>
          </div>
        </aside>

        {/* RIGHT CONTENT: Standardized CRM Content Surface */}
        <main className="crm-settings-main">
          <div className="main-surface-scroller">
            <div className="view-fade-in">
              <section className="settings-hero">
                <div className="settings-hero-copy">
                  <span className="settings-kicker">Settings Module</span>
                  <h1>Global controls for configuration, permissions, and pipeline behavior.</h1>
                  <p>
                    This area is reserved for Admin and Super Admin roles to manage company-wide defaults,
                    access control, lead setup, and operational standards across the CRM.
                  </p>
                </div>
                <div className="settings-overview-grid">
                  {overviewCards.map(card => (
                    <div key={card.label} className={`settings-overview-card tone-${card.tone}`}>
                      <span className="overview-label">{card.label}</span>
                      <strong>{card.value}</strong>
                      <span className="overview-meta">{card.meta}</span>
                    </div>
                  ))}
                </div>
              </section>

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

        .settings-search-shell { padding: 0 20px 20px; display: flex; flex-direction: column; gap: 12px; }
        .settings-search-box {
          display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 14px;
          background: var(--bg-card); border: 1px solid var(--border);
          box-shadow: inset 4px 0 0 var(--card-accent), var(--shadow-sm);
        }
        .settings-search-box input {
          width: 100%; border: none; background: transparent; outline: none; color: var(--text); font-size: 13px;
        }
        .settings-access-chip {
          display: inline-flex; align-items: center; gap: 8px; width: fit-content;
          padding: 8px 12px; border-radius: 999px; background: color-mix(in srgb, var(--primary) 10%, transparent);
          color: var(--primary); border: 1px solid color-mix(in srgb, var(--primary) 22%, transparent);
          font-size: 11px; font-weight: 800; letter-spacing: 0.04em;
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
        .settings-empty-search {
          margin: 24px 16px 0; padding: 16px; border: 1px dashed var(--border); border-radius: 14px;
          color: var(--text-dimmed); display: flex; align-items: center; gap: 10px; font-size: 13px;
        }

        .sidebar-bottom-anchor { padding: 32px; border-top: 1px solid var(--border); text-align: center; }
        .anchor-text { font-size: 10px; font-weight: 900; color: var(--text-dimmed); opacity: 0.4; letter-spacing: 0.1em; }

        /* Main Content Surface */
        .crm-settings-main { flex: 1; height: 100vh; overflow: hidden; display: flex; flex-direction: column; }
        .main-surface-scroller { flex: 1; overflow-y: auto; scroll-behavior: smooth; }
        .view-fade-in { padding: 20px 40px 60px 40px; width: 100%; animation: fadeIn 0.4s ease-out; }
        .settings-hero {
          display: grid; grid-template-columns: 1.2fr 1fr; gap: 24px; margin-bottom: 28px;
          align-items: stretch;
        }
        .settings-hero-copy, .settings-overview-grid {
          background: var(--bg-card); border: 1px solid var(--border); border-radius: 22px;
          box-shadow: inset 4px 0 0 var(--card-accent), var(--shadow-sm);
        }
        .settings-hero-copy { padding: 28px; }
        .settings-kicker {
          display: inline-flex; margin-bottom: 12px; font-size: 11px; font-weight: 900; letter-spacing: 0.12em;
          color: var(--primary); text-transform: uppercase;
        }
        .settings-hero-copy h1 {
          margin: 0 0 12px; font-size: clamp(1.7rem, 2.5vw, 2.4rem); line-height: 1.1; color: var(--text);
        }
        .settings-hero-copy p {
          margin: 0; color: var(--text-muted); font-size: 0.95rem; line-height: 1.7;
        }
        .settings-overview-grid {
          padding: 20px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px;
        }
        .settings-overview-card {
          --overview-accent: var(--card-accent);
          padding: 16px; border-radius: 16px; border: 1px solid color-mix(in srgb, var(--overview-accent) 25%, var(--border));
          background: color-mix(in srgb, var(--bg-card) 85%, var(--overview-accent) 15%);
          box-shadow: inset 4px 0 0 var(--overview-accent);
          display: flex; flex-direction: column; gap: 6px;
        }
        .settings-overview-card.tone-blue { --overview-accent: #3b82f6; }
        .settings-overview-card.tone-green { --overview-accent: #10b981; }
        .settings-overview-card.tone-amber { --overview-accent: #f59e0b; }
        .settings-overview-card.tone-violet { --overview-accent: #8b5cf6; }
        .overview-label { font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 800; color: var(--text-dimmed); }
        .settings-overview-card strong { font-size: 1.2rem; color: var(--text); }
        .overview-meta { font-size: 0.8rem; color: var(--text-muted); line-height: 1.4; }

        /* Hide Back Button in Settings context as per request */
        .crm-settings-main .btn-modern-back { display: none !important; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        @media (max-width: 1100px) {
          .crm-settings-master-wrapper { flex-direction: column; height: auto; overflow: auto; }
          .crm-settings-sidebar { width: 100%; height: auto; border-right: none; border-bottom: 1px solid var(--border); }
          .crm-settings-main { height: auto; overflow: visible; }
          .settings-hero { grid-template-columns: 1fr; }
        }

        @media (max-width: 720px) {
          .view-fade-in { padding: 16px 16px 40px; }
          .settings-overview-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
