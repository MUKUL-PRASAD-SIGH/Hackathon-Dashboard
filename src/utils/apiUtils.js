// API utility functions for consistent error handling
import { getApiBaseUrl } from '../config/api.js';
import { DebugLogger, debugApiCall } from './debugUtils.js';

const apiLogger = new DebugLogger('ApiUtils');

// Enhanced fetch with error handling and debugging
export const apiCall = async (endpoint, options = {}) => {
  return debugApiCall(apiLogger, endpoint, options, async () => {
    let apiBaseUrl;
    try {
      apiBaseUrl = await getApiBaseUrl();
      apiLogger.debug('API Base URL resolved', { apiBaseUrl });
    } catch (urlError) {
      apiLogger.error('Failed to get API base URL', { error: urlError });
      throw new Error(`Backend connection failed: ${urlError.message}`);
    }
    
    const url = `${apiBaseUrl}${endpoint}`;
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const finalOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    };

    apiLogger.debug('Making fetch request', {
      url,
      method: finalOptions.method || 'GET',
      headers: finalOptions.headers,
      bodyLength: finalOptions.body ? finalOptions.body.length : 0
    });
    
    console.log('🔍 EXACT URL BEING CALLED:', url);
    console.log('🔍 METHOD:', finalOptions.method || 'GET');
    console.log('🔍 BODY:', finalOptions.body);

    let response;
    try {
      response = await fetch(url, finalOptions);
      apiLogger.debug('Fetch response received', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        ok: response.ok
      });
    } catch (fetchError) {
      apiLogger.error('Fetch request failed', {
        error: fetchError,
        url,
        method: finalOptions.method || 'GET'
      });
      
      // Handle specific fetch errors
      if (fetchError.name === 'TypeError') {
        throw new Error(`Network error: Cannot connect to ${url}. Is the backend server running on port 5000?`);
      }
      if (fetchError.name === 'AbortError') {
        throw new Error('Request timeout: Server took too long to respond.');
      }
      throw new Error(`Request failed: ${fetchError.message}`);
    }
    
    let data;
    const contentType = response.headers.get('content-type');
    apiLogger.debug('Processing response', { contentType });
    
    if (contentType && contentType.includes('application/json')) {
      try {
        const responseText = await response.text();
        apiLogger.debug('Raw response text', { 
          length: responseText.length,
          preview: responseText.substring(0, 200)
        });
        
        data = JSON.parse(responseText);
        apiLogger.debug('Parsed JSON response', { data });
      } catch (parseError) {
        apiLogger.error('JSON parsing failed', {
          error: parseError,
          contentType,
          responseStatus: response.status
        });
        throw new Error(`Invalid JSON response from server. Status: ${response.status}`);
      }
    } else {
      // Handle non-JSON responses (like HTML error pages)
      const text = await response.text();
      apiLogger.error('Non-JSON response received', {
        contentType,
        status: response.status,
        textPreview: text.substring(0, 500),
        isHtml: text.includes('<!DOCTYPE') || text.includes('<html>')
      });
      
      if (text.includes('<!DOCTYPE') || text.includes('<html>')) {
        throw new Error(`Server returned HTML instead of JSON. This usually means:
1. Backend server is not running on port 5000
2. Wrong API endpoint: ${url}
3. CORS or routing issue

Received: ${text.substring(0, 100)}...`);
      }
      
      throw new Error(`Server returned unexpected content type: ${contentType}`);
    }

    if (!response.ok) {
      const errorMessage = data?.error?.message || data?.message || `HTTP ${response.status}: ${response.statusText}`;
      const errorCode = data?.error?.code || 'UNKNOWN_ERROR';
      
      apiLogger.error('API returned error response', {
        status: response.status,
        errorCode,
        errorMessage,
        fullResponse: data
      });
      
      const error = new Error(errorMessage);
      error.code = errorCode;
      error.status = response.status;
      error.response = data;
      throw error;
    }

    apiLogger.info('API call successful', {
      endpoint,
      method: finalOptions.method || 'GET',
      status: response.status
    });
    
    return data;
  });
};

// Specific API functions with debugging
export const sendOtp = (email) => {
  apiLogger.info('Sending OTP', { email });
  return apiCall('/send-otp', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
};

export const verifyOtp = (email, otp) => {
  return apiCall('/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  });
};

export const resendOtp = (email) => {
  return apiCall('/resend-otp', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
};

export const registerUser = (userData) => {
  return apiCall('/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
};

export const loginUser = (credentials) => {
  return apiCall('/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
};

export const checkHealth = () => {
  return apiCall('/health', {
    method: 'GET',
  });
};

// Connection test utility
export const testConnection = async () => {
  try {
    await checkHealth();
    return { connected: true, message: 'Backend connection successful' };
  } catch (error) {
    return { 
      connected: false, 
      message: error.message,
      suggestion: 'Make sure the backend server is running on port 5000'
    };
  }
};