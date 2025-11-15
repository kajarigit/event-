# Event Management System (MERN Stack)

**Version:** 1.0  
**Tech Stack:** MongoDB, Express.js, React, Node.js  
**Author:** Generated for Sourav Mukhopadhyay  
**Date:** November 14, 2025

---

## 🎯 System Overview

A scalable Event Management System designed for departmental stalls at student events. Supports **15,000 students**, **500 volunteers**, and **500 stalls** with:

- ✅ QR-based check-in/check-out
- ✅ One-time feedback per stall
- ✅ Ranked voting (top 3 stalls)
- ✅ Real-time analytics
- ✅ Bulk upload (CSV)
- ✅ Three role-based dashboards (Admin/Student/Volunteer)

---

## 📁 Project Structure

```
event/
├── backend/              # Node.js + Express API
│   ├── src/
│   │   ├── models/      # Mongoose schemas
│   │   ├── routes/      # API endpoints
│   │   ├── controllers/ # Business logic
│   │   ├── middleware/  # Auth, validation
│   │   ├── utils/       # QR generation, helpers
│   │   └── config/      # DB, env config
│   ├── tests/           # API tests
│   └── package.json
│
├── frontend/            # React SPA
│   ├── src/
│   │   ├── components/  # Reusable UI
│   │   ├── pages/       # Dashboard pages
│   │   ├── services/    # API calls
│   │   ├── context/     # State management
│   │   └── utils/       # QR scanner, helpers
│   └── package.json
│
└── README.md            # This file
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ & npm
- MongoDB 6+ (local or Atlas)
- Git

### 1. Clone & Install

```bash
cd event
npm install
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
npm run dev
```

Backend runs on `http://localhost:5000`

### 3. Frontend Setup

```bash
cd frontend
npm install
npm start
```

Frontend runs on `http://localhost:3000`

### 4. Seed Database (Optional)

```bash
cd backend
npm run seed
```

Creates sample admin user, events, stalls, and test students.

---

## 🔑 Environment Variables

### Backend `.env`

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/event-management
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRE=7d
REDIS_URL=redis://localhost:6379  # Optional, for rate limiting
```

### Frontend `.env`

```env
REACT_APP_API_URL=http://localhost:5000/api
```

---

## 📊 Database Schema (MongoDB)

### Collections

- `users` - Students, volunteers, admins
- `events` - Event details
- `stalls` - Department stalls
- `attendances` - Check-in/out records
- `scanlogs` - Audit trail
- `feedbacks` - Student reviews
- `votes` - Ranked voting

---

## 🔐 Default Credentials (after seeding)

**Admin:**
- Email: `admin@example.com`
- Password: `admin123`

**Test Student:**
- Roll No: `CS2023001`
- Password: `student123`

**Test Volunteer:**
- Email: `volunteer@example.com`
- Password: `volunteer123`

---

## 🛠️ Development Commands

### Backend

```bash
npm run dev          # Start dev server (nodemon)
npm test             # Run tests
npm run seed         # Seed database
npm run migrate      # Run migrations
```

### Frontend

```bash
npm start            # Development server
npm test             # Run tests
npm run build        # Production build
```

---

## 📱 Core Features

### Student Dashboard
- Generate personal QR code
- View check-in status
- Scan stall QR to vote/feedback
- Cast ranked votes (1-3)
- Submit one feedback per stall

### Volunteer Scanner
- Scan student QR at gate
- Toggle IN/OUT status
- View scan history
- Flag erroneous scans

### Admin Dashboard
- Manage events, stalls, users
- Bulk CSV upload
- Real-time analytics
- Export reports (CSV/PDF)
- Open/close event links

---

## 🔄 Voting & Feedback Rules

**Voting:**
- Students cast 3 ranked votes (rank 1, 2, 3)
- Each rank must be a different stall
- Only while checked-in
- Scan stall QR to verify presence

**Feedback:**
- One feedback per stall per event
- Rating (1-5 stars) + comment
- Only while checked-in
- Duplicate attempts return 409 Conflict

---

## 📈 Analytics Endpoints

1. **Top students by stay time**
   `GET /api/admin/analytics/top-students?event_id=X&limit=10`

2. **Students by feedback count**
   `GET /api/admin/analytics/most-reviewers?event_id=X`

3. **Top stalls by votes (dept-wise)**
   `GET /api/admin/analytics/top-stalls?event_id=X&department=CS`

4. **Department presence heatmap**
   `GET /api/admin/analytics/department-stats?event_id=X`

---

## 🔒 Security Features

- JWT authentication with refresh tokens
- Role-based access control (RBAC)
- Rate limiting on scan endpoints
- Signed QR tokens (HMAC-SHA256)
- Password hashing (bcrypt)
- Input validation (Joi)
- CORS configured
- Helmet.js security headers

---

## 🧪 Testing

### Run All Tests

```bash
# Backend
cd backend && npm test

# Frontend
cd frontend && npm test
```

### Load Testing (K6)

```bash
cd backend/tests
k6 run load-test.js
```

Simulates 500 concurrent volunteer scans.

---

## 🚢 Deployment

### Backend (Railway/Render/Heroku)

1. Push to GitHub
2. Connect repo to hosting platform
3. Set environment variables
4. Deploy from `backend/` directory

### Frontend (Vercel/Netlify)

```bash
cd frontend
npm run build
# Deploy dist/ folder
```

### MongoDB Atlas Setup

1. Create cluster at [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. Whitelist IP (0.0.0.0/0 for dev)
3. Copy connection string to `MONGO_URI`

---

## 📖 API Documentation

Full API docs available at:
- Postman Collection: `backend/docs/postman_collection.json`
- Swagger UI: `http://localhost:5000/api-docs` (after starting server)

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🐛 Troubleshooting

**MongoDB connection fails:**
```bash
# Check if MongoDB is running
mongosh
# Or verify Atlas connection string
```

**Port already in use:**
```bash
# Change PORT in .env file
PORT=5001
```

**CORS errors:**
```bash
# Update CORS_ORIGIN in backend/.env
CORS_ORIGIN=http://localhost:3000
```

---

## 📞 Support

For issues, feature requests, or questions:
- Create an issue on GitHub
- Email: support@example.com

---

**Built with ❤️ for seamless event management**
