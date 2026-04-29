import { Link } from 'react-router-dom'
import { Icon } from '../layouts/icons.jsx'

export default function StatCard({ to, code, label, value, loading }) {
  const getIcon = (code) => {
    switch (code) {
      case 'LE': return 'users'
      case 'CU': return 'user'
      case 'OV': return 'clock'
      case 'DE': return 'briefcase'
      case 'RV': return 'trendingUp'
      case 'TI': return 'bell'
      case 'EM': return 'users'
      case 'AT': return 'calendar'
      case 'NT': return 'bell'
      case 'PP': return 'creditCard'
      case 'CD': return 'check'
      default: return 'activity'
    }
  }

  const getTheme = (code) => {
    switch (code) {
      case 'LE': return { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }
      case 'CU': return { bg: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }
      case 'OV': return { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }
      case 'DE': return { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }
      case 'RV': return { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }
      default: return { bg: 'rgba(100, 116, 139, 0.1)', color: '#64748b' }
    }
  }

  const theme = getTheme(code)

  return (
    <Link className="stat-card-modern" to={to} style={{ textDecoration: 'none' }}>
      <div className="stat-icon-wrap" style={{ background: theme.bg, color: theme.color }}>
        <Icon name={getIcon(code)} size={20} />
      </div>
      <div className="stat-info">
        <span className="stat-label">{label}</span>
        <span className="stat-value">
          {loading ? <span className="skeleton small" style={{ width: '60px', height: '24px' }} /> : value}
        </span>
      </div>
    </Link>
  )
}