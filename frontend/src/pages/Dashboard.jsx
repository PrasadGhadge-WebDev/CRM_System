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
  
  useEffect(() => {
    if (user?.role === 'HR') {
      navigate('/hr/dashboard')
    }
  }, [user, navigate])

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
    { id: 1, title: 'Overdue Payments', sub: '5 invoices are overdue', count: 5, icon: <FiCreditCard />, bgClass: 'alert-red', iconColor: 'var(--danger)' },
    { id: 2, title: 'Missed Follow-ups', sub: '7 follow-ups were missed', count: 7, icon: <FiClock />, bgClass: 'alert-orange', iconColor: 'var(--warning)' },
    { id: 3, title: 'Pending Approvals', sub: '4 approvals are pending', count: 4, icon: <FiUsers />, bgClass: 'alert-blue', iconColor: 'var(--primary)' },
    { id: 4, title: 'New Leads', sub: '12 new leads this week', count: 12, icon: <FiUserPlus />, bgClass: 'alert-green', iconColor: 'var(--success)' },
  ]

  const quickActions = [
    { label: 'Add Lead', icon: <FiTarget />, bgClass: 'qa-blue', textColor: 'var(--primary)', path: '/leads/new' },
    ...(user?.role === 'Admin' || user?.role === 'HR' ? [{ label: 'Add Employee', icon: <FiUserPlus />, bgClass: 'qa-green', textColor: 'var(--success)', path: '/users?add=true' }] : []),
    { label: 'Create Deal', icon: <FiBriefcase />, bgClass: 'qa-purple', textColor: '#8b5cf6', path: '/deals/new' },
    { label: 'Generate Invoice', icon: <FiFileText />, bgClass: 'qa-yellow', textColor: 'var(--warning)', path: '/invoices/new' },
  ]

  const isEmployee = user?.role === 'Employee'

  const employeeStats = useMemo(() => {
    if (!metrics?.employee) return []
    return [
      { label: 'My Leads', value: metrics.employee.leadsTotal || 0, icon: <FiTarget />, bgClass: 'stat-blue', iconColor: 'var(--primary)' },
      { label: 'Deals In Progress', value: metrics.employee.dealsInProgress || 0, icon: <FiBriefcase />, bgClass: 'stat-purple', iconColor: '#8b5cf6' },
      { label: 'Follow-ups Today', value: metrics.employee.followupsToday || 0, icon: <FiClock />, bgClass: 'stat-orange', iconColor: '#f97316' },
      { label: 'Tasks Planned', value: metrics.employee.tasksPlanned || 0, icon: <FiCheckCircle />, bgClass: 'stat-green', iconColor: 'var(--success)' },
      { label: 'My Tickets', value: metrics.employee.ticketsTotal || 0, icon: <FiAlertCircle />, bgClass: 'stat-red', iconColor: 'var(--danger)' },
    ]
  }, [metrics])

  const stats = isEmployee ? employeeStats : [
    { label: 'Total Employees', value: metrics?.users?.total || 0, trend: '+8.2%', icon: <FiUsers />, bgClass: 'stat-blue', iconColor: 'var(--primary)' },
    { label: 'Total Customers', value: metrics?.customers?.total || 0, trend: '+12.5%', icon: <FiUserCheck />, bgClass: 'stat-green', iconColor: 'var(--success)' },
    { label: 'Total Leads', value: metrics?.leads?.total || 0, trend: '+15.3%', icon: <FiTarget />, bgClass: 'stat-purple', iconColor: '#8b5cf6' },
    { label: 'Total Deals', value: metrics?.deals?.total || 0, trend: '+10.1%', icon: <FiBriefcase />, bgClass: 'stat-orange', iconColor: '#f97316' },
    { label: 'Total Revenue', value: formatCurrency(metrics?.summary?.totalRevenue || 0), trend: '+18.7%', icon: <FiTrendingUp />, bgClass: 'stat-yellow', iconColor: 'var(--warning)' },
    { label: 'Pending Payments', value: formatCurrency(metrics?.financials?.unpaidValue || 0), trend: '-4.3%', icon: <FiCreditCard />, bgClass: 'stat-red', iconColor: 'var(--danger)', negative: true },
  ]

  if (loading && !metrics) return <div className="center padding40"><div className="spinner-medium" /></div>

  if (isEmployee && metrics?.employee) {
    const { employee } = metrics
    const empStats = [
      { label: 'Assigned Leads', value: employee.leads.total, sub: `${employee.leads.new} New`, icon: <FiTarget />, bgClass: 'stat-blue', iconColor: 'var(--primary)' },
      { label: 'Active Deals', value: employee.deals.active, sub: `${employee.deals.won} Won`, icon: <FiBriefcase />, bgClass: 'stat-purple', iconColor: '#8b5cf6' },
      { label: 'Pending Payments', value: employee.payments.pending, sub: 'Follow-up needed', icon: <FiCreditCard />, bgClass: 'stat-red', iconColor: 'var(--danger)' },
      { label: 'Open Tickets', value: employee.tickets.open, sub: 'Support tasks', icon: <FiAlertCircle />, bgClass: 'stat-orange', iconColor: '#f97316' },
    ]

    return (
      <div className="dashboard-container-v3">
        {/* 1. TOP SUMMARY CARDS */}
        <div className="metrics-row-v3 employee-metrics">
          {empStats.map((s, i) => (
            <div key={i} className="metric-card-v3">
              <div className="card-top">
                <div className={`icon-box ${s.bgClass}`} style={{ color: s.iconColor }}>
                  {s.icon}
                </div>
                <span className="label">{s.label}</span>
              </div>
              <div className="value">{s.value}</div>
              <div className="trend muted" style={{ fontSize: '0.75rem', fontWeight: 600 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* 2. MIDDLE SECTION: LEADS, DEALS, PAYMENTS */}
        <div className="dashboard-three-col-v3">
           {/* RECENT LEADS */}
           <div className="section-card-v3">
              <div className="crm-flex-between mb-16">
                <h3>🧲 Recent Leads</h3>
                <button className="btn-text-only text-xs" onClick={() => navigate('/leads')}>View All</button>
              </div>
              <div className="v3-list">
                {employee.leadsRecent?.length > 0 ? employee.leadsRecent.map((lead, i) => (
                  <div key={i} className="v3-list-item clickable" onClick={() => navigate(`/leads/${lead._id}`)}>
                    <div className="item-main">
                      <div className="item-title">{lead.name}</div>
                      <div className="item-sub">{lead.status}</div>
                    </div>
                    <div className="item-side text-right">
                       <div className="text-xs muted">Follow-up</div>
                       <div className="text-xs font-bold">{lead.nextFollowupDate ? new Date(lead.nextFollowupDate).toLocaleDateString() : 'N/A'}</div>
                    </div>
                  </div>
                )) : <div className="muted center padding20">No recent leads</div>}
              </div>
           </div>

           {/* DEAL PROGRESS */}
           <div className="section-card-v3">
              <div className="crm-flex-between mb-16">
                <h3>💼 Deal Progress</h3>
                <button className="btn-text-only text-xs" onClick={() => navigate('/deals')}>View All</button>
              </div>
              <div className="v3-list">
                {employee.dealsRecent?.length > 0 ? employee.dealsRecent.map((deal, i) => (
                  <div key={i} className="v3-list-item clickable" onClick={() => navigate(`/deals/${deal._id}`)}>
                    <div className="item-main">
                      <div className="item-title">{deal.name}</div>
                      <div className="item-sub">{deal.customer_id?.name || 'Customer'}</div>
                    </div>
                    <div className="item-side text-right">
                       <div className="text-xs font-bold text-success">₹{deal.value?.toLocaleString()}</div>
                       <div className="item-sub">{deal.stage}</div>
                    </div>
                  </div>
                )) : <div className="muted center padding20">No active deals</div>}
              </div>
           </div>

           {/* PAYMENT FOLLOW-UP */}
           <div className="section-card-v3">
              <div className="crm-flex-between mb-16">
                <h3>💰 Payment Follow-up</h3>
                <button className="btn-text-only text-xs" onClick={() => navigate('/payments')}>View All</button>
              </div>
              <div className="v3-list">
                {employee.payments.recent?.length > 0 ? employee.payments.recent.map((pay, i) => (
                  <div key={i} className="v3-list-item clickable" onClick={() => navigate(`/payments/${pay._id}`)}>
                    <div className="item-main">
                      <div className="item-title">{pay.customer_id?.name || 'Customer'}</div>
                      <div className="item-sub">{pay.status}</div>
                    </div>
                    <div className="item-side text-right">
                       <div className="text-xs font-bold text-danger">₹{pay.total_amount?.toLocaleString()}</div>
                       <div className="text-xs muted">Due: {pay.payment_date ? new Date(pay.payment_date).toLocaleDateString() : 'N/A'}</div>
                    </div>
                  </div>
                )) : <div className="muted center padding20">No pending payments</div>}
              </div>
           </div>
        </div>

        {/* 3. BOTTOM SECTION: TASKS, TICKETS, PERFORMANCE */}
        <div className="dashboard-three-col-v3">
           {/* TODAY'S TASKS */}
           <div className="section-card-v3">
              <h3>📅 Today's Tasks</h3>
              <div className="v3-list mt-12">
                {employee.tasks.today?.length > 0 ? employee.tasks.today.map((task, i) => (
                  <div key={i} className="v3-list-item">
                    <div className="alert-icon-v3 alert-green"><FiCheckCircle size={14} /></div>
                    <div className="item-main ml-12">
                      <div className="item-title">{task.description || task.activity_type}</div>
                      <div className="item-sub">{task.activity_date ? new Date(task.activity_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'}</div>
                    </div>
                  </div>
                )) : <div className="muted center padding20">No tasks for today</div>}
              </div>
           </div>

           {/* RECENT TICKETS */}
           <div className="section-card-v3">
              <h3>🎫 Recent Tickets</h3>
              <div className="v3-list mt-12">
                {employee.tickets.recent?.length > 0 ? employee.tickets.recent.map((ticket, i) => (
                  <div key={i} className="v3-list-item clickable" onClick={() => navigate(`/tickets/${ticket._id}`)}>
                    <div className="item-main">
                      <div className="item-title">#{ticket.ticket_id} - {ticket.subject}</div>
                      <div className="item-sub">{ticket.status} • {ticket.priority}</div>
                    </div>
                    <FiChevronRight className="muted" />
                  </div>
                )) : <div className="muted center padding20">No recent tickets</div>}
              </div>
           </div>

           {/* PERFORMANCE SNAPSHOT */}
           <div className="section-card-v3">
              <h3>📈 Performance Snapshot</h3>
              <div className="performance-grid mt-16">
                 <div className="perf-item">
                    <div className="perf-label">Monthly Conversions</div>
                    <div className="perf-value">{employee.performance.conversions}</div>
                 </div>
                 <div className="perf-item">
                    <div className="perf-label">Closed Deals</div>
                    <div className="perf-value">{employee.performance.closedDeals}</div>
                 </div>
                 <div className="perf-item">
                    <div className="perf-label">Follow-up Count</div>
                    <div className="perf-value">{employee.performance.followupCount}</div>
                 </div>
              </div>
              
              {/* NOTIFICATIONS / ALERTS */}
              <div className="notifications-mini mt-20">
                 <div className="alert-banner-mini alert-red animate-pulse">
                    <FiAlertCircle />
                    <span>You have {employee.payments.overdue || 0} overdue payments</span>
                 </div>
                 <div className="alert-banner-mini alert-blue mt-8">
                    <FiTarget />
                    <span>{employee.leads.new} new leads assigned today</span>
                 </div>
              </div>
           </div>
        </div>

        <style>{`
          .mb-16 { margin-bottom: 16px; }
          .mt-12 { margin-top: 12px; }
          .mt-16 { margin-top: 16px; }
          .mt-20 { margin-top: 20px; }
          .ml-12 { margin-left: 12px; }
          .text-xs { font-size: 0.75rem; }
          .v3-list { display: flex; flex-direction: column; gap: 8px; }
          .v3-list-item { 
            display: flex; 
            align-items: center; 
            justify-content: space-between; 
            padding: 10px; 
            background: var(--bg-surface); 
            border: 1px solid var(--border-subtle); 
            border-radius: 12px; 
            transition: all 0.2s;
          }
          .v3-list-item.clickable:hover { 
            border-color: var(--primary); 
            background: var(--bg-card); 
            transform: translateX(4px);
          }
          .item-main { flex: 1; }
          .item-title { font-size: 0.85rem; font-weight: 700; color: var(--text); }
          .item-sub { font-size: 0.75rem; color: var(--text-dimmed); margin-top: 2px; }
          
          .performance-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 12px; 
          }
          .perf-item { 
            background: var(--bg-surface); 
            padding: 12px; 
            border-radius: 12px; 
            border: 1px solid var(--border-subtle);
          }
          .perf-label { font-size: 0.65rem; font-weight: 800; color: var(--text-dimmed); text-transform: uppercase; }
          .perf-value { font-size: 1.25rem; font-weight: 900; color: var(--text); margin-top: 4px; }
          
          .alert-banner-mini {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 12px;
            border-radius: 10px;
            font-size: 0.75rem;
            font-weight: 600;
          }
          .alert-banner-mini.alert-red { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
          .alert-banner-mini.alert-blue { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
        `}</style>
      </div>
    )
  }

  return (
    <div className="dashboard-container-v3">
      {/* 1. TOP METRICS ROW */}
      <div className={`metrics-row-v3 ${isEmployee ? 'employee-metrics' : ''}`}>
        {stats.map((s, i) => (
          <div key={i} className="metric-card-v3">
            <div className="card-top">
              <div className={`icon-box ${s.bgClass}`} style={{ color: s.iconColor }}>
                {s.icon}
              </div>
              <span className="label">{s.label}</span>
            </div>
            <div className="value">{loading ? '...' : s.value}</div>
            {s.trend && (
              <div className={`trend ${s.negative ? 'down' : 'up'}`}>
                {s.negative ? '↓' : '↑'} {s.trend} from last month
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 2. MAIN GRID */}
      <div className="dashboard-grid-v3">
        {/* Performance Chart */}
        <div className="section-card-v3 borderless-card">
          <div className="crm-flex-between" style={{ marginBottom: '20px' }}>
             <h3>{isEmployee ? 'My Performance' : 'Monthly Revenue'}</h3>
             <select className="input-premium small" style={{ width: 'auto', padding: '4px 12px' }}>
                <option>This Year</option>
             </select>
          </div>
          <div style={{ width: '100%', height: '240px', minHeight: '240px' }}>
             <ResponsiveContainer width="100%" height={240} minHeight={240}>
                <AreaChart data={isEmployee ? (metrics?.leads?.trend || revenueTrend) : (metrics?.deals?.revenueTrend || revenueTrend)}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-dimmed)', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-dimmed)', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', background: 'var(--bg-card)', boxShadow: 'var(--shadow-lg)', color: 'var(--text)' }}
                    itemStyle={{ color: 'var(--text)' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* Alerts or Leads Chart */}
        {!isEmployee ? (
          <div className="section-card-v3 borderless-card">
            <div className="crm-flex-between" style={{ marginBottom: '20px' }}>
              <h3>Leads vs Conversions</h3>
              <select className="input-premium small" style={{ width: 'auto', padding: '4px 12px' }}>
                  <option>This Year</option>
              </select>
            </div>
            <div style={{ width: '100%', height: '240px', minHeight: '240px' }}>
              <ResponsiveContainer width="100%" height={240} minHeight={240}>
                  <BarChart data={conversionData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-dimmed)', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-dimmed)', fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', background: 'var(--bg-card)', boxShadow: 'var(--shadow-lg)', color: 'var(--text)' }} itemStyle={{ color: 'var(--text)' }} />
                    <Legend iconType="circle" verticalAlign="top" align="center" wrapperStyle={{ paddingBottom: '20px' }} />
                    <Bar dataKey="Leads" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={10} />
                    <Bar dataKey="Conversions" fill="var(--success)" radius={[4, 4, 0, 0]} barSize={10} />
                  </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="section-card-v3 borderless-card">
             <h3>Quick Access</h3>
             <div className="quick-actions-grid-v3">
                {quickActions.map((qa, i) => (
                  <div key={i} className={`quick-action-btn-v3 ${qa.bgClass}`} onClick={() => navigate(qa.path)}>
                    <div className="icon" style={{ color: qa.textColor }}>{qa.icon}</div>
                    <span className="text">{qa.label}</span>
                  </div>
                ))}
             </div>
          </div>
        )}
      </div>

      {/* 3. THREE COL ROW */}
      <div className="dashboard-three-col-v3">
        {/* Priority Items or Top Performers */}
        <div className="section-card-v3 borderless-card">
          <h3>{isEmployee ? 'Priority Items' : 'Top Performers'}</h3>
          {isEmployee ? (
            <div className="follow-up-list">
              {(metrics?.employee?.priorityItems || []).length > 0 ? (
                metrics.employee.priorityItems.map((item, i) => (
                  <div key={i} className="alert-item-v3" style={{ borderBottom: '1px solid var(--border-subtle)', padding: '12px 0' }}>
                    <div className={`alert-icon-v3 ${item.type === 'lead' ? 'alert-blue' : 'alert-red'}`} style={{ color: item.type === 'lead' ? 'var(--primary)' : 'var(--danger)' }}>
                      {item.type === 'lead' ? <FiTarget /> : <FiAlertCircle />}
                    </div>
                    <div className="alert-content-v3" onClick={() => navigate(item.type === 'lead' ? `/leads/${item._id || item.id}` : `/tickets/${item._id || item.id}`)} style={{ cursor: 'pointer' }}>
                      <div className="alert-title-v3" style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.name || item.subject}</div>
                      <div className="alert-sub-v3">{item.type === 'lead' ? `Follow-up: ${item.follow_up_date ? new Date(item.follow_up_date).toLocaleDateString() : 'Pending'}` : `Ticket: #${item.ticket_id}`}</div>
                    </div>
                  </div>
                ))
              ) : <div className="muted center padding20">No priority items</div>}
            </div>
          ) : (
            <table className="v3-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Revenue</th>
                  <th>Perf</th>
                </tr>
              </thead>
              <tbody>
                {(metrics?.topPerformers || employees).map((emp, i) => (
                  <tr key={emp.id || emp._id}>
                    <td>{i + 1}</td>
                    <td>{emp.name}</td>
                    <td>{formatCurrency(emp.revenue || 0)}</td>
                    <td>{emp.count || 0} Deals</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Follow-up Summary or Recent Deals */}
        <div className="section-card-v3 borderless-card">
          <h3>{isEmployee ? 'Active Deals' : 'Follow-up Summary'}</h3>
          {isEmployee ? (
            <div className="follow-up-list">
               {(metrics?.employee?.activeDeals || []).length > 0 ? (
                 metrics.employee.activeDeals.map((deal, i) => (
                   <div key={i} className="alert-item-v3" onClick={() => navigate(`/deals/${deal._id || deal.id}`)} style={{ cursor: 'pointer' }}>
                      <div className="alert-icon-v3 alert-purple" style={{ color: '#8b5cf6' }}><FiBriefcase /></div>
                      <div className="alert-content-v3">
                        <div className="alert-title-v3">{deal.name}</div>
                        <div className="alert-sub-v3">{deal.customer_id?.name || 'Customer'} - ₹{deal.value?.toLocaleString()}</div>
                      </div>
                      <FiChevronRight className="muted" />
                   </div>
                 ))
               ) : <div className="muted center padding20">No active deals</div>}
            </div>
          ) : (
            <div className="follow-up-grid-v3">
              <div className="follow-up-stat-box-v3 alert-blue">
                <Icon name="calendar" />
                <span className="count" style={{ color: 'var(--primary)' }}>{metrics?.activities?.pending || 0}</span>
                <span className="label">Today's</span>
              </div>
              <div className="follow-up-stat-box-v3 alert-orange">
                <Icon name="clock" />
                <span className="count" style={{ color: '#f97316' }}>{metrics?.leads?.overdueCount || 0}</span>
                <span className="label">Overdue</span>
              </div>
            </div>
          )}
          <button className="btn-link full-width margin-top-12" onClick={() => navigate(isEmployee ? '/deals' : '/leads')}>
            View Details <FiChevronRight size={14} />
          </button>
        </div>

        {/* Alerts & Notifications */}
        <div className="section-card-v3 borderless-card">
          <h3>Recent Activities</h3>
          <div className="activity-list">
              {(metrics?.activities?.recent || []).slice(0, 5).map((act, i) => (
                <div key={i} className="alert-item-v3">
                   <div className={`alert-icon-v3 ${i%2===0 ? 'alert-green' : 'alert-blue'}`} style={{ color: i%2===0 ? 'var(--success)' : 'var(--primary)' }}>
                      <FiCheckCircle />
                   </div>
                   <div className="alert-content-v3">
                      <div className="alert-title-v3">{act.description || act.activity_type}</div>
                      <div className="alert-sub-v3">{new Date(act.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</div>
                   </div>
                </div>
              ))}
          </div>
          <button className="btn-link full-width margin-top-12" onClick={() => navigate('/activities')}>
            See All History <FiChevronRight size={14} />
          </button>
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
