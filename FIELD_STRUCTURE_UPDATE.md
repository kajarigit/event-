# Field Structure Update Summary

## Overview
Updated user and stall field structures to match institutional requirements with registration numbers, faculty/school information, and multiple stall participants.

## Changes Made

### 1. User Model Updates

#### Removed Fields:
- ❌ `rollNumber` - Replaced with `regNo`

#### Added Fields:
- ✅ `regNo` (STRING) - Registration/Roll number (e.g., "2024CS001")
- ✅ `faculty` (STRING) - Faculty/School name (e.g., "School of Engineering")
- ✅ `programme` (STRING) - Programme name (e.g., "B.Tech Computer Science")

#### Kept Fields:
- `name`, `email`, `password`, `role`, `phone`, `department`, `year`, `isActive`

**Migration Script:** `backend/src/scripts/updateUserFields.js`
- Adds regNo, faculty, programme columns
- Migrates data from rollNumber to regNo
- Removes rollNumber column
- Run with: `node src/scripts/updateUserFields.js`

---

### 2. Stall Model Updates

#### Added Fields:
- ✅ `participants` (TEXT/JSON) - Array of participants with name, regNo, department

**Participants Structure:**
```json
[
  {
    "name": "Amit Sharma",
    "regNo": "2024CS001", 
    "department": "Computer Science"
  },
  {
    "name": "Priya Patel",
    "regNo": "2024CS045",
    "department": "Computer Science"  
  }
]
```

**Migration Script:** `backend/src/scripts/addStallParticipants.js`
- Adds participants column (TEXT type for JSON storage)
- Run with: `node src/scripts/addStallParticipants.js`

---

### 3. CSV Template Updates

#### Student Templates:
**New Headers:**
```csv
name,email,password,role,phone,regNo,faculty,department,programme,year
```

**Example Row:**
```csv
Rahul Kumar,rahul.kumar@student.com,Student@123,student,9876543210,2024CS001,School of Engineering,Computer Science,B.Tech Computer Science,2024
```

#### Volunteer Templates:
**New Headers:**
```csv
name,email,password,role,phone,regNo,faculty,department,programme
```

**Example Row:**
```csv
Rajesh Kumar,rajesh.vol@event.com,Volunteer@123,volunteer,9876540001,VOL2024001,School of Engineering,Operations,Event Management
```

#### Stall Templates:
**New Headers:**
```csv
eventId,name,description,location,category,ownerName,ownerContact,ownerEmail,department,participants
```

**Example Row:**
```csv
REPLACE_WITH_EVENT_UUID,AI Project,Showcasing AI,Room 101,Technology,Dr. Kumar,9876543210,kumar@edu,CS,"[{\"name\":\"Amit\",\"regNo\":\"2024CS001\",\"department\":\"CS\"}]"
```

**Important:** Participants field must be JSON-formatted and wrapped in double quotes with escaped inner quotes.

---

### 4. Files Modified

#### Backend:
1. **`backend/src/models/User.sequelize.js`**
   - Removed `rollNumber` field
   - Added `regNo`, `faculty`, `programme` fields

2. **`backend/src/models/Stall.sequelize.js`**
   - Added `participants` field with JSON getter/setter

3. **`backend/src/controllers/adminController.sequelize.js`**
   - Updated `bulkUploadStalls` to parse participants JSON
   - Added: `participants: row.participants ? JSON.parse(row.participants) : []`

4. **`backend/src/scripts/updateUserFields.js`** (NEW)
   - Migration for user field changes

5. **`backend/src/scripts/addStallParticipants.js`** (NEW)
   - Migration for stall participants field

#### Frontend:
6. **`frontend/src/pages/Admin/Users.jsx`**
   - Updated download template functions with new field headers
   - Sample template now includes regNo, faculty, programme

7. **`frontend/src/pages/Admin/Stalls.jsx`**
   - Updated download template functions with participants field
   - Sample shows JSON format for participants

#### Templates:
8. **`templates/blank-students-template.csv`** - Updated headers
9. **`templates/sample-students-upload.csv`** - 20 records with new fields
10. **`templates/blank-volunteers-template.csv`** - Updated headers
11. **`templates/sample-volunteers-upload.csv`** - 10 records with new fields
12. **`templates/blank-stalls-template.csv`** - Updated with participants
13. **`sample-stalls-upload.csv`** - 10 records with participants examples
14. **`templates/README.md`** - Comprehensive documentation with:
    - Updated field tables
    - Participants JSON format examples
    - Migration notes
    - Troubleshooting for JSON parsing

---

### 5. Implementation Details

#### User Model (Sequelize):
```javascript
regNo: {
  type: DataTypes.STRING,
  allowNull: true
},
faculty: {
  type: DataTypes.STRING,
  allowNull: true
},
programme: {
  type: DataTypes.STRING,
  allowNull: true
}
```

#### Stall Model (Sequelize):
```javascript
participants: {
  type: DataTypes.TEXT,
  allowNull: true,
  get() {
    const rawValue = this.getDataValue('participants');
    return rawValue ? JSON.parse(rawValue) : [];
  },
  set(value) {
    this.setDataValue('participants', JSON.stringify(value));
  }
}
```

#### Admin Controller (Bulk Upload):
```javascript
participants: row.participants ? JSON.parse(row.participants) : []
```

---

### 6. CSV Format Rules

#### For Students/Volunteers:
- **Required:** name, email, role
- **Optional:** password (auto-generated if empty), phone, regNo, faculty, department, programme, year
- **Format:** Standard CSV with comma-separated values

#### For Stalls:
- **Required:** eventId, name
- **Optional:** All other fields including participants
- **Participants Format:**
  ```csv
  "[{\"name\":\"John Doe\",\"regNo\":\"2024CS001\",\"department\":\"CS\"}]"
  ```
  - Must be valid JSON array
  - Wrap entire JSON in double quotes
  - Escape inner quotes with backslash
  - Each participant needs: name, regNo, department

---

### 7. Migration Steps

#### Step 1: Backup Database
```bash
# Create backup before migration
pg_dump your_database > backup_before_migration.sql
```

#### Step 2: Run User Migration
```bash
cd backend
node src/scripts/updateUserFields.js
```
**Expected Output:**
```
Starting User table migration...
✓ Added regNo, faculty, and programme columns
✓ Copied rollNumber data to regNo
✓ Removed rollNumber column
✅ User table migration completed successfully!
```

#### Step 3: Run Stall Migration
```bash
node src/scripts/addStallParticipants.js
```
**Expected Output:**
```
Starting Stall participants migration...
✓ Added participants column (JSON field)
✅ Stall participants migration completed successfully!
```

#### Step 4: Verify Changes
Check that:
- User table has regNo, faculty, programme columns
- rollNumber column is removed (data migrated to regNo)
- Stall table has participants column
- Existing data is intact

---

### 8. Testing Checklist

#### User Bulk Upload:
- [ ] Download blank student template
- [ ] Fill with test data including regNo, faculty, programme
- [ ] Upload CSV via admin panel
- [ ] Verify users created with all fields
- [ ] Check welcome emails sent
- [ ] Verify data appears correctly in user list

#### Volunteer Bulk Upload:
- [ ] Download blank volunteer template
- [ ] Fill with test data
- [ ] Upload and verify

#### Stall Bulk Upload:
- [ ] Download blank stall template
- [ ] Fill with test data including participants JSON
- [ ] Upload CSV via admin panel
- [ ] Verify stalls created
- [ ] Check QR emails sent to ownerEmail
- [ ] Verify participants displayed correctly
- [ ] Test with single participant
- [ ] Test with multiple participants
- [ ] Test with no participants (empty)

#### Frontend Download:
- [ ] Click "Sample Template" for students - verify new fields
- [ ] Click "Blank Template" for students - verify headers
- [ ] Click "Sample Template" for stalls - verify participants
- [ ] Click "Blank Template" for stalls - verify headers

---

### 9. Known Issues & Solutions

#### Issue: JSON Parse Error for Participants
**Cause:** Improperly formatted JSON or missing quotes/escaping
**Solution:**
- Use online JSON validator
- Copy format from sample template
- Ensure backslash before inner quotes
- Wrap entire JSON in double quotes

#### Issue: RegNo Not Showing for Existing Users
**Cause:** Migration script not run
**Solution:**
- Run `updateUserFields.js` migration script
- Data will be migrated from rollNumber to regNo

#### Issue: Participants Field Empty After Upload
**Cause:** JSON parsing failed silently or empty value provided
**Solution:**
- Check CSV has proper JSON format
- Verify no extra spaces around JSON
- Use `[]` for empty participants array

---

### 10. Rollback Plan

If needed to rollback:

#### Rollback User Changes:
```sql
-- Add back rollNumber column
ALTER TABLE users ADD COLUMN "rollNumber" VARCHAR(255);

-- Copy data back from regNo
UPDATE users SET "rollNumber" = "regNo" WHERE "regNo" IS NOT NULL;

-- Remove new columns
ALTER TABLE users DROP COLUMN "regNo";
ALTER TABLE users DROP COLUMN "faculty";
ALTER TABLE users DROP COLUMN "programme";
```

#### Rollback Stall Changes:
```sql
-- Remove participants column
ALTER TABLE stalls DROP COLUMN "participants";
```

---

### 11. Next Steps

1. ✅ All code changes completed
2. ⏳ Run migrations on development database
3. ⏳ Test bulk uploads thoroughly
4. ⏳ Run migrations on production (Render)
5. ⏳ Update admin panel UI to display new fields
6. ⏳ Notify admins about new template format
7. ⏳ Archive old templates for reference

---

### 12. Documentation Updates

Updated files:
- ✅ `templates/README.md` - Complete guide with new fields
- ✅ Sample CSVs - All updated with new structure
- ✅ Blank templates - All headers updated
- ⏳ `STALL_MANAGEMENT_GUIDE.md` - Should update with participants info
- ⏳ Admin user guide - Should document new fields

---

## Summary

**User Fields Changed:**
- rollNumber → regNo (with data migration)
- Added: faculty, programme

**Stall Fields Added:**
- participants (JSON array)

**Impact:**
- Admins must use new CSV templates
- Old CSV uploads will fail (missing new headers)
- Existing data preserved through migration
- Better institutional data structure
- Support for multiple stall participants

**Migration Required:** Yes
**Breaking Change:** Yes (CSV template format)
**Data Loss:** No (migration preserves existing data)

---

**Version:** 2.0  
**Date:** November 15, 2025  
**Author:** System Update
