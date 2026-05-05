import { api } from './api';

export const attendanceApi = {
  getTodayStatus: async () => {
    const response = await api.get('/attendance/today');
    return response.data;
  },
  
  checkIn: async () => {
    const response = await api.post('/attendance/check-in');
    return response.data;
  },
  
  checkOut: async () => {
    const response = await api.post('/attendance/check-out');
    return response.data;
  },
  
  getMonthlyReport: async (month, year) => {
    const response = await api.get('/attendance/report', {
      params: { month, year }
    });
    return response.data;
  }
};
