import { useState, useEffect, useCallback } from 'react'
import { reportsApi } from '../../../services/reports'
import { useAuth } from '../../../context/AuthContext'
import { Icon } from '../../../layouts/icons'
import { formatCurrency } from '../../../utils/formatters'
import { toast } from 'react-toastify'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts'
import html2pdf from 'html2pdf.js'

const COLORS = ['#335c85', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export default function ReportsDashboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('sales')
  const [range, setRange] = useState('month')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true)
      let res
      const params = { range, start: startDate, end: endDate }
      
      if (activeTab === 'sales') res = await reportsApi.getSales(params)
      else if (activeTab === 'leads') res = await reportsApi.getLeads(params)
      else if (activeTab === 'finance') res = await reportsApi.getFinance(params)
      else if (activeTab === 'performance') res = await reportsApi.getPerformance(params)
      else if (activeTab === 'tickets') res = await reportsApi.getTickets(params)
      
      setData(res)
    } catch (err) {
      toast.error('Failed to load report')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [activeTab, range, startDate, endDate])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const handleExportPDF = () => {
    const element = document.getElementById('report-content')
    if (!element) return
    const opt = {
      margin: 10,
      filename: `${activeTab}-report-${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    }
    html2pdf().set(opt).from(element).save()
  }

  const renderTabs = () => {
    const tabs = [
      { id: 'sales', label: 'Sales Reports', icon: 'billing', roles: ['Admin', 'Manager', 'Employee'] },
      { id: 'leads', label: 'Leads Reports', icon: 'more-vertical', roles: ['Admin', 'Manager', 'Employee'] },
      { id: 'finance', label: 'Finance Reports', icon: 'billing', roles: ['Admin', 'Accountant'] },
      { id: 'performance', label: 'Performance', icon: 'reports', roles: ['Admin', 'Manager', 'Employee'] },
      { id: 'tickets', label: 'Ticket Reports', icon: 'search', roles: ['Admin', 'Manager'] }
    ]

    return tabs
      .filter(t => t.roles.includes(user?.role))
      .map(t => (
        <button 
          key={t.id} 
          className={`report-tab ${activeTab === t.id ? 'active' : ''}`}
          onClick={() => { setActiveTab(t.id); setData(null); }}
        >
          <Icon name={t.icon} size={16} />
          <span>{t.label}</span>
        </button>
      ))
  }

  const renderContent = () => {
    if (loading && !data) return (
      <div className="report-loading-state">
        <div className="spinner-medium" />
        <p>Generating insights...</p>
      </div>
    )

    if (!data) return <div className="report-empty-state">No data available for the selected criteria.</div>

    return (
      <div id="report-content" className="report-content-grid">
        {activeTab === 'sales' && renderSalesContent()}
        {activeTab === 'leads' && renderLeadsContent()}
        {activeTab === 'finance' && renderFinanceContent()}
        {activeTab === 'performance' && renderPerformanceContent()}
        {activeTab === 'tickets' && renderTicketsContent()}
      </div>
    )
  }

  const getStatusColor = (status) => {
    const s = status?.toLowerCase()
    if (s?.includes('won') || s?.includes('completed') || s?.includes('high') || s?.includes('active')) return '#10b981'
    if (s?.includes('lost') || s?.includes('rejected') || s?.includes('critical') || s?.includes('inactive')) return '#ef4444'
    if (s?.includes('pending') || s?.includes('medium') || s?.includes('follow')) return '#f59e0b'
    if (s?.includes('new') || s?.includes('low') || s?.includes('open')) return '#335c85'
    return '#8b5cf6'
  }

  const CustomTooltip = ({ active, payload, label, prefix = '', suffix = '' }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-chart-tooltip">
          <p className="tooltip-label">{label}</p>
          <div className="tooltip-items">
            {payload.map((p, i) => (
              <div key={i} className="tooltip-item">
                <span className="tooltip-dot" style={{ backgroundColor: p.color || p.fill }} />
                <span className="tooltip-name">{p.name}:</span>
                <span className="tooltip-value">{prefix}{p.value.toLocaleString()}{suffix}</span>
              </div>
            ))}
          </div>
        </div>
      )
    }
    return null
  }

  const renderSalesContent = () => (
    <>
      <div className="report-card full-width">
        <h3 className="report-card-title">Monthly Revenue Pipeline</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.trends || []}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(v) => `₹${v/1000}k`} />
              <Tooltip content={<CustomTooltip prefix="₹" />} />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                name="Revenue"
                stroke="#10b981" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#colorRevenue)" 
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="report-card">
        <h3 className="report-card-title">Deal Success Rate</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.stats || []}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={95}
                paddingAngle={8}
                dataKey="count"
                nameKey="_id"
                animationBegin={0}
                animationDuration={1500}
              >
                {(data.stats || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getStatusColor(entry._id)} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="report-card">
        <h3 className="report-card-title">Portfolio Valuation</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.stats || []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip content={<CustomTooltip prefix="₹" />} />
              <Bar dataKey="totalValue" name="Value" radius={[6, 6, 0, 0]} animationDuration={1500}>
                {(data.stats || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getStatusColor(entry._id)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  )

  const renderLeadsContent = () => (
    <>
      <div className="report-card">
        <h3 className="report-card-title">Conversion Funnel</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.statusBreakdown || []}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={95}
                paddingAngle={5}
                dataKey="count"
                nameKey="_id"
                animationDuration={1500}
              >
                {(data.statusBreakdown || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getStatusColor(entry._id)} />
                ))}
              </Pie>
              <Tooltip />
              <Legend iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="report-card">
        <h3 className="report-card-title">Acquisition Channels</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.sourceBreakdown || []} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" axisLine={false} tickLine={false} hide />
              <YAxis dataKey="_id" type="category" axisLine={false} tickLine={false} width={100} tick={{ fontSize: 12, fontWeight: 600 }} />
              <Tooltip cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="count" name="Leads" fill="#8b5cf6" radius={[0, 6, 6, 0]} animationDuration={1500} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  )

  const renderFinanceContent = () => (
    <>
       <div className="report-card full-width">
        <h3 className="report-card-title">Collection & Cashflow Trend</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.revenueTrend || []}>
              <defs>
                <linearGradient id="colorFinance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#335c85" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#335c85" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${v/1000}k`} />
              <Tooltip content={<CustomTooltip prefix="₹" />} />
              <Area 
                type="stepAfter" 
                dataKey="total" 
                name="Collections" 
                stroke="#335c85" 
                strokeWidth={3}
                fill="url(#colorFinance)" 
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="report-card">
        <h3 className="report-card-title">Expenditure Distribution</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.expenseStats || []}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={95}
                dataKey="total"
                nameKey="_id"
                animationDuration={1500}
              >
                {(data.expenseStats || []).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip prefix="₹" />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="report-card">
        <h3 className="report-card-title">Payment Liquidity Status</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.paymentStats || []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip prefix="₹" />} />
              <Bar dataKey="total" name="Amount" radius={[6, 6, 0, 0]} animationDuration={1500}>
                {(data.paymentStats || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getStatusColor(entry._id)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  )

  const renderPerformanceContent = () => (
    <div className="report-card full-width">
      <h3 className="report-card-title">Team Productivity Index</h3>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={Array.isArray(data) ? data : []} barGap={10}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600 }} />
            <YAxis axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: '#f8fafc' }} />
            <Legend verticalAlign="top" align="right" height={40} iconType="rect" />
            <Bar dataKey="leads" name="Leads" fill="#335c85" radius={[6, 6, 0, 0]} animationDuration={1500} />
            <Bar dataKey="deals" name="Deals" fill="#10b981" radius={[6, 6, 0, 0]} animationDuration={1500} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )

  const renderTicketsContent = () => (
    <>
      <div className="report-card">
        <h3 className="report-card-title">Support Resolution Status</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.stats || []}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={95}
                paddingAngle={5}
                dataKey="count"
                nameKey="_id"
                animationDuration={1500}
              >
                {(data.stats || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getStatusColor(entry._id)} />
                ))}
              </Pie>
              <Tooltip />
              <Legend iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="report-card">
        <h3 className="report-card-title">Urgency Distribution</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.priorityBreakdown || []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700 }} />
              <YAxis axisLine={false} tickLine={false} hide />
              <Tooltip cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="count" name="Tickets" radius={[6, 6, 0, 0]} animationDuration={1500}>
                {(data.priorityBreakdown || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getStatusColor(entry._id)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  )

  return (
    <div className="reports-page stack crmContent">
      <header className="reports-header">
        <div>
          <h1 className="reports-title">Business Analytics & Reports</h1>
          <p className="reports-subtitle">Visualize performance, track revenue and generate custom insights</p>
        </div>
        <div className="reports-actions">
          {range === 'custom' && (
            <div className="custom-date-group">
              <input type="date" className="report-date-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
              <span className="date-separator">to</span>
              <input type="date" className="report-date-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          )}
          <select className="report-range-select" value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
            <option value="custom">Custom Range</option>
          </select>
          <button className="reports-btn secondary" onClick={() => { fetchReport(); toast.info('Refreshing report...'); }}>
            <Icon name="refresh" size={16} />
            <span>Refresh</span>
          </button>
          <button className="reports-btn premium" onClick={handleExportPDF}>
            <Icon name="reports" size={16} />
            <span>Export PDF</span>
          </button>
        </div>
      </header>

      <div className="reports-tabs-bar">
        {renderTabs()}
      </div>

      <main className="reports-main">
        {renderContent()}
      </main>

      <style>{`
        .reports-page { padding: 32px; background: #f8fafc; min-height: 100vh; }
        .reports-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
        .reports-title { font-size: 1.8rem; font-weight: 800; color: #1e293b; margin-bottom: 4px; }
        .reports-subtitle { font-size: 0.95rem; color: #64748b; font-weight: 500; }
        
        .reports-actions { display: flex; gap: 16px; align-items: center; }
        .custom-date-group { display: flex; align-items: center; gap: 8px; background: white; padding: 4px 12px; border-radius: 12px; border: 1px solid #e2e8f0; }
        .report-date-input { border: none; font-size: 0.85rem; font-weight: 600; color: #1e293b; outline: none; background: transparent; cursor: pointer; }
        .date-separator { font-size: 0.8rem; font-weight: 700; color: #64748b; text-transform: lowercase; }
        .report-range-select { padding: 10px 16px; border-radius: 12px; border: 1px solid #e2e8f0; background: white; font-weight: 700; color: #1e293b; cursor: pointer; outline: none; transition: all 0.2s; }
        .report-range-select:hover { border-color: #335c85; }
        
        .reports-btn { display: flex; align-items: center; gap: 10px; padding: 10px 20px; border-radius: 12px; font-weight: 700; font-size: 0.9rem; cursor: pointer; transition: all 0.3s; border: none; }
        .reports-btn.premium { background: #335c85; color: white; box-shadow: 0 4px 12px rgba(51, 92, 133, 0.2); }
        .reports-btn.secondary { background: white; color: #335c85; border: 1px solid #335c85; }
        .reports-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 15px rgba(0,0,0,0.1); }
        
        .reports-tabs-bar { display: flex; gap: 8px; background: white; padding: 6px; border-radius: 16px; margin-bottom: 32px; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.02); }
        .report-tab { border: none; background: transparent; padding: 12px 20px; border-radius: 12px; display: flex; align-items: center; gap: 10px; color: #64748b; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .report-tab:hover { background: #f1f5f9; color: #335c85; }
        .report-tab.active { background: #335c85; color: white; }
        
        .reports-main { min-height: 400px; }
        .report-content-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
        .report-card { background: white; padding: 24px; border-radius: 20px; border: none; box-shadow: 0 4px 20px rgba(0,0,0,0.02); transition: all 0.3s; min-height: 350px; display: flex; flex-direction: column; }
        .report-card:hover { box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
        .report-card.full-width { grid-column: span 2; min-height: 420px; }
        .report-card-title { font-size: 1rem; font-weight: 800; color: #1e293b; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 0.05em; }
        .chart-container { flex: 1; width: 100%; min-height: 280px; position: relative; }
        
        /* Custom Tooltip Styles */
        .custom-chart-tooltip { background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(8px); border: 1px solid #e2e8f0; padding: 12px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
        .tooltip-label { font-weight: 800; font-size: 0.85rem; color: #1e293b; margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; }
        .tooltip-items { display: flex; flex-direction: column; gap: 4px; }
        .tooltip-item { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; font-weight: 600; color: #64748b; }
        .tooltip-dot { width: 8px; height: 8px; border-radius: 50%; }
        .tooltip-name { flex: 1; }
        .tooltip-value { color: #1e293b; font-weight: 800; }

        .report-loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100px 0; color: #64748b; }
        .report-empty-state { text-align: center; padding: 100px 0; color: #64748b; font-weight: 600; }
        
        .spinner-medium { width: 40px; height: 40px; border: 4px solid #f1f5f9; border-top: 4px solid #335c85; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 16px; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        
        @media (max-width: 1000px) {
          .report-content-grid { grid-template-columns: 1fr; }
          .report-card.full-width { grid-column: span 1; }
          .reports-header { flex-direction: column; align-items: stretch; gap: 20px; }
          .reports-tabs-bar { overflow-x: auto; white-space: nowrap; }
        }
      `}</style>
    </div>
  )
}
