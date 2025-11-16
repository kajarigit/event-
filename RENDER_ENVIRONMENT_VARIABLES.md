# 🔐 Render Environment Variables Setup

## ⚠️ CRITICAL: Required for Application to Work

You MUST add these environment variables to your Render services for the application to function properly.

---

## 📋 Backend Service Environment Variables

Go to: **Render Dashboard → Your Backend Service → Environment**

Add these variables:

```env
# Database (Already configured if using Aiven PostgreSQL)
DATABASE_URL=postgresql://username:password@host:port/database
# Or if using Render PostgreSQL:
# DATABASE_URL will be auto-injected by Render

# Redis - Upstash (FREE TIER) ✅ YOU HAVE THIS
# Your system uses REDIS_HOST, REDIS_PORT, REDIS_PASSWORD format
REDIS_HOST=up-polecat-31832.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=AXxYAAIncDIxYzBjZjk1NDZlMzc0MDIzYWUyOTAyNDRiMDJjYmYwY3AyMzE4MzI

# JWT Secrets (Generate new ones for production!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production-min-32-chars
JWT_EXPIRE=24h
JWT_REFRESH_EXPIRE=7d

# Node Environment
NODE_ENV=production

# Server Config
PORT=5000

# Email (Optional - for password reset emails)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
EMAIL_FROM=noreply@yourdomain.com

# Sentry Error Tracking (Optional)
SENTRY_DSN=your-sentry-dsn-url

# CORS Origin (Your frontend URL)
CORS_ORIGIN=https://your-frontend-app.onrender.com
```

### 🔑 How to Set Variables:

1. **Go to Render Dashboard**
2. Click on your **Backend Service**
3. Click **Environment** tab on the left
4. Click **Add Environment Variable**
5. Copy-paste each variable name and value
6. Click **Save Changes**
7. Render will automatically redeploy

---

## 🌐 Frontend Service Environment Variables

Go to: **Render Dashboard → Your Frontend Static Site → Environment**

Add this ONE critical variable:

```env
# Backend API URL (REQUIRED FOR LOGIN!)
VITE_API_URL=https://YOUR-BACKEND-SERVICE-NAME.onrender.com/api
```

### 📝 How to Find Your Backend URL:

1. Go to Render Dashboard
2. Click on your **Backend Service**
3. Copy the URL at the top (e.g., `https://event-backend-abc123.onrender.com`)
4. Add `/api` to the end
5. Use this as `VITE_API_URL` value

**Example:**
```env
VITE_API_URL=https://event-backend-abc123.onrender.com/api
```

### 🔑 How to Set:

1. Go to Render Dashboard
2. Click on your **Frontend Static Site**
3. Click **Environment** tab
4. Add `VITE_API_URL` with your backend URL + `/api`
5. Click **Save Changes**
6. Frontend will redeploy automatically

---

## 🎯 Your Specific Configuration

Based on the information you've provided:

### ✅ Backend Environment Variables (Copy These Exactly):

```env
# Redis (Upstash Free Tier)
REDIS_HOST=up-polecat-31832.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=AXxYAAIncDIxYzBjZjk1NDZlMzc0MDIzYWUyOTAyNDRiMDJjYmYwY3AyMzE4MzI

# Server
NODE_ENV=production
PORT=5000

# JWT Authentication
JWT_SECRET=event-management-system-super-secret-jwt-key-2024-production
JWT_REFRESH_SECRET=event-management-system-refresh-secret-jwt-key-2024-production
JWT_EXPIRE=24h
JWT_REFRESH_EXPIRE=7d
```

### ⚠️ Frontend Environment Variables (FILL IN YOUR BACKEND URL):

```env
VITE_API_URL=https://[YOUR-BACKEND-NAME].onrender.com/api
```

**Replace `[YOUR-BACKEND-NAME]` with your actual Render backend service name!**

---

## 🚀 After Setting Variables

### Backend Will Automatically:
- ✅ Connect to Redis (Upstash)
- ✅ Enable caching for better performance
- ✅ Enable Bull queue for background jobs
- ✅ Connect to your database
- ✅ Handle JWT authentication

### Frontend Will Automatically:
- ✅ Connect to your backend API
- ✅ Login will work
- ✅ Session persistence will work
- ✅ All API calls will go to production backend

---

## 🔍 How to Verify Setup

### Test Backend Redis Connection:

After adding `REDIS_URL`, check Render logs:

```
✅ Should see: "✅ Redis connected successfully"
❌ If error: "Redis connection failed" - check REDIS_URL is correct
```

### Test Frontend API Connection:

1. Open your frontend URL
2. Try to login
3. Open Browser DevTools (F12) → Network tab
4. Check if API calls go to your backend URL (not localhost)

**Correct:** `https://your-backend.onrender.com/api/auth/login`  
**Wrong:** `http://localhost:5000/api/auth/login`

---

## 📊 Quick Checklist

### Backend Service:
- [ ] `REDIS_HOST=up-polecat-31832.upstash.io` - Added ✅
- [ ] `REDIS_PORT=6379` - Added ✅
- [ ] `REDIS_PASSWORD=AXxYAAIncDIxYzBjZjk1NDZlMzc0MDIzYWUyOTAyNDRiMDJjYmYwY3AyMzE4MzI` - Added ✅
- [ ] `NODE_ENV=production` - Added
- [ ] `JWT_SECRET` - Added (changed from default!)
- [ ] `JWT_REFRESH_SECRET` - Added (changed from default!)
- [ ] `DATABASE_URL` - Already configured (Aiven)
- [ ] Clicked "Save Changes"
- [ ] Service redeployed successfully

### Frontend Service:
- [ ] `VITE_API_URL` - Added with correct backend URL + `/api`
- [ ] Clicked "Save Changes"
- [ ] Service redeployed successfully
- [ ] Tested login - works ✅

---

## 🛠️ Troubleshooting

### "Cannot login" Issue:
**Cause:** `VITE_API_URL` not set or wrong  
**Fix:** Add `VITE_API_URL=https://your-backend.onrender.com/api` to frontend

### "Redis connection failed":
**Cause:** Redis variables not set correctly  
**Fix:** Add these THREE variables to backend:
```
REDIS_HOST=up-polecat-31832.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=AXxYAAIncDIxYzBjZjk1NDZlMzc0MDIzYWUyOTAyNDRiMDJjYmYwY3AyMzE4MzI
```

### "Token invalid" errors:
**Cause:** JWT secrets not set  
**Fix:** Add `JWT_SECRET` and `JWT_REFRESH_SECRET`

### CORS errors:
**Cause:** Frontend URL not in CORS whitelist  
**Fix:** Add `CORS_ORIGIN=https://your-frontend.onrender.com`

---

## 🎯 Final Steps After Setup

1. ✅ Add all backend environment variables
2. ✅ Add frontend `VITE_API_URL`
3. ✅ Wait for both services to redeploy (2-3 minutes)
4. ✅ Test login
5. ✅ Test attendance page
6. ✅ Test volunteer recent scans
7. ✅ Check Render logs for any errors

---

## 📞 Need Help?

If you see errors after setup:

1. **Check Render Logs:**
   - Backend logs: Look for "Redis connected" or "Database connected"
   - Frontend logs: Should show successful build

2. **Check Browser Console:**
   - F12 → Console tab
   - Look for API URL errors or CORS issues

3. **Verify URLs:**
   - Backend URL ends with `.onrender.com` (no `/api`)
   - Frontend VITE_API_URL ends with `/api`

---

**Last Updated:** November 16, 2025  
**Status:** ✅ Ready to Configure  
**Your Redis:** Upstash Free Tier (already obtained)  
**Action Required:** Add variables to Render dashboard
