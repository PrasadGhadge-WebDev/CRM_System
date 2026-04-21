import { api } from './api';

export const attachmentsApi = {
  list: (params) => api.get('/api/attachments', { params }),
  upload: (formData) => api.post('/api/attachments', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  remove: (id) => api.delete(`/api/attachments/${id}`),
};
