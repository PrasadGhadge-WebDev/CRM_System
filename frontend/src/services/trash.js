import { api } from './api'

export const trashApi = {
  list: (params) => api.get('/api/trash', { params }),
  restore: (id) => api.post(`/api/trash/${id}/restore`),
  remove: (id) => api.delete(`/api/trash/${id}`),
}
