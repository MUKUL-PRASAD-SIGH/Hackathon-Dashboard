// Direct API URL detection - NO MORE LOCALHOST ISSUES!
const getApiUrl = () => {
  const isLocalhost = window.location.hostname === 'localhost';
  const apiUrl = isLocalhost 
    ? 'http://localhost:5000/api'
    : 'https://hackathon-dashboard-backend-md49.onrender.com/api';
    
  console.log('🔧 API URL:', apiUrl);
  console.log('🌐 Hostname:', window.location.hostname);
  return apiUrl;
};

// Export the direct function
export const getApiBaseUrl = () => {
  return getApiUrl();
};

// Legacy exports for compatibility
export const getDirectApiUrl = () => getApiUrl();
export const API_BASE_URL = getApiUrl();