import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts'
import { 
  FiCreditCard, 
  FiTrendingUp, 
  FiAlertCircle, 
  FiFileText, 
  FiActivity, 
  FiPlus,
  FiChevronRight,
  FiPieChart,
  FiDollarSign
} from 'react-icons/fi'
import { useAuth } from '../../../context/AuthContext'
import { accountantDashboardApi } from '../../../services/accountantDashboard'
import { formatCurrency } from '../../../utils/formatters'
import '../../../styles/dashboard-v3.css'

export default function AccountantDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    accountantDashboardApi.get()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const stats = useMemo(() => {
    if (!data) return []
    return [
      {
        label: "Today's Income",
        value: formatCurrency(data.today?.payments?.total || 0),
        icon: <FiTrendingUp />,
        iconColor: '#10b981',
        bgClass: 'bg-green-soft',
        trend: `${data.today?.payments?.count || 0} payments`
      },
      {
        label: "Today's Invoices",
        value: formatCurrency(data.today?.invoices?.total || 0),
        icon: <FiFileText />,
        iconColor: '#3b82f6',
        bgClass: 'bg-blue-soft',
        trend: `${data.today?.invoices?.count || 0} generated`
      },
      {
        label: "Money Pending",
        value: formatCurrency(data.pendingTotal || 0),
        icon: <FiAlertCircle />,
        iconColor: '#f59e0b',
        bgClass: 'bg-orange-soft',
        trend: 'Collection due'
      },
      {
        label: "Total Collection",
        value: formatCurrency(data.totalCollection || 0),
        icon: <FiCreditCard />,
        iconColor: '#8b5cf6',
        bgClass: 'bg-purple-soft',
        trend: 'Overall revenue'
      }
    ]
  }, [data])

  if (loading) {
    return (
      <div className="dashboard-container-v3">
        <div className="flex-center" style={{ minHeight: '400px' }}>
          <div className="spinner-medium" />
          <span className="muted ml-12">Loading Accountant Home...</span>
        </div>
      </div>
    )
  }

  if (!data) return <div className="p-40 text-center muted">Failed to load dashboard data</div>

  return (
    <div className="dashboard-container-v3">
      {/* 1. HEADER */}
      <header className="crm-flex-between mb-32">
        <div>
          <h1 className="text-2xl font-black letter-tight">Accountant Home</h1>
          <p className="muted">Financial overview and billing tracking</p>
        </div>
        <div className="crm-flex-gap-12">
          <Link to="/invoices/new" className="btn-premium action-secondary">
            <FiPlus /> <span>New Invoice</span>
          </Link>
          <Link to="/payments/new" className="btn-premium action-vibrant">
            <FiPlus /> <span>Add Payment</span>
          </Link>
        </div>
      </header>

      {/* 2. KPI ROW */}
      <div className="metrics-row-v3">
        {stats.map((s, i) => (
          <div key={i} className="metric-card-v3">
            <div className="card-top">
              <div className={`icon-box ${s.bgClass}`} style={{ color: s.iconColor }}>
                {s.icon}
              </div>
              <span className="label">{s.label}</span>
            </div>
            <div className="value">{s.value}</div>
            {s.trend && (
              <div className="trend">
                {s.trend}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 3. CHARTS GRID */}
      <div className="dashboard-grid-v3">
        {/* Monthly Income Chart */}
        <div className="section-card-v3 borderless-card">
          <div className="crm-flex-between mb-24">
            <div className="crm-flex-gap-8 align-center">
               <FiActivity className="text-primary" />
               <h3>Monthly Income</h3>
            </div>
            <span className="badge-modern">Last 6 Months</span>
          </div>
          <div style={{ width: '100%', height: 280 }}>
            {data.monthlyRevenue?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.monthlyRevenue} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-dimmed)', fontSize: 12 }} />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'var(--text-dimmed)', fontSize: 12 }}
                    tickFormatter={(value) => `₹${value >= 1000 ? (value/1000) + 'k' : value}`} 
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', background: 'var(--bg-card)', boxShadow: 'var(--shadow-lg)', color: 'var(--text)' }}
                    formatter={(value) => formatCurrency(value)}
                  />
                  <Area type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex-center muted" style={{ height: '100%' }}>No revenue data available</div>
            )}
          </div>
        </div>

        {/* Expense Pie Chart */}
        <div className="section-card-v3 borderless-card">
          <div className="crm-flex-between mb-24">
             <div className="crm-flex-gap-8 align-center">
                <FiPieChart className="text-warning" />
                <h3>Spending by Category</h3>
             </div>
             <span className="badge-modern">Last 30 Days</span>
          </div>
          <div style={{ width: '100%', height: 280 }}>
            {data.expenses?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.expenses}
                    cx="50%"
                    cy="45%"
                    innerRadius={70}
                    outerRadius={95}
                    paddingAngle={5}
                    dataKey="value"
                    nameKey="label"
                  >
                    {data.expenses.map((entry, index) => {
                      const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'];
                      return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    })}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', background: 'var(--bg-card)', boxShadow: 'var(--shadow-lg)' }}
                    formatter={(value) => formatCurrency(value)} 
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex-center muted" style={{ height: '100%' }}>No expense data available</div>
            )}
          </div>
        </div>
      </div>

      {/* 4. RECENT TABLES ROW */}
      <div className="dashboard-three-col-v3 mt-24">
        {/* Recent Invoices */}
        <div className="section-card-v3 borderless-card" style={{ gridColumn: 'span 2' }}>
          <div className="crm-flex-between mb-20">
            <h3>Recent Invoices</h3>
            <Link to="/invoices" className="btn-text-only">
              View All <FiChevronRight />
            </Link>
          </div>
          <div className="v3-list">
            {data.recent?.invoices?.map(inv => (
              <div key={inv._id} className="v3-list-item clickable" onClick={() => navigate(`/invoices/${inv._id}`)}>
                <div className="item-main">
                  <div className="item-title">{inv.invoice_number}</div>
                  <div className="item-sub">{inv.customer_id?.name || 'Unknown Customer'}</div>
                </div>
                <div className="text-right">
                  <div className="item-title">{formatCurrency(inv.total_amount)}</div>
                  <div className={`text-xs font-bold ${inv.status.toLowerCase()}`}>
                    {inv.status}
                  </div>
                </div>
              </div>
            ))}
            {(!data.recent?.invoices || data.recent.invoices.length === 0) && (
              <div className="p-20 text-center muted text-xs">No recent invoices</div>
            )}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="section-card-v3 borderless-card">
          <div className="crm-flex-between mb-20">
            <h3>Recent Payments</h3>
            <Link to="/payments" className="btn-text-only">
              View All <FiChevronRight />
            </Link>
          </div>
          <div className="v3-list">
            {data.recent?.payments?.map(pay => (
              <div key={pay._id} className="v3-list-item clickable" onClick={() => navigate(`/payments/${pay._id}`)}>
                <div className="item-main">
                  <div className="item-title">{pay.payment_number}</div>
                  <div className="item-sub">{new Date(pay.payment_date).toLocaleDateString()}</div>
                </div>
                <div className="text-right">
                  <div className="item-title text-success">{formatCurrency(pay.amount)}</div>
                  <div className="item-sub">{pay.payment_method}</div>
                </div>
              </div>
            ))}
            {(!data.recent?.payments || data.recent.payments.length === 0) && (
              <div className="p-20 text-center muted text-xs">No recent payments</div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .mb-32 { margin-bottom: 32px; }
        .mb-24 { margin-bottom: 24px; }
        .mb-20 { margin-bottom: 20px; }
        .mt-24 { margin-top: 24px; }
        .ml-12 { margin-left: 12px; }
        .letter-tight { letter-spacing: -0.03em; }
        .v3-list { display: flex; flex-direction: column; gap: 10px; }
        .v3-list-item { 
          display: flex; 
          align-items: center; 
          justify-content: space-between; 
          padding: 12px 16px; 
          background: var(--bg-surface); 
          border: 1px solid var(--border-subtle); 
          border-radius: 14px; 
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .v3-list-item.clickable { cursor: pointer; }
        .v3-list-item.clickable:hover { 
          border-color: var(--primary); 
          background: var(--bg-card); 
          transform: translateX(4px);
          box-shadow: var(--shadow-sm);
        }
        .item-main { flex: 1; }
        .item-title { font-size: 0.9rem; font-weight: 800; color: var(--text); }
        .item-sub { font-size: 0.75rem; color: var(--text-dimmed); margin-top: 2px; font-weight: 600; }
        .text-xs { font-size: 0.7rem; }
        
        .bg-green-soft { background: rgba(16, 185, 129, 0.1) !important; }
        .bg-blue-soft { background: rgba(59, 130, 246, 0.1) !important; }
        .bg-orange-soft { background: rgba(245, 158, 11, 0.1) !important; }
        .bg-purple-soft { background: rgba(139, 92, 246, 0.1) !important; }
        
        .paid { color: #10b981; }
        .pending { color: #f59e0b; }
        .overdue { color: #ef4444; }
      `}</style>
    </div>
  )
}
