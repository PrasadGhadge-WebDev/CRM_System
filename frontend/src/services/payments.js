import { api } from './api'

export const paymentsApi = {
  list: (params) => api.get('/api/payments', { params }),
  get: (id) => api.get(`/api/payments/${id}`),
  create: (data) => api.post('/api/payments', data),
  update: (id, data) => api.patch(`/api/payments/${id}`, data),
  approve: (id) => api.post(`/api/payments/${id}/approve`),
  remove: (id) => api.delete(`/api/payments/${id}`),
}
