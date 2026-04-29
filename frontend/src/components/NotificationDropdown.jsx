import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../context/NotificationContext'
import { Icon } from '../layouts/icons.jsx'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import LottieEmpty from './LottieEmpty.jsx'
import bellData from '../assets/bell-animation.json'

export default function NotificationDropdown() {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead 
  } = useNotifications()
  
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleItemClick = async (n) => {
    if (!n.read && !n.is_read) {
      await markAsRead(n._id || n.id)
    }
    setOpen(false)
    if (n.linked_entity_type === 'Lead' && n.linked_entity_id) {
      navigate(`/leads/${n.linked_entity_id}`)
    }
  }

  return (
    <div className="notificationCenter" ref={dropdownRef}>
      <button className="iconBtn" onClick={() => setOpen(!open)} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px' }}>
        <div style={{ width: '24px', height: '24px' }}>
          <DotLottieReact
            data={bellData}
            loop={unreadCount > 0}
            autoplay={unreadCount > 0}
          />
        </div>
        {unreadCount > 0 && <span className="badgeCount">{unreadCount}</span>}
      </button>

      {open && (
        <div className="notificationDropdown">
          <div className="dropdownHeader">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button className="linkBtn" onClick={markAllAsRead}>
                Mark all read
              </button>
            )}
          </div>

          <div className="notificationList">
            {notifications.length ? (
              notifications.map((n) => (
                <div
                  key={n._id || n.id}
                  className={`notificationItem ${(n.read || n.is_read) ? 'read' : 'unread'}`}
                  onClick={() => handleItemClick(n)}
                >
                  <div className="notificationIcon">
                    <Icon name={n.type === 'lead_assigned' ? 'user' : 'info'} />
                  </div>
                  <div className="notificationBody">
                    <div className="notificationTitle">{n.title}</div>
                    <div className="notificationMessage">{n.message}</div>
                    <div className="notificationTime muted">
                      {new Date(n.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <LottieEmpty 
                message="All caught up!" 
                description="You have no new notifications. Check back later for updates." 
              />
            )}
          </div>

          <div className="dropdownFooter">
             <button className="btn fullWidth" style={{ width: '100%', padding: '10px' }} onClick={() => { setOpen(false); navigate('/notifications'); }}>
                View All Notifications
             </button>
          </div>
        </div>
      )}

      <style>{`
        .notificationCenter {
          position: relative;
        }
        .badgeCount {
          position: absolute;
          top: -2px;
          right: -2px;
          background: var(--danger);
          color: white;
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 10px;
          border: 2px solid var(--bg-card);
          font-weight: bold;
        }
        .notificationDropdown {
          position: absolute;
          top: 100%;
          right: 0;
          width: 340px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 16px;
          box-shadow: var(--shadow-xl);
          z-index: 1000;
          margin-top: 12px;
          overflow: hidden;
        }
        .dropdownHeader {
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--bg-surface);
        }
        .dropdownHeader h3 { margin: 0; font-size: 1rem; font-weight: 800; color: var(--text); }
        .notificationList {
          max-height: 400px;
          overflow-y: auto;
        }
        .notificationItem {
          padding: 16px 20px;
          display: flex;
          gap: 16px;
          cursor: pointer;
          border-bottom: 1px solid var(--border);
          transition: all 0.2s;
        }
        .notificationItem:hover { background: var(--bg-hover); }
        .notificationItem.unread { background: color-mix(in srgb, var(--primary) 5%, transparent); border-left: 3px solid var(--primary); }
        .notificationIcon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: var(--bg-surface);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: var(--text-dimmed);
        }
        .notificationItem.unread .notificationIcon { background: var(--primary); color: white; }
        .notificationTitle { font-weight: 800; font-size: 0.9rem; color: var(--text); }
        .notificationMessage { font-size: 0.85rem; margin-top: 4px; color: var(--text-muted); line-height: 1.4; }
        .notificationTime { font-size: 0.75rem; margin-top: 8px; color: var(--text-dimmed); }
        .dropdownFooter { padding: 12px; border-top: 1px solid var(--border); }
        .linkBtn {
          background: none;
          border: none;
          color: var(--primary);
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 700;
        }
        .linkBtn:hover { color: var(--primary-hover); text-decoration: underline; }
      `}</style>
    </div>
  )
}
