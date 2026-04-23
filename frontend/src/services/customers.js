import { api } from './api.js'

export const customersApi = {
  async list(params = {}) {
    const data = await api.get('/api/customers', { params })
    return data
  },
  async exportCsv(params = {}) {
    const blob = await api.get('/api/customers/export', {
      params,
      responseType: 'blob',
      headers: { Accept: 'text/csv' },
    })
    return blob
  },
  async importCsv({ csv, companyId } = {}) {
    const data = await api.post('/api/customers/import', { csv, companyId })
    return data
  },
  async get(id) {
    const data = await api.get(`/api/customers/${id}`)
    return data
  },
  async create(payload) {
    const data = await api.post('/api/customers', payload)
    return data
  },
  async update(id, payload) {
    const data = await api.put(`/api/customers/${id}`, payload)
    return data
  },
  async remove(id) {
    const data = await api.delete(`/api/customers/${id}`)
    return data
  },
  async listNotes(id) {
    const data = await api.get(`/api/customers/${id}/notes`)
    return data
  },
  async addNote(id, payload) {
    const data = await api.post(`/api/customers/${id}/notes`, payload)
    return data
  },
  async convertLead(payload) {
    const data = await api.post('/api/customers/convert', payload)
    return data
  },
  async getAnalytics(params = {}) {
    const data = await api.get('/api/customers/analytics', { params })
    return data
  },
}
