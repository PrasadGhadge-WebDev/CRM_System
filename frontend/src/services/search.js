import { api } from './api';

export const searchApi = {
  global: (q) => api.get('/api/search', { params: { q } }),
};
