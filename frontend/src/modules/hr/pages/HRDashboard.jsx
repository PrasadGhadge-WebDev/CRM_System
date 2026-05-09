import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../../../layouts/icons'
import { useAuth } from '../../../context/AuthContext'
import { hrDashboardApi } from '../../../services/hrDashboard'
import { formatCurrency } from '../../../utils/formatters'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import '../../../styles/leadsList.css'

export default function HRDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    hrDashboardApi.get()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="crmContent leadsLoadingState">
      <div className="spinner-medium" />
      <span className="muted">Loading dashboard data...</span>
    </div>
  )

  if (!data) return <div className="crmContent p-8 muted">Session synchronization failed.</div>

  return (
    <div className="stack leadsListPage crmContent">
      <section className="leadsFullscreenShell">
        <header className="leadsHeader">
          <div>
            <h1 className="leadsTitle">HR Dashboard</h1>
            <p className="leadsDescription">Employee and Salary Overview</p>
          </div>
          <div className="leadsHeaderActions">
            <button className="btn-premium action-vibrant" onClick={() => navigate('/hr/employees')}>
              <Icon name="users" />
              <span>Employee List</span>
            </button>
          </div>
        </header>

        {/* 1. 🔝 TOP SUMMARY CARDS */}
        <div className="hr-summary-grid">
          <div className="hr-stat-card glass-panel">
             <div className="hr-stat-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}><Icon name="users" /></div>
             <div className="hr-stat-info">
                <span className="label">Total Employees</span>
                <span className="value">{data.attendance?.total || 0}</span>
                <span className="trend positive">Current Staff</span>
             </div>
          </div>
          <div className="hr-stat-card glass-panel">
             <div className="hr-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}><Icon name="check" /></div>
             <div className="hr-stat-info">
                <span className="label">Present Today</span>
                <span className="value">{data.attendance?.present || 0}</span>
                <span className="trend positive">Operational</span>
             </div>
          </div>
          <div className="hr-stat-card glass-panel">
             <div className="hr-stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}><Icon name="close" /></div>
             <div className="hr-stat-info">
                <span className="label">Absent Today</span>
                <span className="value">{data.attendance?.absent || 0}</span>
                <span className="trend negative">Unscheduled</span>
             </div>
          </div>
          <div className="hr-stat-card glass-panel">
             <div className="hr-stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}><Icon name="calendar" /></div>
             <div className="hr-stat-info">
                <span className="label">Pending Leaves</span>
                <span className="value">{data.pendingLeaves || 0}</span>
                <span className="trend warning">Needs Action</span>
             </div>
          </div>
          <div className="hr-stat-card glass-panel">
             <div className="hr-stat-icon" style={{ background: 'rgba(79, 70, 229, 0.1)', color: '#4f46e5' }}><Icon name="billing" /></div>
             <div className="hr-stat-info">
                <span className="label">Salary Expense</span>
                <span className="value">{formatCurrency(data.payrollSummary?.totalNet || 0)}</span>
                <span className="trend positive">Monthly Cycle</span>
             </div>
          </div>
          <div className="hr-stat-card glass-panel">
             <div className="hr-stat-icon" style={{ background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899' }}><Icon name="plus" /></div>
             <div className="hr-stat-info">
                <span className="label">New Joiners</span>
                <span className="value">{data.newJoinersCount || 4}</span>
                <span className="trend positive">This Month</span>
             </div>
          </div>
        </div>

        {/* 2. 📊 MIDDLE: ATTENDANCE + LEAVE */}
        <div className="grid-2 gap-24" style={{ marginTop: '24px' }}>
          <section className="intel-card glass-panel">
            <div className="card-header-premium">
              <Icon name="check" />
              <h3>Today's Attendance</h3>
              <button className="btn-link" onClick={() => navigate('/hr/attendance')}>View</button>
            </div>
            <div className="card-body-premium">
              <table className="table-premium compact">
                <thead>
                  <tr>
                    <th>EMPLOYEE</th>
                    <th>IN TIME</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.todayAttendance || [
                    { name: 'Rahul Sharma', inTime: '09:15 AM', status: 'On-Time' },
                    { name: 'Priya Mehta', inTime: '09:45 AM', status: 'Late' },
                    { name: 'Amit Patel', inTime: '09:10 AM', status: 'On-Time' },
                    { name: 'Sneha Joshi', inTime: '10:05 AM', status: 'Late' },
                    { name: 'Vikram Singh', inTime: '09:20 AM', status: 'On-Time' }
                  ]).map((att, i) => (
                    <tr key={i}>
                      <td><span className="font-bold text-xs">{att.name}</span></td>
                      <td><span className="font-numeric muted text-xs">{att.inTime}</span></td>
                      <td><span className={`status-pill-modern ${att.status === 'Late' ? 'warning' : 'success'}`}>{att.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="intel-card glass-panel">
            <div className="card-header-premium">
              <Icon name="calendar" />
              <h3>Pending Leave Requests</h3>
              <button className="btn-link" onClick={() => navigate('/hr/leaves')}>View All</button>
            </div>
            <div className="card-body-premium">
               <div className="leave-requests-mini">
                  {(data.leaveRequests || [
                    { name: 'Amit Patel', type: 'Sick Leave', duration: 2 },
                    { name: 'Priya Mehta', type: 'Casual Leave', duration: 1 },
                    { name: 'Rahul Sharma', type: 'Paid Leave', duration: 3 }
                  ]).map((req, i) => (
                    <div key={i} className="leave-mini-item">
                       <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="payee-avatar-mini" style={{ width: '28px', height: '28px', fontSize: '0.6rem' }}>{req.name?.charAt(0)}</div>
                          <div className="stack gap-0">
                            <span className="font-bold text-xs">{req.name}</span>
                            <span className="text-xxs muted">{req.type} • {req.duration} days</span>
                          </div>
                       </div>
                       <div className="mini-actions">
                          <button className="action-btn-mini success" title="Approve"><Icon name="check" size={12} /></button>
                          <button className="action-btn-mini danger" title="Reject"><Icon name="close" size={12} /></button>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          </section>
        </div>

        {/* 3. 💰 RIGHT/BELOW: PAYROLL + TRANSACTIONS */}
        <section className="intel-card glass-panel" style={{ marginTop: '24px' }}>
          <div className="card-header-premium">
            <Icon name="billing" />
            <div className="stack gap-0">
               <h3>Recent Salary Payments</h3>
               <span className="text-xxs muted">Salary payment history</span>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '16px', alignItems: 'center' }}>
               <div className="payroll-mini-stat">
                  <span className="muted">Last Paid:</span>
                  <span className="font-numeric-bold">01 May 2026</span>
               </div>
               <button className="btn-premium action-vibrant" onClick={() => navigate('/hr/payroll')}>Calculate Salary</button>
            </div>
          </div>
          <div className="card-body-premium">
             <table className="table-premium">
                <thead>
                  <tr>
                    <th>EMPLOYEE NAME</th>
                    <th>SALARY AMOUNT</th>
                    <th>PAYMENT DATE</th>
                    <th>MODE</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                   {(data.recentSalaries || [
                     { user_name: 'Rahul Sharma', amount: 45000, payment_date: '2026-05-01' },
                     { user_name: 'Priya Mehta', amount: 38000, payment_date: '2026-05-01' },
                     { user_name: 'Amit Patel', amount: 42000, payment_date: '2026-05-01' },
                     { user_name: 'Sneha Joshi', amount: 35000, payment_date: '2026-05-01' }
                   ]).map((sal, i) => (
                     <tr key={i}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                             <div className="payee-avatar-mini" style={{ width: '28px', height: '28px' }}>{sal.user_name?.charAt(0)}</div>
                             <span className="font-bold">{sal.user_name}</span>
                          </div>
                        </td>
                        <td><span className="font-numeric-bold" style={{ color: 'var(--primary)' }}>{formatCurrency(sal.amount)}</span></td>
                        <td><span className="text-sm muted">{new Date(sal.payment_date).toLocaleDateString()}</span></td>
                        <td><span className="text-xs font-bold muted">BANK XFER</span></td>
                        <td><span className="status-pill-modern success">PAID</span></td>
                     </tr>
                   ))}
                </tbody>
             </table>
          </div>
        </section>

        {/* 4. 📈 BOTTOM: CHARTS + ACTIVITIES */}
        <div className="grid-2 gap-24" style={{ marginTop: '24px' }}>
           <section className="intel-card glass-panel">
              <div className="card-header-premium">
                 <Icon name="reports" />
                 <h3>Company Reports</h3>
              </div>
              <div className="card-body-premium" style={{ height: '300px', padding: '20px' }}>
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.revenueTrend || [
                      { name: 'W1', value: 400 },
                      { name: 'W2', value: 300 },
                      { name: 'W3', value: 500 },
                      { name: 'W4', value: 450 }
                    ]}>
                       <defs>
                          <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                             <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                       </defs>
                       <XAxis dataKey="name" hide />
                       <Tooltip contentStyle={{ background: '#1e1b4b', border: 'none', borderRadius: '12px' }} />
                       <Area type="monotone" dataKey="value" stroke="#6366f1" fillOpacity={1} fill="url(#colorVal)" />
                    </AreaChart>
                 </ResponsiveContainer>
                 <div className="analytics-legend">
                    <span className="text-xxs muted">Salary and Team Growth</span>
                 </div>
              </div>
           </section>

           <section className="intel-card glass-panel">
              <div className="card-header-premium">
                 <Icon name="activity" />
                 <h3>Activity Log</h3>
              </div>
              <div className="card-body-premium">
                 <div className="activities-feed-mini">
                    <div className="feed-item">
                       <div className="feed-dot" style={{ background: '#10b981' }} />
                       <div className="feed-content">
                          <span className="text-xs font-bold">New employee joined</span>
                          <span className="text-xxs muted">Vikram Singh has been onboarded</span>
                       </div>
                       <span className="feed-time">1h ago</span>
                    </div>
                    <div className="feed-item">
                       <div className="feed-dot" style={{ background: '#f59e0b' }} />
                       <div className="feed-content">
                          <span className="text-xs font-bold">Leave request pending</span>
                          <span className="text-xxs muted">Sneha Joshi applied for Personal Leave</span>
                       </div>
                       <span className="feed-time">3h ago</span>
                    </div>
                    <div className="feed-item">
                       <div className="feed-dot" style={{ background: '#ef4444' }} />
                       <div className="feed-content">
                          <span className="text-xs font-bold">Salary pending</span>
                          <span className="text-xxs muted">Payroll for Dept IT needs approval</span>
                       </div>
                       <span className="feed-time">Yesterday</span>
                    </div>
                 </div>
              </div>
           </section>
        </div>
      </section>

      <style>{`
        .hr-summary-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 16px; margin: 24px 0; }
        .hr-stat-card { padding: 16px; border-radius: 20px; display: flex; align-items: center; gap: 12px; box-shadow: inset 4px 0 0 var(--card-accent), var(--shadow-sm); }
        .hr-stat-icon { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }
        .hr-stat-info { display: flex; flex-direction: column; gap: 2px; }
        .hr-stat-info .label { font-size: 0.6rem; font-weight: 800; color: var(--text-dimmed); text-transform: uppercase; letter-spacing: 0.05em; }
        .hr-stat-info .value { font-size: 1.1rem; font-weight: 900; color: var(--text); }
        .hr-stat-info .trend { font-size: 0.55rem; font-weight: 700; }
        .hr-stat-info .trend.positive { color: #10b981; }
        .hr-stat-info .trend.warning { color: #f59e0b; }
        .hr-stat-info .trend.negative { color: #ef4444; }

        .table-premium.compact th, .table-premium.compact td { padding: 8px 16px; }
        .text-xxs { font-size: 0.65rem; }
        
        .leave-requests-mini { display: flex; flex-direction: column; gap: 12px; padding: 16px; }
        .leave-mini-item { display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid var(--border-subtle); }
        .leave-mini-item:last-child { border-bottom: none; padding-bottom: 0; }
        .mini-actions { display: flex; gap: 8px; }

        .payroll-mini-stat { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
        .payroll-mini-stat .muted { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 800; }
        
        .activities-feed-mini { display: flex; flex-direction: column; gap: 16px; padding: 16px; }
        .feed-item { display: flex; align-items: center; gap: 12px; position: relative; }
        .feed-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .feed-content { display: flex; flex-direction: column; gap: 2px; flex: 1; }
        .feed-time { font-size: 0.6rem; color: var(--text-dimmed); font-weight: 700; }

        @media (max-width: 1400px) { .hr-summary-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 900px) { .hr-summary-grid { grid-template-columns: repeat(2, 1fr); } }
      `}</style>
    </div>
  )
}
