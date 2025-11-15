const redis = require('redis');
const logger = require('./logger');

let redisClient = null;

const connectRedis = async () => {
  try {
    redisClient = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          logger.error('Redis connection refused');
          return new Error('Redis server connection refused');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          logger.error('Redis retry time exhausted');
          return new Error('Redis retry time exhausted');
        }
        if (options.attempt > 10) {
          logger.error('Redis max retry attempts reached');
          return undefined;
        }
        // Reconnect after
        return Math.min(options.attempt * 100, 3000);
      },
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('✅ Redis connected successfully');
    });

    redisClient.on('ready', () => {
      logger.info('✅ Redis ready to accept commands');
    });

    redisClient.on('reconnecting', () => {
      logger.warn('⚠️ Redis reconnecting...');
    });

    await redisClient.connect();
    
    return redisClient;
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
};

// Cache helper functions
const cache = {
  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} - Parsed value or null
   */
  async get(key) {
    try {
      if (!redisClient || !redisClient.isOpen) {
        logger.warn('Redis not connected, skipping cache get');
        return null;
      }
      
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  },

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds (default: 3600 = 1 hour)
   * @returns {Promise<boolean>} - Success status
   */
  async set(key, value, ttl = 3600) {
    try {
      if (!redisClient || !redisClient.isOpen) {
        logger.warn('Redis not connected, skipping cache set');
        return false;
      }
      
      await redisClient.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  },

  /**
   * Delete key from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} - Success status
   */
  async del(key) {
    try {
      if (!redisClient || !redisClient.isOpen) {
        logger.warn('Redis not connected, skipping cache delete');
        return false;
      }
      
      await redisClient.del(key);
      return true;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  },

  /**
   * Delete all keys matching pattern
   * @param {string} pattern - Key pattern (e.g., 'events:*')
   * @returns {Promise<number>} - Number of keys deleted
   */
  async delPattern(pattern) {
    try {
      if (!redisClient || !redisClient.isOpen) {
        logger.warn('Redis not connected, skipping pattern delete');
        return 0;
      }
      
      const keys = await redisClient.keys(pattern);
      if (keys.length === 0) return 0;
      
      await redisClient.del(keys);
      return keys.length;
    } catch (error) {
      logger.error(`Cache pattern delete error for pattern ${pattern}:`, error);
      return 0;
    }
  },

  /**
   * Check if key exists
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} - Exists status
   */
  async exists(key) {
    try {
      if (!redisClient || !redisClient.isOpen) {
        return false;
      }
      
      const exists = await redisClient.exists(key);
      return exists === 1;
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  },

  /**
   * Set expiration on key
   * @param {string} key - Cache key
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} - Success status
   */
  async expire(key, ttl) {
    try {
      if (!redisClient || !redisClient.isOpen) {
        return false;
      }
      
      await redisClient.expire(key, ttl);
      return true;
    } catch (error) {
      logger.error(`Cache expire error for key ${key}:`, error);
      return false;
    }
  },

  /**
   * Increment value
   * @param {string} key - Cache key
   * @returns {Promise<number>} - New value
   */
  async incr(key) {
    try {
      if (!redisClient || !redisClient.isOpen) {
        return 0;
      }
      
      return await redisClient.incr(key);
    } catch (error) {
      logger.error(`Cache incr error for key ${key}:`, error);
      return 0;
    }
  },

  /**
   * Get raw Redis client
   * @returns {RedisClient} - Redis client instance
   */
  getClient() {
    return redisClient;
  }
};

// Cache key generators
const cacheKeys = {
  event: (id) => `event:${id}`,
  events: (userId) => `events:user:${userId}`,
  allEvents: () => 'events:all',
  stall: (id) => `stall:${id}`,
  stalls: (eventId) => `stalls:event:${eventId}`,
  user: (id) => `user:${id}`,
  userByEmail: (email) => `user:email:${email}`,
  qrToken: (token) => `qr:token:${token}`,
  session: (sessionId) => `session:${sessionId}`,
  rateLimit: (identifier) => `ratelimit:${identifier}`,
  otp: (email) => `otp:${email}`,
};

// Cache TTL constants (in seconds)
const cacheTTL = {
  EVENT: 3600,        // 1 hour
  EVENTS_LIST: 300,   // 5 minutes
  STALL: 3600,        // 1 hour
  STALLS_LIST: 300,   // 5 minutes
  USER: 7200,         // 2 hours
  QR_TOKEN: 300,      // 5 minutes
  SESSION: 86400,     // 24 hours
  OTP: 600,           // 10 minutes
  RATE_LIMIT: 900,    // 15 minutes
};

module.exports = {
  connectRedis,
  cache,
  cacheKeys,
  cacheTTL,
  getRedisClient: () => redisClient,
};
