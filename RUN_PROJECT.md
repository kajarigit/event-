# 🚀 Run Your Event Management Project

## ✅ Pre-Flight Check

- ✅ Backend Login API is **WORKING** (tested successfully!)
- ✅ Database is **CONNECTED** (Aiven PostgreSQL)
- ✅ Admin account exists: `admin@event.com / Password@123`
- ✅ Database has 55 students, 2 events, 3 stalls

---

## 🎯 Quick Start (2 Steps)

### Step 1: Start Backend Server

Open **PowerShell Terminal 1**:

```powershell
cd C:\Users\Administrator\Desktop\test\new-try\try1\event\backend
npm start
```

**Expected Output:**
```
Server running in development mode on port 5000
PostgreSQL Connected: pg-37cec3d3-sourav092002-bfa7.k.aivencloud.com
All models synced successfully
```

✅ **Backend is ready at:** `http://192.168.7.20:5000`

---

### Step 2: Start Frontend Server

Open **PowerShell Terminal 2** (NEW WINDOW):

```powershell
cd C:\Users\Administrator\Desktop\test\new-try\try1\event\frontend
npm run dev
```

**Expected Output:**
```
VITE v5.x.x ready in XXX ms

➜  Local:   http://localhost:3000/
➜  Network: http://192.168.7.20:3000/
```

✅ **Frontend is ready at:** `http://192.168.7.20:3000`

---

## 🔑 Login Credentials

### Admin Account
- **Email:** `admin@event.com`
- **Password:** `Password@123`
- **Dashboard:** `/admin`

### Student Account (Example)
- **Email:** `rahul@student.com`
- **Password:** `Student@123`
- **Dashboard:** `/student`

---

## 📱 Access from Phone (Same Wi-Fi)

1. Make sure your phone is connected to the **same Wi-Fi network**
2. Open browser on phone
3. Go to: **`http://192.168.7.20:3000`**
4. Login with credentials above

---

## 🔥 Firewall Configuration

**Port 5000 (Backend):** ✅ Already configured
**Port 3000 (Frontend):** ⚠️ Optional - may need firewall rule

If you can't access from phone, run this in **Administrator PowerShell**:

```powershell
New-NetFirewallRule -DisplayName "React Frontend - Event Management" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow -Profile Any
```

---

## 🧪 Test Everything is Working

### 1. Test Backend Health
Open browser: `http://192.168.7.20:5000/health`

**Expected:**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2025-11-15T..."
}
```

### 2. Test Frontend
Open browser: `http://192.168.7.20:3000`

**Expected:** Login page with Event Management System header

### 3. Test Login
1. Enter email: `admin@event.com`
2. Enter password: `Password@123`
3. Click "Sign in"
4. Should redirect to `/admin` dashboard

---

## 📊 Available URLs

### Frontend (React/Vite)
- **Laptop:** http://localhost:3000
- **Network:** http://192.168.7.20:3000

### Backend API (Express/Node.js)
- **Laptop:** http://localhost:5000
- **Network:** http://192.168.7.20:5000
- **API Base:** http://192.168.7.20:5000/api
- **Health Check:** http://192.168.7.20:5000/health

### Database (Aiven PostgreSQL)
- **Host:** pg-37cec3d3-sourav092002-bfa7.k.aivencloud.com:19044
- **Database:** defaultdb
- **SSL:** Required

---

## 🐛 Troubleshooting

### Problem: "Login failed" or no response

**Check:**
1. Is backend running? (Check Terminal 1)
2. Is frontend running? (Check Terminal 2)
3. Are you using correct credentials?
   - ✅ `admin@event.com / Password@123`
   - ❌ NOT `admin@example.com / admin123`

**Solution:**
- Restart both servers
- Clear browser cache and localStorage
- Check browser console (F12) for errors

### Problem: Can't access from phone

**Check:**
1. Is phone on same Wi-Fi network?
2. Is Windows Firewall blocking port 3000?
3. Try accessing backend directly: `http://192.168.7.20:5000/health`

**Solution:**
```powershell
# Run as Administrator
New-NetFirewallRule -DisplayName "Frontend - Port 3000" -LocalPort 3000 -Protocol TCP -Action Allow
```

### Problem: Database sync takes too long

**Already Fixed!** ✅ 
The `sync({ alter: true })` is commented out. Startup should be fast now.

### Problem: CORS errors in browser console

**Already Fixed!** ✅
Backend `.env` has `CORS_ORIGIN=*`

---

## 🛑 Stopping the Servers

**Stop Backend:** Press `Ctrl + C` in Terminal 1  
**Stop Frontend:** Press `Ctrl + C` in Terminal 2

---

## 📝 Summary

✅ Backend works perfectly (tested!)  
✅ Login API returns tokens correctly  
✅ Database is connected and populated  
✅ Frontend configuration is correct  

**Just start both servers and login with:** `admin@event.com / Password@123`

🎉 **You're ready to go!**
