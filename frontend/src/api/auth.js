/**
 * Authentication utilities for POCOclass
 */

import API_BASE_URL from '../config/api';
const API_AUTH_URL = `${API_BASE_URL}/api`;

export const auth = {
  /**
   * Check if setup is completed
   */
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

  /**
   * Get current session token from localStorage
   */
  getSessionToken() {
    return localStorage.getItem('pococlass_session');
  },

  /**
   * Get current user from localStorage
   */
  getCurrentUser() {
    const user = localStorage.getItem('pococlass_user');
    return user ? JSON.parse(user) : null;
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.getSessionToken();
  },

  /**
   * Check if current user is admin
   */
  isAdmin() {
    const user = this.getCurrentUser();
    return user && user.role === 'admin';
  },

  /**
   * Validate current session with backend
   */
  async validateSession() {
    const token = this.getSessionToken();
    if (!token) return false;

    try {
      const response = await fetch(`${API_AUTH_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
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

  /**
   * Logout user
   */
  async logout() {
    const token = this.getSessionToken();
    
    if (token) {
      try {
        await fetch(`${API_AUTH_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (error) {
        console.error('Error during logout:', error);
      }
    }

    localStorage.removeItem('pococlass_session');
    localStorage.removeItem('pococlass_user');
    window.location.href = '/login';
  }
};
