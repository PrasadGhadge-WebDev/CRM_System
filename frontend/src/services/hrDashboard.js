import { api } from './api'

export const hrDashboardApi = {
  get: async () => {
    const response = await api.get('/api/hr-dashboard')
    return response.data || response
  }
}
