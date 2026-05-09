import { api } from './api';

export const reportsApi = {
  getSales: (params) => api.get('/api/reports/sales', { params }),
  getLeads: (params) => api.get('/api/reports/leads', { params }),
  getFinance: (params) => api.get('/api/reports/finance', { params }),
  getPerformance: (params) => api.get('/api/reports/performance', { params }),
  getTickets: (params) => api.get('/api/reports/tickets', { params }),
};
