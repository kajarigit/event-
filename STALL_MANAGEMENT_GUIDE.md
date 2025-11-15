# Stall Management System with QR Codes

## Overview
Complete stall management system with automatic QR code generation and email delivery for feedback collection.

## Features

### 1. Stall Creation
- ✅ **Manual Creation**: Admin creates stalls one by one
- ✅ **Bulk Upload**: CSV upload for multiple stalls
- ✅ **QR Code Generation**: Automatic unique QR code for each stall
- ✅ **Email Delivery**: QR code sent to stall owner's email
- ✅ **Department-Specific**: Stalls can be filtered by department

### 2. Stall Fields

```javascript
{
  id: UUID,
  eventId: UUID (required),
  name: STRING (required),
  description: TEXT,
  location: STRING,
  category: STRING,
  ownerName: STRING,
  ownerContact: STRING,
  ownerEmail: STRING (for QR delivery),
  department: STRING (NEW),
  isActive: BOOLEAN,
  qrToken: TEXT (auto-generated)
}
```

### 3. QR Code Functionality
- **Purpose**: Students scan to vote and give feedback
- **Encoding**: stallId + eventId + timestamp
- **Delivery**: Beautiful HTML email with QR code image
- **Usage**: Display at stall for student scanning

---

## Setup Instructions

### Step 1: Run Database Migration

Add new columns to stalls table:

```bash
# In Render Shell or locally:
node src/scripts/addStallEmailDepartment.js
```

**Expected Output:**
```
🚀 Adding ownerEmail and department columns to stalls table...
✅ ownerEmail column added
✅ department column added
✅ Department index created
✅ Migration completed successfully!
```

### Step 2: Verify Email Configuration

Ensure these environment variables are set (from previous email setup):
```bash
EMAIL_SERVICE=gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
FRONTEND_URL=https://your-frontend.onrender.com
```

---

## Manual Stall Creation

### API Endpoint
```http
POST /api/admin/stalls
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "eventId": "uuid-of-event",
  "name": "Computer Science Stall",
  "description": "Showcasing CS department projects",
  "location": "Block A, Room 101",
  "category": "Technology",
  "ownerName": "John Doe",
  "ownerContact": "9876543210",
  "ownerEmail": "cs.stall@example.com",
  "department": "Computer Science"
}
```

### Response
```json
{
  "success": true,
  "message": "Stall created successfully. QR code has been sent to the owner's email.",
  "data": {
    "id": "stall-uuid",
    "name": "Computer Science Stall",
    "ownerEmail": "cs.stall@example.com",
    "department": "Computer Science",
    "qrToken": "generated-jwt-token",
    ...
  }
}
```

### What Happens
1. Stall record created in database
2. Unique QR code generated
3. QR code image created (300x300px)
4. Beautiful HTML email sent with:
   - Stall information
   - QR code image embedded
   - Instructions for use
   - Tips for maximizing votes

---

## Bulk Stall Upload

### CSV Format

Create a CSV file with these columns:

```csv
eventId,name,description,location,category,ownerName,ownerContact,ownerEmail,department
event-uuid-1,Computer Science,CS Projects,Block A-101,Tech,John Doe,9876543210,cs@example.com,Computer Science
event-uuid-1,Electronics,ECE Innovations,Block B-202,Tech,Jane Smith,9876543211,ece@example.com,Electronics
event-uuid-1,Mechanical,Mech Models,Block C-303,Engineering,Bob Wilson,9876543212,mech@example.com,Mechanical
event-uuid-1,Food Stall,Delicious Food,Canteen Area,Food,Alice Brown,9876543213,food@example.com,Hospitality
```

**Required Columns:**
- `eventId` - UUID of the event
- `name` - Stall name

**Optional Columns:**
- `description` - Detailed description
- `location` - Physical location
- `category` - Stall category
- `ownerName` - Owner's name
- `ownerContact` - Phone number
- `ownerEmail` - **Email for QR code delivery**
- `department` - Department name
- `isActive` - true/false (default: true)

### API Endpoint
```http
POST /api/admin/stalls/bulk-upload
Authorization: Bearer <admin-token>
Content-Type: multipart/form-data

file: stalls.csv
```

### Response
```json
{
  "success": true,
  "message": "20 stalls created successfully. 18 QR code emails sent.",
  "data": {
    "created": 20,
    "emailsSent": 18,
    "emailsFailed": 0,
    "emailsSkipped": 2,
    "uploadErrors": [],
    "emailErrors": []
  }
}
```

### Email Results
- **emailsSent**: Stalls with valid email that received QR code
- **emailsFailed**: Email errors (still creates stall)
- **emailsSkipped**: Stalls without ownerEmail

---

## Email Template

### Stall QR Code Email
**Subject:** 🎪 Your Stall QR Code - [Stall Name] | [Event Name]

**Content:**
- Professional gradient header
- Stall information summary
- Large, scannable QR code image (300x300px)
- Step-by-step usage instructions
- Tips for maximizing votes
- Important reminders

**Design:**
- Mobile-responsive HTML
- High-contrast QR code (black on white with pink border)
- Clear call-to-action
- Branded footer

---

## Department Filtering

### Get Stalls by Department
```http
GET /api/admin/stalls?department=Computer Science
Authorization: Bearer <admin-token>
```

### Get All Departments
```http
GET /api/admin/stalls/departments
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    "Computer Science",
    "Electronics",
    "Mechanical",
    "Civil Engineering",
    "Hospitality"
  ]
}
```

---

## How Students Use Stall QR Codes

### Student Flow
1. Student visits a stall at the event
2. Student scans the QR code displayed at the stall
3. **Student must be checked in** to the event first
4. Student can:
   - Vote for the stall (once per stall)
   - Provide text feedback
   - Rate various aspects
5. Votes and feedback are anonymous

### Voting Rules
- ✅ Must be checked in to event
- ✅ One vote per stall per student
- ✅ Can give feedback multiple times
- ✅ Votes counted for leaderboard
- ❌ Cannot vote if not checked in
- ❌ Cannot vote twice for same stall

---

## Admin Features

### Stall Management Dashboard
- View all stalls by event
- Filter by department
- See vote counts in real-time
- Download QR codes
- Resend QR emails
- Edit stall information
- Activate/deactivate stalls

### Analytics
- **Top Stalls by Votes**: Leaderboard
- **Department-wise Performance**: Compare departments
- **Feedback Summary**: View all feedback
- **Voting Trends**: Track voting over time

---

## Testing Guide

### Test 1: Manual Stall Creation
```bash
# 1. Login as admin
# 2. Create stall with ownerEmail
curl -X POST https://event-1-9jvx.onrender.com/api/admin/stalls \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "event-uuid",
    "name": "Test Stall",
    "ownerEmail": "test@example.com",
    "department": "Computer Science"
  }'

# 3. Check test@example.com inbox for QR code email
# 4. Verify email contains QR code image
```

### Test 2: Bulk Upload
```bash
# 1. Create stalls.csv with sample data
# 2. Upload via admin panel or API
# 3. Check all ownerEmails for QR code emails
# 4. Verify each email has unique QR code
```

### Test 3: Student Voting
```bash
# 1. Display QR code from email
# 2. Login as student
# 3. Check in to event
# 4. Scan QR code
# 5. Submit vote and feedback
# 6. Verify vote counted in admin analytics
```

---

## Troubleshooting

### Stalls Created but No Emails Sent
**Cause:** Email service not configured or ownerEmail missing

**Fix:**
1. Check EMAIL_* environment variables
2. Ensure ownerEmail is provided
3. Check backend logs for email errors
4. Resend QR code manually from admin panel

### QR Code Not Scanning
**Cause:** QR code image quality or invalid token

**Fix:**
1. Download high-resolution QR code
2. Print clearly (not blurry)
3. Ensure good lighting when scanning
4. Regenerate QR code if expired

### Email Goes to Spam
**Fix:**
1. Ask recipients to check spam folder
2. Mark as "Not Spam"
3. Add sender email to contacts
4. Use professional domain email

### Department Filter Not Working
**Cause:** Department field empty

**Fix:**
1. Update stalls with department value
2. Re-upload CSV with department column
3. Use exact department names (case-sensitive)

---

## CSV Template Download

### Basic Template (Required Fields Only)
```csv
eventId,name
event-uuid,Stall 1
event-uuid,Stall 2
```

### Full Template (All Fields)
```csv
eventId,name,description,location,category,ownerName,ownerContact,ownerEmail,department
event-uuid,CS Stall,Computer projects,A-101,Tech,John,9876543210,cs@test.com,Computer Science
event-uuid,ECE Stall,Electronics display,B-202,Tech,Jane,9876543211,ece@test.com,Electronics
```

---

## API Reference

### Create Stall
- **Endpoint:** `POST /api/admin/stalls`
- **Auth:** Admin
- **Body:** Stall data (JSON)
- **Returns:** Created stall + email status

### Bulk Upload Stalls
- **Endpoint:** `POST /api/admin/stalls/bulk-upload`
- **Auth:** Admin
- **Body:** CSV file (multipart)
- **Returns:** Upload summary + email results

### Get Stalls
- **Endpoint:** `GET /api/admin/stalls`
- **Auth:** Admin
- **Query:** `?eventId=uuid&department=CS`
- **Returns:** Filtered stalls

### Update Stall
- **Endpoint:** `PUT /api/admin/stalls/:id`
- **Auth:** Admin
- **Body:** Updated fields
- **Returns:** Updated stall

### Delete Stall
- **Endpoint:** `DELETE /api/admin/stalls/:id`
- **Auth:** Admin
- **Returns:** Success message

### Resend QR Email
- **Endpoint:** `POST /api/admin/stalls/:id/resend-qr`
- **Auth:** Admin
- **Returns:** Email status

---

## Security Features

### QR Token
- JWT-signed token
- Contains: stallId, eventId, timestamp
- Expires after event ends
- Cannot be reused for different stalls

### Email
- Only sent to verified email addresses
- TLS encryption in transit
- QR code embedded (no external links)
- Professional templates prevent phishing

### Voting
- One vote per student per stall
- Requires event check-in
- Anonymous voting preserved
- Duplicate votes prevented

---

## Best Practices

### For Admins
1. **Collect emails** during stall registration
2. **Use department field** for better analytics
3. **Test QR codes** before event starts
4. **Print backup QR codes** in case of email issues
5. **Monitor vote counts** during event

### For Stall Owners
1. **Display QR code prominently**
2. **Print in high quality** (300 DPI minimum)
3. **Ensure good lighting** for scanning
4. **Engage with students** to encourage voting
5. **Keep email safe** for future reference

### For Students
1. **Check in first** before voting
2. **Scan clearly** - hold steady
3. **Provide feedback** to help stalls improve
4. **Vote honestly** - one vote per stall
5. **Visit multiple stalls** to compare

---

## Migration Checklist

- [ ] Run `addStallEmailDepartment.js` migration
- [ ] Verify ownerEmail column exists
- [ ] Verify department column exists
- [ ] Test manual stall creation
- [ ] Test bulk stall upload
- [ ] Verify QR emails are sent
- [ ] Test student QR scanning
- [ ] Test department filtering
- [ ] Update admin UI for new fields
- [ ] Create CSV template for uploads

---

## Success Criteria

✅ Stalls created with all fields  
✅ QR codes generated automatically  
✅ Emails sent with QR code images  
✅ Students can scan and vote  
✅ Department filtering works  
✅ Bulk upload handles 100+ stalls  
✅ Email delivery rate >95%  
✅ QR codes scan correctly  
✅ Vote counting accurate  
✅ Analytics show department breakdowns  

---

**Last Updated:** After implementing stall QR code email system
