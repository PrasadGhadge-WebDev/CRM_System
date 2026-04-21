import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
  LineChart,
  Line,
  FunnelChart,
  Funnel,
  LabelList,
} from 'recharts'
import RecentLeads from '../components/RecentLeads.jsx'
import RecentActivity from '../components/RecentActivity.jsx'
import StatCard from '../components/StatCard.jsx'
import { Icon } from '../layouts/icons.jsx'
import { metricsApi } from '../services/metrics.js'
import { useAuth } from '../context/AuthContext.jsx'
import { hasRequiredRole, NAV_ACCESS } from '../utils/accessControl.js'
import { useToastFeedback } from '../utils/useToastFeedback.js'

export default function Dashboard() {
  const { user } = useAuth()
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useToastFeedback({ error })

  useEffect(() => {
    let canceled = false

    metricsApi
      .get()
      .then((data) => {
        if (!canceled) setMetrics(data)
      })
      .catch((e) => {
        if (!canceled) setError(e.message || 'Failed to load dashboard')
      })
      .finally(() => {
        if (!canceled) setLoading(false)
      })

    return () => {
      canceled = true
    }
  }, [])

  const usersTotal = metrics?.users?.total ?? 0
  const customersTotal = metrics?.customers?.total ?? 0
  const leadsTotal = metrics?.leads?.total ?? 0
  const dealsTotal = metrics?.deals?.total ?? 0
  const supportTicketsTotal = metrics?.supportTickets?.total ?? 0
  const activitiesTotal = metrics?.activities?.total ?? 0
  const notificationsUnread = metrics?.notifications?.unread ?? 0
  const leadsByStatus = metrics?.leads?.byStatus || []
  const leadsBySource = metrics?.leads?.bySource || []
  const leadsTrend = metrics?.leads?.trend || []
  const customersTrend = metrics?.customers?.trend || []
  const recentActivities = metrics?.activities?.recent || []
  const summary = metrics?.summary || {}
  const employee = metrics?.employee || {}
  
  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val || 0)
  const canManageUsers = hasRequiredRole(user?.role, NAV_ACCESS.users)
  const isGlobalAdmin = user?.role === 'Admin' && !user?.company_id
  const isAdmin = user?.role === 'Admin'
  const isManager = user?.role === 'Manager'
  const isEmployee = user?.role === 'Employee'
  const isAccountant = user?.role === 'Accountant'
  const dashboardTitle = isGlobalAdmin ? 'System Admin Dashboard' : `${user?.role || 'CRM'} Dashboard`
  const displayName = user?.name || user?.username || 'User'
  const dashboardSubtitle = isGlobalAdmin
    ? 'System-wide overview of users, customers, leads, deals, orders, tickets, and activity.'
    : isEmployee
      ? `${displayName}, here is your overview of leads, today follow-ups, deals in progress, and tasks.`
      : `${displayName}, here is your overview of users, customers, leads, deals, orders, tickets, and activity.`

  // Premium Dashboard Palette
  const chartPalette = ['#3b82f6', '#8b5cf6', '#6366f1', '#10b981', '#f59e0b', '#0ea5e9', '#64748b']

  const leadStatusData = leadsByStatus.map((item, idx) => ({
    name: item.status || 'Unknown',
    value: item.count,
    fill: chartPalette[idx % chartPalette.length],
  }))

  const leadSourceData = leadsBySource.map((item, idx) => ({
    name: item.source || 'Unknown',
    value: item.count,
    fill: chartPalette[idx % chartPalette.length],
  }))

  const trendData = !leadsTrend.length && !customersTrend.length
    ? []
    : (leadsTrend.length ? leadsTrend : customersTrend).map((item, idx) => ({
        month: item.label,
        leads: leadsTrend[idx]?.value ?? 0,
        customers: customersTrend[idx]?.value ?? 0,
        deals: metrics?.deals?.trend?.[idx]?.value ?? 0,
      }))

  const dealsByStatus = metrics?.deals?.byStatus || []
  const dealPipelineData = dealsByStatus
    .map((item, idx) => ({
      name: item.status || 'Unknown',
      value: item.count,
      fill: chartPalette[idx % chartPalette.length],
    }))
    .sort((a, b) => b.value - a.value) // Funnel usually sorted descending

  const hasTrend = trendData.some((item) => item.leads || item.customers)
  const hasStatus = leadStatusData.some((d) => d.value > 0)
  const hasSources = leadSourceData.some((d) => d.value > 0)

  const canAccess = (key) => hasRequiredRole(user?.role, NAV_ACCESS[key])

  const dashboardActions = [
    canAccess('leads') ? { to: '/leads/new', label: '+ Add Lead', className: 'btn primary' } : null,
    canAccess('deals') ? { to: '/deals/new', label: '+ Add Deal', className: 'btn dashboardSecondaryAction' } : null,
    canManageUsers ? { to: '/users/new', label: '+ Add User', className: 'btn dashboardSecondaryAction' } : null,
  ].filter(Boolean)

  const statCards = isEmployee
    ? [
        canAccess('leads') ? { to: '/leads', code: 'LE', label: 'My Leads', value: employee.leadsTotal ?? 0 } : null,
        canAccess('tasks') ? { to: '/tasks', code: 'TS', label: 'My Tasks', value: employee.tasksPlanned ?? 0 } : null,
        canAccess('tickets') ? { to: '/support', code: 'TI', label: 'My Tickets', value: employee.ticketsTotal ?? 0 } : null,
      ].filter(Boolean)
    : isManager ? [
        { to: '/leads?followUpStatus=overdue', code: 'OV', label: 'Overdue Follow-ups', value: metrics?.leads?.overdueCount || 0 },
        { to: '/tasks', code: 'TS', label: 'Pending Tasks', value: summary.pendingTasks || 0 },
        { to: '/support', code: 'TI', label: 'Open Tickets', value: supportTicketsTotal },
      ]
    : isAccountant ? [
        { to: '/deals', code: 'RV', label: 'Total Revenue', value: formatCurrency(summary.totalRevenue) },
        { to: '/deals', code: 'PP', label: 'Pending Payments', value: metrics?.financials?.unpaidCount || 0 },
        { to: '/deals', code: 'PI', label: 'Paid Invoices', value: Math.max(0, (summary.dealsWon ?? 0) - (metrics?.financials?.unpaidCount ?? 0)) },
      ]
    : [
        { to: '/leads', code: 'LE', label: 'Total Leads', value: leadsTotal },
        { to: '/customers', code: 'CU', label: 'Total Customers', value: customersTotal },
        { to: '/leads?followUpStatus=overdue', code: 'OV', label: 'Follow-up Due', value: metrics?.leads?.overdueCount || 0 },
        { to: '/deals', code: 'DE', label: 'Deals (Won)', value: summary.dealsWon ?? 0 },
        { to: '/deals', code: 'RV', label: 'Total Revenue', value: formatCurrency(summary.totalRevenue) },
      ]
  return (
    <div className="dashboard stack">
      <div className="dashboardShell">
        <div className="dashboardHeader">
          <div>
            <h1>{dashboardTitle}</h1>
            <p className="muted">{dashboardSubtitle}</p>
          </div>

          <div className="dashboardActions">
            {dashboardActions.map((action) => (
              <Link key={action.to} className={action.className} to={action.to}>
                {action.label}
              </Link>
            ))}
          </div>
        </div>

        {error ? <div className="alert error">{error}</div> : null}



        <div className="statsGrid" style={!isEmployee ? { gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' } : {}}>
          {statCards.map((c, i) => (
            <StatCard key={i} to={c.to} code={c.code} label={c.label} value={c.value} loading={loading} />
          ))}
        </div>

        {isEmployee ? null : <div className="chartsGrid">
          {canAccess('leads') ? (
            <div className="card chartCard glass-panel">
            <div className="row chartHeader">
              <div>
                <h2>Lead Status Mix</h2>
                <p className="muted small">Distribution by pipeline status</p>
              </div>
              <span className="chartBadge">Total {leadsTotal}</span>
            </div>

            {loading ? (
              <div className="chartEmpty muted">Loading chart...</div>
            ) : hasStatus ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Tooltip wrapperStyle={{ borderRadius: '10px' }} />
                  <Pie 
                    data={leadStatusData} 
                    dataKey="value" 
                    nameKey="name" 
                    innerRadius={60} 
                    outerRadius={110} 
                    paddingAngle={2}
                    style={{ filter: 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.2))' }}
                  >
                    {leadStatusData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="chartEmpty muted">Not enough data yet</div>
            )}
            </div>
          ) : null}

          {/* Leads vs Deals Bar Chart */}
          {isAdmin && (
            <div className="card chartCard glass-panel">
              <div className="row chartHeader">
                <div>
                  <h2>Leads vs Deals</h2>
                  <p className="muted small">Monthly Comparison (Last 6 Months)</p>
                </div>
              </div>

              {loading ? (
                <div className="chartEmpty muted">Loading comparison...</div>
              ) : trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                    <XAxis dataKey="month" tickLine={false} tick={{ fill: 'var(--chart-axis)', fontSize: 12 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: 'var(--chart-axis)', fontSize: 12 }} />
                    <Tooltip wrapperStyle={{ borderRadius: '10px' }} contentStyle={{ background: 'var(--bg-dark)', border: '1px solid var(--border)' }} />
                    <Legend iconType="circle" />
                    <Bar dataKey="leads" name="Leads" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="deals" name="Deals" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="chartEmpty muted">No comparison data</div>
              )}
            </div>
          )}

          {/* Deal Pipeline Funnel */}
          {isAdmin && (
            <div className="card chartCard glass-panel">
              <div className="row chartHeader">
                <div>
                  <h2>Deal Pipeline</h2>
                  <p className="muted small">Breakdown of deals by stage</p>
                </div>
              </div>

              {loading ? (
                <div className="chartEmpty muted">Loading pipeline...</div>
              ) : dealPipelineData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <FunnelChart>
                    <Tooltip wrapperStyle={{ borderRadius: '10px' }} contentStyle={{ background: 'var(--bg-dark)', border: '1px solid var(--border)' }} />
                    <Funnel
                      dataKey="value"
                      data={dealPipelineData}
                      isAnimationActive
                    >
                      <LabelList position="right" fill="var(--text)" stroke="none" dataKey="name" fontSize={12} />
                    </Funnel>
                  </FunnelChart>
                </ResponsiveContainer>
              ) : (
                <div className="chartEmpty muted">No pipeline data</div>
              )}
            </div>
          )}

          {/* New Revenue growth Chart - Modified to LineChart as requested */}
          {isAdmin && (
            <div className="card chartCard glass-panel">
              <div className="row chartHeader">
                <div>
                  <h2>Revenue</h2>
                  <p className="muted small">Monthly Won Deal Value (Last 6 Months)</p>
                </div>
                <div className="revenue-total-badge">
                  {loading ? '...' : formatCurrency(summary.totalRevenue)}
                </div>
              </div>

              {loading ? (
                <div className="chartEmpty muted">Analyzing revenue stream...</div>
              ) : (metrics?.deals?.revenueTrend || []).length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metrics?.deals?.revenueTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                    <XAxis dataKey="month" tickLine={false} tick={{ fill: 'var(--chart-axis)', fontSize: 12 }} />
                    <YAxis 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fill: 'var(--chart-axis)', fontSize: 12 }}
                      tickFormatter={(value) => `₹${value >= 1000 ? (value/1000).toFixed(1) + 'k' : value}`}
                    />
                    <Tooltip 
                      wrapperStyle={{ borderRadius: '10px', overflow: 'hidden' }} 
                      contentStyle={{ background: 'var(--bg-dark)', border: '1px solid var(--border)' }}
                      formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#8b5cf6" 
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 2 }}
                      activeDot={{ r: 6, strokeWidth: 0, fill: '#8b5cf6' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="chartEmpty muted">No revenue data for the period</div>
              )}
            </div>
          )}


          
          {/* Team Performance Scoreboard */}
          {isManager && (
            <div className="card chartCard glass-panel team-leaderboard-card">
              <div className="row chartHeader">
                <div>
                  <h2>Team Performance Leaderboard</h2>
                  <p className="muted small">Top contributors by revenue generated</p>
                </div>

              </div>
              
              <div className="leaderboard-content">
                {loading ? (
                   <div className="padding20 center muted">Calculating standings...</div>
                ) : (metrics?.topPerformers || []).length > 0 ? (
                  metrics.topPerformers.map((performer, idx) => (
                    <div key={idx} className="leaderboard-item">
                      <div className="rank-badge">{idx + 1}</div>
                      <div className="performer-avatar">
                        {performer.name.charAt(0)}
                      </div>
                      <div className="performer-info">
                        <div className="performer-name">{performer.name}</div>
                        <div className="performer-role">{performer.role}</div>
                      </div>
                      <div className="performer-metrics">
                        <div className="performer-revenue">₹{performer.revenue?.toLocaleString()}</div>
                        <div className="performer-count m-hide">{performer.count} Deals</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="padding40 center muted italic">Waiting for the first deal to close!</div>
                )}
              </div>
            </div>
          )}

          {canAccess('tasks') || canAccess('followups') || canAccess('tickets') ? (
            <RecentActivity activities={recentActivities} loading={loading} />
          ) : null}
        </div>}



        {isEmployee && (
          <div className="employee-execution-deck stack gap-24">
            <div className="card-premium execution-checklist shadow-vibrant">
              <div className="card-header-premium border-bottom">
                <div className="card-title-premium">
                  <Icon name="activity" />
                  <h3>Today's Priority Execution Checklist</h3>
                </div>
                <span className="execution-count-badge">{(employee.priorityItems || []).length} Pending Items</span>
              </div>
              <div className="card-body-premium noPadding">
                <div className="checklist-feed">
                  {(employee.priorityItems || []).length > 0 ? (
                    (employee.priorityItems || []).map((item, idx) => (
                      <Link 
                        key={idx} 
                        to={item.type === 'lead' ? `/leads/${item.id || item._id}` : `/tickets/${item.id || item._id}`}
                        className={`checklist-item-premium ${item.type}`}
                      >
                        <div className={`checklist-indicator ${item.type}`}></div>
                        <div className="checklist-main">
                          <div className="checklist-title">
                            {item.type === 'lead' ? (item.name || 'Unnamed Lead') : (item.subject || 'No Subject')}
                          </div>
                          <div className="checklist-meta">
                            <span className="type-tag">{item.type.toUpperCase()}</span>
                            {item.type === 'lead' ? (
                              <span className="deadline-tag overdue">
                                Follow-up: {new Date(item.follow_up_date).toLocaleDateString()}
                              </span>
                            ) : (
                               <span className={`status-tag ${item.priority}`}>
                                Priority: {item.priority}
                               </span>
                            )}
                          </div>
                        </div>
                        <div className="checklist-action">
                           <Icon name="arrow-right" />
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="padding40 center muted">
                      <Icon name="check" size={48} className="success-text opacity-50" />
                      <p className="margin-top-12">Zen mode achieved. No urgent items assigned to you.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="card-premium active-deals-pipeline shadow-vibrant-info">
              <div className="card-header-premium border-bottom">
                <div className="card-title-premium">
                  <Icon name="deals" />
                  <h3>Active Deals Pipeline</h3>
                </div>
                <Link to="/deals" className="btn-icon-minimal"><Icon name="arrow-right" /></Link>
              </div>
              <div className="card-body-premium noPadding">
                <div className="deals-mini-list">
                  {(employee.activeDeals || []).length > 0 ? (
                    (employee.activeDeals || []).map((deal) => (
                      <Link key={deal.id} to={`/deals/${deal.id}`} className="deal-mini-item">
                        <div className="deal-mini-info">
                          <div className="deal-mini-name">{deal.customer_id?.name || 'Unknown Client'}</div>
                          <div className="deal-mini-meta">
                            <span className={`stage-mini-pill ${deal.status.toLowerCase()}`}>{deal.status}</span>
                            <span className="deal-mini-value">${(deal.value || 0).toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="deal-mini-arrow">
                          <Icon name="chevronRight" />
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="padding30 center muted italic">No active deals being handled.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid2 gap-24">
               <div className="card-premium mini-focus">
                  <div className="padding20 flex gap-12 items-center">
                     <div className="focus-icon-shell leads"><Icon name="users" /></div>
                     <div>
                        <div className="focus-label">Lead Funnel</div>
                        <div className="focus-value">{employee.leadsTotal || 0} Assigned</div>
                     </div>
                  </div>
               </div>
               <div className="card-premium mini-focus">
                  <div className="padding20 flex gap-12 items-center">
                     <div className="focus-icon-shell tickets"><Icon name="bell" /></div>
                     <div>
                        <div className="focus-label">Open Support</div>
                        <div className="focus-value">{employee.tasksPlanned || 0} Planned</div>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .execution-checklist { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 20px; overflow: hidden; }
        .checklist-feed { display: grid; grid-template-columns: 1fr; }
        .checklist-item-premium { 
          display: flex; 
          align-items: center; 
          gap: 20px; 
          padding: 20px 24px; 
          border-bottom: 1px solid var(--border); 
          transition: all 0.2s;
          text-decoration: none;
          color: inherit;
        }
        .checklist-item-premium:hover { background: rgba(255, 255, 255, 0.03); transform: translateX(4px); }
        .checklist-item-premium:last-child { border-bottom: none; }
        
        .checklist-indicator { width: 4px; align-self: stretch; border-radius: 4px; }
        .checklist-indicator.lead { background: #10b981; box-shadow: 0 0 10px rgba(16, 185, 129, 0.3); }
        .checklist-indicator.ticket { background: #f59e0b; box-shadow: 0 0 10px rgba(245, 158, 11, 0.3); }
        
        .checklist-main { flex: 1; }
        .checklist-title { font-weight: 700; font-size: 1.05rem; color: white; margin-bottom: 4px; }
        .checklist-meta { display: flex; gap: 12px; align-items: center; }
        .type-tag { font-size: 0.65rem; font-weight: 900; background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px; color: var(--text-dimmed); }
        .deadline-tag { font-size: 0.75rem; font-weight: 600; }
        .deadline-tag.overdue { color: #ef4444; }
        .status-tag.high, .status-tag.urgent { color: #ef4444; }
        
        .checklist-action { color: var(--text-dimmed); opacity: 0.5; transition: all 0.2s; }
        .checklist-item-premium:hover .checklist-action { opacity: 1; color: var(--primary); }
        
        .execution-count-badge { font-size: 0.7rem; font-weight: 800; background: rgba(var(--primary-rgb), 0.1); color: var(--primary); padding: 4px 10px; border-radius: 999px; }
        
        .focus-icon-shell { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }
        .focus-icon-shell.leads { background: rgba(16, 185, 129, 0.1); color: #10b981; }
        .focus-icon-shell.tickets { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
        .focus-label { font-size: 0.75rem; font-weight: 700; color: var(--text-dimmed); text-transform: uppercase; }
        .focus-value { font-size: 1.1rem; font-weight: 800; color: white; }

        .deals-mini-list { display: flex; flex-direction: column; }
        .deal-mini-item { display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; border-bottom: 1px solid var(--border); text-decoration: none; color: inherit; transition: all 0.2s; }
        .deal-mini-item:hover { background: rgba(255,255,255,0.03); transform: translateX(4px); }
        .deal-mini-item:last-child { border-bottom: none; }
        .deal-mini-name { font-weight: 700; font-size: 0.95rem; color: white; margin-bottom: 4px; }
        .deal-mini-meta { display: flex; gap: 12px; align-items: center; }
        .stage-mini-pill { font-size: 0.6rem; font-weight: 800; text-transform: uppercase; padding: 2px 8px; border-radius: 6px; }
        .stage-mini-pill.new { background: rgba(59, 130, 246, 0.1); color: #60a5fa; }
        .stage-mini-pill.qualified { background: rgba(139, 92, 246, 0.1); color: #a78bfa; }
        .stage-mini-pill.proposal { background: rgba(245, 158, 11, 0.1); color: #fbbf24; }
        .stage-mini-pill.negotiation { background: rgba(236, 72, 153, 0.1); color: #f472b6; }
        .deal-mini-value { font-size: 0.8rem; font-weight: 600; color: var(--text-dimmed); }
        .deal-mini-arrow { opacity: 0.3; }
        .deal-mini-item:hover .deal-mini-arrow { opacity: 1; color: var(--primary); }

        .success-text { color: #10b981; }
        .opacity-50 { opacity: 0.5; }

        .dashboard { padding-bottom: 60px; }
        .grid2.gap-32 { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
        @media (max-width: 900px) { .grid2.gap-32 { grid-template-columns: 1fr; } }

        .revenue-hero { text-align: center; padding: 10px 0; }
        .hero-label { font-size: 0.8rem; font-weight: 800; text-transform: uppercase; color: var(--text-dimmed); letter-spacing: 0.05em; margin-bottom: 8px; }
        .hero-value { font-size: 3rem; font-weight: 900; line-height: 1; margin-bottom: 8px; }
        .hero-sub { font-size: 0.9rem; color: var(--text-muted); font-weight: 600; }
        
        .alert-count-row { display: flex; gap: 20px; align-items: center; }
        .alert-number { font-size: 3.5rem; font-weight: 900; line-height: 1; }
        .warning-text { color: #f59e0b; }
        
        .card-header-premium { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; }
        .card-title-premium { display: flex; align-items: center; gap: 10px; }
        .card-title-premium h3 { margin: 0; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: var(--text-dimmed); }
        .card-title-premium svg { color: var(--primary); }

        .shadow-vibrant-info { box-shadow: 0 10px 30px -10px rgba(14, 165, 233, 0.3); }
        .shadow-vibrant-warning { box-shadow: 0 10px 30px -10px rgba(245, 158, 11, 0.3); }
        .shadow-vibrant-gold { box-shadow: 0 10px 30px -10px rgba(245, 158, 11, 0.4); border: 1px solid rgba(245, 158, 11, 0.2); }
        
        .gold-text { color: #f59e0b; }
        .oversight-icon-shell.gold { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
        .label-tiny { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; color: var(--text-dimmed); }
        .value-large { font-size: 1.8rem; font-weight: 900; color: white; }
        .val-mid { font-size: 1.2rem; }
        .danger-text { color: #ef4444; }
        .border-right { border-right: 1px solid var(--border); }
        .margin-top-12 { margin-top: 12px; }

        .shadow-vibrant-success { box-shadow: 0 10px 30px -10px rgba(16, 185, 129, 0.3); }
        .badge-notification { background: #ef4444; color: white; font-size: 0.65rem; font-weight: 900; padding: 2px 8px; border-radius: 999px; }
        .billing-mini-feed { display: flex; flex-direction: column; }
        .billing-mini-item { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--border); }
        .billing-mini-item:last-child { border-bottom: none; }
        .billing-mini-name { font-weight: 700; font-size: 0.95rem; color: white; }
        .billing-mini-meta { font-size: 0.8rem; color: var(--text-dimmed); font-weight: 600; }
        .btn-pill-action { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; padding: 6px 14px; border-radius: 999px; text-decoration: none; transition: all 0.2s; }
        .btn-pill-action.success { background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); }
        .btn-pill-action.success:hover { background: #10b981; color: white; }

        .revenue-total-badge { background: rgba(16, 185, 129, 0.1); color: #10b981; font-weight: 800; padding: 6px 12px; border-radius: 8px; font-size: 0.9rem; border: 1px solid rgba(16, 185, 129, 0.2); }
        
        .team-leaderboard-card { display: flex; flex-direction: column; }
        .leaderboard-content { padding: 10px 0; }
        .leaderboard-item { display: flex; align-items: center; padding: 16px 24px; border-bottom: 1px solid var(--border); transition: all 0.2s; }
        .leaderboard-item:hover { background: rgba(255,255,255,0.03); transform: translateX(5px); }
        .leaderboard-item:last-child { border-bottom: none; }
        
        .rank-badge { width: 24px; font-weight: 900; color: var(--primary); font-size: 1.1rem; opacity: 0.5; }
        .leaderboard-item:first-child .rank-badge { color: #fbbf24; opacity: 1; }
        
        .performer-avatar { width: 40px; height: 40px; background: var(--bg-dark); border: 2px solid var(--primary); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 800; color: white; margin: 0 16px; font-size: 1.1rem; }
        .leaderboard-item:first-child .performer-avatar { border-color: #fbbf24; box-shadow: 0 0 15px rgba(251, 191, 36, 0.2); }
        
        .performer-info { flex: 1; }
        .performer-name { font-weight: 700; color: white; margin-bottom: 2px; }
        .performer-role { font-size: 0.75rem; color: var(--text-dimmed); text-transform: uppercase; font-weight: 700; }
        
        .performer-metrics { text-align: right; }
        .performer-revenue { font-weight: 800; color: #10b981; font-size: 1rem; }
        .performer-count { font-size: 0.75rem; color: var(--text-dimmed); font-weight: 600; }

        @media (max-width: 768px) {
          .m-hide { display: none; }
        }
      `}</style>
    </div>
  )
}
