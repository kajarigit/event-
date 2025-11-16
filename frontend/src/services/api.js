import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Don't intercept login/register/refresh-token requests
    const skipInterceptorUrls = ['/auth/login', '/auth/register', '/auth/refresh-token', '/auth/me'];
    const shouldSkip = skipInterceptorUrls.some(url => originalRequest.url?.includes(url));
    
    if (shouldSkip) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          // Clear tokens and reject with better error message
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          const authError = new Error('Session expired. Please login again.');
          authError.response = error.response;
          throw authError;
        }

        const response = await axios.post(`${API_URL}/auth/refresh-token`, {
          refreshToken,
        });

        const { accessToken } = response.data.data;
        localStorage.setItem('accessToken', accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Only clear tokens, don't redirect (let React Router handle it)
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/update-profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
};

// Student API
export const studentApi = {
  getEvents: (params) => api.get('/student/events', { params }),
  getStalls: (params) => api.get('/student/stalls', { params }),
  getQRCode: (eventId) => api.get(`/student/qrcode/${eventId}`),
  submitFeedback: (data) => api.post('/student/feedback', data),
  castVote: (data) => api.post('/student/vote', data),
  getMyVotes: (eventId) => api.get(`/student/votes/${eventId}`),
  getMyFeedbacks: (eventId) => api.get(`/student/feedbacks/${eventId}`),
  getAttendance: (eventId) => api.get(`/student/attendance/${eventId}`),
  getStatus: (eventId) => api.get(`/student/status/${eventId}`),
};

// Volunteer API
export const volunteerApi = {
  scanStudent: (qrToken) => api.post('/scan/student', { qrToken }),
  scanStall: (data) => api.post('/scan/stall', data),
  getScanLogs: (params) => api.get('/scan/logs', { params }),
  getRecentScans: (params) => api.get('/scan/logs', { params: { ...params, limit: 20 } }),
  flagScanError: (id, data) => api.put(`/scan/logs/${id}/flag`, data),
};

// Scan API (shared)
export const scanApi = {
  getMyRecentScans: (params) => api.get('/scan/my-recent', { params }),
};

// Admin API
export const adminApi = {
  // Events
  getEvents: (params) => api.get('/admin/events', { params }),
  createEvent: (data) => api.post('/admin/events', data),
  updateEvent: (id, data) => api.put(`/admin/events/${id}`, data),
  deleteEvent: (id) => api.delete(`/admin/events/${id}`),
  toggleEventActive: (id) => api.put(`/admin/events/${id}/toggle-active`),
  manuallyStartEvent: (id) => api.patch(`/admin/events/${id}/start`),
  manuallyEndEvent: (id) => api.patch(`/admin/events/${id}/end`),

  // Stalls
  getStalls: (params) => api.get('/admin/stalls', { params }),
  createStall: (data) => api.post('/admin/stalls', data),
  updateStall: (id, data) => api.put(`/admin/stalls/${id}`, data),
  deleteStall: (id) => api.delete(`/admin/stalls/${id}`),
  getStallQRCode: (id) => api.get(`/admin/stalls/${id}/qrcode`),
  bulkUploadStalls: (formData) =>
    api.post('/admin/stalls/bulk', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Users
  getUsers: (params) => api.get('/admin/users', { params }),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  bulkUploadUsers: (formData) =>
    api.post('/admin/users/bulk', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Analytics
  getTopStudents: (params) => api.get('/admin/analytics/top-students', { params }),
  getMostReviewers: (params) => api.get('/admin/analytics/most-reviewers', { params }),
  getTopStalls: (params) => api.get('/admin/analytics/top-stalls', { params }),
  getDepartmentStats: (params) => api.get('/admin/analytics/department-stats', { params }),
  getEventOverview: (params) => api.get('/admin/analytics/event-overview', { params }),

  // Reports
  exportAttendance: (params) => api.get('/admin/reports/attendance', { params, responseType: 'blob' }),
  exportFeedbacks: (params) => api.get('/admin/reports/feedbacks', { params, responseType: 'blob' }),
  exportVotes: (params) => api.get('/admin/reports/votes', { params, responseType: 'blob' }),

  // Manual corrections
  updateAttendance: (id, data) => api.put(`/admin/attendances/${id}`, data),
  deleteAttendance: (id) => api.delete(`/admin/attendances/${id}`),
};
