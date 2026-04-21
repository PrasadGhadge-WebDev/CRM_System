import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { notificationsApi } from '../services/notifications'
import { Icon } from '../layouts/icons.jsx'

export default function NotificationDropdown() {
  const [notifications, setNotifications] = useState([])
  const [open, setOpen] = useState(false)
  const [unseenCount, setUnseenCount] = useState(0)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadNotifications()
    const interval = setInterval(loadNotifications, 60000) // Poll every minute
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function loadNotifications() {
    try {
      const data = await notificationsApi.list()
      const items = data.items || []
      setNotifications(items)
      setUnseenCount(items.filter((n) => !n.is_read).length)
    } catch (err) {
      console.error('Failed to load notifications', err)
    }
  }

  async function handleMarkRead(id) {
    try {
      await notificationsApi.markAsRead(id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      )
      setUnseenCount((prev) => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Failed to mark read')
    }
  }

  async function handleMarkAllRead() {
    try {
      await notificationsApi.markAllAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnseenCount(0)
    } catch (err) {
      console.error('Failed to mark all read')
    }
  }

  return (
    <div className="notificationCenter" ref={dropdownRef}>
      <button className="iconBtn" onClick={() => setOpen(!open)}>
        <Icon name="bell" />
        {unseenCount > 0 && <span className="badgeCount">{unseenCount}</span>}
      </button>

      {open && (
        <div className="notificationDropdown">
          <div className="dropdownHeader">
            <h3>Notifications</h3>
            {unseenCount > 0 && (
              <button className="linkBtn" onClick={handleMarkAllRead}>
                Mark all read
              </button>
            )}
          </div>

          <div className="notificationList">
            {notifications.length ? (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`notificationItem ${n.is_read ? 'read' : 'unread'}`}
                  onClick={() => handleMarkRead(n.id)}
                >
                  <div className="notificationIcon">
                    <Icon name={n.type === 'warning' ? 'alert' : 'info'} />
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
              <div className="muted padding center">No notifications yet.</div>
            )}
          </div>

          <div className="dropdownFooter">
             <button className="btn fullWidth" onClick={() => { setOpen(false); navigate('/notifications'); }}>
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
          background: #ff4757;
          color: white;
          font-size: 10px;
          padding: 2px 5px;
          border-radius: 10px;
          border: 2px solid var(--bg);
        }
        .notificationDropdown {
          position: absolute;
          top: 100%;
          right: 0;
          width: 350px;
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          z-index: 1000;
          margin-top: 8px;
          overflow: hidden;
        }
        .dropdownHeader {
          padding: 12px 16px;
          border-bottom: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .dropdownHeader h3 { margin: 0; font-size: 1rem; }
        .notificationList {
          max-height: 400px;
          overflow-y: auto;
        }
        .notificationItem {
          padding: 12px 16px;
          display: flex;
          gap: 12px;
          cursor: pointer;
          border-bottom: 1px solid var(--border);
          transition: background 0.2s;
        }
        .notificationItem:hover { background: rgba(255,255,255,0.05); }
        .notificationItem.unread { background: rgba(55, 125, 255, 0.05); }
        .notificationIcon {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .notificationItem.unread .notificationIcon { background: var(--primary); color: white; }
        .notificationTitle { font-weight: 600; font-size: 0.9rem; }
        .notificationMessage { font-size: 0.85rem; margin-top: 2px; }
        .notificationTime { font-size: 0.75rem; margin-top: 4px; }
        .dropdownFooter { padding: 8px; border-top: 1px solid var(--border); }
        .linkBtn {
          background: none;
          border: none;
          color: var(--primary);
          cursor: pointer;
          font-size: 0.85rem;
          padding: 0;
        }
        .linkBtn:hover { text-decoration: underline; }
      `}</style>
    </div>
  )
}
