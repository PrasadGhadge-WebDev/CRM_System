import React, { useState } from 'react'
import { Icon } from '../../../layouts/icons.jsx'

export default function PaginationSettings() {
  const [settings, setSettings] = useState({
    defaultLimit: 10,
    allowedLimits: [5, 10, 20, 50, 100],
    defaultSort: 'created_at',
    defaultOrder: 'desc',
    modules: [
      { id: 'leads', name: 'Leads', defaultSort: 'created_at' },
      { id: 'customers', name: 'Customers', defaultSort: 'name' },
      { id: 'deals', name: 'Deals', defaultSort: 'value' },
      { id: 'users', name: 'Users', defaultSort: 'name' },
    ]
  })

  return (
    <div className="pageContainer">
      <div className="pageHeader">
        <div className="headerLeft">
          <h1 className="pageTitle">Pagination & Sorting</h1>
          <p className="pageSub">Configure global list behaviors and data presentation defaults</p>
        </div>
        <div className="headerActions">
          <button className="btn btnPrimary">
            <Icon name="check" size={18} />
            <span>Save Settings</span>
          </button>
        </div>
      </div>

      <div className="grid grid-2 fade-in">
        <div className="contentCard">
          <h3 className="cardTitle">Global Defaults</h3>
          <div className="formGroup">
            <label className="label">Default Records Per Page</label>
            <select 
              className="input" 
              value={settings.defaultLimit}
              onChange={(e) => setSettings({...settings, defaultLimit: Number(e.target.value)})}
            >
              {settings.allowedLimits.map(l => <option key={l} value={l}>{l} Rows</option>)}
            </select>
          </div>

          <div className="formGroup">
            <label className="label">Allowed Display Limits</label>
            <div className="row small-gap" style={{ flexWrap: 'wrap' }}>
              {settings.allowedLimits.map(l => (
                <span key={l} className="badge badgeSecondary">{l}</span>
              ))}
              <button className="btn btnOutline small">+ Add</button>
            </div>
          </div>
        </div>

        <div className="contentCard">
          <h3 className="cardTitle">Sorting Preferences</h3>
          <div className="formGroup">
            <label className="label">Default Sort Field</label>
            <select className="input" value={settings.defaultSort}>
              <option value="created_at">Created At</option>
              <option value="updated_at">Updated At</option>
              <option value="name">Name / Title</option>
            </select>
          </div>
          <div className="formGroup">
            <label className="label">Default Sort Order</label>
            <div className="row small-gap">
              <button className={`btn small ${settings.defaultOrder === 'asc' ? 'btnPrimary' : 'secondary'}`}>Ascending</button>
              <button className={`btn small ${settings.defaultOrder === 'desc' ? 'btnPrimary' : 'secondary'}`}>Descending</button>
            </div>
          </div>
        </div>
      </div>

      <div className="contentCard mt-24">
        <h3 className="cardTitle">Module Specific Overrides</h3>
        <table className="crmTable">
          <thead>
            <tr>
              <th>Module Name</th>
              <th>Primary Sort</th>
              <th>Secondary Sort</th>
              <th className="textRight">Actions</th>
            </tr>
          </thead>
          <tbody>
            {settings.modules.map(m => (
              <tr key={m.id}>
                <td className="bold">{m.name}</td>
                <td>
                  <span className="badge badgePrimary">{m.defaultSort}</span>
                </td>
                <td>
                  <span className="badge badgeNeutral">updated_at</span>
                </td>
                <td className="textRight">
                  <button className="iconBtn"><Icon name="edit" size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`
        .mt-24 { margin-top: 24px; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        @media (max-width: 900px) { .grid-2 { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  )
}
