import { api } from './api';

export const notificationsApi = {
  list: () => api.get('/api/notifications'),
  markAsRead: (id) => api.put(`/api/notifications/${id}/read`),
  markAllAsRead: () => api.put('/api/notifications/mark-all-read'),
  remove: (id) => api.delete(`/api/notifications/${id}`),
};
