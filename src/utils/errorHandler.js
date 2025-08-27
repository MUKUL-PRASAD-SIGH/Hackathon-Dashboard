import { toast } from 'react-hot-toast';

// Error types
export const ERROR_TYPES = {
  NETWORK: 'NETWORK_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  AUTHENTICATION: 'AUTHENTICATION_ERROR',
  AUTHORIZATION: 'AUTHORIZATION_ERROR',
  RATE_LIMIT: 'RATE_LIMIT_EXCEEDED',
  SERVER: 'SERVER_ERROR',
  OTP_EXPIRED: 'OTP_EXPIRED',
  OTP_INVALID: 'INVALID_OTP',
  OTP_USED: 'OTP_ALREADY_USED',
  USER_EXISTS: 'USER_EXISTS',
  USER_NOT_FOUND: 'USER_NOT_FOUND'
};

// User-friendly error messages
const ERROR_MESSAGES = {
  [ERROR_TYPES.NETWORK]: 'Network connection failed. Please check your internet connection.',
  [ERROR_TYPES.VALIDATION]: 'Please check your input and try again.',
  [ERROR_TYPES.AUTHENTICATION]: 'Authentication failed. Please log in again.',
  [ERROR_TYPES.AUTHORIZATION]: 'You are not authorized to perform this action.',
  [ERROR_TYPES.RATE_LIMIT]: 'Too many requests. Please wait before trying again.',
  [ERROR_TYPES.SERVER]: 'Server error occurred. Please try again later.',
  [ERROR_TYPES.OTP_EXPIRED]: 'OTP has expired. Please request a new one.',
  [ERROR_TYPES.OTP_INVALID]: 'Invalid OTP. Please check and try again.',
  [ERROR_TYPES.OTP_USED]: 'OTP has already been used. Please request a new one.',
  [ERROR_TYPES.USER_EXISTS]: 'An account with this email already exists.',
  [ERROR_TYPES.USER_NOT_FOUND]: 'No account found with this email.'
};

// Enhanced error class
export class AppError extends Error {
  constructor(message, type = ERROR_TYPES.SERVER, statusCode = 500, details = null) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

// Network error handler with retry logic
export class NetworkErrorHandler {
  constructor(maxRetries = 3, baseDelay = 1000) {
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
  }

  async executeWithRetry(apiCall, retryCount = 0) {
    try {
      return await apiCall();
    } catch (error) {
      if (this.shouldRetry(error, retryCount)) {
        const delay = this.calculateDelay(retryCount);
        console.log(`🔄 Retrying API call in ${delay}ms (attempt ${retryCount + 1}/${this.maxRetries})`);
        
        await this.delay(delay);
        return this.executeWithRetry(apiCall, retryCount + 1);
      }
      
      throw this.enhanceError(error);
    }
  }

  shouldRetry(error, retryCount) {
    if (retryCount >= this.maxRetries) return false;
    
    // Retry on network errors, timeouts, and 5xx server errors
    return (
      !navigator.onLine ||
      error.name === 'TypeError' ||
      error.message.includes('fetch') ||
      (error.statusCode >= 500 && error.statusCode < 600)
    );
  }

  calculateDelay(retryCount) {
    return this.baseDelay * Math.pow(2, retryCount); // Exponential backoff
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  enhanceError(error) {
    if (!navigator.onLine) {
      return new AppError(
        'No internet connection',
        ERROR_TYPES.NETWORK,
        0
      );
    }

    if (error.name === 'TypeError' || error.message.includes('fetch')) {
      return new AppError(
        'Network request failed',
        ERROR_TYPES.NETWORK,
        0
      );
    }

    return error;
  }
}

// API error parser
export const parseApiError = (response, data) => {
  const statusCode = response.status;
  const errorData = data.error || data;
  
  let errorType = ERROR_TYPES.SERVER;
  let message = errorData.message || 'An error occurred';

  // Map status codes to error types
  switch (statusCode) {
    case 400:
      errorType = ERROR_TYPES.VALIDATION;
      break;
    case 401:
      errorType = ERROR_TYPES.AUTHENTICATION;
      break;
    case 403:
      errorType = ERROR_TYPES.AUTHORIZATION;
      break;
    case 429:
      errorType = ERROR_TYPES.RATE_LIMIT;
      break;
    case 500:
    case 502:
    case 503:
    case 504:
      errorType = ERROR_TYPES.SERVER;
      break;
  }

  // Map specific error codes
  if (errorData.code) {
    switch (errorData.code) {
      case 'OTP_EXPIRED':
        errorType = ERROR_TYPES.OTP_EXPIRED;
        break;
      case 'INVALID_OTP':
        errorType = ERROR_TYPES.OTP_INVALID;
        break;
      case 'OTP_ALREADY_USED':
        errorType = ERROR_TYPES.OTP_USED;
        break;
      case 'RATE_LIMIT_EXCEEDED':
        errorType = ERROR_TYPES.RATE_LIMIT;
        break;
    }
  }

  return new AppError(message, errorType, statusCode, errorData.details);
};

// Global error handler
export const handleError = (error, options = {}) => {
  const {
    showToast = true,
    logError = true,
    fallbackMessage = 'An unexpected error occurred'
  } = options;

  // Log error for debugging
  if (logError) {
    console.error('🚨 Error handled:', {
      message: error.message,
      type: error.type,
      statusCode: error.statusCode,
      details: error.details,
      stack: error.stack,
      timestamp: error.timestamp || new Date().toISOString()
    });
  }

  // Get user-friendly message
  const userMessage = error.type && ERROR_MESSAGES[error.type] 
    ? ERROR_MESSAGES[error.type]
    : error.message || fallbackMessage;

  // Show toast notification
  if (showToast) {
    if (error.type === ERROR_TYPES.NETWORK) {
      toast.error(userMessage, { duration: 5000 });
    } else if (error.type === ERROR_TYPES.RATE_LIMIT) {
      toast.error(userMessage, { duration: 4000 });
    } else {
      toast.error(userMessage);
    }
  }

  return {
    message: userMessage,
    type: error.type,
    statusCode: error.statusCode,
    canRetry: error.type === ERROR_TYPES.NETWORK || error.type === ERROR_TYPES.SERVER
  };
};

// API wrapper with error handling
export const apiCall = async (url, options = {}) => {
  const networkHandler = new NetworkErrorHandler();
  
  const makeRequest = async () => {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    let data;
    try {
      data = await response.json();
    } catch (e) {
      data = { message: 'Invalid server response' };
    }

    if (!response.ok) {
      throw parseApiError(response, data);
    }

    return data;
  };

  return networkHandler.executeWithRetry(makeRequest);
};

// Form validation error handler
export const handleValidationErrors = (errors, setFieldErrors) => {
  if (errors && Array.isArray(errors)) {
    const fieldErrors = {};
    errors.forEach(error => {
      if (error.field) {
        fieldErrors[error.field] = error.message;
      }
    });
    setFieldErrors(fieldErrors);
    return fieldErrors;
  }
  return {};
};

export default {
  AppError,
  NetworkErrorHandler,
  parseApiError,
  handleError,
  apiCall,
  handleValidationErrors,
  ERROR_TYPES
};