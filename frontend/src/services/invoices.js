import { api } from './api'

export const invoicesApi = {
  list: (params) => api.get('/api/invoices', { params }),
  get: (id) => api.get(`/api/invoices/${id}`),
  create: (data) => api.post('/api/invoices', data),
  update: (id, data) => api.put(`/api/invoices/${id}`, data),
  remove: (id) => api.delete(`/api/invoices/${id}`),
  logAction: (id, action) => api.post(`/api/invoices/${id}/log-action`, { action }),
  generateFromDeal: (dealId) => api.post('/api/invoices/generate-from-deal', { dealId })
}
