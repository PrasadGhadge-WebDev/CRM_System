import { Link } from 'react-router-dom'
import { Icon } from '../layouts/icons.jsx'
import '../styles/quickBoard.css'

export default function QuickBoard({ tasks = [], loading }) {
  const quickActions = [
    { label: 'Add Lead', to: '/leads/new', icon: 'plus', primary: true },
    { label: 'Add Customer', to: '/customers/new', icon: 'user', primary: false },
    { label: 'New Deal', to: '/deals/new', icon: 'briefcase', primary: false }
  ]

  return (
    <div className="quick-board-grid">
      {/* Box 1: Pending Tasks */}
      <div className="quick-box glass-panel">
        <div className="quick-box-header">
          <div className="quick-box-title">
            <Icon name="clock" />
            <span>Pending Tasks</span>
          </div>
        </div>
        <div className="quick-box-content">
          {loading ? (
            <div className="skeleton-list">
              {[1, 2].map(i => <div key={i} className="skeleton-line" style={{ height: '40px', marginBottom: '10px' }} />)}
            </div>
          ) : tasks.length > 0 ? (
            <div className="tasks-list">
              {tasks.slice(0, 3).map((task, idx) => (
                <div key={idx} className="task-item">
                  <div className={`task-dot ${task.is_overdue || task.isOverdue ? 'overdue' : 'pending'}`} />
                  <div className="task-info">
                    <span className="task-label">{task.description || task.name || 'Follow-up due'}</span>
                    <span className="task-meta">{task.type || 'Task'} • {task.date || 'Today'}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-tasks">
              <span>No follow-ups due ✅</span>
            </div>
          )}
        </div>
      </div>

      {/* Box 2: Quick Actions */}
      <div className="quick-box glass-panel">
        <div className="quick-box-header">
          <div className="quick-box-title">
            <Icon name="activity" />
            <span>Quick Actions</span>
          </div>
        </div>
        <div className="quick-box-content">
          <div className="actions-grid">
            {quickActions.map((action, idx) => (
              <Link 
                key={idx} 
                to={action.to} 
                className={`quick-action-btn ${action.primary ? 'primary' : 'secondary'}`}
              >
                <Icon name={action.icon} />
                <span>{action.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
