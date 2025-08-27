// API configuration
const API_HOST = 'localhost';
const API_PORT = 5000;
const API_BASE_URL = `http://${API_HOST}:${API_PORT}/api`;

// Test if backend is running
const testBackendConnection = async () => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(`http://${API_HOST}:${API_PORT}/health`, {
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
    throw new Error(`Backend server not responding on port ${API_PORT}. Please start the server with: cd server && npm start`);
  }
  
  console.log(`✅ Backend connected on port ${API_PORT}`);
  return API_BASE_URL;
};

// Direct API URL (use when you know backend is running)
export const getDirectApiUrl = () => API_BASE_URL;

export { API_HOST, API_PORT, API_BASE_URL };