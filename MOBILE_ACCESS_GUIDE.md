# 📱 Mobile Access Guide - Event Management System

## 🌐 How to Access from Your Phone

### Prerequisites
✅ Backend and Frontend servers running
✅ Phone connected to SAME Wi-Fi network as your computer
✅ Windows Firewall configured (automated by start script)

---

## 🚀 Quick Start

### Step 1: Start the Servers

Run the startup script (as Administrator):

```powershell
cd C:\Users\Administrator\Desktop\test\new-try\try1\event
.\start-fullstack.ps1
```

This will:
- ✅ Configure Windows Firewall automatically
- ✅ Start Backend server (port 5000)
- ✅ Start Frontend server (port 3000)
- ✅ Start/Configure Nginx (port 80) if installed
- ✅ Display all access URLs

### Step 2: Find Your Access URLs

After running the script, you'll see:

```
📱 Access URLs (Phone/Computer)
================================

🌐 Via Nginx (RECOMMENDED):
   Full App:  http://192.168.7.20
   API Only:  http://192.168.7.20/api

🔗 Direct Access:
   Frontend:  http://192.168.7.20:3000
   Backend:   http://192.168.7.20:5000/api
```

### Step 3: Access from Phone

1. **Connect to Wi-Fi**: Ensure phone is on same network
2. **Open Browser**: Any browser (Chrome, Safari, etc.)
3. **Enter URL**:
   - **With Nginx**: `http://192.168.7.20`
   - **Without Nginx**: `http://192.168.7.20:3000`

---

## 🎯 Different Access Methods

### Option 1: Via Nginx (Cleanest URLs) ⭐ RECOMMENDED

**Requirements**: Nginx installed at `C:\nginx`

**URLs**:
- Frontend: `http://192.168.7.20`
- API: `http://192.168.7.20/api`

**Advantages**:
- Clean URLs (no port numbers)
- Single entry point
- Production-like setup
- Automatic routing

**Setup**:
1. Download Nginx: https://nginx.org/en/download.html
2. Extract to `C:\nginx`
3. Run `start-fullstack.ps1` (auto-configures)

---

### Option 2: Direct Access (No Nginx)

**URLs**:
- Frontend: `http://192.168.7.20:3000`
- API: `http://192.168.7.20:5000/api`

**Advantages**:
- No additional software needed
- Direct connection
- Easier debugging

**Setup**:
1. Just run `start-fullstack.ps1`
2. Access frontend on port 3000

---

## 🔧 Configuration Details

### Frontend Configuration

The frontend is configured to work with your network IP automatically.

**Current Setup** (`.env.local`):
```env
VITE_API_URL=http://192.168.7.20:5000/api
```

**With Nginx** (`.env.nginx`):
```env
VITE_API_URL=http://192.168.7.20/api
```

### Backend Configuration

**Current Setup** (`.env`):
```env
HOST=0.0.0.0  # Allows network access
PORT=5000
CORS_ORIGIN=*  # Allows all origins (dev only)
```

### Vite Configuration

**Updated** (`vite.config.js`):
```javascript
server: {
  port: 3000,
  host: '0.0.0.0',  // Allow network access
  cors: true,
}
```

---

## 🛠️ Manual Setup (If Script Doesn't Work)

### 1. Configure Windows Firewall

```powershell
# Allow Backend (port 5000)
New-NetFirewallRule -DisplayName "Node Backend" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow

# Allow Frontend (port 3000)
New-NetFirewallRule -DisplayName "React Frontend" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow

# Allow Nginx (port 80)
New-NetFirewallRule -DisplayName "Nginx" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow
```

### 2. Start Backend

```powershell
cd C:\Users\Administrator\Desktop\test\new-try\try1\event\backend
npm start
```

### 3. Start Frontend

```powershell
cd C:\Users\Administrator\Desktop\test\new-try\try1\event\frontend
npm run dev
```

### 4. Start Nginx (Optional)

```powershell
cd C:\nginx
.\nginx.exe
```

---

## 📱 Testing from Phone

### Test Backend API

Open phone browser and visit:
```
http://192.168.7.20:5000/api/
```

You should see API response or JSON.

### Test Frontend

Open phone browser and visit:
```
http://192.168.7.20:3000
```

or with Nginx:
```
http://192.168.7.20
```

You should see the login page.

### Test Login

**Credentials**:
- Email: `admin@event.com`
- Password: `Password@123`

---

## 🔍 Troubleshooting

### Can't Access from Phone

**1. Check Network Connection**
```
- Phone and PC on same Wi-Fi? ✓
- Not using VPN on phone? ✓
- Not using Mobile Data? ✓
```

**2. Verify Servers Running**
```powershell
# Check backend (port 5000)
Get-NetTCPConnection -LocalPort 5000

# Check frontend (port 3000)
Get-NetTCPConnection -LocalPort 3000

# Check Nginx (port 80)
Get-NetTCPConnection -LocalPort 80
```

**3. Test from PC First**
```
http://192.168.7.20:3000  (Frontend)
http://192.168.7.20:5000/api  (Backend)
```

If doesn't work on PC, it won't work on phone!

**4. Check Windows Firewall**
```powershell
# List firewall rules
Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*Event*"}

# If missing, run start-fullstack.ps1 again
```

**5. Verify IP Address**
```powershell
# Get your current IP
ipconfig | findstr IPv4

# Should be 192.168.7.20
# If changed, update .env files
```

---

## 🌐 Different Network Scenarios

### Scenario 1: Same Wi-Fi Network ✅ (Current Setup)
- **Works**: Direct access via IP
- **URL**: `http://192.168.7.20:3000`
- **No configuration needed**

### Scenario 2: Different Wi-Fi Network ❌
- **Doesn't work**: Can't reach local IP
- **Solution**: Use LocalTunnel or Ngrok

### Scenario 3: Mobile Data ❌
- **Doesn't work**: No local network access
- **Solution**: Use LocalTunnel or Ngrok

---

## 🔒 External Access (Different Networks)

### Using LocalTunnel

```powershell
# Install
npm install -g localtunnel

# Tunnel Frontend (in new terminal)
lt --port 3000 --subdomain event-frontend

# Tunnel Backend (in new terminal)
lt --port 5000 --subdomain event-backend

# Access from anywhere:
Frontend: https://event-frontend.loca.lt
Backend: https://event-backend.loca.lt/api
```

**Update Frontend .env**:
```env
VITE_API_URL=https://event-backend.loca.lt/api
```

### Using Ngrok (Alternative)

```powershell
# Download: https://ngrok.com/download

# Tunnel Frontend
ngrok http 3000

# Tunnel Backend
ngrok http 5000
```

---

## 📊 Port Reference

| Service | Port | URL Example |
|---------|------|-------------|
| Frontend (Vite) | 3000 | `http://192.168.7.20:3000` |
| Backend (Node) | 5000 | `http://192.168.7.20:5000/api` |
| Nginx | 80 | `http://192.168.7.20` |
| Database (Aiven) | 19044 | Cloud-hosted (already configured) |

---

## ✅ Checklist

Before testing on phone:

- [ ] Backend running (`npm start` in backend folder)
- [ ] Frontend running (`npm run dev` in frontend folder)
- [ ] Windows Firewall configured (automatic via script)
- [ ] Phone on same Wi-Fi network
- [ ] Tested URLs work on PC browser first
- [ ] Know your IP address (192.168.7.20)
- [ ] Have login credentials ready

---

## 🎯 Quick Reference

### On Your Computer
```powershell
# Start everything
.\start-fullstack.ps1

# Check IP
ipconfig | findstr IPv4

# Check what's running
netstat -ano | findstr "3000 5000 80"
```

### On Your Phone
```
Browser URL: http://192.168.7.20:3000
Login: admin@event.com / Password@123
```

### With Nginx
```
Browser URL: http://192.168.7.20
Login: admin@event.com / Password@123
```

---

## 💡 Tips

1. **Save URL as Bookmark**: Add to home screen on phone
2. **Use Nginx**: Cleaner URLs, easier to remember
3. **Static IP**: Consider setting static IP for your PC
4. **Network Name**: Remember which Wi-Fi network works
5. **Test First**: Always test on PC before phone

---

## 📞 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Can't reach this page" | Check if servers are running |
| "Connection refused" | Check Windows Firewall |
| "Different IP" | Update .env files with new IP |
| "Works on PC not phone" | Verify same Wi-Fi network |
| "API errors" | Check backend is running on 5000 |
| "Blank page" | Clear phone browser cache |

---

## 🎉 Success!

Once you can access the app on your phone:

✅ QR code scanning works
✅ Voting/feedback works
✅ Real-time updates work
✅ All features accessible

**Your app is now mobile-ready!** 📱

---

## Next Steps

1. **Test all features on phone**
2. **Add to home screen** (appears like native app)
3. **Test QR code scanner** with camera
4. **When satisfied**, deploy to EC2 for production

**Ready for Production?** See `EC2_DEPLOYMENT_GUIDE.md`
