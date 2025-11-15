# 🎯 One-Command Installation Script

Copy and paste these commands into PowerShell to set up the complete project.

---

## Option 1: Full Automated Setup (PowerShell)

```powershell
# Navigate to project root
cd c:\Users\Administrator\Desktop\test\new-try\try1\event

# Install backend dependencies
cd backend
npm install

# Create .env file
copy .env.example .env

# Install frontend dependencies
cd ..\frontend
npm install

# Create .env file
copy .env.example .env

# Done! Now you need to:
# 1. Edit backend/.env with your MongoDB URI
# 2. Run seed script: cd backend; npm run seed
# 3. Start backend: npm run dev (in backend folder)
# 4. Start frontend: npm run dev (in frontend folder)
```

---

## Option 2: Step-by-Step (Recommended)

### Step 1: Backend Setup

```powershell
cd c:\Users\Administrator\Desktop\test\new-try\try1\event\backend
npm install
copy .env.example .env
```

**Edit `.env` file** and set your MongoDB connection:
```env
MONGO_URI=mongodb://localhost:27017/event-management
# OR
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/event-management
```

### Step 2: Seed Database

```powershell
npm run seed
```

### Step 3: Start Backend

```powershell
npm run dev
```

Keep this terminal open. Backend runs on `http://localhost:5000`

---

### Step 4: Frontend Setup (New Terminal)

```powershell
cd c:\Users\Administrator\Desktop\test\new-try\try1\event\frontend
npm install
copy .env.example .env
npm run dev
```

Frontend runs on `http://localhost:3000`

---

## Quick Test

Open browser: `http://localhost:3000`

Login with:
- **Email:** admin@example.com
- **Password:** admin123

---

## Full Package List

### Backend Dependencies

```json
{
  "bcryptjs": "^2.4.3",
  "cors": "^2.8.5",
  "dotenv": "^16.3.1",
  "express": "^4.18.2",
  "express-rate-limit": "^7.1.5",
  "express-validator": "^7.0.1",
  "helmet": "^7.1.0",
  "joi": "^17.11.0",
  "jsonwebtoken": "^9.0.2",
  "mongoose": "^8.0.3",
  "morgan": "^1.10.0",
  "multer": "^1.4.5-lts.1",
  "papaparse": "^5.4.1",
  "qrcode": "^1.5.3",
  "uuid": "^9.0.1",
  "winston": "^3.11.0"
}
```

### Frontend Dependencies

```json
{
  "@tanstack/react-query": "^5.14.2",
  "axios": "^1.6.2",
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.20.1",
  "react-hook-form": "^7.49.2",
  "recharts": "^2.10.3",
  "qrcode.react": "^3.1.0",
  "react-hot-toast": "^2.4.1",
  "date-fns": "^3.0.0",
  "lucide-react": "^0.294.0",
  "tailwindcss": "^3.3.6"
}
```

---

## MongoDB Setup Options

### Option A: Local MongoDB

1. Download from [mongodb.com/download-center/community](https://www.mongodb.com/try/download/community)
2. Install and start MongoDB service
3. Use: `MONGO_URI=mongodb://localhost:27017/event-management`

### Option B: MongoDB Atlas (Free Tier - Recommended)

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up and create a free cluster (M0)
3. Create database user (username/password)
4. Add IP whitelist: `0.0.0.0/0` (allows all IPs - for development only!)
5. Get connection string from "Connect" → "Connect your application"
6. Update `.env`:
```env
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/event-management?retryWrites=true&w=majority
```

---

## Verify Installation

### Backend Health Check

Open browser: `http://localhost:5000/health`

Should return:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "..."
}
```

### Frontend Check

Open: `http://localhost:3000`

Should show login page.

---

## Common Issues

### Error: "Cannot find module"
```powershell
# Delete node_modules and reinstall
Remove-Item -Recurse -Force node_modules
npm install
```

### Error: "Port 5000 already in use"
```env
# Change port in backend/.env
PORT=5001
```

### Error: "MongoServerError: Authentication failed"
- Check username/password in MongoDB Atlas
- Verify connection string in `.env`

### Error: "CORS error" on frontend
- Ensure backend is running
- Check `VITE_API_URL` in frontend `.env`

---

## Post-Installation

1. ✅ Backend running on port 5000
2. ✅ Frontend running on port 3000
3. ✅ MongoDB connected
4. ✅ Sample data seeded

**You're ready to go!** 🎉

Login and explore:
- Admin Dashboard → Manage events, users, stalls
- Student Dashboard → Generate QR, view status
- Volunteer Dashboard → Scan QR codes (placeholder UI)

---

## Next Steps

1. **Customize**: Edit `.env` files with your settings
2. **Develop**: Add features or modify existing ones
3. **Deploy**: Follow deployment guides in README files

---

## Need Help?

Check these files:
- `QUICKSTART.md` - Detailed setup guide
- `backend/README.md` - Backend documentation
- `frontend/README.md` - Frontend documentation
- `PROJECT_STRUCTURE.md` - File structure overview

---

**Happy Coding! 🚀**
