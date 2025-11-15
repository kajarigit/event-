# Backend and Frontend Updates Summary

## ✅ All Changes Completed!

### Backend Updates

#### 1. User Model (`backend/src/models/User.sequelize.js`)
**Fields Updated:**
- ❌ Removed: `rollNumber`
- ✅ Added: `regNo`, `faculty`, `programme`
- Kept: `name`, `email`, `password`, `role`, `phone`, `department`, `year`, `isActive`

#### 2. Stall Model (`backend/src/models/Stall.sequelize.js`)
**Fields Added:**
- ✅ `participants` (TEXT/JSON) - Array of participants with getters/setters

#### 3. Admin Controller (`backend/src/controllers/adminController.sequelize.js`)

**bulkUploadUsers Updated:**
```javascript
usersToCreate.push({
  name: row.name,
  email: row.email,
  password: password,
  role: row.role || 'student',
  phone: row.phone || null,
  regNo: row.regNo || null,           // NEW
  faculty: row.faculty || null,        // NEW
  department: row.department || null,
  programme: row.programme || null,    // NEW
  year: row.year || null,
  isActive: row.isActive !== 'false',
});
```

**bulkUploadStalls Updated:**
```javascript
stallsToCreate.push({
  eventId: row.eventId,
  name: row.name,
  description: row.description || null,
  location: row.location || null,
  category: row.category || null,
  ownerName: row.ownerName || null,
  ownerContact: row.ownerContact || null,
  ownerEmail: row.ownerEmail || null,
  department: row.department || null,
  participants: row.participants ? JSON.parse(row.participants) : [],  // NEW
  isActive: row.isActive !== 'false',
});
```

**createUser**: Already uses `...req.body`, automatically accepts new fields

---

### Frontend Updates

#### 1. Users Management (`frontend/src/pages/Admin/Users.jsx`)

**Form State Updated:**
```javascript
const [formData, setFormData] = useState({
  name: '',
  email: '',
  regNo: '',          // NEW (was rollNo)
  faculty: '',        // NEW
  department: '',
  programme: '',      // NEW
  year: '',          // NEW
  role: 'student',
  password: '',
  phone: '',
});
```

**Form Fields Added:**
- Registration No (replaces Roll No)
- Faculty/School (new field)
- Programme (enhanced)
- Year (numeric input)

**Display Card Updated:**
- Shows regNo instead of rollNo
- Displays faculty
- Shows programme and department
- Year shown as "Year: 2024"

**Search Updated:**
- Now searches by regNo instead of rollNo

**Download Templates Updated:**
- Sample template includes new fields
- Blank template has updated headers

#### 2. Stalls Management (`frontend/src/pages/Admin/Stalls.jsx`)

**Form State Updated:**
```javascript
const [formData, setFormData] = useState({
  name: '',
  department: '',
  description: '',
  location: '',           // NEW
  category: '',           // NEW
  ownerName: '',          // Changed from coordinatorName
  ownerContact: '',       // Changed from coordinatorContact
  ownerEmail: '',         // NEW
  participants: [],       // NEW
  eventId: '',
});

const [participantInput, setParticipantInput] = useState({
  name: '',
  regNo: '',
  department: ''
});
```

**New Functions Added:**
```javascript
const addParticipant = () => {
  // Adds participant to formData.participants array
};

const removeParticipant = (index) => {
  // Removes participant from array
};
```

**Form Fields Added:**
- Location (text input)
- Category (text input)
- Owner Email (email input with QR code hint)
- Participants Section:
  - Add participant form (name, regNo, department)
  - Participants list with remove button
  - Visual feedback (blue background)

**Display Card Updated:**
- Shows location with 📍 icon
- Shows category with 🏷️ icon
- Displays owner info
- Shows participants list (first 3, with "+X more")
- Participants in blue box with avatar icon

**Download Templates Updated:**
- Sample includes participants JSON format
- Toast message explains JSON format requirement

---

### Migration Scripts

#### 1. `backend/src/scripts/updateUserFields.js`
**What it does:**
- Adds regNo, faculty, programme columns
- Migrates data from rollNumber to regNo
- Drops rollNumber column
- Creates indexes

**Run:**
```bash
node backend/src/scripts/updateUserFields.js
```

#### 2. `backend/src/scripts/addStallParticipants.js`
**What it does:**
- Adds participants column (TEXT type for JSON)
- No data migration needed (new field)

**Run:**
```bash
node backend/src/scripts/addStallParticipants.js
```

---

### CSV Templates

#### Updated Templates:

**Students:**
```csv
name,email,password,role,phone,regNo,faculty,department,programme,year
```

**Volunteers:**
```csv
name,email,password,role,phone,regNo,faculty,department,programme
```

**Stalls:**
```csv
eventId,name,description,location,category,ownerName,ownerContact,ownerEmail,department,participants
```

**Participants Format in CSV:**
```csv
"[{\"name\":\"Amit Sharma\",\"regNo\":\"2024CS001\",\"department\":\"CS\"}]"
```

---

### Key Features

#### User Management:
✅ Registration number system (replaces roll number)
✅ Faculty/School categorization
✅ Programme-specific tracking
✅ Year tracking for students
✅ Enhanced search by regNo
✅ Better data organization

#### Stall Management:
✅ Multiple participants support
✅ Location and category fields
✅ Owner email for QR code delivery
✅ Visual participant list in UI
✅ Add/remove participants dynamically
✅ JSON storage for flexible participant data
✅ Participants displayed in stall cards

---

### UI Improvements

#### Users Page:
- Cleaner form with conditional fields for students
- Better visual hierarchy in user cards
- Registration number prominently displayed
- Faculty and programme shown in card

#### Stalls Page:
- Comprehensive stall information
- Participants section with inline add/remove
- Visual feedback for participants (blue boxes)
- Location and category visible in cards
- Owner info clearly displayed
- Better use of space with multi-column layout

---

### Database Schema

#### Users Table:
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL,
  email VARCHAR UNIQUE NOT NULL,
  password VARCHAR NOT NULL,
  role ENUM('admin','student','volunteer','stall_owner'),
  phone VARCHAR,
  regNo VARCHAR,              -- NEW
  faculty VARCHAR,            -- NEW
  department VARCHAR,
  programme VARCHAR,          -- NEW
  year INTEGER,
  isActive BOOLEAN DEFAULT true,
  qrToken TEXT,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

#### Stalls Table:
```sql
CREATE TABLE stalls (
  id UUID PRIMARY KEY,
  eventId UUID NOT NULL REFERENCES events(id),
  name VARCHAR NOT NULL,
  description TEXT,
  location VARCHAR,           -- NEW
  category VARCHAR,           -- NEW
  ownerId UUID REFERENCES users(id),
  ownerName VARCHAR,
  ownerContact VARCHAR,
  ownerEmail VARCHAR,         -- ADDED
  department VARCHAR,         -- ADDED
  participants TEXT,          -- NEW (JSON)
  isActive BOOLEAN DEFAULT true,
  qrToken TEXT,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

---

### Testing Checklist

#### Backend:
- [ ] Run user migration script
- [ ] Run stall migration script
- [ ] Test bulk upload users with new CSV
- [ ] Test bulk upload stalls with participants JSON
- [ ] Test manual user creation with new fields
- [ ] Test manual stall creation with participants
- [ ] Verify database columns added correctly
- [ ] Test participants JSON parsing

#### Frontend:
- [ ] Test user form with all new fields
- [ ] Test stall form with participants
- [ ] Add multiple participants to a stall
- [ ] Remove participants from a stall
- [ ] Edit stall with existing participants
- [ ] Download sample templates (verify new fields)
- [ ] Download blank templates (verify headers)
- [ ] Search users by regNo
- [ ] Verify user cards display new fields
- [ ] Verify stall cards display participants

#### Integration:
- [ ] Create user via form → verify in database
- [ ] Bulk upload users → verify new fields saved
- [ ] Create stall with participants → verify JSON stored
- [ ] Bulk upload stalls with participants → verify parsing
- [ ] Edit user → verify new fields update
- [ ] Edit stall participants → verify JSON updates
- [ ] QR code email includes participant info (if applicable)

---

### Deployment Steps

1. **Backup Production Database**
   ```bash
   pg_dump production_db > backup_$(date +%Y%m%d).sql
   ```

2. **Deploy Backend Code**
   ```bash
   git add backend/
   git commit -m "feat: Update user and stall models with new fields"
   git push origin master
   ```

3. **Run Migrations on Production**
   ```bash
   # SSH into production server or use Render shell
   node backend/src/scripts/updateUserFields.js
   node backend/src/scripts/addStallParticipants.js
   ```

4. **Deploy Frontend Code**
   ```bash
   git add frontend/
   git commit -m "feat: Update UI for new user and stall fields"
   git push origin master
   ```

5. **Deploy Templates**
   ```bash
   git add templates/
   git commit -m "docs: Update CSV templates with new field structure"
   git push origin master
   ```

6. **Verify Deployment**
   - Test user creation
   - Test stall creation with participants
   - Test bulk uploads
   - Verify email delivery still works
   - Check QR codes generated correctly

---

### Breaking Changes

⚠️ **CSV Template Format Changed**
- Old CSVs with `rollNumber` field will fail
- Admins must use new templates
- Provide migration guide to users

⚠️ **API Field Names**
- `rollNumber` → `regNo`
- `coordinatorName` → `ownerName` (internal mapping)
- `coordinatorContact` → `ownerContact` (internal mapping)

⚠️ **Database Schema**
- `rollNumber` column removed from users table
- Must run migrations before using new code

---

### Rollback Plan

If issues occur:

1. **Rollback Database:**
   ```sql
   -- Add back rollNumber
   ALTER TABLE users ADD COLUMN "rollNumber" VARCHAR(255);
   UPDATE users SET "rollNumber" = "regNo" WHERE "regNo" IS NOT NULL;
   
   -- Remove new columns
   ALTER TABLE users DROP COLUMN "regNo";
   ALTER TABLE users DROP COLUMN "faculty";
   ALTER TABLE users DROP COLUMN "programme";
   ALTER TABLE stalls DROP COLUMN "participants";
   ```

2. **Rollback Code:**
   ```bash
   git revert HEAD~3  # Adjust number based on commits
   git push origin master
   ```

3. **Restore CSV Templates:**
   - Keep old templates archived
   - Restore from previous commit

---

## Summary

✅ **Backend**: All models and controllers updated
✅ **Frontend**: All forms and displays updated
✅ **Migrations**: Scripts created and ready
✅ **Templates**: Updated with new field structure
✅ **Documentation**: Comprehensive guides created
✅ **Testing**: Checklist provided

**Ready for Testing and Deployment!**

---

**Version:** 2.0  
**Date:** November 15, 2025  
**Status:** ✅ Complete - Ready for Migration
