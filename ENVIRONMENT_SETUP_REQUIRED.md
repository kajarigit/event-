# 🔑 Environment Variables Setup Guide

## ⚠️ CRITICAL: Must Complete Before App Will Work

Your app is deployed but **won't work properly** until you add these environment variables in Render.

---

## 📋 Frontend Service - Required Variables

### Go to Render Dashboard:
1. Click on your **Frontend** service
2. Go to **Environment** tab
3. Click **Add Environment Variable**

### Add This Variable:

```env
VITE_API_URL
```
**Value:** Your backend URL with `/api` at the end

**Example:**
```
https://event-backend-xyz123.onrender.com/api
```

**How to find your backend URL:**
1. Go to Render Dashboard
2. Click on your **Backend** service
3. Copy the URL at the top (it looks like: `https://something.onrender.com`)
4. Add `/api` to the end

**⚠️ After adding, click "Save Changes"** - Render will automatically redeploy the frontend.

---

## 🔧 Backend Service - Optional but Recommended

### Redis (For Better Performance)

If you have Redis from Upstash:

```env
REDIS_URL
```
**Value:** Your Upstash Redis URL

**Example:**
```
rediss://default:AXxYAAIncDIxYzBjZjU0NmUzNzQwMjNhZTI5MDI0NGIwMmNiZjBjcDIzMTgzMg@up-polecat-31832.upstash.io:6379
```

**Not required for basic functionality** but will:
- Speed up the app
- Enable session caching
- Enable rate limiting
- Enable background jobs

---

## ✅ Verify Setup

### Test Login:
1. Go to your deployed frontend URL
2. Try to login
3. Check browser console (F12 → Console)
4. Should NOT see "localhost" in any API calls
5. Should see your Render backend URL

### Check Network Tab:
1. Open DevTools (F12)
2. Go to **Network** tab
3. Login or navigate around
4. Click on any API request
5. URL should show your Render backend URL, not localhost

### Common Issues:

**Still seeing localhost:**
- Frontend environment variable not set correctly
- Forgot to save changes in Render
- Frontend didn't redeploy after adding variable

**Login fails with CORS error:**
- Backend URL in VITE_API_URL is wrong
- Missing `/api` at the end
- Typo in the URL

**401 Unauthorized immediately:**
- This is normal if you haven't logged in yet
- Try logging in with valid credentials

---

## 📸 Screenshot Guide

### Step 1: Find Your Backend URL
```
Render Dashboard → Backend Service → Copy URL
Example: https://event-backend-xyz.onrender.com
```

### Step 2: Add to Frontend
```
Render Dashboard → Frontend Service → Environment → Add Variable

Key: VITE_API_URL
Value: https://event-backend-xyz.onrender.com/api
       ↑ Your backend URL              ↑ Add this
```

### Step 3: Save and Wait
```
Click "Save Changes"
Wait 1-2 minutes for automatic redeploy
Check deployment logs for success
```

---

## 🧪 Test Commands

### Test Frontend Environment:
Open browser console on your deployed site and run:
```javascript
console.log(import.meta.env.VITE_API_URL);
```

Should show your Render backend URL, not localhost.

### Test Backend Endpoint:
```bash
curl https://YOUR-BACKEND.onrender.com/api/auth/me
```

Should return `401 Unauthorized` (this is correct - means backend is running).

### Test Full Login Flow:
```bash
curl -X POST https://YOUR-BACKEND.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'
```

Should return user data or "Invalid credentials" (both mean it's working).

---

## 🚨 If Still Not Working

### Check These:

1. **Variable Name Exact Match:**
   - Must be exactly: `VITE_API_URL`
   - Not: `API_URL`, `REACT_APP_API_URL`, `VUE_APP_API_URL`

2. **Value Format:**
   - Must include: `https://`
   - Must end with: `/api`
   - No trailing slash after `/api`

3. **Deployment Status:**
   - Check Render logs
   - Wait for "Deploy succeeded" message
   - Try hard refresh (Ctrl+F5)

4. **Browser Cache:**
   - Clear browser cache
   - Open in incognito/private window
   - Check DevTools → Application → Clear storage

### Still Issues?

**Get Logs:**
```bash
# In Render dashboard
Backend Service → Logs → Copy last 50 lines
Frontend Service → Logs → Copy last 50 lines
```

**Check Browser Console:**
```javascript
// Open DevTools (F12) → Console
// Look for red errors
// Share screenshot
```

---

## 📝 Current Configuration

Based on your setup, your environment variables should be:

### Frontend Service:
```env
VITE_API_URL = https://YOUR_BACKEND_URL.onrender.com/api
```

### Backend Service:
```env
NODE_ENV = production
DATABASE_URL = [Already set by Aiven PostgreSQL]
JWT_SECRET = [Already in your code]
JWT_EXPIRE = 7d
JWT_COOKIE_EXPIRE = 7
REDIS_URL = [Optional - from Upstash]
```

---

## ✨ Success Indicators

You'll know it's working when:

✅ Login page appears correctly  
✅ Can login with valid credentials  
✅ Dashboard loads after login  
✅ Attendance page shows data  
✅ Volunteer can scan QR codes  
✅ Recent scans appear in volunteer dashboard  
✅ No "localhost" errors in console  
✅ No CORS errors  
✅ Session persists on page refresh  

---

## 🎯 Quick Checklist

- [ ] Found backend URL from Render dashboard
- [ ] Added `/api` to the end
- [ ] Added `VITE_API_URL` to frontend service
- [ ] Clicked "Save Changes"
- [ ] Waited for redeploy to complete (check logs)
- [ ] Cleared browser cache
- [ ] Tested login
- [ ] Checked DevTools console for errors
- [ ] Verified API calls go to Render, not localhost
- [ ] Everything works! 🎉

---

**Need Help?** Share:
1. Screenshot of environment variables page
2. Browser console errors
3. Network tab showing API call URLs
4. Render deployment logs

**Last Updated:** $(date)  
**Status:** Waiting for user to configure environment variables
