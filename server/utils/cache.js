// Simple in-memory cache implementation with TTL support
class Cache {
  constructor(options = {}) {
    this.cache = new Map();
    this.timers = new Map();
    this.defaultTTL = options.defaultTTL || 300000; // 5 minutes default
    this.maxSize = options.maxSize || 1000;
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0
    };
  }

  set(key, value, ttl = this.defaultTTL) {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictOldest();
    }

    // Clear existing timer if key exists
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Set value with metadata
    this.cache.set(key, {
      value,
      createdAt: Date.now(),
      accessCount: 0
    });

    // Set TTL timer
    if (ttl > 0) {
      const timer = setTimeout(() => {
        this.delete(key);
      }, ttl);
      this.timers.set(key, timer);
    }

    this.stats.sets++;
    return true;
  }

  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return undefined;
    }

    // Update access metadata
    item.accessCount++;
    item.lastAccessed = Date.now();
    
    this.stats.hits++;
    return item.value;
  }

  has(key) {
    return this.cache.has(key);
  }

  delete(key) {
    const deleted = this.cache.delete(key);
    
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }

    if (deleted) {
      this.stats.deletes++;
    }

    return deleted;
  }

  clear() {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    
    this.cache.clear();
    this.timers.clear();
    
    // Reset stats
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0
    };
  }

  evictOldest() {
    if (this.cache.size === 0) return;

    // Find oldest entry by creation time
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.createdAt < oldestTime) {
        oldestTime = item.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  // Get cache statistics
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      size: this.cache.size,
      maxSize: this.maxSize
    };
  }

  // Get all keys
  keys() {
    return Array.from(this.cache.keys());
  }

  // Get cache size
  size() {
    return this.cache.size;
  }
}

// Email template cache
class EmailTemplateCache extends Cache {
  constructor() {
    super({
      defaultTTL: 3600000, // 1 hour
      maxSize: 50
    });
  }

  getTemplate(templateName, variables = {}) {
    const cacheKey = `${templateName}_${JSON.stringify(variables)}`;
    return this.get(cacheKey);
  }

  setTemplate(templateName, variables, compiledTemplate) {
    const cacheKey = `${templateName}_${JSON.stringify(variables)}`;
    return this.set(cacheKey, compiledTemplate);
  }
}

// Request deduplication cache
class RequestDeduplicationCache extends Cache {
  constructor() {
    super({
      defaultTTL: 30000, // 30 seconds
      maxSize: 500
    });
  }

  generateKey(method, url, body) {
    const bodyHash = body ? JSON.stringify(body) : '';
    return `${method}_${url}_${bodyHash}`;
  }

  isDuplicate(method, url, body) {
    const key = this.generateKey(method, url, body);
    return this.has(key);
  }

  markRequest(method, url, body, response) {
    const key = this.generateKey(method, url, body);
    return this.set(key, response);
  }

  getResponse(method, url, body) {
    const key = this.generateKey(method, url, body);
    return this.get(key);
  }
}

// Configuration cache
class ConfigCache extends Cache {
  constructor() {
    super({
      defaultTTL: 0, // No expiration for config
      maxSize: 100
    });
  }

  getConfig(key, defaultValue = null) {
    const value = this.get(key);
    return value !== undefined ? value : defaultValue;
  }

  setConfig(key, value) {
    return this.set(key, value, 0); // No TTL for config
  }
}

// Create cache instances
const emailTemplateCache = new EmailTemplateCache();
const requestDeduplicationCache = new RequestDeduplicationCache();
const configCache = new ConfigCache();
const generalCache = new Cache();

// Cache middleware for request deduplication
const requestDeduplicationMiddleware = (req, res, next) => {
  // Only apply to POST requests
  if (req.method !== 'POST') {
    return next();
  }

  // Skip for certain endpoints
  const skipPaths = ['/api/verify-otp', '/api/login'];
  if (skipPaths.some(path => req.path.includes(path))) {
    return next();
  }

  const isDuplicate = requestDeduplicationCache.isDuplicate(
    req.method, 
    req.path, 
    req.body
  );

  if (isDuplicate) {
    const cachedResponse = requestDeduplicationCache.getResponse(
      req.method, 
      req.path, 
      req.body
    );

    if (cachedResponse) {
      console.log(`🔄 Returning cached response for ${req.method} ${req.path}`);
      return res.json(cachedResponse);
    }
  }

  // Override res.json to cache response
  const originalJson = res.json;
  res.json = function(data) {
    // Cache successful responses
    if (res.statusCode >= 200 && res.statusCode < 300) {
      requestDeduplicationCache.markRequest(req.method, req.path, req.body, data);
    }
    return originalJson.call(this, data);
  };

  next();
};

// Performance optimization utilities
const performanceOptimizer = {
  // Debounce function calls
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Throttle function calls
  throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  // Memoize function results
  memoize(func, keyGenerator = (...args) => JSON.stringify(args)) {
    const cache = new Map();
    
    return function(...args) {
      const key = keyGenerator(...args);
      
      if (cache.has(key)) {
        return cache.get(key);
      }
      
      const result = func.apply(this, args);
      cache.set(key, result);
      
      return result;
    };
  },

  // Batch operations
  batch(operations, batchSize = 10) {
    const batches = [];
    for (let i = 0; i < operations.length; i += batchSize) {
      batches.push(operations.slice(i, i + batchSize));
    }
    return batches;
  }
};

// Memory monitoring
const memoryMonitor = {
  getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      rss: Math.round(usage.rss / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      external: Math.round(usage.external / 1024 / 1024), // MB
      arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024) // MB
    };
  },

  checkMemoryThreshold(thresholdMB = 500) {
    const usage = this.getMemoryUsage();
    return usage.heapUsed > thresholdMB;
  },

  forceGarbageCollection() {
    if (global.gc) {
      global.gc();
      console.log('🗑️ Forced garbage collection');
    }
  }
};

// Cleanup old cache entries periodically
setInterval(() => {
  const caches = [emailTemplateCache, requestDeduplicationCache, generalCache];
  
  caches.forEach(cache => {
    const sizeBefore = cache.size();
    // Force eviction of old entries if cache is getting full
    if (sizeBefore > cache.maxSize * 0.8) {
      const keysToEvict = Math.floor(sizeBefore * 0.2);
      for (let i = 0; i < keysToEvict; i++) {
        cache.evictOldest();
      }
      console.log(`🧹 Cache cleanup: evicted ${keysToEvict} entries`);
    }
  });

  // Check memory usage
  if (memoryMonitor.checkMemoryThreshold()) {
    console.log('⚠️ High memory usage detected');
    memoryMonitor.forceGarbageCollection();
  }
}, 5 * 60 * 1000); // Every 5 minutes

module.exports = {
  Cache,
  EmailTemplateCache,
  RequestDeduplicationCache,
  ConfigCache,
  emailTemplateCache,
  requestDeduplicationCache,
  configCache,
  generalCache,
  requestDeduplicationMiddleware,
  performanceOptimizer,
  memoryMonitor
};