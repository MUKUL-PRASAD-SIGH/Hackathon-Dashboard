// API utility functions for consistent error handling
import { DebugLogger, debugApiCall } from './debugUtils.js';
import { getApiUrl } from './apiBase.js';

const apiLogger = new DebugLogger('ApiUtils');

// Enhanced fetch with error handling and debugging
export const apiCall = async (endpoint, options = {}) => {
  return debugApiCall(apiLogger, endpoint, options, async () => {
    const apiBaseUrl = getApiUrl();
    apiLogger.debug('API Base URL resolved', { apiBaseUrl });
    
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

    const method = (finalOptions.method || 'GET').toUpperCase();
    const rateLimitKey = `rateLimit:${endpoint}:${method}`;
    const now = Date.now();
    const cooldownUntil = Number(sessionStorage.getItem(rateLimitKey) || 0);
    if (cooldownUntil && now < cooldownUntil) {
      const waitSeconds = Math.ceil((cooldownUntil - now) / 1000);
      throw new Error(`Rate limited. Please wait ${waitSeconds}s and try again.`);
    }

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
        throw new Error(`Network error: Cannot connect to ${url}. Is the backend server running on port 10000?`);
      }
      if (fetchError.name === 'AbortError') {
        throw new Error('Request timeout: Server took too long to respond.');
      }
      throw new Error(`Request failed: ${fetchError.message}`);
    }
    
    if (response.status === 429) {
      const retryAfterRaw = response.headers.get('retry-after');
      const retryAfterSeconds = retryAfterRaw ? Number(retryAfterRaw) : 15;
      const waitMs = Math.max(5, retryAfterSeconds) * 1000;
      sessionStorage.setItem(rateLimitKey, String(Date.now() + waitMs));

      if (method === 'GET') {
        apiLogger.warn('Rate limited, retrying after backoff', { retryAfterSeconds });
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        return apiCall(endpoint, options);
      }

      throw new Error(`Rate limited. Please wait ${Math.ceil(waitMs / 1000)}s and try again.`);
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
1. Backend server is not running on port 10000
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
  console.log('🔍 Sending registration data:', userData);
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
      suggestion: 'Make sure the backend server is running on port 10000'
    };
  }
};
