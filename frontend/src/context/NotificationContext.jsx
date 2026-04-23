import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { initSocket, disconnectSocket } from '../utils/socket';
import { useAuth } from './AuthContext';
import { notificationsApi } from '../services/notifications';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchSummary = async () => {
    if (!user) return;
    try {
      const res = await notificationsApi.list();
      // res is the data object from api.get
      const items = res.items || [];
      const count = res.unreadCount ?? 0;
      setNotifications(items);
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  const markAsRead = async (id) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications(prev => 
        prev.map(n => (n.id === id || n._id === id) ? { ...n, read: true, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSummary();
      const socket = initSocket(user.id);

      socket.on('notification', (notif) => {
        console.log('🔔 New notification received:', notif);
        setNotifications(prev => [notif, ...prev.slice(0, 4)]);
        setUnreadCount(prev => prev + 1);
        
        // Show real-time Toast
        toast.info(notif.message, {
          onClick: () => {
             // Optional: navigate to the entity
             // window.location.href = `/leads/${notif.linked_entity_id}`;
          }
        });
      });

      return () => {
        // We might not want to disconnect on every rerender, 
        // but since user dependency is stable, it's fine.
      };
    } else {
      setNotifications([]);
      setUnreadCount(0);
      disconnectSocket();
    }
  }, [user]);

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      loading, 
      fetchNotifications: fetchSummary, 
      markAsRead, 
      markAllAsRead 
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
