import { Icon } from '../layouts/icons.jsx'
import '../styles/dashboardMetrics.css'

export default function DashboardMetrics({ metrics, loading }) {
  const leadsTotal = metrics?.leads?.total ?? 0
  const customersTotal = metrics?.customers?.total ?? 0
  const followUpDue = metrics?.leads?.overdueCount ?? 0
  const totalRevenue = metrics?.summary?.totalRevenue ?? 0

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0)
  }

  const stats = [
    {
      label: 'Total Leads',
      value: leadsTotal,
      icon: 'users',
      className: 'leads'
    },
    {
      label: 'Total Customers',
      value: customersTotal,
      icon: 'user',
      className: 'customers'
    },
    {
      label: 'Follow-up Due',
      value: followUpDue,
      icon: 'clock',
      className: followUpDue > 0 ? 'followup-overdue' : 'followup-due'
    },
    {
      label: 'Total Revenue',
      value: formatCurrency(totalRevenue),
      icon: 'deals',
      className: 'revenue'
    }
  ]

  return (
    <div className="dashboard-stats-grid">
      {stats.map((stat, idx) => (
        <div key={idx} className="metric-card">
          <div className="metric-left">
            <div className="metric-info">
              <div className="metric-icon">
                <Icon name={stat.icon} />
              </div>
              <span className="metric-label">{stat.label}</span>
            </div>
          </div>
          <div className="metric-right">
            <span className={`metric-value ${stat.className}`}>
              {loading ? '...' : stat.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
