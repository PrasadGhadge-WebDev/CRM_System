import { api } from './api';

export const activitiesApi = {
  list: (params) => api.get('/api/activities', { params }),
  create: (data) => api.post('/api/activities', data),
  update: (id, data) => api.put(`/api/activities/${id}`, data),
  remove: (id) => api.delete(`/api/activities/${id}`),
};
