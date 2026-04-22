import { api } from './api'

export const demoUsersApi = {
  list: async (params) => {
    const { data } = await api.get('/api/demo-users', { params })
    return data.data
  },
  get: async (id) => {
    const { data } = await api.get(`/api/demo-users/${id}`)
    return data.data
  },
  remove: async (id) => {
    const { data } = await api.delete(`/api/demo-users/${id}`)
    return data.data
  },
  convert: async (id) => {
    const { data } = await api.post(`/api/demo-users/${id}/convert`)
    return data.data
  }
}
