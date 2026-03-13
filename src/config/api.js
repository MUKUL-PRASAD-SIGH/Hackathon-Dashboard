// API URL - uses CRA proxy in dev, absolute URL in production
const getApiUrl = () => {
  // If explicitly set via env var (production), use that
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  // In development: use relative path — CRA proxy forwards /api/* to port 10000
  // This way the frontend port (3000, 5000, etc.) never matters
  const isLocalhost = window.location.hostname === 'localhost';
  return isLocalhost
    ? '/api'
    : 'https://hackathon-dashboard-backend-md49.onrender.com/api';
};

export const getApiBaseUrl = () => getApiUrl();
export const getDirectApiUrl = () => getApiUrl();
export const API_BASE_URL = getApiUrl();
