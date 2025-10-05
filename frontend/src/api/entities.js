import { apiClient } from './apiClient';

// Rule Entity
export const Rule = {
  async list(orderBy = '-created_date') {
    const rules = await apiClient.get(`/rules?order_by=${orderBy}`);
    return rules;
  },

  async get(id) {
    return await apiClient.get(`/rules/${id}`);
  },

  async create(ruleData) {
    return await apiClient.post('/rules', ruleData);
  },

  async update(id, ruleData) {
    return await apiClient.put(`/rules/${id}`, ruleData);
  },

  async delete(id) {
    return await apiClient.delete(`/rules/${id}`);
  },

  async test(id, documentId) {
    return await apiClient.post(`/rules/${id}/test`, { documentId });
  },

  async execute(id, documentIds) {
    return await apiClient.post(`/rules/${id}/execute`, { documentIds });
  }
};

// Log Entity
export const Log = {
  async list(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return await apiClient.get(`/logs?${queryParams}`);
  },

  async get(id) {
    return await apiClient.get(`/logs/${id}`);
  },

  async clear() {
    return await apiClient.delete('/logs');
  }
};

// DeletedRule Entity
export const DeletedRule = {
  async list() {
    return await apiClient.get('/deleted-rules');
  },

  async restore(id) {
    return await apiClient.post(`/deleted-rules/${id}/restore`);
  },

  async permanentDelete(id) {
    return await apiClient.delete(`/deleted-rules/${id}`);
  }
};

// Auth (stub for now, can be implemented later)
export const User = {
  async getCurrentUser() {
    return { name: 'User', email: 'user@example.com' };
  },
  
  async logout() {
    window.location.href = '/logout';
  }
};
