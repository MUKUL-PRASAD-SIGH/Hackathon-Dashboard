// Simplified debugging utility to prevent script errors
export class DebugLogger {
  constructor(component = 'Unknown') {
    this.component = component;
  }

  log(level, message, data = {}) {
    console.log(`[${level.toUpperCase()}] ${this.component} - ${message}`, data);
  }

  info(message, data) { this.log('info', message, data); }
  warn(message, data) { this.log('warn', message, data); }
  error(message, data) { this.log('error', message, data); }
  debug(message, data) { this.log('debug', message, data); }
}

// Simplified API Debug wrapper
export const debugApiCall = async (debugLogger, endpoint, options, apiCallFn) => {
  try {
    debugLogger.info('API Call Started', { endpoint, method: options.method || 'GET' });
    const result = await apiCallFn();
    debugLogger.info('API Call Success', { endpoint });
    return result;
  } catch (error) {
    debugLogger.error('API Call Failed', { endpoint, error: error.message });
    throw error;
  }
};