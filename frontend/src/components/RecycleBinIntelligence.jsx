import React from 'react';
import { Icon } from '../layouts/icons.jsx';
import '../styles/recycleBin.css';

const RecycleBinIntelligence = () => {
  const deletedRecords = [
    {
      id: '69eef25d99b3dc1c7f7b6a1',
      name: 'dwckjwehcb wkchbcwecj',
      type: 'USER',
      removedBy: 'Admin Patil',
      timestamp: {
        date: '4/28/2026',
        time: '11:16 AM'
      }
    },
    {
      id: '69ef1b0b103a13817e0755ca',
      name: 'Sanket Bobade',
      type: 'CUSTOMER',
      removedBy: 'Admin Patil',
      timestamp: {
        date: '4/27/2026',
        time: '01:45 PM'
      }
    },
    {
      id: '69ec81c7a17b8b6a434fae74',
      name: 'Exercitation do voluptatem minim id aliquip',
      type: 'LEAD',
      removedBy: 'Admin Patil',
      timestamp: {
        date: '4/26/2026',
        time: '07:17 AM'
      }
    }
  ];

  const truncate = (str, n) => {
    return str.length > n ? str.substr(0, n - 1) + '...' : str;
  };

  return (
    <div className="recycle-bin-container">
      <div className="recycle-bin-card">
        {/* Header Section */}
        <div className="recycle-bin-header">
          <div className="recycle-bin-title-wrapper">
            <div className="recycle-bin-header-icon">
              <Icon name="undo" size={24} />
            </div>
            <h2 className="recycle-bin-title">Recycle Bin Intelligence</h2>
          </div>
          <p className="recycle-bin-subtitle">
            Audit and recover soft-deleted records across the entire institutional ecosystem.
          </p>
          <div className="recycle-bin-divider"></div>
        </div>

        {/* Table Section */}
        <div className="recycle-bin-table-container">
          <table className="recycle-bin-table">
            <thead>
              <tr className="recycle-bin-thead-row">
                <th className="recycle-bin-th col-identity">NAME / IDENTITY</th>
                <th className="recycle-bin-th col-type">ENTITY TYPE</th>
                <th className="recycle-bin-th col-removed-by">REMOVED BY</th>
                <th className="recycle-bin-th col-timestamp">REMOVAL TIMESTAMP</th>
                <th className="recycle-bin-th col-action">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {deletedRecords.map((record) => (
                <tr key={record.id} className="recycle-bin-row">
                  <td className="recycle-bin-td">
                    <div className="identity-cell">
                      <span className="identity-name" title={record.name}>
                        {truncate(record.name, 35)}
                      </span>
                      <span className="identity-id">{record.id}</span>
                    </div>
                  </td>
                  <td className="recycle-bin-td">
                    <span className={`type-badge ${record.type.toLowerCase()}`}>
                      {record.type}
                    </span>
                  </td>
                  <td className="recycle-bin-td">
                    <span className="removed-by-name">{record.removedBy}</span>
                  </td>
                  <td className="recycle-bin-td">
                    <div className="timestamp-cell">
                      <span className="timestamp-date">{record.timestamp.date}</span>
                      <span className="timestamp-time">{record.timestamp.time}</span>
                    </div>
                  </td>
                  <td className="recycle-bin-td">
                    <button className="restore-btn">
                      <span className="icon-undo">
                        <Icon name="undo" size={14} />
                      </span>
                      <span>Restore</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RecycleBinIntelligence;
