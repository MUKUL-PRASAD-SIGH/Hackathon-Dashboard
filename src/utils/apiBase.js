// Shared API URL helpers (single source of truth)
export const normalizeApiUrl = (url) => {
  if (!url) return url;
  const trimmed = url.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

export const getApiUrl = () => {
  if (process.env.REACT_APP_API_URL) return normalizeApiUrl(process.env.REACT_APP_API_URL);
  const isLocalhost = window.location.hostname === 'localhost';
  return isLocalhost
    ? '/api'
    : 'https://hackathon-dashboard-backend-md49.onrender.com/api';
};

export const getApiBase = () => {
  const apiUrl = getApiUrl();
  if (apiUrl === '/api') return 'http://localhost:10000';
  return apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : apiUrl;
};
