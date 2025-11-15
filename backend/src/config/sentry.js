const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');
const logger = require('./logger');

/**
 * Initialize Sentry error tracking and performance monitoring
 */
const initSentry = (app) => {
  if (!process.env.SENTRY_DSN) {
    logger.warn('SENTRY_DSN not configured, Sentry integration disabled');
    return;
  }

  try {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
      
      // Performance Monitoring
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0.1, // 10% of transactions
      
      // Profiling
      profilesSampleRate: 0.1, // 10% of transactions will be profiled
      integrations: [
        new ProfilingIntegration(),
      ],
      
      // Release tracking
      release: process.env.npm_package_version || '1.0.0',
      
      // Additional context
      beforeSend(event, hint) {
        // Filter out specific errors
        if (event.exception) {
          const error = hint.originalException;
          
          // Don't send validation errors to Sentry
          if (error && error.name === 'ValidationError') {
            return null;
          }
          
          // Don't send JWT expiration errors
          if (error && error.name === 'TokenExpiredError') {
            return null;
          }
        }
        
        return event;
      },
      
      // Ignore specific errors
      ignoreErrors: [
        'ValidationError',
        'TokenExpiredError',
        'JsonWebTokenError',
        'UnauthorizedError',
        'Non-Error promise rejection',
      ],
      
      // Don't send sensitive data
      beforeBreadcrumb(breadcrumb) {
        // Remove sensitive headers
        if (breadcrumb.category === 'http') {
          delete breadcrumb.data?.['Authorization'];
          delete breadcrumb.data?.['Cookie'];
        }
        return breadcrumb;
      },
    });

    // Request handler must be the first middleware
    if (app) {
      app.use(Sentry.Handlers.requestHandler());
      
      // TracingHandler creates a trace for every incoming request
      app.use(Sentry.Handlers.tracingHandler());
    }

    logger.info('✅ Sentry initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Sentry:', error);
  }
};

/**
 * Sentry error handler middleware
 * Must be added AFTER all routes but BEFORE other error handlers
 */
const sentryErrorHandler = Sentry.Handlers.errorHandler({
  shouldHandleError(error) {
    // Only send 500 errors to Sentry
    return error.status === 500 || !error.status;
  },
});

/**
 * Capture exception manually
 */
const captureException = (error, context = {}) => {
  Sentry.captureException(error, {
    contexts: {
      custom: context,
    },
  });
};

/**
 * Capture message
 */
const captureMessage = (message, level = 'info', context = {}) => {
  Sentry.captureMessage(message, {
    level,
    contexts: {
      custom: context,
    },
  });
};

/**
 * Set user context
 */
const setUser = (user) => {
  if (!user) {
    Sentry.setUser(null);
    return;
  }

  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name,
    role: user.role,
  });
};

/**
 * Add breadcrumb
 */
const addBreadcrumb = (category, message, data = {}, level = 'info') => {
  Sentry.addBreadcrumb({
    category,
    message,
    level,
    data,
  });
};

/**
 * Create transaction for performance monitoring
 */
const startTransaction = (name, op, description = '') => {
  return Sentry.startTransaction({
    name,
    op,
    description,
  });
};

/**
 * Middleware to set user context from request
 */
const sentryUserContext = (req, res, next) => {
  if (req.user) {
    setUser(req.user);
  }
  next();
};

/**
 * Middleware to track API performance
 */
const sentryPerformance = (req, res, next) => {
  const transaction = Sentry.startTransaction({
    op: 'http.server',
    name: `${req.method} ${req.route?.path || req.path}`,
    data: {
      method: req.method,
      url: req.url,
      query: req.query,
    },
  });

  // Create span for database operations
  req.sentryTransaction = transaction;

  // End transaction when response is sent
  res.on('finish', () => {
    transaction.setHttpStatus(res.statusCode);
    transaction.finish();
  });

  next();
};

/**
 * Create span for tracking specific operations
 */
const createSpan = (transaction, op, description) => {
  if (!transaction) return null;
  
  return transaction.startChild({
    op,
    description,
  });
};

/**
 * Track database query performance
 */
const trackDatabaseQuery = (req, queryName) => {
  if (!req.sentryTransaction) return null;
  
  return req.sentryTransaction.startChild({
    op: 'db.query',
    description: queryName,
  });
};

/**
 * Track cache operation performance
 */
const trackCacheOperation = (req, operation) => {
  if (!req.sentryTransaction) return null;
  
  return req.sentryTransaction.startChild({
    op: 'cache',
    description: operation,
  });
};

/**
 * Track external API call performance
 */
const trackExternalAPI = (req, apiName) => {
  if (!req.sentryTransaction) return null;
  
  return req.sentryTransaction.startChild({
    op: 'http.client',
    description: apiName,
  });
};

/**
 * Flush Sentry events (useful for serverless)
 */
const flush = async (timeout = 2000) => {
  try {
    await Sentry.flush(timeout);
    logger.info('Sentry events flushed successfully');
  } catch (error) {
    logger.error('Failed to flush Sentry events:', error);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  await flush();
});

module.exports = {
  initSentry,
  sentryErrorHandler,
  sentryUserContext,
  sentryPerformance,
  captureException,
  captureMessage,
  setUser,
  addBreadcrumb,
  startTransaction,
  createSpan,
  trackDatabaseQuery,
  trackCacheOperation,
  trackExternalAPI,
  flush,
  Sentry,
};
