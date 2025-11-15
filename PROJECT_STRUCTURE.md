# Event Management System - Complete File Structure

```
event/
│
├── README.md                       # Main project documentation
├── QUICKSTART.md                   # Step-by-step setup guide
│
├── backend/                        # Node.js + Express + MongoDB backend
│   ├── src/
│   │   ├── models/                # Mongoose schemas
│   │   │   ├── User.js            # User model (students/volunteers/admins)
│   │   │   ├── Event.js           # Event model
│   │   │   ├── Stall.js           # Stall model
│   │   │   ├── Attendance.js      # Check-in/out records
│   │   │   ├── ScanLog.js         # Audit trail for scans
│   │   │   ├── Feedback.js        # Student feedback
│   │   │   └── Vote.js            # Student votes (ranked)
│   │   │
│   │   ├── controllers/           # Business logic
│   │   │   ├── authController.js  # Login/register/logout
│   │   │   ├── scanController.js  # QR scanning logic
│   │   │   ├── studentController.js  # Student actions
│   │   │   └── adminController.js # Admin CRUD & analytics
│   │   │
│   │   ├── routes/                # API endpoints
│   │   │   ├── auth.js            # /api/auth/*
│   │   │   ├── scan.js            # /api/scan/*
│   │   │   ├── student.js         # /api/student/*
│   │   │   └── admin.js           # /api/admin/*
│   │   │
│   │   ├── middleware/            # Express middleware
│   │   │   ├── auth.js            # JWT verification & role checks
│   │   │   ├── errorHandler.js    # Global error handler
│   │   │   ├── validate.js        # Input validation
│   │   │   └── rateLimiter.js     # Rate limiting configs
│   │   │
│   │   ├── utils/                 # Utility functions
│   │   │   └── jwt.js             # JWT & QR token generation
│   │   │
│   │   ├── config/                # Configuration files
│   │   │   ├── database.js        # MongoDB connection
│   │   │   └── logger.js          # Winston logger setup
│   │   │
│   │   ├── scripts/               # Utility scripts
│   │   │   └── seed.js            # Database seeding script
│   │   │
│   │   └── server.js              # Express app entry point
│   │
│   ├── logs/                      # Log files (auto-generated)
│   ├── uploads/                   # Uploaded CSV files
│   ├── .env.example               # Environment variables template
│   ├── .env                       # Your environment config (create this)
│   ├── .gitignore                 # Git ignore rules
│   ├── package.json               # Backend dependencies
│   └── README.md                  # Backend documentation
│
├── frontend/                      # React frontend (Vite)
│   ├── src/
│   │   ├── pages/                # Page components
│   │   │   ├── Student/          # Student dashboard pages
│   │   │   │   ├── Dashboard.jsx # Student main layout
│   │   │   │   ├── Home.jsx      # Student home/status
│   │   │   │   ├── QRCode.jsx    # Generate & display QR
│   │   │   │   ├── Voting.jsx    # Voting interface
│   │   │   │   ├── Feedback.jsx  # Feedback interface
│   │   │   │   └── Attendance.jsx# Attendance history
│   │   │   │
│   │   │   ├── Volunteer/        # Volunteer dashboard
│   │   │   │   └── Dashboard.jsx # QR scanner interface
│   │   │   │
│   │   │   ├── Admin/            # Admin dashboard pages
│   │   │   │   ├── Dashboard.jsx # Admin main layout
│   │   │   │   └── Overview.jsx  # Admin overview stats
│   │   │   │
│   │   │   ├── Login.jsx         # Login page
│   │   │   └── NotFound.jsx      # 404 page
│   │   │
│   │   ├── context/              # React Context
│   │   │   └── AuthContext.jsx   # Authentication state
│   │   │
│   │   ├── services/             # API services
│   │   │   └── api.js            # Axios instance & API calls
│   │   │
│   │   ├── App.jsx               # Main app component & routing
│   │   ├── main.jsx              # React entry point
│   │   └── index.css             # Global styles (Tailwind)
│   │
│   ├── public/                   # Static assets
│   ├── index.html                # HTML template
│   ├── vite.config.js            # Vite configuration
│   ├── tailwind.config.js        # Tailwind CSS config
│   ├── postcss.config.js         # PostCSS config
│   ├── .env.example              # Environment template
│   ├── .env                      # Your frontend config (create this)
│   ├── .gitignore                # Git ignore rules
│   ├── package.json              # Frontend dependencies
│   └── README.md                 # Frontend documentation
│
└── .gitignore                    # Root git ignore

```

---

## 📂 Key Files Explained

### Backend

| File | Purpose |
|------|---------|
| `server.js` | Main Express server, routes registration |
| `models/*.js` | MongoDB schemas with validation |
| `controllers/*.js` | Business logic for each feature |
| `routes/*.js` | API endpoint definitions |
| `middleware/auth.js` | JWT verification, role checks |
| `utils/jwt.js` | QR token generation & validation |
| `scripts/seed.js` | Populate DB with sample data |

### Frontend

| File | Purpose |
|------|---------|
| `App.jsx` | Main routing & protected routes |
| `main.jsx` | React app initialization |
| `context/AuthContext.jsx` | Global auth state management |
| `services/api.js` | All API calls centralized |
| `pages/Student/Dashboard.jsx` | Student dashboard layout |
| `pages/Admin/Dashboard.jsx` | Admin dashboard layout |

---

## 🔑 Important Environment Files

### Backend `.env`

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/event-management
JWT_SECRET=your-secret-key
```

### Frontend `.env`

```env
VITE_API_URL=http://localhost:5000/api
```

---

## 📦 Package Files

### Backend `package.json` - Key Scripts

```json
{
  "start": "node src/server.js",      // Production
  "dev": "nodemon src/server.js",     // Development
  "seed": "node src/scripts/seed.js", // Seed database
  "test": "jest"                      // Run tests
}
```

### Frontend `package.json` - Key Scripts

```json
{
  "dev": "vite",              // Development server
  "build": "vite build",      // Production build
  "preview": "vite preview"   // Preview production build
}
```

---

## 🚀 Quick Navigation

### To modify authentication:
- Backend: `backend/src/middleware/auth.js`
- Frontend: `frontend/src/context/AuthContext.jsx`

### To add new API endpoints:
1. Create route in `backend/src/routes/`
2. Create controller in `backend/src/controllers/`
3. Register route in `backend/src/server.js`

### To add new pages:
1. Create component in `frontend/src/pages/`
2. Add route in `frontend/src/App.jsx`

### To modify database schema:
- Edit models in `backend/src/models/`
- Run seed script to test: `npm run seed`

---

## 📊 Data Flow

```
User Login → Frontend (Login.jsx)
    ↓
API Call → backend/routes/auth.js
    ↓
Controller → backend/controllers/authController.js
    ↓
Database → MongoDB (User model)
    ↓
Response → JWT Token + User Data
    ↓
Frontend → AuthContext stores token
    ↓
Redirect → Role-based dashboard
```

---

## 🎯 Feature Implementation Checklist

### ✅ Completed
- Authentication (JWT with refresh tokens)
- User management (students, volunteers, admins)
- Event management
- Stall management
- QR code generation
- Attendance tracking (backend)
- Voting system
- Feedback system
- Analytics & reporting
- Bulk CSV upload
- Role-based dashboards

### 🔄 Needs Enhancement
- QR scanner integration (requires camera library)
- Real-time notifications (WebSocket/Socket.io)
- Advanced analytics charts
- Full CRUD interfaces for admin
- File upload for stall images

---

## 🛠️ Technologies Used

### Backend
- Node.js + Express
- MongoDB + Mongoose
- JWT (jsonwebtoken)
- QRCode generation
- Bcrypt (password hashing)
- Winston (logging)
- Express-validator
- Multer (file uploads)
- Papa Parse (CSV parsing)

### Frontend
- React 18
- Vite
- React Router v6
- TanStack Query
- Axios
- Tailwind CSS
- Lucide Icons
- React Hot Toast
- QRCode.react

---

**This structure follows MERN best practices with clear separation of concerns!** 🎉
