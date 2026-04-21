import { api } from './api.js'

export const followupsApi = {
  async create(payload) {
    const data = await api.post('/api/followups', payload)
    return data
  },
}

