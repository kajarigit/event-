# 🔧 Render Environment Variables - Complete List

## 📋 Environment Variables to Add/Update

### ✅ **Variables You Already Have (Keep These)**

These are already in your Render deployment:

```env
NODE_ENV=production
PORT=5000

# Database (Aiven PostgreSQL)
DB_HOST=<your-aiven-host>.aivencloud.com
DB_PORT=19044
DB_NAME=defaultdb
DB_USER=avnadmin
DB_PASSWORD=<your-database-password>

# JWT Authentication
JWT_SECRET=<your-current-jwt-secret>
JWT_EXPIRE=7d

# Email (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=<your-email@gmail.com>
EMAIL_PASSWORD=<your-gmail-app-password>
EMAIL_FROM=Event Management <your-email@gmail.com>

# Frontend URL
FRONTEND_URL=https://your-frontend.onrender.com
```

---

## 🆕 **NEW Variables to Add (For Production Features)**

### 1️⃣ **CRITICAL - Redis (Upstash)** ⭐ **ADD THIS FIRST**

This unlocks caching, email queue, and massive performance boost:

```env
REDIS_URL=rediss://default:AXxYAAIncDIxYzBjZjk1NDZlMzc0MDIzYWUyOTAyNDRiMDJjYmYwY3AyMzE4MzI@up-polecat-31832.upstash.io:6379
```

⚠️ **Important**: Use `rediss://` (double 's') for TLS/SSL

**What it enables**:
- ✅ 10-100x faster API responses (caching)
- ✅ Background email processing (Bull queue)
- ✅ Session caching
- ✅ QR token caching

---

### 2️⃣ **RECOMMENDED - Sentry Error Tracking** ⭐

Get real-time error monitoring (free tier available):

```env
SENTRY_DSN=https://your-sentry-dsn@o123456.ingest.sentry.io/7654321
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
```

**How to get**:
1. Go to https://sentry.io
2. Create free account
3. Create new project (Node.js)
4. Copy DSN from project settings
5. Add to Render

**What it enables**:
- ✅ Real-time error tracking
- ✅ Performance monitoring
- ✅ User feedback collection
- ✅ Release tracking

---

### 3️⃣ **OPTIONAL - Rate Limiting Configuration**

Fine-tune rate limits for your traffic:

```env
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Default values** (if not set):
- Window: 15 minutes (900000 ms)
- Max requests: 100 per window

**Adjust if needed**:
- High traffic: Increase to 500-1000
- Low traffic: Keep at 100
- API-heavy users: Increase window time

---

### 4️⃣ **OPTIONAL - Database Connection Pool**

Optimize database performance:

```env
DB_POOL_MAX=100
DB_POOL_MIN=10
DB_POOL_ACQUIRE=60000
DB_POOL_IDLE=10000
```

**What each means**:
- `DB_POOL_MAX`: Maximum database connections (100)
- `DB_POOL_MIN`: Minimum idle connections (10)
- `DB_POOL_ACQUIRE`: Max time to get connection in ms (60s)
- `DB_POOL_IDLE`: Max idle time before closing (10s)

**Note**: Aiven free tier may have connection limits. Adjust if needed.

---

### 5️⃣ **OPTIONAL - Cache TTL Configuration**

Override default cache expiration times:

```env
CACHE_TTL_EVENT=3600
CACHE_TTL_STALL=3600
CACHE_TTL_USER=7200
CACHE_TTL_SESSION=86400
```

**Default values** (in seconds):
- Events: 1 hour (3600)
- Stalls: 1 hour (3600)
- Users: 2 hours (7200)
- Sessions: 24 hours (86400)

**Adjust if**:
- Data changes frequently: Lower values
- Data is static: Higher values

---

### 6️⃣ **OPTIONAL - Email Queue Configuration**

Configure Bull queue behavior:

```env
BULL_CONCURRENCY=5
QUEUE_MAX_RETRIES=3
QUEUE_RETRY_DELAY=2000
```

**What each means**:
- `BULL_CONCURRENCY`: How many emails to send simultaneously (5)
- `QUEUE_MAX_RETRIES`: Retry failed jobs 3 times
- `QUEUE_RETRY_DELAY`: Wait 2 seconds before retry

---

### 7️⃣ **OPTIONAL - Logging Configuration**

Control log levels:

```env
LOG_LEVEL=info
```

**Options**:
- `error`: Only errors
- `warn`: Errors + warnings
- `info`: Errors + warnings + info (recommended)
- `debug`: Everything (use in development only)

---

### 8️⃣ **OPTIONAL - CORS Configuration**

Allow specific origins:

```env
CORS_ORIGINS=https://your-frontend.onrender.com,https://www.yourdomain.com
```

**Default**: Allows your frontend URL

**Add if**: You have multiple domains or custom domain

---

### 9️⃣ **NOT RECOMMENDED - Backup Configuration**

⚠️ Automated backups don't work well on Render (no persistent storage)

```env
BACKUP_ENABLED=false
```

**Alternative**: Use Aiven's built-in backup system

---

## 📝 **Complete Environment Variable List for Copy-Paste**

### **REQUIRED (Minimum to work)**

```env
# Server
NODE_ENV=production
PORT=5000

# Database
DB_HOST=<your-aiven-host>.aivencloud.com
DB_PORT=19044
DB_NAME=defaultdb
DB_USER=avnadmin
DB_PASSWORD=<your-db-password>

# JWT
JWT_SECRET=<your-jwt-secret-32-chars-minimum>
JWT_EXPIRE=7d

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=<your-email@gmail.com>
EMAIL_PASSWORD=<your-gmail-app-password>
EMAIL_FROM=Event Management <your-email@gmail.com>

# Frontend
FRONTEND_URL=https://your-frontend.onrender.com
```

---

### **RECOMMENDED (Best Performance)**

Add these for full production features:

```env
# Redis (Upstash) - CRITICAL for performance
REDIS_URL=rediss://default:AXxYAAIncDIxYzBjZjk1NDZlMzc0MDIzYWUyOTAyNDRiMDJjYmYwY3AyMzE4MzI@up-polecat-31832.upstash.io:6379

# Sentry Error Tracking
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

### **OPTIONAL (Advanced Configuration)**

Only add if you need custom configuration:

```env
# Database Pool
DB_POOL_MAX=100
DB_POOL_MIN=10
DB_POOL_ACQUIRE=60000
DB_POOL_IDLE=10000

# Cache TTL
CACHE_TTL_EVENT=3600
CACHE_TTL_STALL=3600
CACHE_TTL_USER=7200
CACHE_TTL_SESSION=86400

# Queue
BULL_CONCURRENCY=5
QUEUE_MAX_RETRIES=3
QUEUE_RETRY_DELAY=2000

# Logging
LOG_LEVEL=info

# CORS
CORS_ORIGINS=https://your-frontend.onrender.com

# Backups (not recommended on Render)
BACKUP_ENABLED=false
```

---

## 🎯 **Priority Order - What to Add First**

### **Immediate (Add Right Now)**

1. ✅ **REDIS_URL** - Unlocks all performance features
   ```env
   REDIS_URL=rediss://default:AXxYAAIncDIxYzBjZjk1NDZlMzc0MDIzYWUyOTAyNDRiMDJjYmYwY3AyMzE4MzI@up-polecat-31832.upstash.io:6379
   ```

### **This Week**

2. ⭐ **Sentry DSN** - Get error tracking
   - Sign up at https://sentry.io (free)
   - Create project
   - Add DSN to Render

### **When Needed**

3. 🔧 **Rate Limiting** - Adjust based on traffic
4. 🔧 **Cache TTL** - Tune based on data change frequency
5. 🔧 **Database Pool** - Optimize if hitting connection limits

---

## 📋 **How to Add in Render**

### Step-by-Step:

1. **Go to Render Dashboard**: https://dashboard.render.com

2. **Click your backend web service**

3. **Click "Environment" tab** (left sidebar)

4. **For each variable**:
   - Click "Add Environment Variable"
   - Enter Key (e.g., `REDIS_URL`)
   - Enter Value (e.g., `rediss://...`)
   - Click "Add"

5. **After adding all variables**:
   - Click "Save Changes" at bottom
   - Render will automatically redeploy (2-3 minutes)

6. **Check deployment logs** to verify:
   ```
   ✅ Redis connected successfully
   ✅ Sentry initialized
   ```

---

## 🧪 **Testing After Adding Variables**

### Test 1: Health Check
```bash
curl https://your-backend.onrender.com/api/health
```

**Should show**:
```json
{
  "status": "healthy",
  "services": {
    "database": { "status": "healthy" },
    "redis": { "status": "healthy" }
  }
}
```

### Test 2: Check Logs

In Render Dashboard → Logs:
```
✅ PostgreSQL connected
✅ Redis connected successfully
✅ Sentry initialized successfully
✅ Server running on port 5000
```

### Test 3: Verify Caching

```bash
# First request (slow - cache miss)
time curl https://your-backend.onrender.com/api/events

# Second request (fast - cache hit)
time curl https://your-backend.onrender.com/api/events
```

Second request should be **10-20x faster**!

---

## ⚠️ **Security Notes**

### **Never commit these to Git**:
- ❌ `DB_PASSWORD`
- ❌ `JWT_SECRET`
- ❌ `EMAIL_PASSWORD`
- ❌ `REDIS_URL`
- ❌ `SENTRY_DSN`

### **Keep secure**:
- ✅ Only in Render environment variables
- ✅ Use strong passwords (32+ characters for JWT_SECRET)
- ✅ Rotate secrets regularly
- ✅ Use different secrets for dev/staging/production

---

## 📊 **Impact Summary**

| Variable | Impact | Priority |
|----------|--------|----------|
| `REDIS_URL` | 10-100x faster API | 🔴 CRITICAL |
| `SENTRY_DSN` | Real-time error tracking | 🟡 HIGH |
| `RATE_LIMIT_*` | Prevent abuse | 🟢 MEDIUM |
| `DB_POOL_*` | Database optimization | 🟢 LOW |
| `CACHE_TTL_*` | Fine-tuning | 🔵 OPTIONAL |
| `LOG_LEVEL` | Debug control | 🔵 OPTIONAL |

---

## 🎉 **Quick Summary**

### **Must Add (Right Now)**:
```env
REDIS_URL=rediss://default:AXxYAAIncDIxYzBjZjk1NDZlMzc0MDIzYWUyOTAyNDRiMDJjYmYwY3AyMzE4MzI@up-polecat-31832.upstash.io:6379
```

### **Should Add (This Week)**:
```env
SENTRY_DSN=<get-from-sentry.io>
SENTRY_ENVIRONMENT=production
```

### **Optional (If Needed)**:
```env
RATE_LIMIT_MAX_REQUESTS=100
CACHE_TTL_EVENT=3600
LOG_LEVEL=info
```

---

## 🆘 **Support**

- **Can't find variable**: Check existing environment variables first
- **Wrong value**: Verify from source (Upstash, Aiven, etc.)
- **Not working**: Check Render logs for error details
- **Need help**: See `UPSTASH_SETUP.md` or `INTEGRATION_CHECKLIST.md`

---

**Status**: Ready to add! Start with `REDIS_URL` and you'll see immediate performance gains! 🚀
