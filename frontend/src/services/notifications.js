import { api } from './api';

export const notificationsApi = {
  list: () => api.get('/api/notifications'),
  markAsRead: (id) => api.put(`/api/notifications/${id}/read`),
  markAsUnread: (id) => api.put(`/api/notifications/${id}/unread`),
  togglePin: (id) => api.put(`/api/notifications/${id}/pin`),
  markAllAsRead: () => api.put('/api/notifications/mark-all-read'),
  remove: (id) => api.delete(`/api/notifications/${id}`),
};
