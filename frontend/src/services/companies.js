import { api } from './api.js'

export const companiesApi = {
  async list(params = {}) {
    const data = await api.get('/api/companies', { params })
    return data
  },
  async get(id) {
    const data = await api.get(`/api/companies/${id}`)
    return data
  },
  async create(payload) {
    const data = await api.post('/api/companies', payload)
    return data
  },
  async update(id, payload) {
    const data = await api.put(`/api/companies/${id}`, payload)
    return data
  },
  async remove(id) {
    const data = await api.delete(`/api/companies/${id}`)
    return data
  },
}
