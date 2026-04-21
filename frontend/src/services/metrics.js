import { api } from './api.js'

export const metricsApi = {
  async get(params = {}) {
    const data = await api.get('/api/metrics', { params })
    return data
  },
  async getTeamPerformance(params = {}) {
    const data = await api.get('/api/metrics/team', { params })
    return data
  },
}

