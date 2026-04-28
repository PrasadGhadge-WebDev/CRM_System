import { Link } from 'react-router-dom'

export default function StatCard({ to, code, label, value, loading }) {
  return (
    <Link className="statCard modern" to={to} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div className="statLabel muted" style={{ fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>

      <div className="statValue" style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--text)' }}>
        {loading ? <span className="skeleton small" /> : value}
      </div>
    </Link>
  )
}