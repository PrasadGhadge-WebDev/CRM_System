import { api } from './api';

export const statusesApi = {
  // Get all settings including statuses
  list: async (type = 'lead') => {
    const res = await api.get('/api/settings');
    const settings = res || {};
    const statuses = settings.leadStatuses || [];
    return statuses
      .filter(s => s.type === type)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  },

  // Save (add or update) a status
  save: async (data) => {
    return api.post('/api/settings/statuses', data);
  },

  // Reorder statuses
  reorder: async (updates) => {
    return api.put('/api/settings/statuses/reorder', { updates });
  },

  // Remove a status
  remove: async (id) => {
    return api.delete(`/api/settings/statuses/${id}`);
  }
};
