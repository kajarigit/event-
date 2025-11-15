# 🚀 Quick Start Guide - Event Management System (MERN)

Follow these steps to get the Event Management System running on your machine.

---

## ✅ Prerequisites

Before starting, make sure you have:

- **Node.js 18+** (Download from [nodejs.org](https://nodejs.org))
- **MongoDB 6+** (Local installation or MongoDB Atlas account)
- **Git** (Optional, for version control)

---

## 📦 Step 1: Install Backend Dependencies

Open PowerShell or Command Prompt and navigate to the backend folder:

```powershell
cd c:\Users\Administrator\Desktop\test\new-try\try1\event\backend
npm install
```

This will install all required backend packages (Express, Mongoose, JWT, etc.).

---

## 🔧 Step 2: Configure Backend Environment

1. Copy the example environment file:

```powershell
copy .env.example .env
```

2. Open `.env` in a text editor and configure:

```env
NODE_ENV=development
PORT=5000

# Local MongoDB
MONGO_URI=mongodb://localhost:27017/event-management

# OR use MongoDB Atlas (recommended)
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/event-management

# Generate a random secret (or use this for testing)
JWT_SECRET=your-super-secret-jwt-key-change-in-production-minimum-32-chars
JWT_EXPIRE=7d

# Optional: Redis for caching (can skip for now)
# REDIS_URL=redis://localhost:6379
```

**For MongoDB Atlas (Free Tier):**
1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create a database user
4. Whitelist your IP (or use `0.0.0.0/0` for testing)
5. Copy the connection string to `MONGO_URI`

---

## 🌱 Step 3: Seed the Database

Populate the database with sample data:

```powershell
npm run seed
```

This creates:
- 1 admin user (`admin@example.com` / `admin123`)
- 3 students
- 2 volunteers
- 1 active event
- 10 sample stalls

---

## ▶️ Step 4: Start the Backend Server

```powershell
npm run dev
```

You should see:
```
Server running in development mode on port 5000
MongoDB Connected: ...
```

**Backend is now running at:** `http://localhost:5000`

Test it by visiting: `http://localhost:5000/health`

---

## 📦 Step 5: Install Frontend Dependencies

Open a **NEW** PowerShell window and navigate to the frontend folder:

```powershell
cd c:\Users\Administrator\Desktop\test\new-try\try1\event\frontend
npm install
```

---

## 🔧 Step 6: Configure Frontend Environment

1. Copy the example file:

```powershell
copy .env.example .env
```

2. The default configuration should work:

```env
VITE_API_URL=http://localhost:5000/api
```

---

## ▶️ Step 7: Start the Frontend Development Server

```powershell
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

**Frontend is now running at:** `http://localhost:3000`

---

## 🎉 Step 8: Login and Test

1. Open your browser and go to: `http://localhost:3000`

2. Login with default credentials:

   **Admin:**
   - Email: `admin@example.com`
   - Password: `admin123`

   **Student:**
   - Email: `rahul@student.com`
   - Password: `student123`

   **Volunteer:**
   - Email: `volunteer1@example.com`
   - Password: `volunteer123`

---

## 📋 Summary of Running Services

| Service  | URL                      | Status |
|----------|--------------------------|--------|
| Backend  | http://localhost:5000    | ✅     |
| Frontend | http://localhost:3000    | ✅     |
| MongoDB  | localhost:27017 or Atlas | ✅     |

---

## 🛠️ Troubleshooting

### Backend won't start

**Error:** `MongooseServerSelectionError`
- **Fix:** Check if MongoDB is running (local) or verify Atlas connection string

**Error:** `Port 5000 is already in use`
- **Fix:** Change `PORT=5001` in backend `.env` file

### Frontend won't start

**Error:** `ELIFECYCLE Command failed`
- **Fix:** Delete `node_modules` and `package-lock.json`, then run `npm install` again

**Error:** `Failed to fetch`
- **Fix:** Make sure backend is running on port 5000

### Login fails

**Error:** `Network Error` or `401 Unauthorized`
- **Fix:** Verify backend is running and `VITE_API_URL` is correct in frontend `.env`

---

## 📚 Next Steps

1. **Explore the Student Dashboard:**
   - Generate your QR code
   - View check-in status
   - Cast votes (requires check-in)

2. **Try the Admin Dashboard:**
   - View event overview
   - Manage users, stalls, and events
   - Export reports

3. **Test the Volunteer Scanner:**
   - QR scanning requires camera integration (placeholder UI is shown)

---

## 🎯 Key Features Implemented

✅ JWT authentication with auto-refresh  
✅ Role-based dashboards (Admin/Student/Volunteer)  
✅ QR code generation for students  
✅ Check-in/out system (backend ready)  
✅ Voting system (rank 1-3)  
✅ Feedback system (one per stall)  
✅ Analytics & reporting  
✅ Bulk CSV upload  
✅ Real-time status updates  

---

## 🔐 Default Credentials

| Role      | Email                      | Password    |
|-----------|----------------------------|-------------|
| Admin     | admin@example.com          | admin123    |
| Student 1 | rahul@student.com          | student123  |
| Student 2 | priya@student.com          | student123  |
| Student 3 | amit@student.com           | student123  |
| Volunteer | volunteer1@example.com     | volunteer123|

---

## 📖 Documentation

- **Backend README:** `backend/README.md`
- **Frontend README:** `frontend/README.md`
- **Main README:** `README.md`

---

## 🚢 Production Deployment

### Backend (Railway/Render/Heroku)

1. Push code to GitHub
2. Connect repository to hosting platform
3. Set environment variables (from `.env`)
4. Deploy from `backend/` directory

### Frontend (Vercel/Netlify)

```bash
cd frontend
npm run build
# Deploy dist/ folder
```

---

## 💡 Need Help?

- Check the README files in backend and frontend folders
- Review the API documentation at `http://localhost:5000/api-docs` (if Swagger is configured)
- Check browser console and terminal logs for errors

---

**Happy Coding! 🎊**
