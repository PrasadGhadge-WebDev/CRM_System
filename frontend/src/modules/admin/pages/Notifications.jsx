import React, { useState, useEffect } from 'react'
import { Icon } from '../../../layouts/icons'
import { api } from '../../../services/api'
import { toast } from 'react-toastify'

export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications')
      setNotifications(res.data)
    } catch (err) {
      console.error('Error fetching notifications:', err)
      // Fallback for demo if API is not fully ready
      setNotifications([
        { id: 1, title: 'Welcome to CRM', message: 'Glad to have you here!', createdAt: new Date().toISOString() },
        { id: 2, title: 'System Update', message: 'New features added to Leads module.', createdAt: new Date().toISOString() }
      ])
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`)
      setNotifications(prev => prev.filter(n => n.id !== id))
      toast.success('Notification cleared')
    } catch (err) {
      toast.error('Failed to clear notification')
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle muted">Keep track of important updates and alerts.</p>
        </div>
      </div>

      {loading ? (
        <div className="card loading-state">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="card empty-state" style={{ textAlign: 'center', padding: '40px' }}>
          <Icon name="help" size={48} />
          <p className="muted">You have no new notifications.</p>
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map(n => (
            <div key={n.id} className="card notification-item" style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: 0 }}>{n.title}</h4>
                <p className="muted" style={{ margin: '5px 0' }}>{n.message}</p>
                <small className="muted">{new Date(n.createdAt).toLocaleString()}</small>
              </div>
              <button className="btn btn-icon" onClick={() => markAsRead(n.id)} title="Clear notification">
                <Icon name="close" size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
