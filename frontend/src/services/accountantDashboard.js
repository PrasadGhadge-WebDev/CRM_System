import { api } from './api'

export const accountantDashboardApi = {
  get: () => api.get('/api/accountant-dashboard'),
}
