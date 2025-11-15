# Backend - Event Management System

Node.js + Express + MongoDB backend for the Event Management System.

## Features

- ✅ JWT-based authentication with refresh tokens
- ✅ Role-based access control (Admin/Student/Volunteer)
- ✅ QR code generation and validation
- ✅ Check-in/check-out system with transaction support
- ✅ Voting and feedback system
- ✅ Real-time analytics and reporting
- ✅ Bulk CSV upload for users and stalls
- ✅ Rate limiting and security headers
- ✅ Comprehensive error handling

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required environment variables:
- `MONGO_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `PORT`: Server port (default: 5000)

### 3. Seed Database

```bash
npm run seed
```

This creates:
- 1 admin user
- 3 sample students
- 2 volunteers
- 1 active event
- 10 sample stalls

### 4. Start Server

```bash
# Development
npm run dev

# Production
npm start
```

## API Documentation

### Authentication

**POST** `/api/auth/register`
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "student",
  "rollNo": "CS2023001",
  "department": "Computer Science"
}
```

**POST** `/api/auth/login`
```json
{
  "email": "admin@example.com",
  "password": "admin123"
}
```

**GET** `/api/auth/me`
Headers: `Authorization: Bearer <token>`

### Scanning (Volunteer/Admin)

**POST** `/api/scan/student`
```json
{
  "token": "<student_qr_token>",
  "eventId": "event_id_here",
  "gate": "Gate A"
}
```

**POST** `/api/scan/stall` (Student, must be checked-in)
```json
{
  "token": "<stall_qr_token>",
  "eventId": "event_id_here"
}
```

**GET** `/api/scan/logs?eventId=xxx&limit=50`

### Student

**GET** `/api/student/qrcode/:eventId`

**POST** `/api/student/feedback`
```json
{
  "stallId": "stall_id",
  "eventId": "event_id",
  "rating": 5,
  "comment": "Great stall!"
}
```

**POST** `/api/student/vote`
```json
{
  "stallId": "stall_id",
  "eventId": "event_id",
  "rank": 1
}
```

**GET** `/api/student/votes/:eventId`

**GET** `/api/student/status/:eventId`

### Admin

**Events**
- `GET /api/admin/events`
- `POST /api/admin/events`
- `PUT /api/admin/events/:id`
- `PUT /api/admin/events/:id/toggle-active`

**Stalls**
- `GET /api/admin/stalls?eventId=xxx&department=CS`
- `POST /api/admin/stalls`
- `POST /api/admin/stalls/bulk` (CSV upload)

**Users**
- `GET /api/admin/users?role=student`
- `POST /api/admin/users`
- `POST /api/admin/users/bulk` (CSV upload)

**Analytics**
- `GET /api/admin/analytics/top-students?eventId=xxx&limit=10`
- `GET /api/admin/analytics/most-reviewers?eventId=xxx`
- `GET /api/admin/analytics/top-stalls?eventId=xxx&department=CS`
- `GET /api/admin/analytics/department-stats?eventId=xxx`
- `GET /api/admin/analytics/event-overview?eventId=xxx`

**Reports (CSV Export)**
- `GET /api/admin/reports/attendance?eventId=xxx`
- `GET /api/admin/reports/feedbacks?eventId=xxx`
- `GET /api/admin/reports/votes?eventId=xxx`

## Database Models

### User
- Supports student, volunteer, and admin roles
- Password hashing with bcrypt
- Includes department, programme, rollNo

### Event
- Start/end times
- Active status toggle
- Voting/feedback permissions

### Stall
- QR token (permanent)
- Department and programme
- Cached statistics (votes, ratings)

### Attendance
- Check-in/check-out tracking
- Duration calculation
- Gate information

### ScanLog
- Audit trail for all scans
- Error flagging capability

### Feedback
- One per student per stall per event
- Rating (1-5) + comment

### Vote
- Ranked voting (1-3)
- One vote per rank per student per event

## Testing

```bash
npm test
```

## CSV Upload Formats

### Students CSV
```
name,email,password,rollNo,programme,department,phone
Rahul Sharma,rahul@student.com,student123,CS2023001,B.Tech,Computer Science,+919876543210
```

### Stalls CSV
```
name,department,programme,description,ownerName,ownerContact,ownerEmail,eventId
Robotics Lab,Computer Science,B.Tech,Advanced robotics projects,Prof. Kumar,+919876543210,robotics@college.edu,event_id_here
```

## Security Features

- Helmet.js security headers
- Rate limiting (100 requests/15 minutes)
- JWT token expiration
- Password hashing (bcrypt)
- Input validation (express-validator)
- CORS configuration
- MongoDB injection prevention

## Error Handling

All errors return:
```json
{
  "success": false,
  "message": "Error description",
  "errors": []  // Optional validation errors
}
```

HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict (duplicate)
- `429` - Too Many Requests
- `500` - Server Error

## Logging

Logs are stored in `logs/` directory:
- `all.log` - All logs
- `error.log` - Error logs only

## License

MIT
