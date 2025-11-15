# Integration Checklist - Connect All New Features

## ✅ What's Ready
All infrastructure code has been created and committed. Now we need to integrate it with your existing application.

## 🔧 Required Integration Steps

### 1. Update server.js (CRITICAL - Do First)

**File**: `backend/src/server.js`

Add these imports at the top:
```javascript
const { initSentry, sentryErrorHandler, sentryUserContext, sentryPerformance } = require('./config/sentry');
const { connectRedis } = require('./config/redis');
const { scheduleBackups } = require('./services/backupService');
const {
  securityHeaders,
  globalRateLimiter,
  createUserRateLimiter,
  httpsRedirect,
  sanitizeHeaders,
  preventSQLInjection,
  xssProtection,
  detectAttackPatterns,
} = require('./middleware/security');
const healthController = require('./controllers/healthController');
```

Initialize Sentry FIRST (before any other middleware):
```javascript
// Initialize Sentry - MUST BE FIRST
initSentry(app);
```

Apply security middleware (after Sentry, before routes):
```javascript
// Security middleware
app.use(httpsRedirect);
app.use(securityHeaders);
app.use(sanitizeHeaders);
app.use(globalRateLimiter);
app.use(preventSQLInjection);
app.use(xssProtection);
app.use(detectAttackPatterns);

// Sentry tracking
app.use(sentryUserContext);
app.use(sentryPerformance);
```

Add health check routes:
```javascript
// Health check endpoints (before auth required)
app.get('/api/health', healthController.healthCheck);
app.get('/api/health/ready', healthController.readinessProbe);
app.get('/api/health/live', healthController.livenessProbe);
```

Add user rate limiter for protected routes:
```javascript
const userRateLimiter = createUserRateLimiter();
app.use('/api', userRateLimiter);
```

Add Sentry error handler BEFORE your existing error handler:
```javascript
// Sentry error handler - MUST BE BEFORE your error handler
app.use(sentryErrorHandler);

// ... your existing error handler ...
```

Connect Redis and schedule backups:
```javascript
// After database connection
connectRedis().catch(err => {
  logger.error('Redis connection failed:', err);
  // App continues without Redis (graceful degradation)
});

// Schedule automated backups
scheduleBackups();
```

### 2. Update Email Service to Use Queue

**File**: `backend/src/services/emailService.js`

Add at top:
```javascript
const queueEmail = require('../queues/emailQueue');
```

Replace direct email sending with queuing:
```javascript
// OLD (direct sending):
async function sendWelcomeEmail(user) {
  await sendEmail(user.email, 'Welcome!', html);
}

// NEW (queued):
async function sendWelcomeEmail(user) {
  await queueEmail.sendEmail(user.email, 'Welcome!', html);
}
```

For bulk emails:
```javascript
// OLD:
for (const user of users) {
  await sendEmail(user.email, subject, html);
}

// NEW:
const recipients = users.map(u => ({ email: u.email }));
await queueEmail.sendBulkEmail(recipients, subject, html);
```

### 3. Add Caching to Controllers

**Example**: `backend/src/controllers/eventController.js`

Add imports:
```javascript
const { cache, cacheKeys, cacheTTL } = require('../config/redis');
const { trackDatabaseQuery } = require('../config/sentry');
```

Get all events (with caching):
```javascript
async function getAllEvents(req, res) {
  try {
    // Try cache first
    const cacheKey = cacheKeys.allEvents();
    const cached = await cache.get(cacheKey);
    
    if (cached) {
      logger.info('Cache hit: events list');
      return res.json(cached);
    }

    // Track database performance
    const dbSpan = trackDatabaseQuery(req, 'Event.findAll');
    
    // Fetch from database
    const events = await Event.findAll({
      order: [['date', 'DESC']],
    });
    
    if (dbSpan) dbSpan.finish();

    // Cache the result
    await cache.set(cacheKey, events, cacheTTL.EVENTS_LIST);
    
    logger.info('Cache miss: events list - cached for future');
    res.json(events);
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
}
```

Get single event (with caching):
```javascript
async function getEvent(req, res) {
  try {
    const { id } = req.params;
    const cacheKey = cacheKeys.event(id);
    
    // Try cache
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Fetch from DB
    const event = await Event.findByPk(id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Cache it
    await cache.set(cacheKey, event, cacheTTL.EVENT);
    
    res.json(event);
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
}
```

Update event (invalidate cache):
```javascript
async function updateEvent(req, res) {
  try {
    const { id } = req.params;
    
    await Event.update(req.body, { where: { id } });
    
    // Invalidate caches
    await cache.del(cacheKeys.event(id));
    await cache.del(cacheKeys.allEvents());
    
    logger.logAudit('UPDATE_EVENT', req.user?.id, { eventId: id, changes: req.body });
    
    res.json({ success: true });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ error: 'Failed to update event' });
  }
}
```

Apply same pattern to:
- `stallController.js` - Cache stalls list and individual stalls
- `userController.js` - Cache user data
- `qrController.js` - Cache QR tokens

### 4. Add Validation to Routes

**Example**: `backend/src/routes/userRoutes.js`

Add import:
```javascript
const { validate, schemas, validateUUID } = require('../middleware/validation');
```

Apply validation:
```javascript
// Create user
router.post('/users',
  validate(schemas.createUser),
  createUser
);

// Update user
router.put('/users/:id',
  validateUUID,
  validate(schemas.updateUser),
  updateUser
);

// Get user by ID
router.get('/users/:id',
  validateUUID,
  getUser
);
```

Apply to all routes:
- `authRoutes.js` - Login, register, password reset
- `eventRoutes.js` - Event CRUD
- `stallRoutes.js` - Stall CRUD
- `qrRoutes.js` - QR scanning

### 5. Add Special Rate Limiting to Auth Routes

**File**: `backend/src/routes/authRoutes.js`

Add import:
```javascript
const { authRateLimiter } = require('../middleware/security');
```

Apply to auth endpoints:
```javascript
router.post('/login', authRateLimiter, validate(schemas.login), login);
router.post('/register', authRateLimiter, validate(schemas.register), register);
router.post('/forgot-password', authRateLimiter, validate(schemas.forgotPassword), forgotPassword);
router.post('/reset-password', authRateLimiter, validate(schemas.resetPassword), resetPassword);
```

### 6. Create Email Worker Process (Optional but Recommended)

**File**: `backend/src/workers/emailWorker.js` (new file)

```javascript
require('dotenv').config();
const logger = require('../config/logger');
const { connectRedis } = require('../config/redis');
const emailQueue = require('../queues/emailQueue');

async function startWorker() {
  logger.info('🚀 Starting email worker...');

  // Connect to Redis
  await connectRedis();

  logger.info('✅ Email worker ready to process jobs');
  logger.info('Queue is already processing in emailQueue.js');
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down email worker...');
  const queue = emailQueue.getQueue();
  await queue.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down email worker...');
  const queue = emailQueue.getQueue();
  await queue.close();
  process.exit(0);
});

startWorker().catch(err => {
  logger.error('Failed to start email worker:', err);
  process.exit(1);
});
```

### 7. Add Admin Queue Management Endpoint

**File**: `backend/src/controllers/adminController.js`

Add these functions:
```javascript
const queueEmail = require('../queues/emailQueue');

async function getQueueStats(req, res) {
  try {
    const stats = await queueEmail.getStats();
    res.json(stats);
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ error: 'Failed to get queue stats' });
  }
}

async function cleanQueue(req, res) {
  try {
    const { grace = 86400000 } = req.query; // Default 24 hours
    const result = await queueEmail.clean(parseInt(grace));
    res.json(result);
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ error: 'Failed to clean queue' });
  }
}

async function pauseQueue(req, res) {
  try {
    await queueEmail.pause();
    res.json({ success: true, message: 'Queue paused' });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ error: 'Failed to pause queue' });
  }
}

async function resumeQueue(req, res) {
  try {
    await queueEmail.resume();
    res.json({ success: true, message: 'Queue resumed' });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ error: 'Failed to resume queue' });
  }
}

module.exports = {
  // ... existing exports
  getQueueStats,
  cleanQueue,
  pauseQueue,
  resumeQueue,
};
```

Add routes:
```javascript
// In adminRoutes.js
router.get('/queue/stats', getQueueStats);
router.post('/queue/clean', cleanQueue);
router.post('/queue/pause', pauseQueue);
router.post('/queue/resume', resumeQueue);
```

### 8. Add Audit Logging Model (Optional)

**File**: `backend/src/models/AuditLog.sequelize.js` (new file)

```javascript
module.exports = (sequelize, DataTypes) => {
  const AuditLog = sequelize.define('AuditLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    tableName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    recordId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    oldValue: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    newValue: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    userAgent: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  });

  return AuditLog;
};
```

Then use in controllers:
```javascript
// After important operations
logger.logAudit('CREATE_USER', req.user?.id, {
  tableName: 'Users',
  recordId: newUser.id,
  newValue: newUser.toJSON(),
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
});
```

## 🧪 Testing Integration

After integration, test each feature:

### 1. Test Health Checks
```bash
curl http://localhost:5000/api/health
curl http://localhost:5000/api/health/ready
curl http://localhost:5000/api/health/live
```

### 2. Test Redis Cache
```bash
# First call (cache miss)
time curl http://localhost:5000/api/events

# Second call (cache hit - should be faster)
time curl http://localhost:5000/api/events
```

### 3. Test Email Queue
```bash
# Trigger email (password reset)
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Check queue stats
curl http://localhost:5000/api/admin/queue/stats \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 4. Test Rate Limiting
```bash
# Make many requests
for i in {1..150}; do curl http://localhost:5000/api/events; done

# Should get 429 (Too Many Requests) after 100
```

### 5. Test Validation
```bash
# Invalid email
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid","name":"Test"}'

# Should get 400 with validation errors
```

### 6. Test Sentry (if configured)
```bash
# Trigger an error
# Check Sentry dashboard for error report
```

## 📊 Performance Verification

Monitor improvements:

```bash
# Before integration (baseline)
ab -n 1000 -c 10 http://localhost:5000/api/events

# After integration (with cache)
ab -n 1000 -c 10 http://localhost:5000/api/events

# Should see ~10-100x improvement in cached requests
```

## 🚨 Common Issues

### Redis Connection Errors
**Solution**: Ensure Redis is running in Docker
```bash
docker-compose ps redis
docker-compose restart redis
```

### Queue Not Processing
**Solution**: Check email worker
```bash
docker-compose logs email-worker
```

### Cache Not Working
**Solution**: Check Redis password
```bash
# In .env, ensure REDIS_PASSWORD matches docker-compose.yml
```

### Validation Errors
**Solution**: Check schema matches your data structure
```javascript
// In validation.js, adjust schemas as needed
```

## ✅ Integration Checklist

Before deploying:

- [ ] server.js updated with all middleware
- [ ] Health checks accessible
- [ ] Redis connected successfully
- [ ] Email queue processing jobs
- [ ] Caching working (check logs for "Cache hit/miss")
- [ ] Rate limiting active (test with many requests)
- [ ] Validation working (test with invalid data)
- [ ] Sentry receiving errors (if configured)
- [ ] Backups scheduled (check logs)
- [ ] Security headers present (check with browser devtools)
- [ ] All tests passing

## 📝 Final Steps

1. Complete all integrations above
2. Test each feature
3. Run full test suite: `npm test`
4. Check all logs for errors
5. Deploy to staging first
6. Load test
7. Deploy to production
8. Monitor for 24 hours

## 🆘 Need Help?

Check the full documentation:
- `IMPLEMENTATION_STATUS.md` - What's been implemented
- `DOCKER_DEPLOYMENT.md` - Full deployment guide
- `QUICK_START.md` - Quick setup instructions

Still stuck? Create a GitHub issue with:
- Error message
- Relevant logs
- Steps to reproduce
