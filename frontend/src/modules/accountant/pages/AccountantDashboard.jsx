import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../../../layouts/icons'
import { useAuth } from '../../../context/AuthContext'
import { accountantDashboardApi } from '../../../services/accountantDashboard'
import { formatCurrency } from '../../../utils/formatters'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

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

  if (loading) {
    return <div className="p-8 muted">Loading Dashboard...</div>
  }

  if (!data) return <div className="p-8 muted">Failed to load dashboard</div>

  return (
    <div className="accountant-dashboard stack gap-24">
      <header className="page-header">
        <div>
          <h1 className="text-2xl font-bold">Accountant Home</h1>
          <p className="muted">Overview of your money and bills</p>
        </div>
        <div className="actions">
          <Link to="/invoices/new" className="btn primary">
            <Icon name="plus" size={16} /> New Invoice
          </Link>
          <Link to="/payments/new" className="btn">
            <Icon name="plus" size={16} /> Add Payment
          </Link>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid-cards">
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(52, 211, 153, 0.1)', color: '#10b981' }}>
            <Icon name="billing" />
          </div>
          <div className="stat-content">
            <h3 className="muted">Today's Income</h3>
            <div className="stat-val">{formatCurrency(data.today?.payments?.total || 0)}</div>
            <p className="text-small text-success">{data.today?.payments?.count || 0} payments received</p>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <Icon name="deals" />
          </div>
          <div className="stat-content">
            <h3 className="muted">Today's Invoices</h3>
            <div className="stat-val">{formatCurrency(data.today?.invoices?.total || 0)}</div>
            <p className="text-small text-info">{data.today?.invoices?.count || 0} invoices generated</p>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <Icon name="alert" />
          </div>
          <div className="stat-content">
            <h3 className="muted">Money Pending</h3>
            <div className="stat-val">{formatCurrency(data.pendingTotal || 0)}</div>
            <p className="text-small text-warning">Total money to be collected</p>
          </div>
        </div>
      </div>

      <div className="grid2">
        {/* Monthly Revenue Chart */}
        <div className="card stack">
          <h3 className="text-lg font-bold mb-16">Monthly Income (Last 6 Months)</h3>
          <div style={{ width: '100%', height: 300 }}>
            {data.monthlyRevenue?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthlyRevenue} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color, #e2e8f0)" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tickFormatter={(value) => `₹${value >= 1000 ? (value/1000) + 'k' : value}`} 
                  />
                  <Tooltip 
                    formatter={(value) => formatCurrency(value)}
                    cursor={{ fill: 'var(--sidebar-item-active, #f1f5f9)' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex-center muted" style={{ height: '100%' }}>No revenue data available</div>
            )}
          </div>
        </div>

        {/* Expense Pie Chart */}
        <div className="card stack">
          <h3 className="text-lg font-bold mb-16">Spending by Category (Last 30 Days)</h3>
          <div style={{ width: '100%', height: 300 }}>
            {data.expenses?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.expenses}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    nameKey="label"
                  >
                    {data.expenses.map((entry, index) => {
                      const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'];
                      return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    })}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex-center muted" style={{ height: '100%' }}>No expense data available</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid2">
        {/* Recent Invoices */}
        <div className="card stack">
          <div className="row align-center justify-between">
            <h3 className="text-lg font-bold">Recent Invoices</h3>
            <Link to="/invoices" className="btn small">View All</Link>
          </div>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recent?.invoices?.map(inv => (
                  <tr key={inv._id}>
                    <td><Link to={`/invoices/${inv._id}`}>{inv.invoice_number}</Link></td>
                    <td>{inv.customer_id?.name || 'Unknown'}</td>
                    <td>{formatCurrency(inv.total_amount)}</td>
                    <td>
                      <span className={`badge ${inv.status.toLowerCase().replace(' ', '-')}`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {(!data.recent?.invoices || data.recent.invoices.length === 0) && (
                  <tr><td colSpan="4" className="text-center muted py-4">No recent invoices</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Payments */}
        <div className="card stack">
          <div className="row align-center justify-between">
            <h3 className="text-lg font-bold">Recent Payments</h3>
            <Link to="/payments" className="btn small">View All</Link>
          </div>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recent?.payments?.map(pay => (
                  <tr key={pay._id}>
                    <td><Link to={`/payments/${pay._id}`}>{pay.payment_number}</Link></td>
                    <td>{pay.customer_id?.name || 'Unknown'}</td>
                    <td><strong className="text-success">{formatCurrency(pay.amount)}</strong></td>
                    <td>{new Date(pay.payment_date).toLocaleDateString()}</td>
                  </tr>
                ))}
                {(!data.recent?.payments || data.recent.payments.length === 0) && (
                  <tr><td colSpan="4" className="text-center muted py-4">No recent payments</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
