import { api } from './api';

export const leadSourcesApi = {
  // Get all sources
  list: async () => {
    const res = await api.get('/api/settings');
    const settings = res || {};
    return settings.leadSources || [];
  },

  // Save (add or update) a source
  save: async (data) => {
    return api.post('/api/settings/sources', data);
  },

  // Remove a source
  remove: async (id) => {
    return api.delete(`/api/settings/sources/${id}`);
  }
};
