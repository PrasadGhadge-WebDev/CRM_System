import { useEffect, useState } from 'react'
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts'
import { metricsApi } from '../services/metrics'
import PageHeader from '../components/PageHeader'
import { Icon } from '../layouts/icons'

export default function Reports() {
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    metricsApi.get()
      .then(data => setMetrics(data))
      .catch(e => setError(e.message || 'Failed to load reports'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="padding40 center muted">Generating business reports...</div>
  if (error) return <div className="alert error">{error}</div>

  const chartPalette = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9']
  
  const leadSourceData = metrics?.leads?.bySource?.map((item, idx) => ({
    name: item.source || 'Unknown',
    value: item.count,
    fill: chartPalette[idx % chartPalette.length]
  })) || []

  const conversionRate = metrics?.leads?.total > 0 
    ? ((metrics?.summary?.dealsWon / metrics?.leads?.total) * 100).toFixed(1)
    : 0

  return (
    <div className="stack gap-32">
      <PageHeader 
        title="Business Intelligence Reports" 
        description="Data-driven insights for growth."
      />

      <div className="reports-grid">
        {/* REVENUE GROWTH */}
        <div className="card glass-panel report-card full-width shadow-vibrant">
          <div className="report-header">
            <div>
              <h3>Monthly Revenue</h3>
              <p className="muted small">Value of won deals over time</p>
            </div>
            <div className="report-stat">
              <span className="label">Total Revenue</span>
              <span className="value success-text">₹{metrics?.summary?.totalRevenue?.toLocaleString()}</span>
            </div>
          </div>
          <div className="report-chart">
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={metrics?.deals?.revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Line 
                   type="monotone" 
                   dataKey="amount" 
                   stroke="#3b82f6" 
                   strokeWidth={4} 
                   dot={{ r: 6, fill: '#3b82f6', strokeWidth: 0 }} 
                   activeDot={{ r: 8, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid2 gap-24">
          {/* LEAD CONVERSION RATE */}
          <div className="card glass-panel report-card shadow-vibrant">
            <div className="report-header">
              <h3>Lead Conversion</h3>
              <div className="conversion-badge">{conversionRate}%</div>
            </div>
            <div className="center padding40">
               <div className="conversion-radial-wrap">
                  <div className="conversion-radial-track">
                     <div className="conversion-radial-fill" style={{ '--percent': conversionRate }}></div>
                     <div className="conversion-radial-center">
                        <span className="big-percent">{conversionRate}%</span>
                        <span className="muted tiny uppercase">Conversion</span>
                     </div>
                  </div>
               </div>
               <div className="margin-top-24 stack gap-8">
                  <div className="flex justify-between muted small">
                     <span>Total Leads</span>
                     <span className="white">{metrics?.leads?.total}</span>
                  </div>
                  <div className="flex justify-between muted small">
                     <span>Deals Won</span>
                     <span className="white">{metrics?.summary?.dealsWon}</span>
                  </div>
               </div>
            </div>
          </div>

          {/* TOP PERFORMERS */}
          <div className="card glass-panel report-card shadow-vibrant">
             <div className="report-header">
               <h3>Top Performers</h3>
               <p className="muted tiny">By revenue contribution</p>
             </div>
             <div className="performers-list stack gap-16 margin-top-20">
                {(metrics?.topPerformers || []).map((p, i) => (
                  <div key={i} className="performer-row">
                     <div className="performer-rank">{i+1}</div>
                     <div className="performer-info">
                        <div className="name">{p.name}</div>
                        <div className="role muted tiny">{p.role}</div>
                     </div>
                     <div className="performer-value success-text">₹{p.revenue?.toLocaleString()}</div>
                  </div>
                ))}
                {(!metrics?.topPerformers || metrics.topPerformers.length === 0) && (
                   <div className="center muted italic padding20">No data available</div>
                )}
             </div>
          </div>
        </div>
      </div>

      <style>{`
        .reports-grid { display: grid; gap: 24px; }
        .report-card { padding: 24px; }
        .full-width { grid-column: 1 / -1; }
        .report-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
        .report-header h3 { margin: 0; font-size: 1.1rem; }
        .report-stat { text-align: right; }
        .report-stat .label { display: block; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; color: var(--text-dimmed); }
        .report-stat .value { font-size: 1.5rem; font-weight: 900; }
        
        .conversion-badge { background: rgba(16, 185, 129, 0.1); color: #10b981; padding: 4px 12px; border-radius: 999px; font-weight: 800; font-size: 0.75rem; }
        
        .conversion-radial-wrap { display: flex; justify-content: center; position: relative; width: 150px; height: 150px; margin: 0 auto; }
        .conversion-radial-track { width: 100%; height: 100%; border-radius: 50%; border: 12px solid rgba(255,255,255,0.05); position: relative; }
        .conversion-radial-fill { 
           position: absolute; top: -12px; left: -12px; width: 150px; height: 150px; border-radius: 50%; 
           border: 12px solid transparent; border-top-color: #10b981; border-right-color: #10b981;
           transform: rotate(calc(var(--percent) * 3.6deg));
           transition: transform 1s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .conversion-radial-center { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .big-percent { font-size: 1.8rem; font-weight: 900; color: white; line-height: 1; }
        
        .performer-row { display: flex; align-items: center; gap: 16px; padding: 12px; background: rgba(255,255,255,0.02); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); }
        .performer-rank { width: 28px; height: 28px; background: var(--bg-dark); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; color: var(--primary); font-size: 0.8rem; }
        .performer-info { flex: 1; }
        .performer-info .name { font-weight: 700; color: white; }
        .performer-value { font-weight: 800; }
      `}</style>
    </div>
  )
}
