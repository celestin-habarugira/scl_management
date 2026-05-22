import axios from 'axios';
import { API_ENDPOINT } from '../config';

const api = axios.create({ baseURL: API_ENDPOINT });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  login: (data) => api.post('/employees/login', data),
  register: (data) => api.post('/employees/register', data),
  getProfile: () => api.get('/employees/profile'),
};

export const employeeAPI = {
  getAll: () => api.get('/employees'),
  getById: (id) => api.get(`/employees/${id}`),
  update: (id, data) => api.put(`/employees/${id}`, data),
  remove: (id) => api.delete(`/employees/${id}`),
};

export const studentAPI = {
  getAll: (params) => api.get('/students', { params }),
  getById: (id) => api.get(`/students/${id}`),
  create: (data) => api.post('/students', data),
  update: (id, data) => api.put(`/students/${id}`, data),
  remove: (id) => api.delete(`/students/${id}`),
};

export const attendanceAPI = {
  getAll: (params) => api.get('/attendance', { params }),
  create: (data) => api.post('/attendance', data),
  createBulk: (data) => api.post('/attendance/bulk', data),
  getStats: (params) => api.get('/attendance/stats', { params }),
};

export const performanceAPI = {
  getAll: (params) => api.get('/performance', { params }),
  create: (data) => api.post('/performance', data),
  update: (id, data) => api.put(`/performance/${id}`, data),
  remove: (id) => api.delete(`/performance/${id}`),
  getStudentStats: (studentId, year) => api.get(`/performance/student/${studentId}`, { params: { year } }),
};

export const chatAPI = {
  getConversations: () => api.get('/chat/conversations'),
  getMessages: (roomId, params) => api.get(`/chat/messages/${roomId}`, { params }),
  getOrCreateDirect: (participantId) => api.post('/chat/direct', { participantId }),
  createGroup: (data) => api.post('/chat/group', data),
  createAnnouncement: (data) => api.post('/chat/announcement', data),
  sendMessage: (roomId, content, messageType, replyTo) => api.post('/chat/messages', { roomId, content, messageType, replyTo }),
  uploadFile: (formData, config) => api.post('/chat/upload', formData, config),
  markAsRead: (roomId) => api.put(`/chat/read/${roomId}`),
  getAvailableUsers: () => api.get('/chat/users'),
  reactToMessage: (messageId, emoji) => api.post(`/chat/react/${messageId}`, { emoji }),
  editMessage: (messageId, content) => api.put(`/chat/edit/${messageId}`, { content }),
  deleteMessage: (messageId) => api.delete(`/chat/delete/${messageId}`),
  searchMessages: (roomId, q) => api.get(`/chat/search/${roomId}`, { params: { q } }),
};

export default api;
