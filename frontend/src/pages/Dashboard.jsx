import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  Cell
} from 'recharts'
import { 
  FiUsers, 
  FiUserCheck, 
  FiTarget, 
  FiTrendingUp, 
  FiCreditCard,
  FiBriefcase,
  FiClock,
  FiAlertCircle,
  FiCheckCircle,
  FiChevronRight,
  FiPlus,
  FiFileText,
  FiUserPlus
} from 'react-icons/fi'
import { Link, useNavigate } from 'react-router-dom'
import { metricsApi } from '../services/metrics.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useToastFeedback } from '../utils/useToastFeedback.js'
import '../styles/dashboard-v3.css'

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  useToastFeedback({ error })

  const fetchMetrics = useCallback(() => {
    setLoading(true)
    metricsApi
      .get()
      .then((data) => {
        setMetrics(data)
      })
      .catch((e) => {
        setError(e.message || 'Failed to load dashboard')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  const formatCurrency = (val) => {
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(1)} L`
    }
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0)
  }

  // MOCK DATA for visualization parity with image
  const revenueTrend = useMemo(() => [
    { name: 'Jan', value: 8 },
    { name: 'Feb', value: 18 },
    { name: 'Mar', value: 16 },
    { name: 'Apr', value: 20 },
    { name: 'May', value: 25 },
    { name: 'Jun', value: 30 },
    { name: 'Jul', value: 38 },
    { name: 'Aug', value: 32 },
    { name: 'Sep', value: 36 },
    { name: 'Oct', value: 42 },
    { name: 'Nov', value: 45 },
    { name: 'Dec', value: 52 },
  ], [])

  const conversionData = useMemo(() => [
    { name: 'Jan', Leads: 1800, Conversions: 1100 },
    { name: 'Feb', Leads: 2000, Conversions: 1200 },
    { name: 'Mar', Leads: 1900, Conversions: 950 },
    { name: 'Apr', Leads: 2200, Conversions: 1300 },
    { name: 'May', Leads: 2400, Conversions: 1400 },
    { name: 'Jun', Leads: 2100, Conversions: 1250 },
    { name: 'Jul', Leads: 2300, Conversions: 1350 },
    { name: 'Aug', Leads: 2000, Conversions: 1100 },
    { name: 'Sep', Leads: 2150, Conversions: 1200 },
    { name: 'Oct', Leads: 2250, Conversions: 1300 },
    { name: 'Nov', Leads: 2400, Conversions: 1450 },
  ], [])

  const employees = [
    { id: 1, name: 'Rahul Sharma', handled: 245, conv: 45, perf: 85 },
    { id: 2, name: 'Priya Mehta', handled: 210, conv: 38, perf: 76 },
    { id: 3, name: 'Amit Patel', handled: 180, conv: 30, perf: 66 },
    { id: 4, name: 'Sneha Joshi', handled: 155, conv: 26, perf: 62 },
    { id: 5, name: 'Vikram Singh', handled: 130, conv: 20, perf: 55 },
  ]

  const alerts = [
    { id: 1, title: 'Overdue Payments', sub: '5 invoices are overdue', count: 5, icon: <FiCreditCard />, color: '#fee2e2', iconColor: '#ef4444' },
    { id: 2, title: 'Missed Follow-ups', sub: '7 follow-ups were missed', count: 7, icon: <FiClock />, color: '#ffedd5', iconColor: '#f59e0b' },
    { id: 3, title: 'Pending Approvals', sub: '4 approvals are pending', count: 4, icon: <FiUsers />, color: '#dbeafe', iconColor: '#3b82f6' },
    { id: 4, title: 'New Leads', sub: '12 new leads this week', count: 12, icon: <FiUserPlus />, color: '#dcfce7', iconColor: '#10b981' },
  ]

  const quickActions = [
    { label: 'Add Lead', icon: <FiTarget />, color: '#eff6ff', textColor: '#3b82f6', path: '/leads/new' },
    { label: 'Add Employee', icon: <FiUserPlus />, color: '#f0fdf4', textColor: '#10b981', path: '/users?add=true' },
    { label: 'Create Deal', icon: <FiBriefcase />, color: '#faf5ff', textColor: '#8b5cf6', path: '/deals/new' },
    { label: 'Generate Invoice', icon: <FiFileText />, color: '#fffbeb', textColor: '#f59e0b', path: '/invoices/new' },
  ]

  const stats = [
    { label: 'Total Employees', value: metrics?.users?.total || 128, trend: '+8.2%', icon: <FiUsers />, color: '#eff6ff', iconColor: '#3b82f6' },
    { label: 'Total Customers', value: metrics?.customers?.total || 1245, trend: '+12.5%', icon: <FiUserCheck />, color: '#f0fdf4', iconColor: '#10b981' },
    { label: 'Total Leads', value: metrics?.leads?.total || 2350, trend: '+15.3%', icon: <FiTarget />, color: '#faf5ff', iconColor: '#8b5cf6' },
    { label: 'Total Deals', value: metrics?.deals?.total || 320, trend: '+10.1%', icon: <FiBriefcase />, color: '#fff7ed', iconColor: '#f97316' },
    { label: 'Total Revenue', value: formatCurrency(metrics?.summary?.totalRevenue || 4860000), trend: '+18.7%', icon: <FiTrendingUp />, color: '#fffbeb', iconColor: '#f59e0b' },
    { label: 'Pending Payments', value: formatCurrency(metrics?.financials?.unpaidValue || 1240000), trend: '-4.3%', icon: <FiCreditCard />, color: '#fee2e2', iconColor: '#ef4444', negative: true },
  ]

  return (
    <div className="dashboard-container-v3">
      {/* 1. TOP METRICS ROW */}
      <div className="metrics-row-v3">
        {stats.map((s, i) => (
          <div key={i} className="metric-card-v3">
            <div className="card-top">
              <div className="icon-box" style={{ backgroundColor: s.color, color: s.iconColor }}>
                {s.icon}
              </div>
              <span className="label">{s.label}</span>
            </div>
            <div className="value">{loading ? '...' : s.value}</div>
            <div className={`trend ${s.negative ? 'down' : 'up'}`}>
              {s.negative ? '↓' : '↑'} {s.trend} from last month
            </div>
          </div>
        ))}
      </div>

      {/* 2. CHARTS ROW */}
      <div className="dashboard-grid-v3">
        <div className="section-card-v3">
          <div className="crm-flex-between" style={{ marginBottom: '20px' }}>
             <h3>Monthly Revenue</h3>
             <select className="input-premium small" style={{ width: 'auto', padding: '4px 12px' }}>
                <option>This Year</option>
             </select>
          </div>
          <div style={{ width: '100%', height: '240px' }}>
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrend}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(v) => `${v}L`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    formatter={(v) => [`₹${v} L`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
             </ResponsiveContainer>
          </div>
        </div>

        <div className="section-card-v3">
          <div className="crm-flex-between" style={{ marginBottom: '20px' }}>
             <h3>Leads vs Conversions</h3>
             <select className="input-premium small" style={{ width: 'auto', padding: '4px 12px' }}>
                <option>This Year</option>
             </select>
          </div>
          <div style={{ width: '100%', height: '240px' }}>
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={conversionData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(v) => v >= 1000 ? `${v/1000}K` : v} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                  <Legend iconType="circle" verticalAlign="top" align="center" wrapperStyle={{ paddingBottom: '20px' }} />
                  <Bar dataKey="Leads" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={10} />
                  <Bar dataKey="Conversions" fill="#10b981" radius={[4, 4, 0, 0]} barSize={10} />
                </BarChart>
             </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 3. PERFORMANCE & SUMMARY ROW */}
      <div className="dashboard-three-col-v3">
        {/* Employee Performance */}
        <div className="section-card-v3">
          <h3>Employee Performance</h3>
          <table className="v3-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Leads Handled</th>
                <th>Conversions</th>
                <th>Performance</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, i) => (
                <tr key={emp.id}>
                  <td>{i + 1}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                       <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800 }}>{emp.name.charAt(0)}</div>
                       {emp.name}
                    </div>
                  </td>
                  <td>{emp.handled}</td>
                  <td>{emp.conv}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, width: '30px' }}>{emp.perf}%</span>
                      <div className="v3-progress-bar">
                        <div className="v3-progress-fill" style={{ width: `${emp.perf}%` }} />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="btn-link full-width margin-top-12" onClick={() => navigate('/users')}>View All Employees</button>
        </div>

        {/* Follow-up Summary */}
        <div className="section-card-v3">
          <h3>Follow-up Summary</h3>
          <div className="follow-up-grid-v3">
            <div className="follow-up-stat-box-v3" style={{ background: '#eff6ff' }}>
              <Icon name="calendar" />
              <span className="count" style={{ color: '#3b82f6' }}>32</span>
              <span className="label">Today's</span>
            </div>
            <div className="follow-up-stat-box-v3" style={{ background: '#fff7ed' }}>
              <Icon name="clock" />
              <span className="count" style={{ color: '#f97316' }}>58</span>
              <span className="label">Upcoming</span>
            </div>
            <div className="follow-up-stat-box-v3" style={{ background: '#fee2e2' }}>
              <Icon name="alert" />
              <span className="count" style={{ color: '#ef4444' }}>07</span>
              <span className="label">Missed</span>
            </div>
          </div>
          
          <div className="follow-up-list">
             <div style={{ padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Follow-up with Tech Solutions</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Today, 10:00 AM</div>
             </div>
             <div style={{ padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Proposal discussion with ABC Corp</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Today, 01:00 PM</div>
             </div>
             <div style={{ padding: '12px 0' }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Demo follow-up with Global Pvt Ltd</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Tomorrow, 11:00 AM</div>
             </div>
          </div>
          <button className="btn-link full-width margin-top-12" onClick={() => navigate('/leads')}>View All Follow-ups</button>
        </div>

        {/* Alerts & Notifications */}
        <div className="section-card-v3">
          <h3>Alerts & Notifications</h3>
          <div className="alerts-list">
            {alerts.map(a => (
              <div key={a.id} className="alert-item-v3">
                <div className="alert-icon-v3" style={{ background: a.color, color: a.iconColor }}>
                  {a.icon}
                </div>
                <div className="alert-content-v3">
                  <div className="alert-title-v3">{a.title}</div>
                  <div className="alert-sub-v3">{a.sub}</div>
                </div>
                <div className="alert-badge-v3">{a.count}</div>
              </div>
            ))}
          </div>
          <button className="btn-link full-width margin-top-24" onClick={() => navigate('/notifications')}>View All Alerts</button>
        </div>
      </div>

      {/* 4. BOTTOM ACTIVITY & ACTIONS ROW */}
      <div className="dashboard-two-col-bottom-v3">
        {/* Recent Activity */}
        <div className="section-card-v3">
           <h3>Recent Activity</h3>
           <div className="activity-list">
              {(metrics?.activities?.recent || []).slice(0, 4).map((act, i) => (
                <div key={i} className="alert-item-v3">
                   <div className="alert-icon-v3" style={{ background: i%2===0 ? '#dcfce7' : '#f0f9ff', color: i%2===0 ? '#10b981' : '#0369a1' }}>
                      <FiCheckCircle />
                   </div>
                   <div className="alert-content-v3">
                      <div className="alert-title-v3">{act.description || act.activity_type}</div>
                      <div className="alert-sub-v3">by {act.user_id?.name || 'System'}</div>
                   </div>
                   <div className="alert-sub-v3">{new Date(act.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                </div>
              ))}
              {(!metrics?.activities?.recent?.length) && (
                <>
                   <div className="alert-item-v3">
                      <div className="alert-icon-v3" style={{ background: '#dcfce7', color: '#10b981' }}><FiTarget /></div>
                      <div className="alert-content-v3">
                         <div className="alert-title-v3">New lead "Tech Solutions" has been added by Rahul Sharma.</div>
                      </div>
                      <div className="alert-sub-v3">10 min ago</div>
                   </div>
                   <div className="alert-item-v3">
                      <div className="alert-icon-v3" style={{ background: '#f5f3ff', color: '#8b5cf6' }}><FiBriefcase /></div>
                      <div className="alert-content-v3">
                         <div className="alert-title-v3">Deal "Website Development" has been closed won.</div>
                      </div>
                      <div className="alert-sub-v3">1 hour ago</div>
                   </div>
                    <div className="alert-item-v3">
                       <div className="alert-icon-v3" style={{ background: '#fffbeb', color: '#f59e0b' }}><FiTrendingUp /></div>
                       <div className="alert-content-v3">
                          <div className="alert-title-v3">Payment of ₹85,000 received from ABC Corp.</div>
                       </div>
                       <div className="alert-sub-v3">2 hours ago</div>
                    </div>
                </>
              )}
           </div>
           <button className="btn-link full-width margin-top-12" onClick={() => navigate('/activities')}>View All Activities</button>
        </div>

        {/* Quick Actions */}
        <div className="section-card-v3">
           <h3>Quick Actions</h3>
           <div className="quick-actions-grid-v3">
              {quickActions.map((qa, i) => (
                <div key={i} className="quick-action-btn-v3" onClick={() => navigate(qa.path)}>
                   <div className="icon" style={{ color: qa.textColor }}>{qa.icon}</div>
                   <span className="text">{qa.label}</span>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  )
}

function Icon({ name }) {
  const common = { size: 18 }
  switch(name) {
    case 'calendar': return <FiClock {...common} />
    case 'clock': return <FiClock {...common} />
    case 'alert': return <FiAlertCircle {...common} />
    default: return <FiCheckCircle {...common} />
  }
}
