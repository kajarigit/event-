# 🔧 Fix Session Persistence & 404 Errors on Render

## 🐛 Problems Fixed

### Issue 1: Logged Out After Page Refresh ❌
- **Problem**: Refreshing page logs user out
- **Cause**: `/auth/me` endpoint returning 404
- **Solution**: Backend route exists, need to verify Render deployment

### Issue 2: 404 on Direct URL Access ❌  
- **Problem**: Going to `/student/voting` directly shows "Not Found"
- **Cause**: SPA routing not configured on Render
- **Solution**: Add `_redirects` file to serve index.html for all routes

## ✅ Solutions Applied

### 1. Frontend SPA Routing Fix

**Files Created/Modified**:

**`frontend/public/_redirects`** (already exists):
```
/*    /index.html   200
```

**`frontend/vite.config.js`** - Updated to copy public files:
```javascript
build: {
  outDir: 'dist',
  sourcemap: false,
  chunkSizeWarningLimit: 1000,
  copyPublicDir: true, // ✅ Ensures _redirects is copied to dist
},
```

**`frontend/build.sh`** - Build script with verification:
```bash
npm install
npm run build
# Verify _redirects exists in dist
if [ ! -f "dist/_redirects" ]; then
  echo "/*    /index.html   200" > dist/_redirects
fi
```

### 2. Render Static Site Configuration

**Go to Render Dashboard** → Your frontend service → **Settings**:

**Build Command**:
```bash
npm install && npm run build
```

**Publish Directory**:
```
dist
```

**Routes**:
- ✅ Render automatically respects `_redirects` file
- ✅ All routes (/*) will serve index.html
- ✅ React Router handles client-side navigation

### 3. Verify Backend is Running

**Check Backend Logs**:
1. Go to Render Dashboard → Backend service
2. Click "Logs" tab
3. Look for:
   ```
   ✅ PostgreSQL connected
   ✅ Server running on port 5000
   ```

**Test Backend API**:
```bash
# Should return 401 (unauthorized) but NOT 404
curl https://your-backend.onrender.com/api/auth/me

# Should return server info
curl https://your-backend.onrender.com/health
```

## 🧪 Testing After Fix

### Test 1: Login Persistence ✅
1. Login to the app
2. Navigate to any page (e.g., /student/voting)
3. **Refresh the browser (F5 or Ctrl+R)**
4. **Expected**: Still logged in, page loads correctly
5. **NOT Expected**: Logged out, redirected to login

### Test 2: Direct URL Access ✅
1. Login to the app
2. Copy URL from address bar (e.g., https://your-app.onrender.com/student/voting)
3. **Open in new tab or new incognito window**
4. **Expected**: If logged in → voting page loads | If not logged in → redirect to login
5. **NOT Expected**: "Not Found" or 404 error

### Test 3: Browser Back/Forward ✅
1. Login → Navigate around (Dashboard → Voting → Feedback)
2. **Click browser back button multiple times**
3. **Expected**: Navigation works smoothly
4. **NOT Expected**: 404 errors or logged out

### Test 4: Session Across Tabs ✅
1. Login in Tab 1
2. **Open new tab (Tab 2)** → Navigate to your app
3. **Expected**: Already logged in (tokens shared via localStorage)
4. **Logout in Tab 1**
5. **Refresh Tab 2** → Should redirect to login

## 🔍 How It Works

### Before (Broken) ❌

```
User → https://app.com/student/voting (refresh)
  ↓
Render Server → "Do I have /student/voting file?"
  ↓
Render Server → "No! 404 Not Found"
  ↓
Browser → Shows 404 error page
```

### After (Fixed) ✅

```
User → https://app.com/student/voting (refresh)
  ↓
Render Server → Checks _redirects file
  ↓
Render Server → "Serve /index.html for all routes"
  ↓
Browser → Gets index.html with React app
  ↓
React Router → Parses URL → Loads /student/voting component
  ↓
AuthContext → Checks localStorage for tokens
  ↓
AuthContext → Calls /auth/me → Gets user → Keeps logged in ✅
```

## 📋 Deployment Checklist

### Frontend (Static Site)

- [ ] `_redirects` file exists in `frontend/public/`
- [ ] `vite.config.js` has `copyPublicDir: true`
- [ ] Build command: `npm install && npm run build`
- [ ] Publish directory: `dist`
- [ ] Redeploy frontend service

### Backend (Web Service)

- [ ] Backend deployed and running
- [ ] `/api/auth/me` route responds (not 404)
- [ ] `/health` endpoint returns 200 OK
- [ ] Environment variables set (DB, JWT, etc.)
- [ ] Check logs for errors

### Test Everything

- [ ] Login works
- [ ] Refresh keeps you logged in
- [ ] Direct URL access works (/student/voting)
- [ ] Browser back/forward works
- [ ] Logout works properly
- [ ] Multiple tabs share session

## 🐛 Troubleshooting

### Still Getting 404 After Refresh

**Check**:
1. Verify `dist/_redirects` exists after build:
   ```bash
   npm run build
   ls dist/_redirects  # Should exist
   cat dist/_redirects  # Should show: /*    /index.html   200
   ```

2. Check Render build logs:
   ```
   ✅ _redirects file copied to dist
   ✅ Build successful
   ```

3. Manually add _redirects in Render:
   - Download your deployed `dist` folder
   - Verify `_redirects` is there
   - If missing, create it manually and redeploy

### Still Getting Logged Out

**Check**:
1. Open browser console (F12)
2. Go to Application → Local Storage
3. Verify `accessToken` and `refreshToken` exist
4. Check Network tab → Filter by `/auth/me`
5. See what status code it returns:
   - **404**: Backend route missing (check server.js)
   - **401**: Token expired (should auto-refresh)
   - **500**: Backend error (check logs)

### Backend /auth/me Returns 404

**Fix**:
1. Check `backend/src/server.js` includes auth routes:
   ```javascript
   const authRoutes = require('./routes/auth');
   app.use('/api/auth', authRoutes);
   ```

2. Verify auth route file has `/me` endpoint:
   ```javascript
   router.get('/me', protect, authController.getMe);
   ```

3. Redeploy backend

### Tokens Getting Cleared on Refresh

**Check AuthContext.jsx**:
```javascript
// Should NOT clear tokens on network errors
if (error.code === 'ERR_NETWORK' || !error.response) {
  // Keep tokens, just set user to null temporarily
  setUser(null);
} else if (error.response?.status === 401) {
  // Only clear on 401 Unauthorized
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}
```

## 🔒 Session Flow Diagram

```
┌─────────────┐
│   Login     │
│  Success    │
└──────┬──────┘
       │
       ▼
┌──────────────────────┐
│  Store in localStorage│
│  - accessToken       │
│  - refreshToken      │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  User navigates      │
│  around app          │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  User refreshes      │ ← CRITICAL MOMENT
│  page (F5)           │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  AuthContext loads   │
│  checks localStorage │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  Calls /auth/me      │
│  with token          │
└──────┬───────────────┘
       │
       ├─── ✅ 200 OK ────────┐
       │                      │
       │                      ▼
       │              ┌──────────────┐
       │              │ User stays   │
       │              │ logged in ✅ │
       │              └──────────────┘
       │
       ├─── ❌ 401 Unauthorized ─────┐
       │                              │
       │                              ▼
       │                      ┌──────────────┐
       │                      │ Try refresh  │
       │                      │ token        │
       │                      └──────┬───────┘
       │                             │
       │                             ├─ ✅ Success → Stay logged in
       │                             │
       │                             └─ ❌ Fail → Logout, redirect
       │
       └─── ❌ 404 Not Found ────────┐
                                     │
                                     ▼
                             ┌──────────────┐
                             │ Backend not  │
                             │ configured!  │
                             │ ⚠️ FIX THIS │
                             └──────────────┘
```

## 🚀 Deploy Fixes Now

```bash
# Commit changes
git add .
git commit -m "fix: Add SPA routing for Render + ensure session persistence"
git push origin master

# Render will auto-deploy both services
# Wait 2-3 minutes for deployment
```

## ✅ Success Criteria

After deploying:

1. ✅ Login → Refresh → Still logged in
2. ✅ Navigate to /student/voting → Refresh → Page loads (no 404)
3. ✅ Direct URL access works
4. ✅ Browser back/forward works
5. ✅ Multiple tabs share session
6. ✅ Logout works on all tabs
7. ✅ Session persists until explicit logout

---

**Status**: 🟡 Fixes ready to deploy
**Next**: Commit & push → Wait for Render deployment → Test
