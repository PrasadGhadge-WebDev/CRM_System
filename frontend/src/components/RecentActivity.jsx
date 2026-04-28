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
                  <span className="lead-name" style={{ marginRight: '12px' }}>{activity.description || 'Activity'}</span>
                  {(!activity.activity_type?.includes(' ') && activity.status) && (
                    <span className={`status-badge ${activity.status === 'completed' ? 'badge-success' : 'badge-info'}`} style={{ textTransform: 'capitalize' }}>
                      {activity.status}
                    </span>
                  )}
                </div>
                <div className="lead-meta-row">
                  <span className="lead-source">{activity.activity_type || 'Activity'}</span>
                  <span className="lead-date">
                    <FiClock size={12} /> {new Date(activity.created_at).toLocaleDateString()}
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
