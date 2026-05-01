import { api } from './api.js';

export const settingsApi = {
  get: () => api.get('/api/settings'),
  update: (data) => api.put('/api/settings', data),
  
  // Lead Sources (legacy aliases if needed)
  saveSource: (data) => api.post('/api/settings/sources', data),
  deleteSource: (id) => api.delete(`/api/settings/sources/${id}`),
  
  // Statuses (legacy aliases if needed)
  saveStatus: (data) => api.post('/api/settings/statuses', data),
  deleteStatus: (id) => api.delete(`/api/settings/statuses/${id}`),
  reorderStatuses: (data) => api.put('/api/settings/statuses/reorder', data),
};
