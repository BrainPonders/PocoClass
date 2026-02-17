import API_BASE_URL from '../config/api';
const API_AUTH_URL = `${API_BASE_URL}/api`;

export const auth = {
  async checkSetupStatus() {
    try {
      const response = await fetch(`${API_AUTH_URL}/auth/status`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error checking setup status:', error);
      return { setupCompleted: false };
    }
  },

  getSessionToken() {
    return localStorage.getItem('pococlass_user') ? 'cookie' : null;
  },

  getCurrentUser() {
    const user = localStorage.getItem('pococlass_user');
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated() {
    return !!this.getSessionToken();
  },

  isAdmin() {
    const user = this.getCurrentUser();
    return user && user.role === 'admin';
  },

  async validateSession() {
    try {
      const response = await fetch(`${API_AUTH_URL}/auth/me`, {
        credentials: 'include'
      });

      if (!response.ok) {
        this.logout();
        return false;
      }

      const user = await response.json();
      localStorage.setItem('pococlass_user', JSON.stringify(user));
      return true;
    } catch (error) {
      console.error('Error validating session:', error);
      this.logout();
      return false;
    }
  },

  async logout() {
    try {
      await fetch(`${API_AUTH_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Error during logout:', error);
    }

    localStorage.removeItem('pococlass_session');
    localStorage.removeItem('pococlass_user');
    window.location.href = '/login';
  }
};
