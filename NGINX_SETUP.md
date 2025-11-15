# Nginx Reverse Proxy Setup for Event Management System

## Your Network Details
- **Server IP**: `192.168.7.20`
- **Backend Port**: `5000`
- **Nginx Port**: `80`

## Quick Start

### 1. Install Nginx (if not already installed)
Download Nginx for Windows from: https://nginx.org/en/download.html

Extract to: `C:\nginx`

### 2. Configure Nginx

Copy the `nginx.conf` file to `C:\nginx\conf\nginx.conf`

### 3. Start Nginx

```powershell
# Navigate to Nginx directory
cd C:\nginx

# Start Nginx
.\nginx.exe

# Or reload if already running
.\nginx.exe -s reload
```

### 4. Test the Setup

Open browser and visit:
- `http://192.168.7.20/` - Should show welcome message
- `http://192.168.7.20/api/` - API endpoints

### 5. Stop Nginx

```powershell
cd C:\nginx
.\nginx.exe -s stop
```

## React App Configuration

### Update your React app's API base URL:

**For development (.env.development):**
```env
REACT_APP_API_URL=http://192.168.7.20/api
```

**For production (.env.production):**
```env
REACT_APP_API_URL=http://192.168.7.20/api
```

### In your React API service file (e.g., `src/services/api.js`):

```javascript
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://192.168.7.20/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
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

export default api;
```

## API Endpoints (Access via Nginx)

### Authentication
- `POST http://192.168.7.20/api/auth/register`
- `POST http://192.168.7.20/api/auth/login`
- `GET http://192.168.7.20/api/auth/me`

### Admin
- `GET http://192.168.7.20/api/admin/events`
- `POST http://192.168.7.20/api/admin/events`
- `GET http://192.168.7.20/api/admin/users`

### Student
- `GET http://192.168.7.20/api/student/events`
- `GET http://192.168.7.20/api/student/stalls`
- `POST http://192.168.7.20/api/student/feedback`

### Scan
- `POST http://192.168.7.20/api/scan/student`
- `POST http://192.168.7.20/api/scan/stall`

## Mobile Access

### Same Network
If your phone is on the same Wi-Fi network (192.168.7.x):
- Direct access: `http://192.168.7.20/api`

### Different Network (Using LocalTunnel or Ngrok)

**Option 1: LocalTunnel**
```powershell
# Install localtunnel (if not installed)
npm install -g localtunnel

# Tunnel port 80 (Nginx)
lt --port 80 --subdomain your-event-app

# You'll get a URL like: https://your-event-app.loca.lt
```

**Option 2: Ngrok**
```powershell
# Download ngrok from https://ngrok.com/

# Tunnel port 80
ngrok http 80

# You'll get a URL like: https://abc123.ngrok.io
```

## Troubleshooting

### Check if Nginx is running
```powershell
netstat -ano | findstr :80
```

### Check if Backend is running
```powershell
netstat -ano | findstr :5000
```

### View Nginx Logs
- Error log: `C:\nginx\logs\error.log`
- Access log: `C:\nginx\logs\access.log`

### Common Issues

1. **Port 80 already in use**
   - Change `listen 80;` to `listen 8080;` in nginx.conf
   - Update API URL to `http://192.168.7.20:8080/api`

2. **502 Bad Gateway**
   - Ensure backend is running on port 5000
   - Check backend logs

3. **CORS Errors**
   - Already configured in nginx.conf
   - Verify browser console for specific errors

## Testing the Complete Setup

```powershell
# 1. Start Backend (if not running)
cd C:\Users\Administrator\Desktop\test\new-try\try1\event\backend
npm start

# 2. Start Nginx (in new terminal)
cd C:\nginx
.\nginx.exe

# 3. Test API
curl http://192.168.7.20/api/
```

## For React Development Server

If you're running React dev server (port 3000), you can proxy through it:

**package.json (React app):**
```json
{
  "proxy": "http://192.168.7.20"
}
```

Or use the .env file approach mentioned above.
