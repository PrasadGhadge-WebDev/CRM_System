import { api } from './api.js';

export const settingsApi = {
  get: () => api.get('/settings').then(res => res.data),
  update: (data) => api.put('/settings', data).then(res => res.data),
  
  // Lead Sources (legacy aliases if needed)
  saveSource: (data) => api.post('/settings/sources', data).then(res => res.data),
  deleteSource: (id) => api.delete(`/settings/sources/${id}`).then(res => res.data),
  
  // Statuses (legacy aliases if needed)
  saveStatus: (data) => api.post('/settings/statuses', data).then(res => res.data),
  deleteStatus: (id) => api.delete(`/settings/statuses/${id}`).then(res => res.data),
  reorderStatuses: (data) => api.put('/settings/statuses/reorder', data).then(res => res.data),
};
