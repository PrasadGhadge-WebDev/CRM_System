import { api } from './api'

export const demoApi = {
  async register(payload) {
    const data = await api.post('/api/demo/register', payload)
    return data
  },
  async listUsers(params = {}) {
    const data = await api.get('/api/demo/users', { params })
    return data
  },
}
