import { useNavigate } from 'react-router-dom'
import { Icon } from '../../../layouts/icons.jsx'

const ADMIN_TOOLS = [
  { 
    id: 'trash', 
    title: 'Recycle Bin', 
    desc: 'Restore or permanently delete removed items', 
    icon: 'trash', 
    path: '/trash',
    color: '#ef4444'
  },
  { 
    id: 'filters', 
    title: 'Lead Filters', 
    desc: 'Configure global lead classification rules', 
    icon: 'filter', 
    path: '/filters',
    color: '#8b5cf6'
  },
  { 
    id: 'pagination', 
    title: 'System Display', 
    desc: 'Configure pagination and record limits', 
    icon: 'settings', 
    path: '/pagination',
    color: '#f59e0b'
  },
  { 
    id: 'notifs', 
    title: 'Notifications', 
    desc: 'Review system alerts and audit logs', 
    icon: 'bell', 
    path: '/notifications',
    color: '#0ea5e9'
  }
]

export default function ToolsTab() {
  const navigate = useNavigate()

  return (
    <div className="page-enter">
      <div className="summaryHeader" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '800' }}>System Utility Tools</h2>
        <p className="muted" style={{ fontSize: '13px', marginTop: '4px' }}>
          Access advanced system modules and maintenance utilities
        </p>
      </div>

      <div className="statsGrid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        {ADMIN_TOOLS.map(tool => (
          <div 
            key={tool.id}
            className="statCard modern" 
            style={{ cursor: 'pointer', padding: '24px' }}
            onClick={() => navigate(tool.path)}
          >
            <div 
              className="statIcon" 
              style={{ 
                background: `color-mix(in srgb, ${tool.color} 12%, transparent)`,
                color: tool.color,
                border: `1px solid color-mix(in srgb, ${tool.color} 25%, transparent)`
              }}
            >
              <Icon name={tool.icon} size={24} />
            </div>
            <div className="statMeta">
              <div className="statValue" style={{ fontSize: '18px', marginBottom: '4px' }}>{tool.title}</div>
              <div className="statLabel" style={{ fontSize: '12px', lineHeight: '1.4' }}>{tool.desc}</div>
            </div>
            <div style={{ marginLeft: 'auto', opacity: 0.3 }}>
              <Icon name="chevronDown" style={{ transform: 'rotate(-90deg)' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
