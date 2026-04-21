import React from 'react'
import { Link } from 'react-router-dom'
import { FiUser, FiCalendar, FiArrowRight } from 'react-icons/fi'

const getStatusClass = (status) => {
  const s = status?.toLowerCase() || ''
  if (s.includes('new')) return 'badge-new'
  if (s.includes('contacted')) return 'badge-info'
  if (s.includes('qualified')) return 'badge-success'
  if (s.includes('lost')) return 'badge-danger'
  return 'badge-muted'
}

const RecentLeads = ({ leads, loading }) => {
  if (loading) {
    return (
      <div className="recent-leads-card glass-panel">
        <div className="card-header">
          <h3>Recent Leads</h3>
          <div className="skeleton-line" style={{ width: '40px' }}></div>
        </div>
        <div className="recent-list">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="recent-item-skeleton">
              <div className="avatar-skeleton"></div>
              <div className="info-skeleton">
                <div className="line-sm"></div>
                <div className="line-xs"></div>
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
          <h3>Recent Leads</h3>
          <p className="text-muted small">Latest potential customers</p>
        </div>
        <Link to="/leads" className="view-all-link">
          View All <FiArrowRight />
        </Link>
      </div>

      <div className="recent-list">
        {leads && leads.length > 0 ? (
          leads.map((lead, i) => (
            <Link key={lead._id ?? i} to={`/leads/${lead._id}`} className="recent-item">
              <div className="lead-avatar-box">
                <div className="lead-avatar">
                  {lead.name?.charAt(0) || <FiUser />}
                </div>
              </div>
              <div className="lead-info">
                <div className="lead-name-row">
                  <span className="lead-name">{lead.name}</span>
                  <span className={`status-badge ${getStatusClass(lead.status)}`}>
                    {lead.status}
                  </span>
                </div>
                <div className="lead-meta-row">
                  <span className="lead-source">
                    {lead.source || 'Direct'}
                  </span>
                  <span className="lead-date">
                    <FiCalendar size={12} /> {new Date(lead.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="empty-state">
            <p>No recent leads found</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default RecentLeads
