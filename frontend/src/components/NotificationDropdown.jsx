import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../context/NotificationContext'
import { Icon } from '../layouts/icons.jsx'

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
      <button className="iconBtn" onClick={() => setOpen(!open)}>
        <Icon name="bell" />
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
              <div className="muted padding center" style={{ padding: '20px', textAlign: 'center' }}>
                No notifications yet.
              </div>
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
          background: #ef4444;
          color: white;
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 10px;
          border: 2px solid var(--card-bg);
          font-weight: bold;
        }
        .notificationDropdown {
          position: absolute;
          top: 100%;
          right: 0;
          width: 320px;
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          z-index: 1000;
          margin-top: 12px;
          overflow: hidden;
        }
        .dropdownHeader {
          padding: 12px 16px;
          border-bottom: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .dropdownHeader h3 { margin: 0; font-size: 0.95rem; font-weight: 700; color: var(--text); }
        .notificationList {
          max-height: 380px;
          overflow-y: auto;
        }
        .notificationItem {
          padding: 12px 16px;
          display: flex;
          gap: 12px;
          cursor: pointer;
          border-bottom: 1px solid var(--border);
          transition: all 0.2s;
        }
        .notificationItem:hover { background: rgba(55, 125, 255, 0.05); }
        .notificationItem.unread { background: rgba(55, 125, 255, 0.1); border-left: 3px solid #2563eb; }
        .notificationIcon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: #64748b;
        }
        .notificationItem.unread .notificationIcon { background: #2563eb; color: white; }
        .notificationTitle { font-weight: 700; font-size: 0.875rem; color: var(--text); }
        .notificationMessage { font-size: 0.825rem; margin-top: 2px; color: var(--text-muted); }
        .notificationTime { font-size: 0.7rem; margin-top: 6px; color: #94a3b8; }
        .dropdownFooter { padding: 8px; background: rgba(0,0,0,0.05); }
        .linkBtn {
          background: none;
          border: none;
          color: #2563eb;
          cursor: pointer;
          font-size: 0.8rem;
          font-weight: 600;
        }
        .linkBtn:hover { text-decoration: underline; }
      `}</style>
    </div>
  )
}
