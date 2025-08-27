// API configuration
const isDevelopment = process.env.NODE_ENV === 'development';
const API_HOST = isDevelopment ? 'localhost' : 'hackathon-dashboard-backend-md49.onrender.com';
const API_PORT = isDevelopment ? 5000 : 443;
const API_PROTOCOL = isDevelopment ? 'http' : 'https';
const API_BASE_URL = isDevelopment 
  ? `${API_PROTOCOL}://${API_HOST}:${API_PORT}/api`
  : `${API_PROTOCOL}://${API_HOST}/api`;

// Test if backend is running
const testBackendConnection = async () => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const healthUrl = isDevelopment 
      ? `${API_PROTOCOL}://${API_HOST}:${API_PORT}/health`
      : `${API_PROTOCOL}://${API_HOST}/health`;
    
    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.error('Backend connection test failed:', error.message);
    return false;
  }
};

// Get API base URL with connection check
export const getApiBaseUrl = async () => {
  const isConnected = await testBackendConnection();
  
  if (!isConnected) {
    const errorMsg = isDevelopment 
      ? `Backend server not responding on port ${API_PORT}. Please start the server with: cd server && npm start`
      : `Backend server not responding at ${API_HOST}. Please check if the server is deployed and MongoDB is connected.`;
    throw new Error(errorMsg);
  }
  
  console.log(`✅ Backend connected at ${API_BASE_URL}`);
  return API_BASE_URL;
};

// Direct API URL (use when you know backend is running)
export const getDirectApiUrl = () => API_BASE_URL;

export { API_HOST, API_PORT, API_BASE_URL };