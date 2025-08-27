const fs = require('fs');
const path = require('path');

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const LOG_LEVEL_NAMES = ['ERROR', 'WARN', 'INFO', 'DEBUG'];

class Logger {
  constructor(options = {}) {
    this.level = options.level || (process.env.NODE_ENV === 'production' ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG);
    this.enableConsole = options.enableConsole !== false;
    this.enableFile = options.enableFile || false;
    this.logDir = options.logDir || path.join(__dirname, '../logs');
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB
    this.maxFiles = options.maxFiles || 5;
    
    // Create logs directory if it doesn't exist
    if (this.enableFile && !fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const levelName = LOG_LEVEL_NAMES[level];
    
    const logEntry = {
      timestamp,
      level: levelName,
      message,
      ...meta
    };

    return JSON.stringify(logEntry);
  }

  writeToFile(level, formattedMessage) {
    if (!this.enableFile) return;

    const levelName = LOG_LEVEL_NAMES[level].toLowerCase();
    const filename = `${levelName}.log`;
    const filepath = path.join(this.logDir, filename);

    try {
      // Check file size and rotate if necessary
      if (fs.existsSync(filepath)) {
        const stats = fs.statSync(filepath);
        if (stats.size > this.maxFileSize) {
          this.rotateLogFile(filepath);
        }
      }

      fs.appendFileSync(filepath, formattedMessage + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  rotateLogFile(filepath) {
    const dir = path.dirname(filepath);
    const ext = path.extname(filepath);
    const basename = path.basename(filepath, ext);

    // Rotate existing files
    for (let i = this.maxFiles - 1; i >= 1; i--) {
      const oldFile = path.join(dir, `${basename}.${i}${ext}`);
      const newFile = path.join(dir, `${basename}.${i + 1}${ext}`);
      
      if (fs.existsSync(oldFile)) {
        if (i === this.maxFiles - 1) {
          fs.unlinkSync(oldFile); // Delete oldest file
        } else {
          fs.renameSync(oldFile, newFile);
        }
      }
    }

    // Move current file to .1
    const rotatedFile = path.join(dir, `${basename}.1${ext}`);
    fs.renameSync(filepath, rotatedFile);
  }

  log(level, message, meta = {}) {
    if (level > this.level) return;

    const formattedMessage = this.formatMessage(level, message, meta);

    // Console output with colors
    if (this.enableConsole) {
      const colors = {
        [LOG_LEVELS.ERROR]: '\x1b[31m', // Red
        [LOG_LEVELS.WARN]: '\x1b[33m',  // Yellow
        [LOG_LEVELS.INFO]: '\x1b[36m',  // Cyan
        [LOG_LEVELS.DEBUG]: '\x1b[37m'  // White
      };
      
      const reset = '\x1b[0m';
      const color = colors[level] || reset;
      
      console.log(`${color}${formattedMessage}${reset}`);
    }

    // File output
    this.writeToFile(level, formattedMessage);
  }

  error(message, meta = {}) {
    this.log(LOG_LEVELS.ERROR, message, meta);
  }

  warn(message, meta = {}) {
    this.log(LOG_LEVELS.WARN, message, meta);
  }

  info(message, meta = {}) {
    this.log(LOG_LEVELS.INFO, message, meta);
  }

  debug(message, meta = {}) {
    this.log(LOG_LEVELS.DEBUG, message, meta);
  }

  // Audit logging for security events
  audit(event, details = {}) {
    this.info(`AUDIT: ${event}`, {
      type: 'audit',
      event,
      ...details,
      timestamp: new Date().toISOString()
    });
  }

  // Performance logging
  performance(operation, duration, details = {}) {
    this.info(`PERFORMANCE: ${operation}`, {
      type: 'performance',
      operation,
      duration,
      ...details
    });
  }

  // Security logging
  security(event, details = {}) {
    this.warn(`SECURITY: ${event}`, {
      type: 'security',
      event,
      ...details,
      timestamp: new Date().toISOString()
    });
  }
}

// Create default logger instance
const logger = new Logger({
  enableFile: process.env.NODE_ENV === 'production',
  enableConsole: true
});

// Performance monitoring utilities
const performanceTracker = {
  timers: new Map(),
  
  start(operation, details = {}) {
    const startTime = process.hrtime.bigint();
    this.timers.set(operation, { startTime, details });
    logger.debug(`Started: ${operation}`, details);
  },
  
  end(operation, additionalDetails = {}) {
    const timer = this.timers.get(operation);
    if (!timer) {
      logger.warn(`No timer found for operation: ${operation}`);
      return;
    }
    
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - timer.startTime) / 1000000; // Convert to milliseconds
    
    logger.performance(operation, duration, {
      ...timer.details,
      ...additionalDetails
    });
    
    this.timers.delete(operation);
    return duration;
  }
};

// Middleware for request logging
const requestLogger = (req, res, next) => {
  const startTime = process.hrtime.bigint();
  const requestId = Math.random().toString(36).substr(2, 9);
  
  req.requestId = requestId;
  req.logger = logger;
  
  logger.info('Request started', {
    requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(data) {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000;
    
    logger.info('Request completed', {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      responseSize: JSON.stringify(data).length
    });
    
    return originalJson.call(this, data);
  };
  
  next();
};

module.exports = {
  logger,
  Logger,
  LOG_LEVELS,
  performanceTracker,
  requestLogger
};