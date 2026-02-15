/**
 * @file api.js
 * @description API base URL configuration. Uses localhost:8000 for local development
 * and the current window origin for production/deployed environments.
 */

const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:8000'
  : `${window.location.protocol}//${window.location.host}`;

export default API_BASE_URL;
