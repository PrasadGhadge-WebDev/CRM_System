import { api } from './api'

function normalizeRolesList(payload) {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== 'object') return []

  if (Array.isArray(payload.items)) return payload.items
  if (Array.isArray(payload.roles)) return payload.roles
  if (Array.isArray(payload.data)) return payload.data

  return []
}

export const rolesApi = {
  list: async () => normalizeRolesList(await api.get('/api/roles')),
  create: (data) => api.post('/api/roles', data),
  update: (id, data) => api.put(`/api/roles/${id}`, data),
  remove: (id) => api.delete(`/api/roles/${id}`),
}
