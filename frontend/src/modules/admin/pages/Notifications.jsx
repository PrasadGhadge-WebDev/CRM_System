import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../../../layouts/icons'
import { notificationsApi } from '../../../services/notifications'
import { toast } from 'react-toastify'

export default function Notifications() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [activeFilter, setActiveFilter] = useState('all')

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await notificationsApi.list()
      setNotifications(res.items || [])
      setUnreadCount(res.unreadCount || 0)
    } catch (err) {
      toast.error('Failed to sync alerts')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const handleAction = async (id, action) => {
    try {
      if (action === 'read') await notificationsApi.markAsRead(id)
      if (action === 'unread') await notificationsApi.markAsUnread(id)
      if (action === 'pin') await notificationsApi.togglePin(id)
      if (action === 'delete') await notificationsApi.remove(id)
      fetchNotifications()
    } catch (err) {
      toast.error('Action failed')
    }
  }

  const markAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead()
      toast.success('All alerts cleared')
      fetchNotifications()
    } catch { toast.error('Failed to clear all') }
  }

  const navigateToEntity = (type, id) => {
    const routes = {
      'Lead': `/leads/${id}`,
      'Deal': `/deals/${id}`,
      'Customer': `/customers/${id}`,
      'Ticket': `/tickets/${id}`,
      'LeaveRequest': `/hr/leaves`
    }
    if (routes[type]) navigate(routes[type])
  }

  const filtered = notifications.filter(n => {
    if (activeFilter === 'all') return true
    return n.type === activeFilter
  })

  const getIcon = (type) => {
    const icons = {
      lead: 'activity',
      deal: 'deals',
      ticket: 'help',
      leave: 'calendar',
      system: 'settings',
      'follow-up': 'clock'
    }
    return icons[type] || 'info'
  }

  return (
    <div className="crm-fullscreen-shell" style={{ background: 'var(--bg)', minHeight: '100vh', padding: '32px' }}>
      
      <div className="users-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
           <h1 className="users-title">Notification Center</h1>
           <p className="users-subtitle">Stay updated with real-time operational alerts and system messages</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
           <button className="crm-btn-premium secondary" onClick={markAllRead}>
              <Icon name="check" />
              <span>Mark All as Read</span>
           </button>
        </div>
      </div>

      <div className="notif-layout-v3" style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '32px' }}>
         
         <aside className="notif-sidebar">
            <div className="notif-nav-card shadow-soft">
               {['all', 'lead', 'ticket', 'leave', 'system'].map(filter => (
                  <button 
                    key={filter} 
                    className={`notif-nav-item ${activeFilter === filter ? 'is-active' : ''}`}
                    onClick={() => setActiveFilter(filter)}
                  >
                     <Icon name={getIcon(filter)} size={16} />
                     <span>{filter.toUpperCase()}</span>
                     {filter === 'all' && unreadCount > 0 && <span className="badge-notif">{unreadCount}</span>}
                  </button>
               ))}
            </div>
         </aside>

         <main className="notif-feed">
            {loading ? (
               <div className="center p-40 stack gap-16">
                  <div className="spinner-medium" />
                  <span className="muted">Synchronizing feed...</span>
               </div>
            ) : filtered.length === 0 ? (
               <div className="empty-state-v3 shadow-soft">
                  <div className="empty-icon-v3"><Icon name="bell" size={48} /></div>
                  <h3>No notifications found</h3>
                  <p className="muted">Your inbox is clean. We'll alert you when something important happens.</p>
               </div>
            ) : (
               <div className="notif-list-v3 stack gap-12">
                  {filtered.map(n => (
                     <div key={n.id} className={`notif-card-v3 shadow-soft ${n.is_read ? 'is-read' : 'unread'} ${n.is_pinned ? 'is-pinned' : ''}`}>
                        <div className={`notif-type-bar ${n.type}`} />
                        
                        <div className="notif-main-content">
                           <div className="notif-header">
                              <div className="notif-title-row">
                                 <div className={`notif-icon-circle ${n.type}`}><Icon name={getIcon(n.type)} size={14} /></div>
                                 <h4 className="notif-title">{n.title}</h4>
                                 {n.priority === 'High' && <span className="badge-premium-v3 danger text-xs">CRITICAL</span>}
                              </div>
                              <span className="notif-time">{new Date(n.created_at).toLocaleString()}</span>
                           </div>
                           
                           <p className="notif-message">{n.message}</p>
                           
                           <div className="notif-footer">
                              <div className="notif-actions-left">
                                 {n.linked_entity_id && (
                                    <button className="notif-link-btn" onClick={() => navigateToEntity(n.linked_entity_type, n.linked_entity_id)}>
                                       <Icon name="chevron-right" size={14} />
                                       <span>Open {n.linked_entity_type}</span>
                                    </button>
                                 )}
                              </div>
                              <div className="notif-actions-right">
                                 <button className={`notif-action-icon ${n.is_pinned ? 'active' : ''}`} onClick={() => handleAction(n.id, 'pin')} title="Pin Notification">
                                    <Icon name="activity" size={14} />
                                 </button>
                                 <button className="notif-action-icon" onClick={() => handleAction(n.id, n.is_read ? 'unread' : 'read')} title={n.is_read ? 'Mark as Unread' : 'Mark as Read'}>
                                    <Icon name={n.is_read ? 'mail' : 'check'} size={14} />
                                 </button>
                                 <button className="notif-action-icon danger" onClick={() => handleAction(n.id, 'delete')} title="Delete">
                                    <Icon name="trash" size={14} />
                                 </button>
                              </div>
                           </div>
                        </div>
                     </div>
                  ))}
               </div>
            )}
         </main>

      </div>

      <style>{`
        .notif-nav-card {
           background: var(--bg-card);
           border: 1px solid var(--border);
           border-radius: 16px;
           padding: 8px;
           display: flex;
           flex-direction: column;
           gap: 4px;
        }
        .notif-nav-item {
           display: flex;
           align-items: center;
           gap: 12px;
           padding: 12px 16px;
           border-radius: 12px;
           border: none;
           background: none;
           color: var(--text-dimmed);
           font-size: 0.85rem;
           font-weight: 600;
           cursor: pointer;
           transition: all 0.2s;
           position: relative;
        }
        .notif-nav-item:hover { background: var(--bg-surface); color: var(--text); }
        .notif-nav-item.is-active { background: var(--primary-soft); color: var(--primary); }
        
        .badge-notif {
           margin-left: auto;
           background: var(--primary);
           color: white;
           font-size: 0.65rem;
           padding: 2px 8px;
           border-radius: 100px;
        }

        .notif-card-v3 {
           background: var(--bg-card);
           border: 1px solid var(--border);
           border-radius: 16px;
           display: flex;
           overflow: hidden;
           transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .notif-card-v3.unread { border-left-width: 0; background: #ffffff; }
        .notif-card-v3.is-read { opacity: 0.7; }
        .notif-card-v3.is-pinned { border-color: var(--primary); box-shadow: 0 4px 12px var(--primary-soft); }

        .notif-type-bar { width: 4px; flex-shrink: 0; }
        .notif-type-bar.lead { background: #3b82f6; }
        .notif-type-bar.deal { background: #8b5cf6; }
        .notif-type-bar.ticket { background: #f59e0b; }
        .notif-type-bar.leave { background: #10b981; }
        .notif-type-bar.system { background: #6366f1; }

        .notif-main-content { flex: 1; padding: 20px; }
        .notif-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
        .notif-title-row { display: flex; align-items: center; gap: 12px; }
        .notif-icon-circle {
           width: 32px;
           height: 32px;
           border-radius: 50%;
           display: flex;
           align-items: center;
           justify-content: center;
           background: var(--bg-surface);
        }
        .notif-icon-circle.lead { color: #3b82f6; background: #eff6ff; }
        .notif-icon-circle.deal { color: #8b5cf6; background: #f5f3ff; }
        .notif-icon-circle.ticket { color: #f59e0b; background: #fffbeb; }
        .notif-icon-circle.leave { color: #10b981; background: #f0fdf4; }

        .notif-title { margin: 0; font-size: 0.95rem; font-weight: 700; color: var(--text); }
        .notif-time { font-size: 0.75rem; color: var(--text-dimmed); }
        .notif-message { font-size: 0.9rem; color: var(--text-muted); line-height: 1.5; margin: 0 0 16px 0; }
        
        .notif-footer { display: flex; justify-content: space-between; align-items: center; }
        .notif-link-btn {
           display: flex;
           align-items: center;
           gap: 6px;
           padding: 6px 12px;
           border-radius: 8px;
           border: 1px solid var(--border-subtle);
           background: var(--bg-surface);
           color: var(--primary);
           font-size: 0.75rem;
           font-weight: 700;
           cursor: pointer;
           transition: all 0.2s;
        }
        .notif-link-btn:hover { background: var(--primary); color: white; border-color: var(--primary); }

        .notif-actions-right { display: flex; gap: 8px; }
        .notif-action-icon {
           width: 32px;
           height: 32px;
           border-radius: 8px;
           border: 1px solid var(--border-subtle);
           background: var(--bg-surface);
           color: var(--text-dimmed);
           display: flex;
           align-items: center;
           justify-content: center;
           cursor: pointer;
           transition: all 0.2s;
        }
        .notif-action-icon:hover { background: var(--bg-card); color: var(--text); transform: translateY(-2px); }
        .notif-action-icon.active { background: var(--primary-soft); color: var(--primary); border-color: var(--primary-soft); }
        .notif-action-icon.danger:hover { background: var(--danger-soft); color: var(--danger); border-color: var(--danger-soft); }

        .empty-state-v3 {
           background: var(--bg-card);
           border: 1px solid var(--border);
           border-radius: 24px;
           padding: 64px 32px;
           text-align: center;
        }
        .empty-icon-v3 {
           width: 80px;
           height: 80px;
           background: var(--bg-surface);
           border-radius: 50%;
           display: flex;
           align-items: center;
           justify-content: center;
           margin: 0 auto 24px auto;
           color: var(--text-dimmed);
        }
      `}</style>
    </div>
  )
}
