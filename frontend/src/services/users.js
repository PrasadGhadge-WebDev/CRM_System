import { api } from './api.js'

export const usersApi = {
  async list(params = {}) {
    const data = await api.get('/api/users', { params })
    return data
  },
  async get(id) {
    const cleanId = String(id).replace(/:\d+$/, '')
    const data = await api.get(`/api/users/${cleanId}`)
    return data
  },
  async create(payload) {
    const data = await api.post('/api/users', payload)
    return data
  },
  async update(id, payload) {
    const cleanId = String(id).replace(/:\d+$/, '')
    const data = await api.put(`/api/users/${cleanId}`, payload)
    return data
  },
  async resetPassword(id, payload) {
    const cleanId = String(id).replace(/:\d+$/, '')
    const data = await api.put(`/api/users/${cleanId}/reset-password`, payload)
    return data
  },
  async remove(id) {
    const cleanId = String(id).replace(/:\d+$/, '')
    const data = await api.delete(`/api/users/${cleanId}`)
    return data
  },
}
