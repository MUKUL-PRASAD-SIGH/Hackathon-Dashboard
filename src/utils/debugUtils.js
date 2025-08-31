// Comprehensive debugging utility for detailed error tracking
export class DebugLogger {
  constructor(component = 'Unknown') {
    this.component = component;
    this.sessionId = Date.now().toString(36);
  }

  // Log with detailed context
  log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      sessionId: this.sessionId,
      component: this.component,
      level,
      message,
      data,
      url: window.location.href,
      userAgent: navigator.userAgent,
      stack: new Error().stack
    };

    console.group(`🔍 [${level.toUpperCase()}] ${this.component} - ${message}`);
    console.log('📊 Full Debug Info:', logEntry);
    
    if (data.error) {
      console.error('❌ Error Details:', {
        name: data.error.name,
        message: data.error.message,
        stack: data.error.stack,
        cause: data.error.cause
      });
    }
    
    if (data.request) {
      console.log('📤 Request Details:', data.request);
    }
    
    if (data.response) {
      console.log('📥 Response Details:', data.response);
    }
    
    console.groupEnd();

    // Store in sessionStorage for debugging
    this.storeDebugLog(logEntry);
    
    return logEntry;
  }

  info(message, data) { return this.log('info', message, data); }
  warn(message, data) { return this.log('warn', message, data); }
  error(message, data) { return this.log('error', message, data); }
  debug(message, data) { return this.log('debug', message, data); }

  // Store debug logs for analysis
  storeDebugLog(logEntry) {
    try {
      const logs = JSON.parse(sessionStorage.getItem('debugLogs') || '[]');
      logs.push(logEntry);
      
      // Keep only last 50 logs
      if (logs.length > 50) {
        logs.splice(0, logs.length - 50);
      }
      
      sessionStorage.setItem('debugLogs', JSON.stringify(logs));
    } catch (error) {
      console.warn('Failed to store debug log:', error);
    }
  }

  // Get all debug logs
  static getAllLogs() {
    try {
      return JSON.parse(sessionStorage.getItem('debugLogs') || '[]');
    } catch (error) {
      console.warn('Failed to retrieve debug logs:', error);
      return [];
    }
  }

  // Clear debug logs
  static clearLogs() {
    sessionStorage.removeItem('debugLogs');
    console.log('🧹 Debug logs cleared');
  }

  // Export logs for sharing
  static exportLogs() {
    const logs = DebugLogger.getAllLogs();
    const exportData = {
      exportedAt: new Date().toISOString(),
      totalLogs: logs.length,
      logs
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    console.log('📁 Debug logs exported');
    return exportData;
  }
}

// API Debug wrapper
export const debugApiCall = async (debugLogger, endpoint, options, apiCallFn) => {
  const requestId = Math.random().toString(36).substr(2, 9);
  
  debugLogger.info('API Call Started', {
    requestId,
    endpoint,
    request: {
      method: options.method || 'GET',
      headers: options.headers,
      body: options.body,
      url: endpoint
    }
  });

  try {
    const startTime = performance.now();
    const result = await apiCallFn();
    const endTime = performance.now();
    
    debugLogger.info('API Call Success', {
      requestId,
      endpoint,
      duration: `${(endTime - startTime).toFixed(2)}ms`,
      response: {
        success: true,
        data: result
      }
    });
    
    return result;
  } catch (error) {
    debugLogger.error('API Call Failed', {
      requestId,
      endpoint,
      error,
      errorDetails: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause
      }
    });
    
    throw error;
  }
};

// Get correct backend URL
const getBackendUrl = () => {
  const isLocalhost = window.location.hostname === 'localhost';
  return isLocalhost 
    ? 'http://localhost:10000'
    : 'https://hackathon-dashboard-backend-md49.onrender.com';
};

// Network diagnostics
export const runNetworkDiagnostics = async () => {
  const backendUrl = getBackendUrl();
  const diagnostics = {
    timestamp: new Date().toISOString(),
    online: navigator.onLine,
    backendUrl,
    connection: navigator.connection ? {
      effectiveType: navigator.connection.effectiveType,
      downlink: navigator.connection.downlink,
      rtt: navigator.connection.rtt
    } : 'Not available',
    tests: {}
  };

  // Test backend health
  try {
    const startTime = performance.now();
    const response = await fetch(`${backendUrl}/health`, {
      method: 'GET',
      timeout: 5000
    });
    const endTime = performance.now();
    
    diagnostics.tests.backendHealth = {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      responseTime: `${(endTime - startTime).toFixed(2)}ms`,
      headers: Object.fromEntries(response.headers.entries())
    };
  } catch (error) {
    diagnostics.tests.backendHealth = {
      success: false,
      error: error.message,
      errorType: error.name
    };
  }

  // Test API endpoint
  try {
    const startTime = performance.now();
    const response = await fetch(`${backendUrl}/api/users`, {
      method: 'GET',
      timeout: 5000
    });
    const endTime = performance.now();
    
    diagnostics.tests.apiEndpoint = {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      responseTime: `${(endTime - startTime).toFixed(2)}ms`,
      contentType: response.headers.get('content-type')
    };
  } catch (error) {
    diagnostics.tests.apiEndpoint = {
      success: false,
      error: error.message,
      errorType: error.name
    };
  }

  console.group('🔍 Network Diagnostics');
  console.log('📊 Full Report:', diagnostics);
  console.groupEnd();

  return diagnostics;
};

// Global error handler
export const setupGlobalErrorHandling = () => {
  const globalLogger = new DebugLogger('GlobalErrorHandler');

  window.addEventListener('error', (event) => {
    globalLogger.error('Global JavaScript Error', {
      error: event.error,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      message: event.message
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    globalLogger.error('Unhandled Promise Rejection', {
      error: event.reason,
      promise: event.promise
    });
  });

  console.log('🛡️ Global error handling setup complete');
};
