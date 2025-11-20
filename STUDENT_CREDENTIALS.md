# 📋 STUDENT CREDENTIALS - Event Management System

**Generated:** November 20, 2025  
**Total Students:** 20  
**System Status:** ✅ All Active, ⏳ Awaiting First Login & Verification

---

## 🔐 Login Information

### Default Password (ALL Students)
```
Password: student123
```

**Important:** This is a temporary password. Students MUST:
1. Login with RegNo + `student123`
2. Verify identity with birthDate + PIN code
3. Set a new personal password
4. Re-login with RegNo + new password

---

## 👥 Student List (A-Z by Name)

| No. | Name | RegNo (UID) | Email | Department | Year |
|-----|------|-------------|-------|------------|------|
| 1 | Student 1 | **REG001** | student1@example.com | Electronics and Communication Engineering | 2 |
| 2 | Student 2 | **REG012** | student2@example.com | Chemical Engineering | 3 |
| 3 | Student 3 | **REG014** | student3@example.com | MECH | 4 |
| 4 | Student 4 | **REG015** | student4@example.com | CIVIL | 2 |
| 5 | Student 5 | **REG016** | student5@example.com | IT | 3 |
| 6 | Student 6 | **REG017** | student6@example.com | EEE | 4 |
| 7 | Student 7 | **REG018** | student7@example.com | CSE | 2 |
| 8 | Student 8 | **REG019** | student8@example.com | ECE | 3 |
| 9 | Student 9 | **REG020** | student9@example.com | MECH | 4 |
| 10 | Student 10 | **REG002** | student10@example.com | CIVIL | 2 |
| 11 | Student 11 | **REG003** | student11@example.com | IT | 3 |
| 12 | Student 12 | **REG004** | student12@example.com | EEE | 4 |
| 13 | Student 13 | **REG005** | student13@example.com | CSE | 2 |
| 14 | Student 14 | **REG006** | student14@example.com | ECE | 3 |
| 15 | Student 15 | **REG007** | student15@example.com | MECH | 4 |
| 16 | Student 16 | **REG008** | student16@example.com | CIVIL | 2 |
| 17 | Student 17 | **REG009** | student17@example.com | IT | 3 |
| 18 | Student 18 | **REG010** | student18@example.com | EEE | 4 |
| 19 | Student 19 | **REG011** | student19@example.com | CSE | 2 |
| 20 | Student 20 | **REG013** | student20@example.com | ECE | 3 |

---

## 📝 Step-by-Step Login Guide

### For Students (First Time Login)

1. **Navigate to Login Page**
   - Open the application
   - Click on **"Student Login"** button

2. **Enter Credentials**
   - **RegNo (UID):** Your assigned registration number (REG001, REG002, etc.)
   - **Password:** `student123`
   - Click "Login"

3. **Verification Required** (First Login Only)
   - You'll be redirected to verification page
   - Enter your **Birth Date** (YYYY-MM-DD format, e.g., 2000-01-15)
   - Enter your **Permanent Address PIN Code** (6 digits, e.g., 560001)
   - Click "Verify"

4. **Set New Password**
   - After successful verification, you'll be asked to set a new password
   - Choose a strong password (minimum 6 characters)
   - Confirm the password
   - Click "Reset Password"

5. **Login Again**
   - You'll be redirected to login page
   - Enter your **RegNo** (same as before)
   - Enter your **NEW password** (the one you just set)
   - Click "Login"

6. **Access Dashboard**
   - ✅ You're now logged in!
   - Access your student dashboard

---

## 🚨 Important Notes

### Security
- **NEVER share your password** with anyone
- Change your password immediately after first login
- Each student has a **unique RegNo** - this is your permanent username

### Login Method
- Students login with **RegNo ONLY** (NOT email)
- Example: Use `REG001`, not `student1@example.com`
- Volunteers use **Volunteer ID** (different system)
- Admins/Stall Owners use **Email** (different system)

### Troubleshooting
- **"Invalid credentials"** → Check if you're using the correct RegNo and password
- **"Verification failed"** → Ensure birthDate and PIN are entered in correct format
- **"Session expired"** → Re-login with your RegNo + password
- **Can't remember new password?** → Contact admin for password reset

---

## 📊 Statistics

- **Total Students:** 20
- **Active Accounts:** 20 (100%)
- **Verified Accounts:** 0 (0%) - All awaiting first login
- **Pending First Login:** 20 (100%)

---

## 🔧 Admin Actions

### To generate updated credentials:
```bash
cd backend
node get-student-credentials.js
```

### To assign RegNo to new students without it:
```bash
cd backend
node assign-student-regno.js
```

---

## 📞 Support

If students face any login issues:
1. Verify they're using **RegNo** (not email)
2. Confirm default password: `student123`
3. Check database with: `node check-regno.js`
4. Contact system administrator

---

**Last Updated:** November 20, 2025  
**Script Location:** `backend/get-student-credentials.js`
