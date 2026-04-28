import { api } from './api.js'


export const supportApi = {
  async list(params = {}) {
    const data = await api.get('/api/support', { params })
    return data
  },
  async get(id) {
    const data = await api.get(`/api/support/${id}`)
    return data
  },
  async create(payload) {
    const data = await api.post('/api/support', payload)
    return data
  },
  async update(id, payload) {
    const data = await api.patch(`/api/support/${id}`, payload)
    return data
  },
  async remove(id) {
    const data = await api.delete(`/api/support/${id}`)
    return data
  },
  async escalate(id, reason) {
    const data = await api.patch(`/api/support/${id}/escalate`, { reason })
    return data
  },
  async addNote(id, text) {
    const data = await api.patch(`/api/support/${id}/note`, { text })
    return data
  },
  async reply(id, text) {
    const data = await api.post(`/api/support/${id}/reply`, { text })
    return data
  },
}

export const workflowApi = {
  async convertToDeal(leadId, dealData) {
    const data = await api.post('/api/workflow/convert-to-deal', { leadId, dealData })
    return data
  },
  async convertToCustomer(sourceId, sourceType, customerData) {
    const data = await api.post('/api/workflow/convert-to-customer', { sourceId, sourceType, customerData })
    return data
  },
  async createSupportTicket(ticketData) {
    const data = await api.post('/api/workflow/create-support-ticket', ticketData)
    return data
  },
  async assignLead(leadId, userId) {
    const data = await api.post('/api/workflow/assign-lead', { leadId, userId })
    return data
  },
  async updateLeadStatus(leadId, status) {
    const data = await api.patch('/api/workflow/update-lead-status', { leadId, status })
    return data
  },
}
