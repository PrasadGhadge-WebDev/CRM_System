import { api } from './api.js'

export const demoUsersApi = {
  async list(params = {}) {
    const data = await api.get('/api/demo/users', { params })
    return data
  },
  async get(id) {
    const data = await api.get(`/api/demo-users/${id}`)
    return data
  },
  async remove(id) {
    const data = await api.delete(`/api/demo-users/${id}`)
    return data
  },
  async convert(id) {
    const data = await api.post(`/api/demo-users/${id}/convert`)
    return data
  },
}
