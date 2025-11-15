const { cache } = require('../config/redis');
const { sequelize } = require('../models');
const logger = require('../config/logger');
const queueEmail = require('../queues/emailQueue');

/**
 * Health check endpoint
 * Returns status of all services
 */
const healthCheck = async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {},
  };

  try {
    // Check database connection
    try {
      await sequelize.authenticate();
      health.services.database = {
        status: 'healthy',
        type: 'PostgreSQL',
      };
    } catch (error) {
      health.services.database = {
        status: 'unhealthy',
        error: error.message,
      };
      health.status = 'degraded';
    }

    // Check Redis connection
    try {
      const redisCheck = await cache.set('health:check', { timestamp: Date.now() }, 10);
      if (redisCheck) {
        health.services.redis = {
          status: 'healthy',
        };
      } else {
        throw new Error('Redis set operation failed');
      }
    } catch (error) {
      health.services.redis = {
        status: 'unhealthy',
        error: error.message,
      };
      health.status = 'degraded';
    }

    // Check email queue
    try {
      const queueStats = await queueEmail.getStats();
      health.services.emailQueue = {
        status: 'healthy',
        stats: queueStats,
      };
    } catch (error) {
      health.services.emailQueue = {
        status: 'unhealthy',
        error: error.message,
      };
      health.status = 'degraded';
    }

    // Memory usage
    const memoryUsage = process.memoryUsage();
    health.memory = {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
    };

    // CPU usage
    const cpuUsage = process.cpuUsage();
    health.cpu = {
      user: `${Math.round(cpuUsage.user / 1000)}ms`,
      system: `${Math.round(cpuUsage.system / 1000)}ms`,
    };

    // Environment info
    health.environment = {
      nodeVersion: process.version,
      platform: process.platform,
      env: process.env.NODE_ENV,
    };

    const statusCode = health.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Readiness probe
 * Returns 200 if ready to accept traffic
 */
const readinessProbe = async (req, res) => {
  try {
    // Check critical services
    await sequelize.authenticate();
    
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Liveness probe
 * Returns 200 if process is alive
 */
const livenessProbe = (req, res) => {
  res.status(200).json({
    status: 'alive',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  healthCheck,
  readinessProbe,
  livenessProbe,
};
