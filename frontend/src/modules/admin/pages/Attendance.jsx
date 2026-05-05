import { useState, useEffect } from 'react'
import { attendanceApi } from '../../../services/attendance'
import { Icon } from '../../../layouts/icons.jsx'
import '../../../styles/leadsList.css'

export default function Attendance() {
  const [activeTab, setActiveTab] = useState('attendance')
  const [reportData, setReportData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  useEffect(() => {
    fetchReport()
  }, [selectedMonth, selectedYear])

  const fetchReport = async () => {
    try {
      setLoading(true)
      const data = await attendanceApi.getMonthlyReport(selectedMonth, selectedYear)
      setReportData(data)
    } catch (error) {
      console.error('Failed to fetch attendance report', error)
    } finally {
      setLoading(false)
    }
  }

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const years = [2024, 2025, 2026]

  return (
    <div className="stack crmContent page-enter">
      <div className="users-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="users-title">Attendance Intelligence</h1>
          <p className="users-subtitle">Monthly employee presence and performance report</p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <select 
            className="premium-select" 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
          >
            {months.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          <select 
            className="premium-select" 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="glass-panel" style={{ marginTop: '32px', borderRadius: '24px', overflow: 'hidden' }}>
        <div className="tabs-header" style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
           <button 
             className={`tab-btn ${activeTab === 'attendance' ? 'active' : ''}`} 
             onClick={() => setActiveTab('attendance')}
           >
             Monthly Summary
           </button>
           <button 
             className={`tab-btn ${activeTab === 'leave' ? 'active' : ''}`} 
             onClick={() => setActiveTab('leave')}
           >
             Detailed Logs
           </button>
        </div>

        <div className="tab-content" style={{ padding: '0' }}>
           {loading ? (
             <div className="emptyState" style={{ padding: '60px 0' }}>
               <div className="loading-spinner-premium" />
               <p>Generating intelligence report...</p>
             </div>
           ) : reportData.length === 0 ? (
             <div className="emptyState" style={{ padding: '60px 0' }}>
               <Icon name="calendar" size={48} style={{ opacity: 0.2, marginBottom: '20px' }} />
               <h3>No records found for this period</h3>
               <p className="muted">Try selecting a different month or year.</p>
             </div>
           ) : (
             <div className="table-responsive">
               <table className="crm-premium-table">
                 <thead>
                   <tr>
                     <th>Employee</th>
                     <th>Present</th>
                     <th>Late</th>
                     <th>Half Day</th>
                     <th>On Leave</th>
                     <th>Total Hours</th>
                     <th>Efficiency</th>
                   </tr>
                 </thead>
                 <tbody>
                   {reportData.map((item) => (
                     <tr key={item.employee._id}>
                       <td>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                           <div className="avatar-small">{item.employee.name.charAt(0)}</div>
                           <div>
                             <div style={{ fontWeight: 700 }}>{item.employee.name}</div>
                             <div className="text-xs muted">{item.employee.role}</div>
                           </div>
                         </div>
                       </td>
                       <td><span className="badge-present">{item.stats.Present}</span></td>
                       <td><span className="badge-late">{item.stats.Late}</span></td>
                       <td>{item.stats['Half Day']}</td>
                       <td>{item.stats['On Leave']}</td>
                       <td style={{ fontWeight: 700 }}>{item.stats.totalHours.toFixed(1)} hrs</td>
                       <td>
                         <div className="efficiency-bar">
                           <div 
                             className="efficiency-fill" 
                             style={{ width: `${Math.min((item.stats.Present / 22) * 100, 100)}%` }} 
                           />
                         </div>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           )}
        </div>
      </div>
      
      <style>{`
        .premium-select {
          background: var(--bg-surface);
          border: 1px solid var(--border);
          color: var(--text);
          padding: 8px 16px;
          border-radius: 12px;
          font-weight: 700;
          outline: none;
          cursor: pointer;
        }
        .tab-btn {
          padding: 20px 32px;
          border: none;
          background: none;
          color: var(--text-muted);
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          border-bottom: 3px solid transparent;
        }
        .tab-btn.active {
          color: var(--primary);
          border-bottom-color: var(--primary);
          background: rgba(99, 102, 241, 0.05);
        }
        .crm-premium-table {
          width: 100%;
          border-collapse: collapse;
        }
        .crm-premium-table th {
          text-align: left;
          padding: 16px 24px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-muted);
          background: var(--bg-surface);
        }
        .crm-premium-table td {
          padding: 16px 24px;
          border-top: 1px solid var(--border);
          color: var(--text);
        }
        .avatar-small {
          width: 32px; height: 32px; border-radius: 50%; background: var(--primary);
          color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px;
        }
        .badge-present { background: rgba(34, 197, 94, 0.15); color: #16a34a; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 12px; border: 1px solid rgba(34, 197, 94, 0.2); }
        .badge-late { background: rgba(234, 179, 8, 0.15); color: #854d0e; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 12px; border: 1px solid rgba(234, 179, 8, 0.2); }
        .efficiency-bar { width: 100px; height: 6px; background: var(--border-subtle); border-radius: 10px; overflow: hidden; }
        .efficiency-fill { height: 100%; background: var(--primary); border-radius: 10px; transition: width 1s ease-out; }
        .loading-spinner-premium {
          width: 40px; height: 40px; border: 3px solid var(--border); border-top-color: var(--primary);
          border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

