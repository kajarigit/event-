# Local Development Guide - Event Management System

## Your Current Setup

- **Local IP**: 192.168.7.20
- **Backend Port**: 5000
- **Database**: PostgreSQL on Aiven Cloud (already configured)

## Quick Start (Local Development)

### 1. Start Backend Server

```powershell
# Open PowerShell in the event/backend directory
cd C:\Users\Administrator\Desktop\test\new-try\try1\event\backend

# Use local environment file
Copy-Item ..\.env.local .env

# Start the server
npm start

# Or for development with auto-reload
npm run dev
```

Backend will be available at:
- `http://localhost:5000/api`
- `http://192.168.7.20:5000/api` (for other devices on your network)

### 2. Setup Nginx (Optional but Recommended)

#### Install Nginx
1. Download: https://nginx.org/en/download.html
2. Extract to: `C:\nginx`

#### Configure Nginx
```powershell
# Copy local Nginx config
Copy-Item C:\Users\Administrator\Desktop\test\new-try\try1\event\nginx-local.conf C:\nginx\conf\nginx.conf

# Start Nginx
cd C:\nginx
.\nginx.exe

# To reload after config changes
.\nginx.exe -s reload

# To stop
.\nginx.exe -s stop
```

With Nginx, API will be available at:
- `http://192.168.7.20/api`

### 3. Quick Start Script

```powershell
# Run the automated setup script (as Administrator)
cd C:\Users\Administrator\Desktop\test\new-try\try1\event
.\start-server.ps1
```

This script will:
- ✓ Check if backend is running
- ✓ Start backend if needed
- ✓ Configure and start Nginx (if installed)
- ✓ Show your access URLs
- ✓ Test API connection

## React Frontend Configuration

### For Local Development

Create or update `.env.local` in your React app:

```env
# Without Nginx (direct backend access)
REACT_APP_API_URL=http://192.168.7.20:5000/api

# With Nginx (recommended)
REACT_APP_API_URL=http://192.168.7.20/api

# For localhost only
REACT_APP_API_URL=http://localhost:5000/api
```

### API Service Setup (React)

**src/services/api.js**:
```javascript
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://192.168.7.20:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error.message);
  }
);

export default api;
```

### Example API Calls

**Auth Service (src/services/authService.js)**:
```javascript
import api from './api';

export const authService = {
  // Login
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.success && response.token) {
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.data));
    }
    return response;
  },

  // Register
  register: async (userData) => {
    return await api.post('/auth/register', userData);
  },

  // Get current user
  getMe: async () => {
    return await api.get('/auth/me');
  },

  // Logout
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
};
```

**Student Service (src/services/studentService.js)**:
```javascript
import api from './api';

export const studentService = {
  // Get events
  getEvents: async () => {
    return await api.get('/student/events');
  },

  // Get stalls
  getStalls: async (eventId) => {
    return await api.get(`/student/stalls?eventId=${eventId}`);
  },

  // Submit feedback
  submitFeedback: async (feedbackData) => {
    return await api.post('/student/feedback', feedbackData);
  },

  // Cast vote
  castVote: async (voteData) => {
    return await api.post('/student/vote', voteData);
  },

  // Get my votes
  getMyVotes: async (eventId) => {
    return await api.get(`/student/votes/${eventId}`);
  },

  // Get QR code
  getQRCode: async (eventId) => {
    return await api.get(`/student/qrcode/${eventId}`);
  },
};
```

**Admin Service (src/services/adminService.js)**:
```javascript
import api from './api';

export const adminService = {
  // Events
  getEvents: async () => {
    return await api.get('/admin/events');
  },

  createEvent: async (eventData) => {
    return await api.post('/admin/events', eventData);
  },

  updateEvent: async (id, eventData) => {
    return await api.put(`/admin/events/${id}`, eventData);
  },

  deleteEvent: async (id) => {
    return await api.delete(`/admin/events/${id}`);
  },

  // Users
  getUsers: async (role, page = 1, limit = 10) => {
    return await api.get(`/admin/users?role=${role}&page=${page}&limit=${limit}`);
  },

  // Stalls
  getStalls: async (eventId) => {
    return await api.get(`/admin/stalls?eventId=${eventId}`);
  },

  // Analytics
  getEventOverview: async (eventId) => {
    return await api.get(`/admin/analytics/overview/${eventId}`);
  },
};
```

## Testing the API

### Using PowerShell

```powershell
# Test basic connectivity
Invoke-WebRequest -Uri "http://192.168.7.20:5000/api/" -Method GET

# Login (update with actual credentials)
$body = @{
    email = "admin@event.com"
    password = "Password@123"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://192.168.7.20:5000/api/auth/login" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"

$response.Content | ConvertFrom-Json

# Get events with token
$token = "your-jwt-token-here"
$headers = @{
    "Authorization" = "Bearer $token"
}

Invoke-WebRequest -Uri "http://192.168.7.20:5000/api/admin/events" `
    -Method GET `
    -Headers $headers
```

### Using cURL (Git Bash or WSL)

```bash
# Test API
curl http://192.168.7.20:5000/api/

# Login
curl -X POST http://192.168.7.20:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@event.com","password":"Password@123"}'

# Get events (with token)
curl http://192.168.7.20:5000/api/admin/events \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Using Postman

1. Import this collection:

**Base URL**: `http://192.168.7.20:5000/api` (or `http://192.168.7.20/api` with Nginx)

**Headers** (for authenticated requests):
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Sample Requests**:
- POST `/auth/login` - Body: `{"email":"admin@event.com","password":"Password@123"}`
- GET `/auth/me`
- GET `/admin/events`
- POST `/admin/events` - Body: Event data
- GET `/student/events`
- POST `/student/vote` - Body: Vote data

## Mobile Testing (Same Network)

### Access from Phone/Tablet

If your phone is connected to the same Wi-Fi network (192.168.7.x):

1. **Update React app .env**:
   ```env
   REACT_APP_API_URL=http://192.168.7.20/api
   ```

2. **Start React dev server**:
   ```powershell
   npm start -- --host 0.0.0.0
   ```

3. **Access from phone**:
   - Backend API: `http://192.168.7.20:5000/api`
   - React App: `http://192.168.7.20:3000`

### Using LocalTunnel (For External Access)

```powershell
# Install localtunnel globally
npm install -g localtunnel

# Tunnel backend (port 5000)
lt --port 5000 --subdomain event-backend-test

# Or tunnel Nginx (port 80) - Requires admin privileges
lt --port 80 --subdomain event-app-test

# You'll get a URL like: https://event-app-test.loca.lt
```

Update React .env:
```env
REACT_APP_API_URL=https://event-backend-test.loca.lt/api
```

## Development Workflow

### 1. Start Backend
```powershell
cd backend
npm run dev  # With auto-reload
```

### 2. Watch Logs
```powershell
# In backend directory
Get-Content -Path "logs\app.log" -Wait
```

### 3. Test Database Connection
```powershell
cd backend
node -e "const db = require('./src/config/database.sequelize'); db.authenticate().then(() => console.log('Connected')).catch(console.error);"
```

### 4. Check Running Processes
```powershell
# Check if backend is running
Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue

# Check if Nginx is running
Get-NetTCPConnection -LocalPort 80 -ErrorAction SilentlyContinue

# See all Node processes
Get-Process node
```

## Common Issues & Solutions

### Port Already in Use
```powershell
# Find process using port 5000
Get-NetTCPConnection -LocalPort 5000 | Select-Object -Property OwningProcess
Get-Process -Id <PID>

# Kill the process
Stop-Process -Id <PID> -Force
```

### Cannot Access from Another Device
1. Check Windows Firewall:
   ```powershell
   # Allow port 5000
   New-NetFirewallRule -DisplayName "Node Backend" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow
   
   # Allow port 80 (Nginx)
   New-NetFirewallRule -DisplayName "Nginx" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow
   ```

2. Verify backend is listening on 0.0.0.0:
   - Check `.env`: `HOST=0.0.0.0`

### Database Connection Errors
```powershell
# Test database connection
cd backend
node src/scripts/test-db-connection.js
```

### Nginx Won't Start
```powershell
# Check if port 80 is in use (might be IIS or other service)
Get-NetTCPConnection -LocalPort 80

# Test Nginx config
cd C:\nginx
.\nginx.exe -t

# View Nginx error logs
Get-Content C:\nginx\logs\error.log
```

## Environment Files Summary

| File | Usage |
|------|-------|
| `.env.local` | Local development (192.168.7.20) |
| `.env.production` | EC2 production deployment |
| `backend/.env` | Currently active (copy from above) |

## Next Steps

After testing locally:
1. Verify all API endpoints work
2. Test with React frontend
3. Test mobile access (same network)
4. Review EC2_DEPLOYMENT_GUIDE.md for production deployment

## Quick Reference

**Your URLs**:
- Backend (direct): `http://192.168.7.20:5000/api`
- Backend (via Nginx): `http://192.168.7.20/api`
- Database: Aiven Cloud PostgreSQL (already configured)

**Default Credentials**:
- Admin: `admin@event.com` / `Password@123`

**Important Ports**:
- Backend: 5000
- Nginx: 80
- PostgreSQL: 19044 (Aiven Cloud)

**Logs Location**:
- Backend: `backend/logs/app.log`
- Nginx: `C:\nginx\logs\error.log` & `access.log`
