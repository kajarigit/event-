# Event Management System - Complete System Documentation

## 📋 **System Overview**

This is a comprehensive Event Management System built with Node.js/Express backend, React frontend, and PostgreSQL database. The system manages events, stalls, users (students, volunteers, stall owners, admins), attendance tracking, voting, feedback, and analytics.

## 🏗️ **Architecture**

### **Technology Stack:**
- **Backend**: Node.js, Express.js, Sequelize ORM
- **Frontend**: React.js, React Query, React Router
- **Database**: PostgreSQL (Aiven cloud hosted)
- **Authentication**: JWT tokens, bcrypt password hashing
- **File Upload**: Multer for CSV processing
- **QR Codes**: QRCode library for stall QR generation
- **Email**: Custom email service integration

### **Project Structure:**
```
event/
├── backend/
│   ├── src/
│   │   ├── controllers/     # API endpoint handlers
│   │   ├── models/         # Sequelize database models
│   │   ├── routes/         # Express route definitions
│   │   ├── middleware/     # Authentication & validation
│   │   ├── utils/          # Helper functions & utilities
│   │   └── config/         # Database & app configuration
│   ├── uploads/            # CSV file upload directory
│   └── migration scripts/  # Database migration files
├── frontend/
│   ├── src/
│   │   ├── pages/          # React page components
│   │   ├── components/     # Reusable UI components
│   │   ├── context/        # React context (Auth, etc.)
│   │   └── utils/          # Frontend utilities
└── documentation/          # System documentation
```

## 👥 **User Roles & Authentication System**

### **Four Distinct User Types:**

#### 1. **Students** 🎓
- **Login Method**: UID (Registration Number) ONLY
- **Authentication**: `POST /api/auth/login` with `{ regNo, password }`
- **Default Password**: "student123" (set during CSV upload)
- **Email**: Optional/Not required
- **Verification Flow**: Mandatory verification with birthDate + PIN code on first login
- **Features**: 
  - Event attendance via QR scanning
  - Voting for stalls
  - Providing feedback
  - View personal dashboard

#### 2. **Volunteers** 👥
- **Login Method**: Volunteer ID ONLY (auto-generated: VOL123456)
- **Authentication**: `POST /api/auth/login` with `{ volunteerId, password }`
- **Password**: Auto-generated during CSV upload
- **Email**: Optional/Not required
- **Features**:
  - QR code scanning for attendance
  - Event management assistance
  - Access to volunteer dashboard

#### 3. **Stall Owners** 🏪
- **Login Method**: Email ONLY (mandatory)
- **Authentication**: `POST /api/stall-owner/login` with `{ email, password }`
- **Password**: Individual passwords set by admin
- **Email**: Required/Mandatory
- **Features**:
  - Stall dashboard with real-time stats
  - Live vote tracking
  - Feedback monitoring
  - QR code generation for stall
  - Department leaderboard view

#### 4. **Admin** 👑
- **Login Method**: Email ONLY
- **Authentication**: `POST /api/auth/login` with `{ email, password }`
- **Password**: Individual secure passwords
- **Email**: Required/Mandatory
- **Features**:
  - Complete system management
  - User management (CRUD operations)
  - Event management (CRUD operations)
  - Stall management (CRUD operations)
  - CSV bulk upload for users/stalls
  - Analytics and reporting
  - Download volunteer credentials

## 🗄️ **Database Schema**

### **Core Models:**

#### **User Model** (`users` table)
```javascript
{
  id: UUID (Primary Key),
  name: STRING (Required),
  email: STRING (Optional - Required only for admin/stall_owner),
  password: STRING (Hashed with bcrypt),
  role: ENUM('admin', 'student', 'stall_owner', 'volunteer'),
  regNo: STRING (Required for students),
  volunteerId: STRING (Required for volunteers, auto-generated),
  phone: STRING (Optional),
  department: STRING,
  faculty: STRING,
  programme: STRING,
  year: INTEGER,
  birthDate: DATE (Required for students - verification),
  permanentAddressPinCode: STRING (Required for students - verification),
  isFirstLogin: BOOLEAN (Student verification tracking),
  isVerified: BOOLEAN (Student verification status),
  isActive: BOOLEAN (Account status),
  qrToken: TEXT (QR code data)
}
```

#### **Event Model** (`events` table)
```javascript
{
  id: UUID (Primary Key),
  name: STRING (Required),
  description: TEXT,
  startDate: DATE,
  endDate: DATE,
  location: STRING,
  isActive: BOOLEAN,
  maxCapacity: INTEGER,
  registrationDeadline: DATE
}
```

#### **Stall Model** (`stalls` table)
```javascript
{
  id: UUID (Primary Key),
  eventId: UUID (Foreign Key),
  name: STRING (Required),
  description: TEXT,
  location: STRING,
  category: STRING,
  department: STRING,
  ownerId: UUID (Foreign Key to users),
  ownerName: STRING,
  ownerEmail: STRING (Required),
  ownerPassword: STRING (Hashed),
  plainTextPassword: STRING (Admin view only),
  ownerContact: STRING,
  participants: JSON,
  isActive: BOOLEAN,
  qrToken: TEXT
}
```

#### **Other Core Models:**
- **Attendance**: Tracks user event attendance
- **Vote**: Student votes for stalls
- **Feedback**: Student feedback for stalls with ratings
- **ScanLog**: QR scan tracking for analytics

## 🔐 **Authentication & Security**

### **Authentication Flow:**

#### **Student Authentication:**
1. Login with UID (regNo) + password
2. If first login → Redirect to verification page
3. Verify with birthDate + permanentAddressPinCode
4. Set new password → Access student dashboard

#### **Volunteer Authentication:**
1. Login with volunteerId + password
2. Direct access to volunteer dashboard

#### **Stall Owner Authentication:**
1. Login with email + password
2. Access stall dashboard with real-time stats

#### **Admin Authentication:**
1. Login with email + password
2. Access admin panel with full system control

### **Security Features:**
- **JWT Tokens**: Access & refresh token system
- **Password Hashing**: bcrypt with salt rounds
- **Role-based Access Control**: Middleware authorization
- **Input Validation**: Sequelize validators & custom validation
- **SQL Injection Protection**: Sequelize ORM parameterized queries
- **File Upload Security**: Multer with file type restrictions

## 📤 **CSV Upload System**

### **Student Upload:**
```csv
name,uid,role,department,birthDate,permanentAddressPinCode
John Doe,REG001,student,Computer Science,1995-01-15,560001
Jane Smith,REG002,student,Electronics,1996-03-22,560002
```
- **Password**: Auto-set to "student123"
- **Email**: Not required
- **Verification**: birthDate + PIN required on first login

### **Volunteer Upload:**
```csv
name,uid,role
Alice Johnson,UID001,volunteer
Bob Wilson,UID002,volunteer
```
- **System Generates**: 
  - Volunteer ID: VOL847321, VOL847322, etc.
  - Random passwords: abc123def, xyz789ghi, etc.
- **Email**: Not required
- **Download**: Admin can download CSV with volunteer ID + password

### **Stall Owner & Admin Upload:**
```csv
name,email,role,password
Manager One,manager1@example.com,stall_owner,securepass123
Admin User,admin@example.com,admin,adminpass456
```
- **Email**: Required and mandatory
- **Password**: Individual passwords (or auto-generated)

## 📊 **Analytics & Reporting**

### **Available Analytics:**
- **Attendance Analytics**: Event attendance tracking, department-wise stats
- **Voting Analytics**: Stall voting rankings, department leaderboards
- **Feedback Analytics**: Rating distributions, top feedback providers
- **Scan Log Analytics**: QR scan tracking, volunteer performance
- **Department Statistics**: Cross-departmental comparisons
- **Real-time Dashboards**: Live voting, feedback, attendance updates

### **Export Capabilities:**
- **CSV Reports**: Attendance, votes, feedback data export
- **Volunteer Credentials**: Downloadable CSV with login details
- **Comprehensive Analytics**: Multi-format data export

## 🔄 **Major Changes Made Today (November 20, 2025)**

### **🎯 Complete Authentication System Overhaul**

#### **Previous System Issues:**
- Mixed login methods causing confusion
- Students could login with email or regNo
- Volunteers had unclear authentication
- Stall owners had dual email/ID system
- No clear volunteer management system

#### **Today's Changes - EXACT REQUIREMENTS IMPLEMENTED:**

##### **1. Strict Role-Based Authentication**
- **Students**: UID ONLY (no email login)
- **Volunteers**: Volunteer ID ONLY (no email login)
- **Stall Owners**: Email ONLY (email mandatory)
- **Admin**: Email ONLY (email mandatory)

##### **2. Enhanced User Model**
**Added Fields:**
- `volunteerId`: Auto-generated volunteer identifier
- Enhanced validation hooks for role-based requirements

**Validation Rules:**
- Students MUST have `regNo`
- Volunteers MUST have `volunteerId`
- Stall Owners MUST have `email`
- Admin MUST have `email`

##### **3. Updated Authentication Controller**
**File**: `backend/src/controllers/authController.sequelize.js`

**Changes**:
- Removed multi-type login support
- Added strict role validation
- Login method enforcement by user type
- Enhanced error messages for incorrect login methods

##### **4. CSV Upload System Enhancement**
**File**: `backend/src/controllers/adminController.sequelize.js`

**Volunteer Upload Process**:
```
Input CSV: name, uid, role=volunteer
↓
System Generates:
- Volunteer ID (VOL + timestamp + random)
- Random secure password
↓
Store in temporary cache for download
↓
Admin downloads: name, volunteerID, password, uid
```

##### **5. Volunteer Credential Management**
**New File**: `backend/src/utils/volunteerCredentialsCache.js`

**Features**:
- Temporary secure storage of volunteer credentials
- 24-hour auto-expiry for security
- Batch download capability for admin

##### **6. Enhanced Admin API Endpoints**
**New Routes**:
- `GET /api/admin/volunteers/credentials` - View volunteer list
- `GET /api/admin/volunteers/download-credentials` - Download CSV with passwords

##### **7. Frontend Authentication UI**
**File**: `frontend/src/pages/Login.jsx`

**Changes**:
- Removed confusing multi-toggle system
- Clear separation: Student (UID) vs Volunteer buttons
- Admin link separate from main login
- Stall Owner completely separate page
- Enhanced UX with role-specific icons

##### **8. Database Migration**
**Files**: 
- `backend/migrate-volunteer-system.js` (Node.js script)
- SQL migration for `volunteerId` column addition

### **🔧 Technical Improvements:**

#### **Security Enhancements:**
- Stricter role-based access control
- Enhanced password validation
- Temporary credential storage with auto-expiry
- Prevention of cross-role login attempts

#### **User Experience:**
- Simplified login interface
- Clear role identification
- Reduced user confusion
- Streamlined authentication flow

#### **Admin Features:**
- Volunteer credential download system
- Enhanced CSV upload validation
- Better error handling and reporting
- Improved user management capabilities

## 📋 **API Endpoints Summary**

### **Authentication:**
```
POST /api/auth/login                              # Student/Admin/Volunteer login
POST /api/auth/verify-student                     # Student verification
POST /api/auth/reset-password-after-verification  # Password reset
POST /api/stall-owner/login                       # Stall owner login (separate)
```

### **Admin - User Management:**
```
GET    /api/admin/users                     # List users
POST   /api/admin/users                     # Create user
PUT    /api/admin/users/:id                 # Update user
DELETE /api/admin/users/:id                 # Delete user
POST   /api/admin/users/bulk                # CSV bulk upload
```

### **Admin - Volunteer Management:**
```
GET /api/admin/volunteers/credentials            # View volunteers
GET /api/admin/volunteers/download-credentials   # Download CSV with passwords
```

### **Stall Owner Dashboard:**
```
GET /api/stall-owner/my-stall              # Stall details & stats
GET /api/stall-owner/live-votes            # Real-time vote tracking
GET /api/stall-owner/live-feedbacks        # Real-time feedback
GET /api/stall-owner/department-leaderboard # Department rankings
```

### **Analytics:**
```
GET /api/admin/analytics/attendance-comprehensive  # Attendance analytics
GET /api/admin/analytics/voting-overview          # Voting statistics
GET /api/admin/analytics/feedback-overview        # Feedback analytics
```

## 🧪 **Testing & Development**

### **Environment Setup:**
1. **Database**: PostgreSQL (Aiven cloud or local)
2. **Backend**: Node.js server on port 5000
3. **Frontend**: React development server on port 3000

### **Key Testing Scenarios:**

#### **Authentication Testing:**
```bash
# Student Login
curl -X POST /api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"regNo": "REG001", "password": "student123"}'

# Volunteer Login  
curl -X POST /api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"volunteerId": "VOL123456", "password": "generatedPass"}'

# Admin Login
curl -X POST /api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "adminpass"}'
```

#### **CSV Upload Testing:**
```csv
# Student Upload
name,uid,role,birthDate,permanentAddressPinCode
Test Student,REG999,student,2000-01-01,560001

# Volunteer Upload  
name,uid,role
Test Volunteer,UID999,volunteer
```

### **Migration Commands:**
```bash
# Run volunteer system migration
cd backend
node migrate-volunteer-system.js

# Or manual SQL execution
psql -d database_name -f volunteer-system-migration.sql
```

## 🔄 **Future Enhancements**

### **Potential Improvements:**
1. **Real-time Features**: WebSocket integration for live updates
2. **Mobile App**: React Native mobile application
3. **Advanced Analytics**: Machine learning insights
4. **Notification System**: Email/SMS notifications
5. **QR Code Enhancement**: Advanced QR features
6. **Performance Optimization**: Database indexing, caching
7. **Security Audit**: Penetration testing, vulnerability assessment

## 📞 **Support & Maintenance**

### **Key Files to Monitor:**
- **Authentication**: `authController.sequelize.js`
- **User Management**: `User.sequelize.js`, `adminController.sequelize.js`
- **Database**: Migration scripts, model definitions
- **Frontend**: `Login.jsx`, authentication context

### **Common Issues & Solutions:**
1. **Database Connection**: Check PostgreSQL service, connection strings
2. **Authentication Errors**: Verify JWT tokens, password hashing
3. **CSV Upload Issues**: Validate CSV format, file permissions
4. **Role Access**: Check middleware authorization, user roles

---

## 🎯 **Summary**

This Event Management System is now a robust, secure, and user-friendly platform with strict role-based authentication. Today's major overhaul implemented exact requirements for user authentication, enhanced the volunteer management system, and improved overall security and user experience. The system is ready for production use with comprehensive testing and documentation.

**Key Achievement**: Transformed from a confusing multi-login system to a clear, role-specific authentication system that prevents user confusion and enhances security.