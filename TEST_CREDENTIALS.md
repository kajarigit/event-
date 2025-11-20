# Exact Authentication System Implementation - Test Credentials & Documentation

## 🔐 Login System Overview - EXACT REQUIREMENTS

The system implements **STRICT role-based login methods**:

1. **Students**: UID (Registration Number) ONLY - no email required
2. **Volunteers**: Volunteer ID ONLY - no email required  
3. **Stall Owners**: Email ONLY - email mandatory
4. **Admin**: Email ONLY - email mandatory

## 🚫 **Strict Login Enforcement**
- Students **CANNOT** login with email - only UID
- Volunteers **CANNOT** login with email - only Volunteer ID
- Stall Owners **MUST** use email - no UID login
- Admin **MUST** use email - no other method

## 📋 Test Credentials

### 👨‍🎓 Student Login
**Login Method:** Registration Number
- **Default Password:** `student123`
- **Login Process:**
  1. Select "Student" tab on login page
  2. Enter registration number (e.g., REG001, REG002)
  3. Enter password: `student123`
  4. **Complete mandatory verification** with birthDate + PIN code
  5. Set new password after verification

**Sample Test Student:**
- **Registration No:** REG001
- **Password:** student123
- **Birth Date:** 1995-01-15 (example)
- **PIN Code:** 560001 (example)

### 👥 Volunteer Login
**Login Method:** Volunteer ID ONLY (no email)
- **Password:** Generated during CSV upload
- **CSV Upload Format:** `name, uid, role=volunteer`
- **System generates:** Volunteer ID + Password
- **Login Process:**
  1. Select "👥 Volunteer" button on login page
  2. Enter volunteer ID (e.g., VOL123456)
  3. Enter assigned password
  4. Access volunteer dashboard

**CSV Upload Example for Volunteers:**
```csv
name,uid,role
John Smith,UID001,volunteer
Jane Doe,UID002,volunteer
```

**System generates:**
- **John Smith:** Volunteer ID: VOL847321, Password: randomGenerated123
- **Jane Doe:** Volunteer ID: VOL847322, Password: randomGenerated456

**Download credentials:** Admin downloads CSV with Volunteer ID + Password

### 🏪 Stall Owner Login
**Login Method:** Email ONLY (email mandatory)
- **No UID/ID login** - email required for stall owners
- **Email Login:** Use email + password ONLY

**Login Process:**
1. Go to stall owner login `/stall-owner/login`
2. Enter email (required)
3. Enter password
4. Access stall dashboard

**Sample Test Stall Owner:**
- **Email:** stallowner@example.com (REQUIRED)
- **Password:** As set by admin
- **Note:** Stall ID login removed - email only

### 👑 Admin Login
**Login Method:** Email only
- **Email:** admin@event.com
- **Password:** admin123

## 🔄 Database Migration

Run the volunteer system migration:
```bash
cd backend
node migrate-volunteer-system.js
```

## 📤 CSV Upload System - EXACT IMPLEMENTATION

### Student Upload
- **CSV Format:** `name, uid, role=student, birthDate, permanentAddressPinCode`
- **Password:** All students get default password `student123`
- **Email:** NOT required, NOT used
- **Required Fields:** name, uid (used as regNo), birthDate, permanentAddressPinCode
- **Email Sending:** NO emails sent to students

### Volunteer Upload - YOUR EXACT REQUIREMENTS
- **CSV Format:** `name, uid, role=volunteer`
- **System generates:** Volunteer ID (VOL123456) + Random Password
- **Required Fields:** name, uid, role=volunteer
- **Email:** NOT required, NOT used
- **Email Sending:** NO emails sent to volunteers
- **Download:** Admin gets CSV with name, volunteerId, password

**Example CSV Upload:**
```csv
name,uid,role
Alice Johnson,UID003,volunteer
Bob Wilson,UID004,volunteer
```

**System Output:**
- Alice: VOL847323 + password abc123def
- Bob: VOL847324 + password xyz789ghi

**Admin Downloads:**
```csv
Name,Volunteer ID,Password,UID,Department,Phone,Source
Alice Johnson,VOL847323,abc123def,UID003,N/A,N/A,Recently Created (with password)
Bob Wilson,VOL847324,xyz789ghi,UID004,N/A,N/A,Recently Created (with password)
```

### Download Volunteer Credentials
- **Admin Endpoint:** `GET /api/admin/volunteers/download-credentials`
- **Download Format:** CSV file with name, volunteerId, department, phone
- **View Credentials:** `GET /api/admin/volunteers/credentials`

## 🌐 API Endpoints

### Authentication
```
POST /api/auth/login                              # Multi-type login (email/regNo/volunteerId)
POST /api/auth/verify-student                     # Student verification  
POST /api/auth/reset-password-after-verification  # Password reset post-verification
POST /api/stall-owner/login                       # Stall owner login (email/stallId)
```

### Admin - Volunteer Management
```
GET  /api/admin/volunteers/credentials            # View volunteer list
GET  /api/admin/volunteers/download-credentials   # Download CSV
POST /api/admin/users/bulk                        # Upload volunteers via CSV
```

## 🎯 Testing the Complete System

### 1. **Start Backend Server**
```bash
cd backend
npm run dev
```

### 2. **Run Database Migrations**
```bash
# Student verification migration (if not done)
node migrate-student-verification.js

# New volunteer system migration  
node migrate-volunteer-system.js
```

### 3. **Test Each Login Type**

**Frontend Login Page** - `/login`
- Three tabs: Email, Student, Volunteer
- Dynamic form inputs based on selected type

**Student Flow:**
`Login → Verification → Password Reset → Dashboard`

**Volunteer Flow:** 
`Login → Dashboard`

**Stall Owner Flow:**
`Stall Login → Dashboard`

**Admin Flow:**
`Login → Admin Panel`

## ✅ Recent Updates Completed

### 🆕 New Features Added:
1. **Volunteer System** - Full volunteer management with auto-generated IDs
2. **Triple Login Interface** - Email/Student/Volunteer tabs
3. **Volunteer CSV Upload** - Bulk upload with automatic ID generation
4. **Credential Download** - Admin can download volunteer credentials
5. **Dual Stall Owner Login** - Both email and stall ID supported
6. **Enhanced Authentication** - Support for volunteerId in login API

### 🔧 System Architecture:
- **Students:** regNo + verification flow + default password
- **Volunteers:** volunteerId + individual passwords + CSV management
- **Stall Owners:** email OR stallId + password (both methods work)
- **Admin:** email + password (standard)

### 🚀 Ready for Production:
All authentication flows are implemented and tested. The system supports:
- ✅ Multi-type user authentication
- ✅ Secure password hashing  
- ✅ Role-based access control
- ✅ CSV bulk operations
- ✅ Credential management
- ✅ Mobile-responsive login interface