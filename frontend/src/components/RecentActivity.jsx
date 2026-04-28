import { FiClock, FiCheckCircle, FiCalendar, FiMail, FiPhone, FiPlusCircle, FiTrendingUp, FiAlertCircle } from 'react-icons/fi'

function getActivityIcon(type) {
  const value = String(type || '').toLowerCase()
  if (value === 'call') return <FiPhone />
  if (value === 'meeting') return <FiCalendar />
  if (value === 'email') return <FiMail />
  if (value === 'task') return <FiCheckCircle />
  if (value === 'lead created') return <FiPlusCircle style={{ color: '#10b981' }} />
  if (value === 'deal created') return <FiPlusCircle style={{ color: '#3b82f6' }} />
  if (value === 'deal won') return <FiTrendingUp style={{ color: '#10b981' }} />
  if (value === 'ticket raised') return <FiAlertCircle style={{ color: '#f59e0b' }} />
  return <FiClock />
}

function formatActivityTitle(activity) {
  const description = activity.description?.trim()
  if (description) return description

  const kind = activity.activity_type || 'activity'
  return kind.charAt(0).toUpperCase() + kind.slice(1)
}

function formatActivityDate(activity) {
  const sourceDate = activity.activity_date || activity.due_date || activity.created_at
  if (!sourceDate) return 'No date'
  return new Date(sourceDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function getStatusTone(status) {
  const value = String(status || '').toLowerCase()
  if (value === 'completed') return 'badge-success'
  if (value === 'planned' || value === 'pending') return 'badge-info'
  return 'badge-secondary'
}

export default function RecentActivity({ activities, loading }) {
  if (loading) {
    return (
      <div className="recent-leads-card glass-panel">
        <div className="card-header">
          <h3>Recent Activity</h3>
          <div className="skeleton-line" style={{ width: '40px' }} />
        </div>
        <div className="recent-list">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="recent-item-skeleton">
              <div className="avatar-skeleton" />
              <div className="info-skeleton">
                <div className="line-sm" />
                <div className="line-xs" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="recent-leads-card glass-panel">
      <div className="card-header">
        <div className="header-info">
          <h3>Recent Activity</h3>
          <p className="text-muted small">Latest calls, meetings, emails, and follow-ups</p>
        </div>
      </div>

      <div className="recent-list">
        {activities && activities.length > 0 ? (
          activities.map((activity, idx) => (
            <div key={activity.id || activity._id || idx} className="recent-item">
              <div className="lead-avatar-box">
                <div className="lead-avatar">
                  {getActivityIcon(activity.activity_type)}
                </div>
              </div>
              <div className="lead-info">
                <div className="lead-name-row">
                  <span className="lead-name">{formatActivityTitle(activity)}</span>
                  {activity.status && (
                    <span className={`status-badge ${getStatusTone(activity.status)}`} style={{ textTransform: 'capitalize' }}>
                      {activity.status}
                    </span>
                  )}
                </div>
                <div className="lead-meta-row">
                  <span className="lead-source">{activity.activity_type || 'Activity'}</span>
                  <span className="lead-date">
                    <FiClock size={12} /> {formatActivityDate(activity)}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <p>No recent activity found</p>
          </div>
        )}
      </div>
    </div>
  )
}
