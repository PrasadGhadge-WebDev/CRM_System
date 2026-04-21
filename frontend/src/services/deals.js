import { api } from './api';

export const dealsApi = {
  list: (params) => api.get('/api/deals', { params }),
  get: (id) => api.get(`/api/deals/${id}`),
  getHistory: (id) => api.get(`/api/deals/${id}/history`),
  getAnalytics: (params) => api.get('/api/deals/analytics', { params }),
  create: (data) => api.post('/api/deals', data),
  update: (id, data) => api.put(`/api/deals/${id}`, data),
  remove: (id) => api.delete(`/api/deals/${id}`),
};
