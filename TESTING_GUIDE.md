# 🚀 Quick Start Guide - Run & Test

## Prerequisites
- Node.js 18+ installed
- MongoDB installed OR MongoDB Atlas account
- PowerShell (Windows) or Terminal

## 1️⃣ Install & Configure (5 minutes)

### Backend Setup
```powershell
cd c:\Users\Administrator\Desktop\test\new-try\try1\event\backend
npm install
copy .env.example .env
notepad .env
```

**Edit .env file:**
```env
# Required - MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/event-management
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/event-management

# Required - JWT Secret (change this!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-this-too

# Optional - Defaults are fine
PORT=5000
NODE_ENV=development
QR_TOKEN_EXPIRY=24h
```

### Frontend Setup
```powershell
cd c:\Users\Administrator\Desktop\test\new-try\try1\event\frontend
npm install
copy .env.example .env
notepad .env
```

**Edit .env file:**
```env
VITE_API_URL=http://localhost:5000/api
```

## 2️⃣ Seed Database (1 minute)
```powershell
cd c:\Users\Administrator\Desktop\test\new-try\try1\event\backend
npm run seed
```

**Expected Output:**
```
Database seeded successfully!
✓ 1 admin
✓ 3 students  
✓ 2 volunteers
✓ 1 event
✓ 10 stalls
```

## 3️⃣ Start Servers

### Terminal 1 - Backend
```powershell
cd c:\Users\Administrator\Desktop\test\new-try\try1\event\backend
npm run dev
```

**Should see:**
```
Server running on port 5000
MongoDB connected successfully
```

### Terminal 2 - Frontend
```powershell
cd c:\Users\Administrator\Desktop\test\new-try\try1\event\frontend
npm run dev
```

**Should see:**
```
VITE ready in XXX ms
Local: http://localhost:3000/
```

## 4️⃣ Test Features

### Open Browser
Navigate to: **http://localhost:3000**

### Test 1: Admin Login & Events Management
1. Login with: `admin@example.com` / `admin123`
2. Click **Events** in sidebar
3. Click **Add Event** button
4. Fill form:
   - Name: "Tech Fest 2025 Test"
   - Description: "Testing event creation"
   - Start Date: Pick any future date
   - Venue: "Main Hall"
5. Click **Create Event**
6. ✅ Should see success toast and new event in table
7. Click **Toggle** to make it active/inactive
8. Click **Edit** icon, change name, save
9. ✅ Should see updated name

### Test 2: Stalls Management
1. Click **Stalls** in sidebar
2. Click **Add Stall** button
3. Fill form:
   - Name: "AI & ML Stall"
   - Department: "Computer Science"
   - Description: "Artificial Intelligence demos"
   - Coordinator: "John Doe"
   - Contact: "1234567890"
4. Click **Create Stall**
5. ✅ Should see new stall in grid
6. Click **QR Code** icon on any stall
7. ✅ Should see QR code modal
8. Click **Download QR Code**
9. ✅ Should download PNG file

### Test 3: Users Management
1. Click **Users** in sidebar
2. Filter by Role: **Students**
3. ✅ Should see filtered list
4. Type in search: "rahul"
5. ✅ Should filter results
6. Click **Add User** button
7. Create a test student
8. ✅ Should see in table

### Test 4: Analytics Dashboard
1. Click **Analytics** in sidebar
2. Select Event: "Tech Fest 2025"
3. ✅ Should see 4 charts render
4. Click **Export Attendance**
5. ✅ Should download CSV file
6. Click **Export Votes**
7. ✅ Should download CSV file

### Test 5: Student Login & Voting
1. Logout (bottom of sidebar)
2. Login with: `rahul@student.com` / `student123`
3. Click **Voting** tab
4. Select Event: "Tech Fest 2025"
5. ✅ If not checked in, should see yellow warning
6. Select stalls for Rank 1, 2, 3
7. Click **Vote for Rank 1**
8. ✅ Should see success toast
9. ✅ Should see vote appear in "Your Current Votes"
10. Try voting same stall twice
11. ✅ Should NOT appear in other rank dropdowns

### Test 6: Student Feedback
1. Click **Feedback** tab
2. Select Event: "Tech Fest 2025"
3. Select a stall
4. Click on stars to rate (try 4 stars)
5. ✅ Should see hover effect and selection
6. Type comment: "Great stall!"
7. Click **Submit Feedback**
8. ✅ Should see success toast
9. ✅ Should appear in "My Feedbacks" section
10. Try submitting feedback for same stall again
11. ✅ Should get error (duplicate not allowed)

### Test 7: Student QR Code
1. Click **QR Code** tab
2. Select Event: "Tech Fest 2025"
3. ✅ Should see QR code (300x300)
4. Click **Download QR Code**
5. ✅ Should download PNG file
6. ✅ Should see expiry info (24 hours)

### Test 8: Volunteer QR Scanner
1. Logout
2. Login with: `volunteer1@example.com` / `volunteer123`
3. ✅ Should see gate assignment
4. ✅ Should see QR scanner with camera preview
5. Allow camera access when prompted
6. Point camera at student QR code (from Test 7)
7. ✅ Should see scan success with student details
8. ✅ Should see "Check IN" status
9. ✅ Should appear in "Recent Scans" panel
10. Scan same QR again after 3 seconds
11. ✅ Should see "Check OUT" status
12. ✅ Recent scans should auto-refresh

## 5️⃣ Test API Directly (Optional)

Use Postman or curl:

### Health Check
```powershell
curl http://localhost:5000/health
```

### Get Events
```powershell
curl http://localhost:5000/api/admin/events
```

### Login
```powershell
curl -X POST http://localhost:5000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"admin@example.com\",\"password\":\"admin123\"}'
```

## 6️⃣ Test Bulk Upload

### Create Test CSV for Stalls
Create `test-stalls.csv`:
```csv
name,department,description,coordinatorName,coordinatorContact
Robotics Stall,Mechanical,Robot demonstrations,Alice Smith,9876543210
Web Development,Computer Science,Web app showcase,Bob Jones,9876543211
```

### Upload
1. Go to Admin > Stalls
2. Click **Bulk Upload**
3. Select `test-stalls.csv`
4. ✅ Should see success message
5. ✅ Should see new stalls in grid

## 7️⃣ Check Database

### Using MongoDB Compass (GUI)
1. Open MongoDB Compass
2. Connect to: `mongodb://localhost:27017`
3. Select database: `event-management`
4. Browse collections:
   - users (should have 6+ documents)
   - events (should have 2+ documents)
   - stalls (should have 12+ documents)
   - votes (check after voting test)
   - feedbacks (check after feedback test)
   - attendances (check after QR scan test)
   - scanlogs (check after QR scan test)

### Using MongoDB Shell
```bash
mongosh
use event-management
db.users.countDocuments()
db.events.find().pretty()
db.votes.find().pretty()
```

## 8️⃣ Common Issues & Solutions

### Issue: "ECONNREFUSED MongoDB"
**Solution:** 
```powershell
# Start MongoDB service
net start MongoDB
# OR run mongod manually
mongod --dbpath C:\data\db
```

### Issue: "Port 5000 already in use"
**Solution:**
```powershell
# Find process using port
netstat -ano | findstr :5000
# Kill process (replace PID)
taskkill /PID <PID> /F
# OR change PORT in .env
```

### Issue: "Camera not working"
**Solution:**
- Check browser permissions
- Use HTTPS in production (HTTP works on localhost)
- Try different browser (Chrome works best)
- Check antivirus camera blocking

### Issue: "Module not found"
**Solution:**
```powershell
# Delete and reinstall
rm -r node_modules
rm package-lock.json
npm install
```

### Issue: "CORS error"
**Solution:** Check backend is running on port 5000 and frontend on 3000

## 9️⃣ Performance Testing

### Test Auto-Refresh
1. Login as student
2. Open Home tab
3. Open browser DevTools (F12)
4. Go to Network tab
5. ✅ Should see requests every 30 seconds

### Test Real-time Scan Updates
1. Login as volunteer in browser 1
2. Open same volunteer in browser 2
3. Scan QR in browser 1
4. ✅ Within 5 seconds, should appear in browser 2

## 🔟 Production Checklist

Before deploying:
- [ ] Change JWT_SECRET to random string
- [ ] Set NODE_ENV=production
- [ ] Use MongoDB Atlas (cloud)
- [ ] Enable HTTPS
- [ ] Set proper CORS origins
- [ ] Remove seed script from production
- [ ] Set up logging service
- [ ] Enable database backups
- [ ] Set up monitoring (PM2, etc.)
- [ ] Configure environment variables on host

## 📊 Expected Test Results

After all tests:
- ✅ 2+ events in database
- ✅ 12+ stalls in database
- ✅ 6+ users in database
- ✅ 3+ votes in database
- ✅ 2+ feedbacks in database
- ✅ 2+ attendance records
- ✅ 2+ scan logs
- ✅ All API endpoints responding
- ✅ All pages loading without errors
- ✅ Charts rendering with data
- ✅ CSV exports working
- ✅ QR scanner functional

## 🎉 Success Indicators

**You know everything works when:**
1. Can login as all 3 roles
2. QR scanner shows camera preview
3. Can scan student QR and see check-in
4. Can vote and see votes in analytics
5. Can submit feedback and see in analytics
6. Charts render with actual data
7. CSV exports download successfully
8. Bulk upload creates stalls
9. Real-time updates work
10. No console errors in browser DevTools

---

**Status**: Ready to Test! 🚀
**Time to Complete**: ~30 minutes for full testing
**Difficulty**: Beginner-friendly

**Need Help?** Check the error messages and console logs. Most issues are related to:
1. MongoDB not running
2. Wrong credentials
3. Port conflicts
4. Missing environment variables
