import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';

export const adminAPI = {
  // Dashboard
  async getDashboard() {
    const response = await axios.get(`${API_BASE_URL}/admin/dashboard`);
    return response.data;
  },

  // Users
  async getUsers(params?: { page?: number; limit?: number; role?: string; search?: string }) {
    const response = await axios.get(`${API_BASE_URL}/admin/users`, { params });
    return response.data;
  },

  async createUser(data: { name: string; email: string; password: string; role: string; icbtNumber?: string; programme?: string }) {
    const response = await axios.post(`${API_BASE_URL}/admin/users`, data);
    return response.data;
  },

  async updateUser(id: string, data: { role?: string; isActive?: boolean; name?: string }) {
    const response = await axios.put(`${API_BASE_URL}/admin/users/${id}`, data);
    return response.data;
  },

  async deleteUser(id: string) {
    const response = await axios.delete(`${API_BASE_URL}/admin/users/${id}`);
    return response.data;
  },

  // Analytics
  async getAnalytics(timeRange: string = '7d') {
    const response = await axios.get(`${API_BASE_URL}/admin/analytics`, { params: { timeRange } });
    return response.data;
  },

  // AI Monitoring
  async getAIMonitoring() {
    const response = await axios.get(`${API_BASE_URL}/admin/ai-monitoring`);
    return response.data;
  },

  // Datasets
  async getDatasets() {
    const response = await axios.get(`${API_BASE_URL}/admin/datasets`);
    return response.data;
  },

  // Research
  async getResearch() {
    const response = await axios.get(`${API_BASE_URL}/admin/research`);
    return response.data;
  },

  // Notifications
  async getNotifications() {
    const response = await axios.get(`${API_BASE_URL}/admin/notifications`);
    return response.data;
  },

  async createNotification(data: { title: string; message: string; type?: string }) {
    const response = await axios.post(`${API_BASE_URL}/admin/notifications`, data);
    return response.data;
  },

  // Privacy
  async getPrivacy() {
    const response = await axios.get(`${API_BASE_URL}/admin/privacy`);
    return response.data;
  },

  async createDeletionRequest(data: { userId: string; reason: string }) {
    const response = await axios.post(`${API_BASE_URL}/admin/privacy/delete-request`, data);
    return response.data;
  },

  // Settings
  async getSettings() {
    const response = await axios.get(`${API_BASE_URL}/admin/settings`);
    return response.data;
  },

  async updateSettings(section: string, settings: Record<string, unknown>) {
    const response = await axios.put(`${API_BASE_URL}/admin/settings`, { section, settings });
    return response.data;
  },

  // System Health
  async getSystemHealth() {
    const response = await axios.get(`${API_BASE_URL}/admin/system`);
    return response.data;
  },

  // Export
  async exportData() {
    const response = await axios.get(`${API_BASE_URL}/admin/export`, {
      responseType: 'blob',
    });
    return response;
  },
};

export default adminAPI;
