import { useState } from 'react'
import PageHeader from '../../../components/PageHeader.jsx'
import { Icon } from '../../../layouts/icons.jsx'
import '../../../styles/leadsList.css'

export default function Attendance() {
  const [activeTab, setActiveTab] = useState('attendance')

  const stats = [
    { label: 'Present Today', value: '42', icon: 'check', color: '#10b981' },
    { label: 'On Leave', value: '5', icon: 'calendar', color: '#3b82f6' },
    { label: 'Late Arrival', value: '3', icon: 'bell', color: '#f59e0b' },
  ]

  return (
    <div className="stack crmContent page-enter">
      <PageHeader
        title="Attendance & Leave Management"
        description="Track employee presence, manage leave requests, and monitor operational capacity."
        backTo="/"
        actions={
          <div className="leadsHeaderActions">
            <button className="btn primary">
              <Icon name="plus" size={16} />
              <span>Mark Attendance</span>
            </button>
          </div>
        }
      />

      <div className="dashboard-stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginTop: '24px' }}>
        {stats.map(s => (
          <div key={s.label} className="glass-panel stat-card-premium" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.05 }}>
               <Icon name={s.icon} size={80} />
            </div>
            <div className="muted text-xs font-bold uppercase letter-spacing-1">{s.label}</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '8px', color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="glass-panel" style={{ marginTop: '32px', borderRadius: '24px', overflow: 'hidden' }}>
        <div className="tabs-header" style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
           <button 
             className={`tab-btn ${activeTab === 'attendance' ? 'active' : ''}`} 
             onClick={() => setActiveTab('attendance')}
             style={{ padding: '20px 32px', border: 'none', background: 'none', color: activeTab === 'attendance' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 700, borderBottom: activeTab === 'attendance' ? '3px solid var(--primary)' : 'none', cursor: 'pointer' }}
           >
             Daily Attendance
           </button>
           <button 
             className={`tab-btn ${activeTab === 'leave' ? 'active' : ''}`} 
             onClick={() => setActiveTab('leave')}
             style={{ padding: '20px 32px', border: 'none', background: 'none', color: activeTab === 'leave' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 700, borderBottom: activeTab === 'leave' ? '3px solid var(--primary)' : 'none', cursor: 'pointer' }}
           >
             Leave Requests
           </button>
        </div>

        <div className="tab-content" style={{ padding: '32px' }}>
           {activeTab === 'attendance' ? (
             <div className="emptyState" style={{ padding: '60px 0' }}>
               <Icon name="calendar" size={48} style={{ opacity: 0.2, marginBottom: '20px' }} />
               <h3>No attendance records for today</h3>
               <p className="muted">Records will appear here once employees check in or manual entries are made.</p>
             </div>
           ) : (
             <div className="emptyState" style={{ padding: '60px 0' }}>
               <Icon name="tasks" size={48} style={{ opacity: 0.2, marginBottom: '20px' }} />
               <h3>No pending leave requests</h3>
               <p className="muted">All requests have been processed or none have been submitted yet.</p>
             </div>
           )}
        </div>
      </div>
      
      <style>{`
        .stat-card-premium { border: 1px solid var(--border); transition: transform 0.3s ease; }
        .stat-card-premium:hover { transform: translateY(-5px); }
        .tab-btn { transition: all 0.2s ease; }
        .tab-btn:hover { background: rgba(255,255,255,0.05); }
      `}</style>
    </div>
  )
}
