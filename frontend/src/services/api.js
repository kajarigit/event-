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
  
  // Scan Analytics for Volunteers
  getScanAnalytics: (params) => api.get('/scan/analytics', { params }),
  getDetailedScanLogs: (params) => api.get('/scan/analytics/detailed', { params }),
  getRealTimeActivity: (params) => api.get('/scan/analytics/real-time', { params }),
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
  refreshStallStats: () => api.post('/admin/stalls/refresh-stats'),

  // Users (Students/Admins only)
  getUsers: (params) => api.get('/admin/users', { params }),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  bulkUploadUsers: (formData) =>
    api.post('/admin/users/bulk', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Volunteers (Separate table)
  getVolunteers: (params) => api.get('/admin/volunteers', { params }),
  createVolunteer: (data) => api.post('/admin/volunteers', data),
  getVolunteer: (id) => api.get(`/admin/volunteers/${id}`),
  updateVolunteer: (id, data) => api.put(`/admin/volunteers/${id}`, data),
  deleteVolunteer: (id) => api.delete(`/admin/volunteers/${id}`),
  bulkUploadVolunteers: (formData) =>
    api.post('/admin/volunteers/bulk', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getVolunteerCredentials: () => api.get('/admin/volunteers/credentials'),
  downloadVolunteerCredentials: () => api.get('/admin/volunteers/download-credentials', {
    responseType: 'blob'
  }),
  getVolunteerScanAnalytics: (params) => api.get('/admin/volunteers/scan-analytics', { params }),

  // Analytics - Legacy
  getDetailedAttendance: (params) => api.get('/admin/analytics/detailed-attendance', { params }),
  getTopStudents: (params) => api.get('/admin/analytics/top-students', { params }),
  getMostReviewers: (params) => api.get('/admin/analytics/most-reviewers', { params }),
  getTopStalls: (params) => api.get('/admin/analytics/top-stalls', { params }),
  getDepartmentStats: (params) => api.get('/admin/analytics/department-stats', { params }),
  getEventOverview: (params) => api.get('/admin/analytics/event-overview', { params }),
  exportComprehensiveAnalytics: (params) => api.get('/admin/analytics/export-comprehensive', { params, responseType: 'blob' }),

  // Analytics - New Comprehensive System
  getComprehensiveAttendance: (params) => api.get('/admin/analytics/attendance-comprehensive', { params }),
  getStudentHistory: (studentId, params) => api.get(`/admin/analytics/student-history/${studentId}`, { params }),
  getDepartmentAttendanceStats: (params) => api.get('/admin/analytics/department-attendance', { params }),
  
  // Simple Attendance Records (Direct from table)
  getEventAttendanceRecords: (eventId, params) => api.get(`/admin/attendance/processed/${eventId}`, { params }),
  getStudentAttendanceRecords: (studentId, params) => api.get(`/admin/attendance/student/${studentId}`, { params }),

  // New Comprehensive Analytics
  getComprehensiveAttendance: (params) => api.get('/admin/analytics/attendance-comprehensive', { params }),
  getStudentAttendanceHistory: (studentId, params) => api.get(`/admin/analytics/student-history/${studentId}`, { params }),
  getDepartmentAttendanceStats: (params) => api.get('/admin/analytics/department-attendance', { params }),
  
  // Feedback Analytics
  getTopFeedbackGivers: (eventId, params) => api.get(`/admin/analytics/top-feedback-givers/${eventId}`, { params }),
  getFeedbackOverview: (params) => api.get('/admin/analytics/feedback-overview', { params }),
  
  // Stall Ranking Analytics
  getTopStallsByDepartment: (eventId, params) => api.get(`/admin/analytics/top-stalls-by-department/${eventId}`, { params }),
  getVotingOverview: (params) => api.get('/admin/analytics/voting-overview', { params }),
  testVotingSystem: () => api.get('/admin/analytics/test-voting'),
  
  // Department Attendance Analytics
  getDepartmentAttendanceStats: (eventId, params) => api.get(`/admin/analytics/department-attendance-stats/${eventId}`, { params }),
  getDepartmentAttendanceDetails: (eventId, department, params) => api.get(`/admin/analytics/department-attendance-details/${eventId}/${department}`, { params }),
  getAllEventsAttendanceSummary: (params) => api.get('/admin/analytics/all-events-attendance-summary', { params }),
  
  // Scan Log Analytics
  getScanLogAnalytics: (params) => api.get('/admin/analytics/scan-logs', { params }),
  getDetailedScanLogs: (params) => api.get('/admin/analytics/scan-logs-detailed', { params }),
  getVolunteerPerformance: (params) => api.get('/admin/analytics/volunteer-performance', { params }),
  getRealTimeScans: (params) => api.get('/admin/analytics/real-time-scans', { params }),
  exportScanLogs: (params) => api.get('/admin/analytics/export-scan-logs', { params, responseType: 'blob' }),

  // Detailed 5-Category Feedback Analytics
  getDetailedFeedbackRankings: (params) => api.get('/admin/analytics/detailed-feedback-rankings', { params }),
  getStallFeedbackDetails: (stallId, params) => api.get(`/admin/analytics/stall-feedback-details/${stallId}`, { params }),
  getFeedbackAnalyticsOverview: (params) => api.get('/admin/analytics/feedback-analytics-overview', { params }),

  // Reports
  exportAttendance: (params) => api.get('/admin/reports/attendance', { params, responseType: 'blob' }),
  exportFeedbacks: (params) => api.get('/admin/reports/feedbacks', { params, responseType: 'blob' }),
  exportVotes: (params) => api.get('/admin/reports/votes', { params, responseType: 'blob' }),

  // Manual corrections
  updateAttendance: (id, data) => api.put(`/admin/attendances/${id}`, data),
  deleteAttendance: (id) => api.delete(`/admin/attendances/${id}`),
};

// Stall Owner API
export const stallOwnerApi = {
  login: (credentials) => api.post('/stall-owner/login', credentials),
  getMyStall: () => api.get('/stall-owner/my-stall'),
  getDepartmentLeaderboard: () => api.get('/stall-owner/department-leaderboard'),
  getLiveVotes: (params) => api.get('/stall-owner/live-votes', { params }),
  getLiveFeedbacks: (params) => api.get('/stall-owner/live-feedbacks', { params }),
  getCompetitionStats: () => api.get('/stall-owner/competition-stats'),
  getRecentActivity: (params) => api.get('/stall-owner/recent-activity', { params }),
};

