# Render Deployment Guide for Event Management System

## 🚀 Quick Deploy to Render

### Prerequisites
- GitHub account
- Render account (sign up at https://render.com)
- PostgreSQL database (you already have Aiven)

---

## Step 1: Push to GitHub

```bash
cd C:\Users\Administrator\Desktop\test\new-try\try1\event
git add .
git commit -m "Prepare for Render deployment"
git push origin master
```

---

## Step 2: Deploy Backend on Render

1. **Go to Render Dashboard:** https://dashboard.render.com/

2. **Click "New +"** → **"Web Service"**

3. **Connect your GitHub repository:** `kajarigit/event-`

4. **Configure Backend Service:**
   - **Name:** `event-management-backend`
   - **Region:** Choose closest to you
   - **Branch:** `master`
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free

5. **Add Environment Variables:**
   Click "Advanced" → "Add Environment Variable"
   
   ```
   NODE_ENV=production
   PORT=5000
   DB_HOST=your-aiven-host.aivencloud.com
   DB_PORT=19044
   DB_NAME=defaultdb
   DB_USER=avnadmin
   DB_PASSWORD=your-database-password
   DB_SSL=true
   JWT_SECRET=change-this-to-a-strong-random-secret
   JWT_EXPIRE=7d
   JWT_COOKIE_EXPIRE=7
   CORS_ORIGIN=*
   MAX_FILE_SIZE=10485760
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   LOG_LEVEL=info
   QR_CODE_EXPIRY_HOURS=24
   ```

6. **Click "Create Web Service"**

7. **Wait for deployment** (takes 2-5 minutes)

8. **Copy your backend URL** (e.g., `https://event-management-backend.onrender.com`)

---

## Step 3: Deploy Frontend on Render

1. **Click "New +"** → **"Static Site"**

2. **Connect same GitHub repository:** `kajarigit/event-`

3. **Configure Frontend:**
   - **Name:** `event-management-frontend`
   - **Region:** Same as backend
   - **Branch:** `master`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`

4. **Add Environment Variables:**
   ```
   VITE_API_URL=https://YOUR-BACKEND-URL.onrender.com/api
   ```
   ⚠️ **Replace `YOUR-BACKEND-URL` with actual backend URL from Step 2**

5. **Click "Create Static Site"**

6. **Wait for deployment** (takes 2-5 minutes)

7. **Get your frontend URL** (e.g., `https://event-management-frontend.onrender.com`)

---

## Step 4: Update CORS (IMPORTANT!)

After both are deployed, update the backend environment variable:

1. Go to backend service on Render
2. Click "Environment" tab
3. Update `CORS_ORIGIN` to your frontend URL:
   ```
   CORS_ORIGIN=https://event-management-frontend.onrender.com
   ```
4. Click "Save Changes" (will auto-redeploy)

---

## Step 5: Seed Database (First Time Only)

1. Go to backend service on Render
2. Click "Shell" tab (opens terminal)
3. Run:
   ```bash
   node seed-postgres.js
   ```

---

## 🎉 Your App is Live!

**Frontend:** `https://event-management-frontend.onrender.com`
**Backend:** `https://event-management-backend.onrender.com`

### Test Credentials:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@event.com | Password@123 |
| Student | rahul@student.com | Student@123 |
| Volunteer | volunteer@event.com | Volunteer@123 |
| Stall Owner | owner@event.com | Owner@123 |

---

## 📱 Camera Access

✅ **HTTPS Enabled by default on Render!**
- Camera will work on both laptop and phone
- No ngrok needed
- Access from any device using the public URL

---

## ⚠️ Important Notes

### Free Tier Limitations:
- Backend spins down after 15 minutes of inactivity
- First request after inactivity takes 30-60 seconds
- 750 hours/month free (enough for testing)

### To Upgrade (Optional):
- Go to service settings
- Change instance type from "Free" to "Starter" ($7/month)
- Gets persistent instances with no spin-down

---

## 🔧 Troubleshooting

### Backend not connecting to database:
- Check environment variables are correct
- Ensure `DB_SSL=true` is set
- Check Aiven database is accessible from Render IPs

### Frontend can't reach backend:
- Verify `VITE_API_URL` points to correct backend URL
- Check CORS_ORIGIN is set to frontend URL
- Look at browser console for errors

### Database not seeded:
- Run seed script from Render Shell
- Check logs for errors

### 500 Errors:
- Check backend logs in Render dashboard
- Look for database connection errors
- Verify all environment variables are set

---

## 📊 Monitoring

**View Logs:**
1. Go to service in Render dashboard
2. Click "Logs" tab
3. See real-time application logs

**Check Metrics:**
- CPU usage
- Memory usage
- Request count
- Response times

---

## 🔄 Updating Your App

**Auto-deploy on Git push:**
1. Make changes locally
2. Commit: `git commit -am "Your changes"`
3. Push: `git push origin master`
4. Render auto-deploys both services

**Manual deploy:**
- Click "Manual Deploy" → "Deploy latest commit"

---

## 💡 Next Steps

After deployment:
1. ✅ Test login with all roles
2. ✅ Test QR code generation
3. ✅ Test camera scanning (works via HTTPS!)
4. ✅ Test check-in/check-out workflow
5. ✅ Test on mobile devices

---

## Alternative: Deploy Frontend to Vercel (Optional)

If you prefer Vercel for frontend:

```bash
cd frontend
npm install -g vercel
vercel deploy
```

Set environment variable:
```
VITE_API_URL=https://YOUR-BACKEND-URL.onrender.com/api
```

---

**Need Help?**
- Render Docs: https://render.com/docs
- Render Community: https://community.render.com
