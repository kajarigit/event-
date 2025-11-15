const helmet = require('helmet');
const csrf = require('csurf');
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const { getRedisClient } = require('../config/redis');
const logger = require('../config/logger');

/**
 * Security headers middleware using Helmet
 */
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

/**
 * CSRF protection middleware
 */
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  },
});

/**
 * Rate limiting middleware - Global
 */
const globalRateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/api/health';
  },
  handler: (req, res) => {
    logger.logSecurity('RATE_LIMIT_EXCEEDED', 'medium', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.',
    });
  },
});

/**
 * Rate limiting middleware - Per User (requires authentication)
 */
const createUserRateLimiter = () => {
  const redisClient = getRedisClient();
  
  if (!redisClient) {
    logger.warn('Redis not available, using memory store for rate limiting');
    return rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      keyGenerator: (req) => req.user?.id || req.ip,
    });
  }

  return rateLimit({
    store: new RedisStore({
      client: redisClient,
      prefix: 'ratelimit:user:',
    }),
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: async (req) => {
      // Different limits based on user role
      if (req.user?.role === 'admin') return 1000;
      if (req.user?.role === 'volunteer') return 500;
      return 100; // students and guests
    },
    keyGenerator: (req) => req.user?.id || req.ip,
    handler: (req, res) => {
      logger.logSecurity('USER_RATE_LIMIT_EXCEEDED', 'medium', {
        userId: req.user?.id,
        role: req.user?.role,
        ip: req.ip,
        path: req.path,
      });
      
      res.status(429).json({
        success: false,
        message: 'Too many requests, please slow down.',
      });
    },
  });
};

/**
 * Rate limiting for authentication endpoints
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  skipSuccessfulRequests: true, // Don't count successful requests
  message: 'Too many login attempts, please try again later.',
  handler: (req, res) => {
    logger.logSecurity('AUTH_RATE_LIMIT_EXCEEDED', 'high', {
      ip: req.ip,
      email: req.body?.email,
      path: req.path,
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts. Please try again after 15 minutes.',
    });
  },
});

/**
 * HTTPS redirect middleware
 */
const httpsRedirect = (req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.header('x-forwarded-proto') !== 'https') {
    logger.logSecurity('HTTP_TO_HTTPS_REDIRECT', 'low', {
      ip: req.ip,
      path: req.path,
    });
    
    return res.redirect(`https://${req.header('host')}${req.url}`);
  }
  next();
};

/**
 * Sanitize request headers
 */
const sanitizeHeaders = (req, res, next) => {
  // Remove potentially dangerous headers
  delete req.headers['x-powered-by'];
  delete req.headers['server'];
  
  next();
};

/**
 * Prevent SQL injection in query parameters
 */
const preventSQLInjection = (req, res, next) => {
  const sqlPattern = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)|(-{2})|(\/\*)|(\*\/)|(;)/gi;
  
  const checkForSQLInjection = (obj, path = '') => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        if (sqlPattern.test(obj[key])) {
          logger.logSecurity('SQL_INJECTION_ATTEMPT', 'critical', {
            ip: req.ip,
            userId: req.user?.id,
            path: req.path,
            field: `${path}${key}`,
            value: obj[key],
          });
          
          return true;
        }
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        if (checkForSQLInjection(obj[key], `${path}${key}.`)) {
          return true;
        }
      }
    }
    return false;
  };

  if (checkForSQLInjection(req.query) || checkForSQLInjection(req.body) || checkForSQLInjection(req.params)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid input detected.',
    });
  }

  next();
};

/**
 * XSS protection - Sanitize input
 */
const xssProtection = (req, res, next) => {
  const xssPattern = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
  
  const sanitizeValue = (value) => {
    if (typeof value === 'string') {
      return value.replace(xssPattern, '').replace(/[<>]/g, '');
    }
    return value;
  };

  const sanitizeObject = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = sanitizeValue(obj[key]);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  };

  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);

  next();
};

/**
 * Detect and prevent common attack patterns
 */
const detectAttackPatterns = (req, res, next) => {
  const suspiciousPatterns = [
    /\.\.\//g,  // Directory traversal
    /etc\/passwd/g,  // System file access
    /cmd\.exe/g,  // Command execution
    /eval\(/g,  // Code execution
    /javascript:/g,  // XSS
  ];

  const checkString = `${req.path} ${JSON.stringify(req.query)} ${JSON.stringify(req.body)}`;

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(checkString)) {
      logger.logSecurity('ATTACK_PATTERN_DETECTED', 'critical', {
        ip: req.ip,
        userId: req.user?.id,
        path: req.path,
        pattern: pattern.toString(),
        userAgent: req.get('user-agent'),
      });

      return res.status(400).json({
        success: false,
        message: 'Invalid request detected.',
      });
    }
  }

  next();
};

/**
 * IP Whitelist middleware (optional, for admin routes)
 */
const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    if (allowedIPs.length === 0) {
      return next(); // No whitelist configured
    }

    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (!allowedIPs.includes(clientIP)) {
      logger.logSecurity('IP_NOT_WHITELISTED', 'high', {
        ip: clientIP,
        path: req.path,
      });

      return res.status(403).json({
        success: false,
        message: 'Access denied from your IP address.',
      });
    }

    next();
  };
};

module.exports = {
  securityHeaders,
  csrfProtection,
  globalRateLimiter,
  createUserRateLimiter,
  authRateLimiter,
  httpsRedirect,
  sanitizeHeaders,
  preventSQLInjection,
  xssProtection,
  detectAttackPatterns,
  ipWhitelist,
};
