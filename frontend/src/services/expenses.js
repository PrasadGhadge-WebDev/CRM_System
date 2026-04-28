import { api } from './api'

export const expensesApi = {
  list: (params) => api.get('/api/expenses', { params }),
  get: (id) => api.get(`/api/expenses/${id}`),
  create: (data) => api.post('/api/expenses', data),
  update: (id, data) => api.put(`/api/expenses/${id}`, data),
  remove: (id) => api.delete(`/api/expenses/${id}`),
  getReports: (params) => api.get('/api/expenses/reports', { params }),
}
