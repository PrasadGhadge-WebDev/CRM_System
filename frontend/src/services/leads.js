import { api } from './api.js'

const cleanId = (id) => String(id).replace(/:\d+$/, '')

export const leadsApi = {
  async list(params = {}) {
    const data = await api.get('/api/leads', { params })
    return data
  },

  async exportExcel(params = {}) {
    const blob = await api.get('/api/leads/export-excel', {
      params,
      responseType: 'blob',
      headers: { Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    })
    return blob
  },
  async get(id) {
    const data = await api.get(`/api/leads/${id}`)
    return data
  },
  async create(payload) {
    const data = await api.post('/api/leads', payload)
    return data
  },

  async update(id, payload) {
    const data = await api.put(`/api/leads/${cleanId(id)}`, payload)
    return data
  },
  async updateFollowup(id, payload) {
    const data = await api.patch(`/api/leads/${cleanId(id)}/followup`, payload)
    return data
  },
  async updateStatus(id, status) {
    const data = await api.patch(`/api/leads/${cleanId(id)}/status`, { status })
    return data
  },
  async delete(id, hard = false) {
    const data = await api.delete(`/api/leads/${cleanId(id)}${hard ? '?hard=true' : ''}`)
    return data
  },
  async listNotes(leadId) {
    const data = await api.get(`/api/leads/${cleanId(leadId)}/notes`)
    return data
  },
  async addNote(leadId, payload) {
    const data = await api.post(`/api/leads/${cleanId(leadId)}/notes`, payload)
    return data
  },
  async removeNote(leadId, noteId) {
    const data = await api.delete(`/api/leads/${cleanId(leadId)}/notes/${cleanId(noteId)}`)
    return data
  },
  async bulkUpdate(payload) {
    const data = await api.patch('/api/leads/bulk-update', payload)
    return data
  },
  async bulkDelete(ids, hard = false) {
    const data = await api.post('/api/leads/bulk-delete', { ids, hard })
    return data
  },
  async convertToDeal(id, payload) {
    const data = await api.post(`/api/leads/${cleanId(id)}/convert-to-deal`, payload)
    return data
  },
  // Aliases for compatibility
  remove(id, hard) { return this.delete(id, hard); },
  bulkRemove(ids, hard) { return this.bulkDelete(ids, hard); },
}
