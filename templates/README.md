# CSV Bulk Upload Templates

This folder contains CSV templates for bulk uploading users and stalls to the event management system.

## Available Templates

### 1. Student Upload Templates

**Blank Template:** `blank-students-template.csv`  
**Sample Template:** `sample-students-upload.csv` (20 sample records)

#### Fields:

| Field | Required | Type | Description | Example |
|-------|----------|------|-------------|---------|
| `name` | ✅ Yes | String | Full name of the student | `Rahul Kumar` |
| `email` | ✅ Yes | String (Email) | Valid email address (must be unique) | `rahul.kumar@student.com` |
| `password` | ⚠️ Optional* | String (Min 6 chars) | Account password. If empty, auto-generated | `Student@123` |
| `role` | ✅ Yes | Enum | Must be `student` for this template | `student` |
| `phone` | ❌ Optional | String | Contact number | `9876543210` |
| `regNo` | ❌ Optional | String | Registration/Roll number | `2024CS001` |
| `faculty` | ❌ Optional | String | Faculty/School name | `School of Engineering` |
| `department` | ❌ Optional | String | Department/Branch name | `Computer Science` |
| `programme` | ❌ Optional | String | Programme name | `B.Tech Computer Science` |
| `year` | ❌ Optional | Integer | Year of study (e.g., 2024) | `2024` |

**\* Password Behavior:**
- If provided in CSV: Uses the provided password
- If left empty: System auto-generates a secure password
- Welcome email is sent with credentials in both cases

---

### 2. Volunteer Upload Templates

**Blank Template:** `blank-volunteers-template.csv`  
**Sample Template:** `sample-volunteers-upload.csv` (10 sample records)

#### Fields:

| Field | Required | Type | Description | Example |
|-------|----------|------|-------------|---------|
| `name` | ✅ Yes | String | Full name of the volunteer | `Priya Sharma` |
| `email` | ✅ Yes | String (Email) | Valid email address (must be unique) | `priya@volunteer.com` |
| `password` | ⚠️ Optional* | String (Min 6 chars) | Account password. If empty, auto-generated | `Volunteer@123` |
| `role` | ✅ Yes | Enum | Must be `volunteer` for this template | `volunteer` |
| `phone` | ❌ Optional | String | Contact number | `9876543210` |
| `regNo` | ❌ Optional | String | Volunteer ID | `VOL2024001` |
| `faculty` | ❌ Optional | String | Faculty/School name | `School of Engineering` |
| `department` | ❌ Optional | String | Assignment area (e.g., Security, Operations) | `Operations` |
| `programme` | ❌ Optional | String | Programme name | `Event Management` |

---

### 3. Stall Upload Templates

**Blank Template:** `blank-stalls-template.csv`  
**Sample Template:** `sample-stalls-upload.csv` (10 sample records)

#### Fields:

| Field | Required | Type | Description | Example |
|-------|----------|------|-------------|---------|
| `eventId` | ✅ Yes | UUID | Event ID (get from admin panel) | `550e8400-e29b-41d4-a716-446655440000` |
| `name` | ✅ Yes | String | Stall name | `AI & Machine Learning` |
| `description` | ❌ Optional | Text | Detailed description | `Showcasing AI projects...` |
| `location` | ❌ Optional | String | Physical location at event | `Block A - Room 101` |
| `category` | ❌ Optional | String | Stall category/type | `Technology` |
| `ownerName` | ❌ Optional | String | Name of stall owner | `Dr. Rajesh Kumar` |
| `ownerContact` | ❌ Optional | String | Contact number | `9876543210` |
| `ownerEmail` | ❌ Optional | String (Email) | **Important:** QR code email sent here | `rajesh.kumar@college.edu` |
| `department` | ❌ Optional | String | Department organizing the stall | `Computer Science` |
| `participants` | ❌ Optional | JSON Array | **Multiple participants** with name, regNo, department | See format below |

**🔑 Participants Format:**

The `participants` field must be a JSON array wrapped in double quotes. Each participant should have:
- `name`: Full name of the participant
- `regNo`: Registration number
- `department`: Department name

**Example:**
```csv
"[{\"name\":\"Amit Sharma\",\"regNo\":\"2024CS001\",\"department\":\"Computer Science\"},{\"name\":\"Priya Patel\",\"regNo\":\"2024CS045\",\"department\":\"Computer Science\"}]"
```

**Important Notes:**
- Wrap the entire JSON array in **double quotes**
- Escape inner quotes with backslash (\")
- Can include one or multiple participants
- Leave empty or use `[]` for no participants

**🔑 Other Important Notes:**

- **eventId**: Get this from the admin panel. All stalls in one upload should belong to the same event.
- **ownerEmail**: If provided, a beautiful email with embedded QR code will be automatically sent to this address after stall creation. The QR code allows students to vote and provide feedback.
- **department**: Used for department-wise filtering and analytics in the admin dashboard.

---

## How to Use These Templates

### Step 1: Download the Template

1. Choose the appropriate **blank template** for your upload type:
   - Students: `blank-students-template.csv`
   - Volunteers: `blank-volunteers-template.csv`
   - Stalls: `blank-stalls-template.csv`

2. **Or** download the **sample template** to see examples:
   - Students: `sample-students-upload.csv` (20 records)
   - Volunteers: `sample-volunteers-upload.csv` (10 records)
   - Stalls: `sample-stalls-upload.csv` (10 records)

### Step 2: Fill in Your Data

1. Open the CSV file in **Excel**, **Google Sheets**, or any spreadsheet software
2. **Do not modify the header row** (first row with field names)
3. Add your data starting from the second row
4. Fill **all required fields** (marked ✅ above)
5. Optional fields can be left empty

**Example (Students):**
```csv
name,email,password,role,phone,regNo,faculty,department,programme,year
John Doe,john@student.com,Pass@123,student,9876543210,2024CS001,School of Engineering,Computer Science,B.Tech CS,2024
Jane Smith,jane@student.com,,student,9876543211,2024EC002,School of Engineering,Electronics,B.Tech EC,2024
```

**Example (Stalls with Participants):**
```csv
eventId,name,description,location,category,ownerName,ownerContact,ownerEmail,department,participants
550e8400-e29b-...,AI Project,"AI demo",Room 101,Tech,Dr. Kumar,9876543210,kumar@edu,CS,"[{\"name\":\"Amit\",\"regNo\":\"2024CS001\",\"department\":\"CS\"}]"
```

**Important CSV Rules:**
- ✅ Always keep the header row
- ✅ Use commas to separate fields
- ✅ Empty optional fields: leave blank but keep commas
- ✅ Emails must be unique across all users
- ✅ Passwords must be at least 6 characters (or leave empty for auto-generation)
- ✅ For JSON fields (participants), wrap in quotes and escape inner quotes
- ❌ Don't add extra columns
- ❌ Don't use commas within field values (or wrap in quotes)

### Step 3: Save the File

1. Save as **CSV (Comma delimited)** format
2. Keep the `.csv` extension
3. Ensure UTF-8 encoding (for special characters)

### Step 4: Upload

1. Login to **Admin Panel**
2. Navigate to **Bulk Upload** section
3. Select the upload type (Students, Volunteers, or Stalls)
4. Click **Choose File** and select your CSV
5. Click **Upload**
6. Wait for the success message with upload summary

### Step 5: Verify

**For Users (Students/Volunteers):**
- Check that all users appear in the user management table
- Verify that welcome emails were sent (check spam folder)
- Test login with provided credentials

**For Stalls:**
- Check that all stalls appear in the stall management table
- If ownerEmail was provided, verify QR code emails were sent
- Check the upload summary for email delivery status
- Verify participants are displayed correctly
- Test QR code scanning

---

## Common Issues & Solutions

### ❌ "Invalid email format"
**Solution:** Ensure emails follow format: `name@domain.com`. No spaces, special characters except `@` and `.`

### ❌ "Duplicate email"
**Solution:** Each email must be unique. Check for duplicates in your CSV and across existing users.

### ❌ "Password too short"
**Solution:** Passwords must be at least 6 characters. Or leave empty for auto-generation.

### ❌ "Invalid role"
**Solution:** Role must exactly match: `student`, `volunteer`, `admin`, or `stall_owner` (case-sensitive).

### ❌ "Event not found"
**Solution:** For stalls, ensure the eventId is correct. Copy it from the event management page.

### ❌ "Invalid JSON in participants field"
**Solution:** 
- Ensure JSON is properly formatted
- Wrap entire JSON in double quotes
- Escape inner quotes with backslash
- Use online JSON validator to check format
- Example: `"[{\"name\":\"John\",\"regNo\":\"123\",\"department\":\"CS\"}]"`

### ❌ "CSV parsing error"
**Solution:** 
- Check that commas separate all fields
- Ensure no extra commas at line ends
- Wrap fields containing commas in double quotes
- Wrap JSON fields in double quotes
- Ensure file is saved as CSV (not Excel format)

### ❌ "Email not sent" (for stalls)
**Solution:** 
- Verify ownerEmail is a valid email format
- Check your email service is configured (SMTP settings)
- Check spam folder
- Email failure doesn't stop stall creation; you can resend QR codes later

### ❌ "Special characters garbled"
**Solution:** Save CSV with UTF-8 encoding. In Excel: Save As → CSV UTF-8.

---

## Field Migration Notes

### Changes from Previous Version:

**User Fields:**
- ❌ Removed: `rollNumber` (old field)
- ✅ Added: `regNo` (registration number - replaces rollNumber)
- ✅ Added: `faculty` (school/faculty)
- ✅ Added: `programme` (programme name)
- ✅ Kept: `department`, `year`, `phone`

**Stall Fields:**
- ✅ Added: `participants` (JSON array of multiple participants)

**Migration Script:**
If you have existing data, run the migration scripts:
```bash
node backend/src/scripts/updateUserFields.js
node backend/src/scripts/addStallParticipants.js
```

---

## Upload Response Examples

### Successful Student Upload:
```json
{
  "success": true,
  "message": "Bulk upload completed",
  "summary": {
    "total": 20,
    "created": 20,
    "failed": 0
  },
  "createdUsers": [...],
  "failedRows": []
}
```

### Successful Stall Upload (with emails):
```json
{
  "success": true,
  "message": "Bulk upload completed",
  "summary": {
    "total": 10,
    "created": 10,
    "failed": 0,
    "emailResults": {
      "sent": 8,
      "failed": 1,
      "skipped": 1,
      "errors": [
        "Row 5: Email service unavailable"
      ]
    }
  },
  "createdStalls": [...],
  "failedRows": []
}
```

**Email Results Explanation:**
- **sent**: QR code emails successfully delivered
- **failed**: Email sending failed (stall still created)
- **skipped**: No ownerEmail provided (no email sent)
- **errors**: Specific error messages for failed emails

---

## Best Practices

### 📝 Data Quality
1. **Validate emails** before uploading (use email validation tools)
2. **Remove duplicates** in your spreadsheet before upload
3. **Test with small batch** first (5-10 records) before uploading hundreds
4. **Use consistent formatting** for departments, faculties, programmes
5. **Validate JSON** for participants field using online JSON validator

### 🔐 Security
1. **Don't share CSV files** with passwords via insecure channels
2. **Delete CSV files** after successful upload
3. **Use strong passwords** if providing them (or let system auto-generate)
4. **Verify user access** after creation

### 📧 Email Delivery
1. **For stalls:** Always provide ownerEmail if you want QR codes emailed
2. **Check spam folders** after bulk upload
3. **Inform recipients** to expect an email from the event system
4. **Save QR codes** locally as backup (downloadable from admin panel)

### 📊 Record Keeping
1. **Save original CSVs** with timestamp before upload
2. **Note the upload summary** (users created, emails sent, etc.)
3. **Keep track of eventIds** used for stall uploads
4. **Document naming conventions** for faculty, department, programme

---

## Quick Reference Table

| Upload Type | Template File | Required Fields | Auto-Generated | Email Sent | Special Fields |
|-------------|---------------|-----------------|----------------|------------|----------------|
| **Students** | `blank-students-template.csv` | name, email, role | password (if empty) | ✅ Welcome email | regNo, faculty, programme |
| **Volunteers** | `blank-volunteers-template.csv` | name, email, role | password (if empty) | ✅ Welcome email | regNo, faculty, programme |
| **Stalls** | `blank-stalls-template.csv` | eventId, name | QR code token | ⚠️ Only if ownerEmail | participants (JSON array) |

---

## Participants Field Examples

### Single Participant:
```csv
"[{\"name\":\"Amit Sharma\",\"regNo\":\"2024CS001\",\"department\":\"Computer Science\"}]"
```

### Multiple Participants:
```csv
"[{\"name\":\"Amit Sharma\",\"regNo\":\"2024CS001\",\"department\":\"Computer Science\"},{\"name\":\"Priya Patel\",\"regNo\":\"2024CS045\",\"department\":\"Computer Science\"},{\"name\":\"Vikram Reddy\",\"regNo\":\"2024EC012\",\"department\":\"Electronics\"}]"
```

### No Participants (both valid):
```csv
[]
```
or leave empty

### Tips for Creating Participants JSON:
1. Use an online JSON formatter to validate
2. Copy from sample template and modify
3. Each participant must have: name, regNo, department
4. Don't forget to escape quotes with backslash
5. Wrap entire JSON in double quotes in CSV

---

## Support

If you encounter issues not covered here:

1. **Check field requirements** in the tables above
2. **Validate CSV format** (commas, quotes, encoding)
3. **Test with sample templates** provided
4. **Review upload response** for specific error messages
5. **Validate JSON** for participants field
6. **Contact system administrator** with error details

---

## Template Version

**Version:** 2.0  
**Last Updated:** November 2025  
**Compatible With:** Event Management System v2.0+

**Changelog:**
- v2.0: Added regNo, faculty, programme fields; Added participants to stalls
- v1.0: Initial release with basic fields

---

**Need Help?**  
Refer to the [Stall Management Guide](../STALL_MANAGEMENT_GUIDE.md) for detailed information about stall features, QR code system, and department filtering.
