# 🚀 Quick Start Guide - No Nginx Required!

## ✅ Everything is Already Configured!

Your backend and frontend are ready to run and access from any device on your network.

---

## 📱 Step-by-Step: Run and Access

### Step 1: Start Backend Server

```powershell
# Open PowerShell Terminal 1
cd C:\Users\Administrator\Desktop\test\new-try\try1\event\backend
npm start
```

**You should see:**
```
Server running in development mode on port 5000
PostgreSQL Connected
All models synced successfully
```

**Backend is now running on:**
- Your computer: `http://localhost:5000`
- Your network: `http://192.168.7.20:5000`

---

### Step 2: Start Frontend Server

```powershell
# Open PowerShell Terminal 2 (new window)
cd C:\Users\Administrator\Desktop\test\new-try\try1\event\frontend
npm run dev
```

**You should see:**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: http://192.168.7.20:3000/
  ➜  press h to show help
```

**Frontend is now running on:**
- Your computer: `http://localhost:3000`
- Your network: `http://192.168.7.20:3000`

---

## 🌐 Access URLs

### From Your Laptop (This Computer)

**Option 1: Localhost**
```
http://localhost:3000
```

**Option 2: Network IP**
```
http://192.168.7.20:3000
```

### From Your Phone (Same Wi-Fi)

**Make sure your phone is connected to the SAME Wi-Fi network!**

```
http://192.168.7.20:3000
```

**That's it!** 🎉

---

## 📋 Test Credentials

Once the app loads:

- **Email**: `admin@event.com`
- **Password**: `Password@123`

---

## ✅ Pre-Configuration Checklist

Everything below is already done for you:

- [x] Windows Firewall configured (port 5000 allowed)
- [x] Backend configured with `HOST=0.0.0.0`
- [x] Frontend configured with `host: '0.0.0.0'` in vite.config.js
- [x] Frontend `.env.local` set to: `VITE_API_URL=http://192.168.7.20:5000/api`
- [x] CORS enabled for all origins (`CORS_ORIGIN=*`)

---

## 🔥 One-Command Start (Easiest!)

I've created an automated script for you. Just run:

```powershell
cd C:\Users\Administrator\Desktop\test\new-try\try1\event
.\start-fullstack.ps1
```

This will:
1. ✅ Configure Windows Firewall automatically
2. ✅ Start Backend in a new window
3. ✅ Start Frontend in a new window
4. ✅ Display all access URLs
5. ✅ Show your network IP

---

## 📱 Using on Your Phone

### Step-by-Step on Phone:

1. **Connect to Wi-Fi**
   - Same network as your laptop
   - Check Wi-Fi name matches your laptop's network

2. **Open Browser**
   - Chrome, Safari, or any browser

3. **Type the URL**
   ```
   http://192.168.7.20:3000
   ```

4. **Login**
   - Email: `admin@event.com`
   - Password: `Password@123`

5. **Done!** 🎉

---

## 🛠️ Troubleshooting

### "Can't access from phone"

**Solution 1: Check if servers are running**
```powershell
# Check backend
Get-NetTCPConnection -LocalPort 5000

# Check frontend  
Get-NetTCPConnection -LocalPort 3000

# Both should show "LISTENING" state
```

**Solution 2: Test on laptop first**
```
Visit: http://192.168.7.20:3000

If this doesn't work on your laptop, it won't work on phone!
```

**Solution 3: Verify same Wi-Fi**
- Phone: Settings → Wi-Fi → Check network name
- Laptop: Should be on the same network

**Solution 4: Windows Firewall**
```powershell
# Allow port 3000 (Frontend)
New-NetFirewallRule -DisplayName "React Frontend" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow -Profile Any
```

### "Backend API errors"

**Check frontend .env.local:**
```powershell
cd frontend
Get-Content .env.local
```

Should show:
```env
VITE_API_URL=http://192.168.7.20:5000/api
```

If different, update it:
```powershell
echo "VITE_API_URL=http://192.168.7.20:5000/api" > .env.local
```

Then restart frontend (Ctrl+C and `npm run dev` again).

### "Different IP address"

If your laptop's IP changed:

```powershell
# Get current IP
ipconfig | findstr IPv4
```

Then update:
1. `frontend/.env.local` → Change `VITE_API_URL`
2. `backend/.env` → Already set to `HOST=0.0.0.0` (works for any IP)

---

## 📊 Port Reference

| Service | Port | Local URL | Network URL |
|---------|------|-----------|-------------|
| Frontend | 3000 | http://localhost:3000 | http://192.168.7.20:3000 |
| Backend | 5000 | http://localhost:5000/api | http://192.168.7.20:5000/api |

---

## 🎯 What About Nginx?

**You DON'T need Nginx for development!**

The npm package you installed (`npm install nginx`) is not useful for this. You can remove it:

```powershell
cd backend
npm uninstall nginx
```

**Nginx is only useful for:**
- Production deployments
- Cleaner URLs (remove port numbers)
- Load balancing

**For local development**, Vite's built-in server is perfect!

---

## 🚀 Production Setup (Later)

When you're ready to deploy to production:

1. **Deploy to EC2** (see `EC2_DEPLOYMENT_GUIDE.md`)
2. **Install real Nginx** on the server (not via npm)
3. **Get a domain name** (optional)
4. **Setup SSL certificate**

---

## 💡 Quick Commands

### Start Backend
```powershell
cd backend
npm start
```

### Start Frontend
```powershell
cd frontend
npm run dev
```

### Start Both (Automated)
```powershell
.\start-fullstack.ps1
```

### Stop Servers
- Press `Ctrl + C` in each terminal
- Or close the terminal windows

### Check What's Running
```powershell
netstat -ano | findstr "3000 5000"
```

### Get Your IP
```powershell
ipconfig | findstr IPv4
```

---

## 📱 Mobile Features to Test

Once accessed on phone:

✅ **Login/Logout**
✅ **Dashboard navigation**  
✅ **QR Code scanning** (uses phone camera!)
✅ **Event browsing**
✅ **Voting system**
✅ **Feedback submission**
✅ **Attendance tracking**

---

## 🎉 Summary

### To Run and Access:

1. **Terminal 1**: `cd backend && npm start`
2. **Terminal 2**: `cd frontend && npm run dev`
3. **Laptop**: Visit `http://localhost:3000`
4. **Phone**: Visit `http://192.168.7.20:3000` (same Wi-Fi!)

### Or Use Automated Script:

```powershell
.\start-fullstack.ps1
```

**That's all you need!** 🚀

No Nginx installation required for local development.

---

## 📞 Need Help?

**Problem**: Can't access on phone
**Solution**: Run `start-fullstack.ps1` - it configures firewall automatically

**Problem**: Different IP address
**Solution**: Update `frontend/.env.local` with new IP

**Problem**: API errors
**Solution**: Make sure backend is running on port 5000

**Problem**: Blank page
**Solution**: Clear browser cache or open in incognito mode

---

## Next Steps

1. ✅ Run the servers (backend + frontend)
2. ✅ Test on laptop: `http://localhost:3000`
3. ✅ Test on phone: `http://192.168.7.20:3000`
4. 📱 Test all mobile features
5. ☁️ When satisfied, deploy to EC2

**Happy coding!** 🎊
