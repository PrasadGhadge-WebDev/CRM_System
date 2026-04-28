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
  const isHR = user?.role === 'HR'
  const dashboardTitle = isGlobalAdmin ? 'System Admin Dashboard' : `${user?.role || 'CRM'} Dashboard`
  const displayName = user?.name || user?.username || 'User'
  const dashboardSubtitle = isGlobalAdmin
    ? 'System-wide overview of users, customers, leads, deals, orders, tickets, and activity.'
    : isEmployee
      ? `${displayName}, here is your overview of leads, today's follow-ups, deals in progress, and support work.`
      : isHR
        ? `${displayName}, here is your HR overview focused on employees, attendance, and alerts.`
      : isAccountant
        ? `${displayName}, here is your financial overview. Track your revenue, pending bills, and successful settlements.`
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
    canAccess('leads') && !isAccountant ? { to: '/leads/new', label: '+ Add Lead', className: 'btn-premium action-vibrant' } : null,
    isAccountant ? { to: '/invoices/new', label: '+ New Bill', className: 'btn-premium action-vibrant' } : null,
    isAccountant ? { to: '/payments/new', label: '+ Add Payment', className: 'btn-premium action-secondary' } : null,
    canAccess('deals') && !isAccountant ? { to: '/deals/new', label: '+ Add Deal', className: 'btn-premium action-secondary' } : null,
    canManageUsers ? { to: '/users/new', label: '+ Add User', className: 'btn-premium action-secondary' } : null,
  ].filter(Boolean)

  const statCards = isEmployee
    ? [
        canAccess('leads') ? { to: '/leads', code: 'LE', label: 'My Leads', value: employee.leadsTotal ?? 0 } : null,
        canAccess('tickets') ? { to: '/support', code: 'TI', label: 'My Tickets', value: employee.ticketsTotal ?? 0 } : null,
      ].filter(Boolean)
    : isHR ? [
        canAccess('users') ? { to: '/users', code: 'EM', label: 'Employees', value: usersTotal } : null,
        canAccess('attendance') ? { to: '/attendance', code: 'AT', label: 'Attendance Hub', value: usersTotal } : null,
        canAccess('notifications') ? { to: '/notifications', code: 'NT', label: 'Unread Alerts', value: notificationsUnread } : null,
      ].filter(Boolean)
    : isManager ? [
        { to: '/leads?followUpStatus=overdue', code: 'OV', label: 'Overdue Follow-ups', value: metrics?.leads?.overdueCount || 0 },
        { to: '/support', code: 'TI', label: 'Open Tickets', value: supportTicketsTotal },
      ]
    : isAccountant ? [
        { to: '/invoices', code: 'RV', label: 'Total Revenue', value: formatCurrency(summary.totalRevenue) },
        { to: '/invoices?status=Unpaid', code: 'PP', label: 'Pending Bills', value: metrics?.financials?.unpaidCount || 0 },
        { to: '/deals?status=Completed', code: 'CD', label: 'Completed Deals', value: Math.max(0, (summary.dealsWon ?? 0) - (metrics?.financials?.unpaidCount ?? 0)) },
      ]
    : [
        { to: '/leads', code: 'LE', label: 'Total Leads', value: leadsTotal },
        { to: '/customers', code: 'CU', label: 'Total Customers', value: customersTotal },
        { to: '/leads?followUpStatus=overdue', code: 'OV', label: 'Follow-up Due', value: metrics?.leads?.overdueCount || 0 },
        { to: '/deals', code: 'DE', label: 'Deals (Won)', value: summary.dealsWon ?? 0 },
        { to: '/deals', code: 'RV', label: 'Total Revenue', value: formatCurrency(summary.totalRevenue) },
      ]
  return (
    <div className="stack">
      <section className="crm-fullscreen-shell">
        <div className="crm-flex-between">
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text)', marginBottom: '8px' }}>{dashboardTitle}</h1>
            <p className="muted" style={{ fontSize: '1rem' }}>{dashboardSubtitle}</p>
          </div>

          <div className="crm-flex-end crm-gap-12">
            {dashboardActions.map((action) => (
              <Link key={action.to} className={action.className} to={action.to} style={{ textDecoration: 'none' }}>
                {action.label}
              </Link>
            ))}
          </div>
        </div>

        {error ? <div className="alert error">{error}</div> : null}

        <div className="statsGrid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', margin: '12px 0' }}>
          {statCards.map((c, i) => (
            <StatCard key={i} to={c.to} code={c.code} label={c.label} value={c.value} loading={loading} />
          ))}
        </div>

        {isEmployee || isHR ? null : (
          <div className="chartsGrid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
            {canAccess('leads') ? (
              <div className="card chartCard glass-panel" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '24px', padding: '24px' }}>
              <div className="row chartHeader" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)' }}>Lead Stages</h2>
                  <p className="muted small">Leads in each stage</p>
                </div>
                <span className="chartBadge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '4px 12px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 800 }}>Total {leadsTotal}</span>
              </div>

              {loading ? (
                <div className="chartEmpty muted">Loading chart...</div>
              ) : hasStatus ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Tooltip wrapperStyle={{ borderRadius: '10px' }} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)' }} itemStyle={{ color: 'var(--text)' }} />
                    <Pie 
                      data={leadStatusData} 
                      dataKey="value" 
                      nameKey="name" 
                      innerRadius={60} 
                      outerRadius={110} 
                      paddingAngle={2}
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

            {isAdmin && (
              <div className="card chartCard glass-panel" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '24px', padding: '24px' }}>
                <div className="row chartHeader" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                  <div>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)' }}>Leads and Sales</h2>
                    <p className="muted small">Monthly View (Last 6 Months)</p>
                  </div>
                </div>

                {loading ? (
                  <div className="chartEmpty muted">Loading comparison...</div>
                ) : trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="month" tickLine={false} tick={{ fill: 'var(--text-dimmed)', fontSize: 12 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: 'var(--text-dimmed)', fontSize: 12 }} />
                      <Tooltip wrapperStyle={{ borderRadius: '10px' }} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)' }} itemStyle={{ color: 'var(--text)' }} />
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

            {isAdmin && (
              <div className="card chartCard glass-panel" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '24px', padding: '24px' }}>
                <div className="row chartHeader" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                  <div>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)' }}>Sales Progress</h2>
                    <p className="muted small">Deals in each stage</p>
                  </div>
                </div>

                {loading ? (
                  <div className="chartEmpty muted">Loading pipeline...</div>
                ) : dealPipelineData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <FunnelChart>
                      <Tooltip wrapperStyle={{ borderRadius: '10px' }} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)' }} itemStyle={{ color: 'var(--text)' }} />
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

            {isAdmin && (
              <div className="card chartCard glass-panel" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '24px', padding: '24px' }}>
                <div className="row chartHeader" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                  <div>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)' }}>Money Earned</h2>
                    <p className="muted small">Successful Sales (Last 6 Months)</p>
                  </div>
                  <div className="revenue-total-badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '4px 12px', borderRadius: '8px', fontWeight: 800 }}>
                    {loading ? '...' : formatCurrency(summary.totalRevenue)}
                  </div>
                </div>

                {loading ? (
                  <div className="chartEmpty muted">Analyzing revenue stream...</div>
                ) : (metrics?.deals?.revenueTrend || []).length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={metrics?.deals?.revenueTrend}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="month" tickLine={false} tick={{ fill: 'var(--text-dimmed)', fontSize: 12 }} />
                      <YAxis 
                        tickLine={false} 
                        axisLine={false} 
                        tick={{ fill: 'var(--text-dimmed)', fontSize: 12 }}
                        tickFormatter={(value) => `₹${value >= 1000 ? (value/1000).toFixed(1) + 'k' : value}`}
                      />
                      <Tooltip 
                        wrapperStyle={{ borderRadius: '10px', overflow: 'hidden' }} 
                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)' }} itemStyle={{ color: 'var(--text)' }}
                        formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="amount" 
                        stroke="#8b5cf6" 
                        strokeWidth={3}
                        dot={{ r: 4, strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="chartEmpty muted">No revenue data for the period</div>
                )}
              </div>
            )}
          </div>
        )}

        {isEmployee && (
          <div className="employee-execution-deck" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginTop: '24px' }}>
            <div className="card-premium glass-panel" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '24px', overflow: 'hidden' }}>
              <div className="card-header-premium" style={{ padding: '20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="card-title-premium" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Icon name="activity" style={{ color: 'var(--primary)' }} />
                  <h3 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-dimmed)', margin: 0 }}>Important Tasks</h3>
                </div>
                <span className="execution-count-badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '4px 10px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 800 }}>{(employee.priorityItems || []).length} Items</span>
              </div>
              <div className="checklist-feed">
                {(employee.priorityItems || []).map((item, idx) => (
                  <Link key={idx} to={item.type === 'lead' ? `/leads/${item.id || item._id}` : `/tickets/${item.id || item._id}`} className="checklist-item-premium" style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', textDecoration: 'none', color: 'inherit' }}>
                    <div className="checklist-indicator" style={{ width: '4px', height: '32px', borderRadius: '4px', background: item.type === 'lead' ? '#10b981' : '#f59e0b', marginRight: '16px' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: 'var(--text)' }}>{item.type === 'lead' ? (item.name || 'Unnamed Lead') : (item.subject || 'No Subject')}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)' }}>{item.type.toUpperCase()} • {new Date(item.follow_up_date || item.created_at).toLocaleDateString()}</div>
                    </div>
                    <Icon name="chevronRight" style={{ opacity: 0.3 }} />
                  </Link>
                ))}
              </div>
            </div>
            
            <div className="card-premium glass-panel" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '24px', overflow: 'hidden' }}>
              <div className="card-header-premium" style={{ padding: '20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="card-title-premium" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Icon name="deals" style={{ color: 'var(--primary)' }} />
                  <h3 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-dimmed)', margin: 0 }}>My Sales</h3>
                </div>
              </div>
              <div className="deals-mini-list">
                {(employee.activeDeals || []).map((deal) => (
                  <Link key={deal.id} to={`/deals/${deal.id}`} className="deal-mini-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', textDecoration: 'none', color: 'inherit' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text)' }}>{deal.customer_id?.name || 'Unknown Client'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)' }}>{deal.status} • ₹{(deal.value || 0).toLocaleString()}</div>
                    </div>
                    <Icon name="chevronRight" style={{ opacity: 0.3 }} />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {!isEmployee && !isHR && (
          <div style={{ marginTop: '24px' }}>
            <RecentActivity activities={recentActivities} loading={loading} />
          </div>
        )}
      </section>

      <style>{`
        .checklist-item-premium:hover { background: rgba(255,255,255,0.03); }
        .deal-mini-item:hover { background: rgba(255,255,255,0.03); }
      `}</style>
    </div>
  )
}
