# MongoDB Setup Guide

## Option 1: Install MongoDB Locally (Recommended for Development)

### Windows Installation:

1. **Download MongoDB Community Server:**
   - Visit: https://www.mongodb.com/try/download/community
   - Select: Windows x64
   - Download the MSI installer

2. **Install MongoDB:**
   - Run the installer
   - Choose "Complete" installation
   - Install MongoDB as a Service (check the box)
   - Install MongoDB Compass (optional GUI tool)

3. **Verify Installation:**
   ```powershell
   mongod --version
   ```

4. **Start MongoDB Service:**
   ```powershell
   # MongoDB should auto-start as a Windows Service
   # To manually start:
   net start MongoDB
   
   # To check status:
   sc query MongoDB
   ```

5. **Test Connection:**
   ```powershell
   mongosh
   # Should connect to mongodb://localhost:27017
   ```

6. **Update .env file:**
   ```
   MONGO_URI=mongodb://localhost:27017/event-management
   ```

---

## Option 2: Use MongoDB Atlas (Cloud - Free Tier Available)

### Setup Steps:

1. **Create Account:**
   - Visit: https://www.mongodb.com/cloud/atlas/register
   - Sign up for free

2. **Create Cluster:**
   - Choose FREE tier (M0)
   - Select cloud provider and region (closest to you)
   - Click "Create Cluster"

3. **Configure Access:**
   - **Database Access:**
     - Create database user with username/password
     - Example: `eventadmin` / `SecurePassword123`
   
   - **Network Access:**
     - Click "Add IP Address"
     - Choose "Allow Access from Anywhere" (0.0.0.0/0) for development
     - Or add your specific IP address

4. **Get Connection String:**
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Example: `mongodb+srv://eventadmin:<password>@cluster0.xxxxx.mongodb.net/event-management?retryWrites=true&w=majority`

5. **Update .env file:**
   ```
   MONGO_URI=mongodb+srv://eventadmin:SecurePassword123@cluster0.xxxxx.mongodb.net/event-management?retryWrites=true&w=majority
   ```
   
   **Replace:**
   - `eventadmin` with your username
   - `SecurePassword123` with your password
   - `cluster0.xxxxx` with your actual cluster URL
   - `event-management` is your database name

---

## Option 3: Docker (Quick Setup)

If you have Docker installed:

```powershell
# Run MongoDB in Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Verify it's running
docker ps

# Stop MongoDB
docker stop mongodb

# Start MongoDB again
docker start mongodb
```

`.env` configuration:
```
MONGO_URI=mongodb://localhost:27017/event-management
```

---

## Quick Test: Which Option to Choose?

### Choose **Local Installation** if:
- ✅ You want full control
- ✅ You're developing offline
- ✅ You have admin rights on your machine
- ✅ You want faster performance (no network latency)

### Choose **MongoDB Atlas** if:
- ✅ You don't want to install software
- ✅ You want easy deployment later
- ✅ You're working on multiple machines
- ✅ You want automatic backups

### Choose **Docker** if:
- ✅ You already have Docker installed
- ✅ You want quick setup/teardown
- ✅ You're comfortable with containers

---

## After MongoDB is Running

1. **Restart the backend server:**
   ```powershell
   cd backend
   npm start
   ```

2. **You should see:**
   ```
   info: Server running in development mode on port 5000
   info: MongoDB Connected: localhost
   ```

3. **Test the API:**
   ```powershell
   # Open browser and visit:
   http://localhost:5000/api/health
   
   # Or use curl:
   curl http://localhost:5000/api/health
   ```

---

## Common Issues & Solutions

### Issue 1: "MongoDB service not starting"
**Solution:**
```powershell
# Check if MongoDB is installed
sc query MongoDB

# If not found, reinstall MongoDB as a service
# During installation, check "Install MongoD as a Service"
```

### Issue 2: "Connection refused"
**Solution:**
```powershell
# Check if MongoDB is running
netstat -ano | findstr :27017

# If nothing shows, start MongoDB:
net start MongoDB
```

### Issue 3: "Authentication failed" (Atlas)
**Solution:**
- Verify username/password in connection string
- Ensure IP address is whitelisted (Network Access)
- Check database user has correct permissions

### Issue 4: "Network timeout" (Atlas)
**Solution:**
- Check internet connection
- Verify firewall isn't blocking MongoDB ports
- Try whitelisting 0.0.0.0/0 in Network Access

---

## Verify Database Connection

Once the backend starts successfully, you can verify the database:

### Using MongoDB Compass (GUI):
1. Open MongoDB Compass
2. Connect to: `mongodb://localhost:27017` (or your Atlas connection string)
3. You should see `event-management` database
4. Collections will be created automatically when you use the app

### Using mongosh (CLI):
```powershell
mongosh

# List databases
show dbs

# Use event-management database
use event-management

# List collections (after data is created)
show collections

# Query users (after creating some)
db.users.find().pretty()
```

---

## Next Steps

After MongoDB is connected:

1. ✅ Backend server should show: "MongoDB Connected"
2. ✅ Frontend is running at: http://localhost:3000
3. ✅ Backend API is at: http://localhost:5000/api
4. 📝 Create initial admin user (see TESTING_GUIDE.md)
5. 🧪 Start testing the application!

---

## Production Deployment Notes

For production:
- 🔒 Use MongoDB Atlas with authentication
- 🔒 Restrict IP addresses (don't use 0.0.0.0/0)
- 🔒 Use strong passwords
- 🔒 Enable SSL/TLS
- 📊 Set up monitoring and alerts
- 💾 Configure automated backups
- 🔄 Use connection pooling (already configured)

---

**Need Help?**
- MongoDB Docs: https://docs.mongodb.com/
- Atlas Docs: https://docs.atlas.mongodb.com/
- Community: https://community.mongodb.com/

