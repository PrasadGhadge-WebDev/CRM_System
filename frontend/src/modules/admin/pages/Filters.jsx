import React, { useState } from 'react'
import { Icon } from '../../../layouts/icons.jsx'

const INITIAL_FILTERS = [
  { id: 1, name: 'High Value Leads', module: 'Leads', criteria: 'Value > 10,000', status: 'Active' },
  { id: 2, name: 'Inactive Customers', module: 'Customers', criteria: 'Last Login > 30 days', status: 'Active' },
  { id: 3, name: 'Open Enterprise Deals', module: 'Deals', criteria: 'Stage = Negotiation, Type = Enterprise', status: 'Inactive' },
  { id: 4, name: 'New Support Tickets', module: 'Tickets', criteria: 'Status = New, Priority = High', status: 'Active' },
]

export default function Filters() {
  const [filters] = useState(INITIAL_FILTERS)

  return (
    <div className="pageContainer">
      <div className="pageHeader">
        <div className="headerLeft">
          <h1 className="pageTitle">Filters & Search</h1>
          <p className="pageSub">Manage dynamic search filters and global data segments</p>
        </div>
        <div className="headerActions">
          <button className="btn btnPrimary">
            <Icon name="plus" size={18} />
            <span>Create Filter</span>
          </button>
        </div>
      </div>

      <div className="contentCard fade-in">
        <div className="tableWrapper">
          <table className="crmTable">
            <thead>
              <tr>
                <th>Filter Name</th>
                <th>Module</th>
                <th>Conditions</th>
                <th>Status</th>
                <th className="textRight">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filters.map((filter) => (
                <tr key={filter.id}>
                  <td>
                    <div className="bold">{filter.name}</div>
                  </td>
                  <td>
                    <span className="badge badgeSecondary">{filter.module}</span>
                  </td>
                  <td>
                    <code className="textMuted small">{filter.criteria}</code>
                  </td>
                  <td>
                    <span className={`statusDot ${filter.status === 'Active' ? 'success' : 'neutral'}`}>
                      {filter.status}
                    </span>
                  </td>
                  <td className="textRight">
                    <div className="btnGroup">
                      <button className="iconBtn" title="Edit">
                        <Icon name="edit" size={16} />
                      </button>
                      <button className="iconBtn danger" title="Delete">
                        <Icon name="delete" size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .tableWrapper {
          overflow-x: auto;
        }
        .textMuted { color: var(--text-muted); }
        .small { font-size: 0.85rem; }
        .success { color: var(--success); }
        .neutral { color: var(--text-muted); }
        .statusDot::before {
          content: '●';
          margin-right: 8px;
        }
        code {
          background: var(--bg-card);
          padding: 2px 6px;
          border-radius: 4px;
          border: 1px solid var(--border-color);
        }
      `}</style>
    </div>
  )
}
