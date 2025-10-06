const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:8000'
  : `${window.location.protocol}//${window.location.hostname}:8000`;

export default API_BASE_URL;
