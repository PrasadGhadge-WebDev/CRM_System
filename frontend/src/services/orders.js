import { api } from './api.js'

export const ordersApi = {
  async list(params = {}) {
    const data = await api.get('/api/orders', { params })
    return data
  },
  async get(id) {
    const data = await api.get(`/api/orders/${id}`)
    return data
  },
  async create(payload) {
    const data = await api.post('/api/orders', payload)
    return data
  }
}
