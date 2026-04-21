import { useEffect, useState } from 'react'
import PageHeader from '../../../components/PageHeader.jsx'
import { dealsApi } from '../../../services/deals'
import { Icon } from '../../../layouts/icons.jsx'
import { useToastFeedback } from '../../../utils/useToastFeedback.js'

export default function DealAnalytics() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useToastFeedback({ error })

  useEffect(() => {
    dealsApi.getAnalytics()
      .then(setStats)
      .catch(() => setError('Failed to load analytics'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="muted">Loading analytics...</div>
  if (error) return <div className="alert error">{error}</div>
  if (!stats) return null

  return (
    <div className="stack">
      <PageHeader title="Deal Analytics" backTo="/deals" />

      <div className="hero-stats-row">
        <div className="stat-panel primary">
          <div className="icon-wrap"><Icon name="deals" /></div>
          <div className="stat-content">
            <div className="label">Total Deals</div>
            <div className="value">{stats.total}</div>
          </div>
        </div>
        <div className="stat-panel success">
          <div className="icon-wrap"><Icon name="check" /></div>
          <div className="stat-content">
            <div className="label">Won Deals</div>
            <div className="value">{stats.won}</div>
          </div>
        </div>
        <div className="stat-panel danger">
          <div className="icon-wrap"><Icon name="trash" /></div>
          <div className="stat-content">
            <div className="label">Lost Deals</div>
            <div className="value">{stats.lost}</div>
          </div>
        </div>
        <div className="stat-panel warning">
          <div className="icon-wrap"><Icon name="reports" /></div>
          <div className="stat-content">
            <div className="label">Conversion Rate</div>
            <div className="value">{stats.conversionRate.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      <div className="card glass-panel" style={{ marginTop: 10, padding: '40px 30px', textAlign: 'center' }}>
        <div className="muted small uppercase tracking-widest" style={{ marginBottom: 12 }}>Total Revenue (Converted)</div>
        <div className="huge text-success" style={{ fontSize: '48px', textShadow: '0 0 40px rgba(16, 185, 129, 0.2)' }}>
           INR {stats.revenue?.toLocaleString()}
        </div>
        <div className="info muted small" style={{ marginTop: 20 }}>
          Revenue is calculated from all successfully converted deals in your currency.
        </div>
      </div>
    </div>
  )
}
