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

// User/Auth Entity
export const User = {
  async me() {
    const sessionToken = localStorage.getItem('pococlass_session');
    if (!sessionToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch('http://localhost:8000/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${sessionToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to get user info');
    }

    const user = await response.json();
    return {
      full_name: user.username,
      email: `${user.username}@paperless`,
      role: user.role,
      id: user.id
    };
  },
  
  async getCurrentUser() {
    return this.me();
  },
  
  async logout() {
    const sessionToken = localStorage.getItem('pococlass_session');
    if (sessionToken) {
      try {
        await fetch('http://localhost:8000/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionToken}`
          }
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    
    localStorage.removeItem('pococlass_session');
    localStorage.removeItem('pococlass_user');
    window.location.href = '/login';
  }
};
