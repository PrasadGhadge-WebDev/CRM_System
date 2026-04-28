import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '../../../layouts/icons'
import { useAuth } from '../../../context/AuthContext'
import { hrDashboardApi } from '../../../services/hrDashboard'
import { formatCurrency } from '../../../utils/formatters'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
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
      <span className="muted">Synchronizing human capital analytics...</span>
    </div>
  )

  if (!data) return <div className="crmContent p-8 muted">Failed to synchronize dashboard intelligence.</div>

  const pieData = [
    { name: 'Operational', value: data.attendance?.present || 0 },
    { name: 'Absent', value: data.attendance?.absent || 0 },
    { name: 'Leave', value: data.attendance?.onLeave || 0 }
  ]
  const COLORS = ['#10b981', '#ef4444', '#f59e0b']

  return (
    <div className="stack leadsListPage crmContent">
      <section className="leadsFullscreenShell">
        <header className="leadsHeader">
          <div>
            <h1 className="leadsTitle">Personnel Intelligence</h1>
            <p className="leadsDescription">Global workforce metrics, institutional payroll, and recruitment analytics.</p>
          </div>
          <div className="leadsHeaderActions">
            <button className="btn-premium action-vibrant" onClick={() => navigate('/employees/new')}>
              <Icon name="plus" />
              <span>Onboard Personnel</span>
            </button>
          </div>
        </header>

        <div className="dashboard-metrics-premium">
          <div className="metric-card-premium glass-panel">
            <div className="metric-icon-premium" style={{ background: 'linear-gradient(135deg, #4f46e5, #818cf8)' }}>
              <Icon name="users" color="white" />
            </div>
            <div className="metric-details-premium">
              <span className="metric-label-premium">Active Workforce</span>
              <div className="metric-value-premium">{data.attendance?.total || 0}</div>
              <div className="metric-trend-premium positive">Institutional Capacity</div>
            </div>
          </div>

          <div className="metric-card-premium glass-panel">
            <div className="metric-icon-premium" style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)' }}>
              <Icon name="calendar" color="white" />
            </div>
            <div className="metric-details-premium">
              <span className="metric-label-premium">Pending Audits</span>
              <div className="metric-value-premium">{data.pendingLeaves || 0}</div>
              <div className="metric-trend-premium warning">Leave Approvals</div>
            </div>
          </div>

          <div className="metric-card-premium glass-panel">
            <div className="metric-icon-premium" style={{ background: 'linear-gradient(135deg, #10b981, #34d399)' }}>
              <Icon name="billing" color="white" />
            </div>
            <div className="metric-details-premium">
              <span className="metric-label-premium">Payroll Outlay</span>
              <div className="metric-value-premium">{formatCurrency(data.payrollSummary?.totalNet || 0)}</div>
              <div className="metric-trend-premium positive">Processed this sequence</div>
            </div>
          </div>
        </div>

        <div className="grid-2 gap-24">
          <section className="intel-card glass-panel">
            <div className="card-header-premium">
              <Icon name="reports" />
              <h3>Personnel Distribution</h3>
            </div>
            <div className="card-body-premium" style={{ height: '320px', padding: '24px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.employeesByRole}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="role" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-dimmed)', fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-dimmed)', fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: '#1e1b4b', border: 'none', borderRadius: '12px', boxShadow: 'var(--shadow-lg)' }} />
                  <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="intel-card glass-panel">
            <div className="card-header-premium">
              <Icon name="check" />
              <h3>Attendance Intelligence</h3>
            </div>
            <div className="card-body-premium" style={{ height: '320px', padding: '24px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {pieData.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1e1b4b', border: 'none', borderRadius: '12px' }} />
                  <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        <div className="grid-2 gap-24" style={{ marginTop: '24px' }}>
          <section className="intel-card glass-panel">
            <div className="card-header-premium">
              <Icon name="calendar" />
              <h3>Events & Institutional Milestones</h3>
            </div>
            <div className="card-body-premium">
               <table className="table-premium">
                  <thead>
                    <tr>
                      <th>EVENT</th>
                      <th>IDENTITY</th>
                      <th>DATE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.reminders?.length ? data.reminders.map((rem, idx) => (
                      <tr key={idx}>
                        <td><span className="status-pill-modern" style={{ '--pill-color': rem.type === 'Birthday' ? '#ec4899' : '#6366f1' }}>{rem.type.toUpperCase()}</span></td>
                        <td><span className="font-bold">{rem.name}</span></td>
                        <td><span className="text-sm muted">{rem.date}</span></td>
                      </tr>
                    )) : <tr><td colSpan="3" className="text-center p-8 muted">No active milestones</td></tr>}
                  </tbody>
               </table>
            </div>
          </section>

          <section className="intel-card glass-panel">
            <div className="card-header-premium">
              <Icon name="user" />
              <h3>Recruitment Intelligence</h3>
            </div>
            <div className="card-body-premium">
               <table className="table-premium">
                  <thead>
                    <tr>
                      <th>CANDIDATE</th>
                      <th>DESIGNATION</th>
                      <th>TIMESTAMP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.upcomingInterviews?.length ? data.upcomingInterviews.map(iv => (
                      <tr key={iv._id}>
                        <td><span className="font-bold">{iv.name}</span></td>
                        <td><span className="text-sm muted">{iv.job_id?.title || 'General'}</span></td>
                        <td><span className="font-numeric-bold" style={{ color: 'var(--primary)' }}>{new Date(iv.interview_date).toLocaleDateString()}</span></td>
                      </tr>
                    )) : <tr><td colSpan="3" className="text-center p-8 muted">Pipeline idle</td></tr>}
                  </tbody>
               </table>
            </div>
          </section>
        </div>
      </section>

      <style>{`
        .intel-card { border-radius: 24px; overflow: hidden; height: 100%; }
        .card-header-premium { padding: 16px 24px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.02); }
        .card-header-premium h3 { margin: 0; font-size: 0.85rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }
        .dashboard-metrics-premium { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin: 32px 0; }
        .metric-card-premium { padding: 24px; border-radius: 24px; display: flex; align-items: center; gap: 20px; }
        .metric-icon-premium { width: 48px; height: 48px; border-radius: 16px; display: flex; align-items: center; justify-content: center; }
        .metric-details-premium { display: flex; flex-direction: column; gap: 4px; }
        .metric-label-premium { font-size: 0.65rem; font-weight: 800; color: var(--text-dimmed); text-transform: uppercase; letter-spacing: 0.05em; }
        .metric-value-premium { font-size: 1.5rem; font-weight: 900; color: var(--text); }
        .metric-trend-premium { font-size: 0.7rem; font-weight: 600; color: var(--text-dimmed); }
        @media (max-width: 1024px) { .dashboard-metrics-premium { grid-template-columns: 1fr; } .grid-2 { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  )
}
