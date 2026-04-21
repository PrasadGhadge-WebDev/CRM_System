import { api } from './api.js'

export const notesApi = {
  async list({ related_to, related_type, page = 1, limit = 20 } = {}) {
    const data = await api.get('/api/notes', {
      params: { related_to, related_type, page, limit }
    })
    return data
  },
  async create(payload) {
    const data = await api.post('/api/notes', payload)
    return data
  },
  async remove(id) {
    const data = await api.delete(`/api/notes/${id}`)
    return data
  }
}
