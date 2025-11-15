# Fix Attendance Duplicate Constraint Issue
# Run this script to remove the unique constraint causing "duplicate event ID" errors

## Problem
The Attendance table has a unique constraint on (eventId, studentId) that prevents students from checking in/out multiple times for the same event.

## Solution
Remove the unique constraint and create non-unique indexes instead.

## Steps to Fix on Render:

### Option 1: Using Render Shell (Recommended)

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Click your backend web service**
3. **Click "Shell" tab** (left sidebar)
4. **Run these commands**:

```bash
# Navigate to scripts directory
cd backend/scripts

# Run the fix script using psql
psql $DATABASE_URL -f fix-attendance-constraint.sql
```

### Option 2: Using Aiven Console

1. **Go to Aiven Console**: https://console.aiven.io
2. **Click your PostgreSQL database**
3. **Click "Query Editor"**
4. **Copy and paste this SQL**:

```sql
-- Remove unique constraint
ALTER TABLE "attendances" 
DROP CONSTRAINT IF EXISTS "attendances_eventId_studentId_key";

-- Drop old index
DROP INDEX IF EXISTS "attendances_event_id_student_id";

-- Create new indexes
CREATE INDEX IF NOT EXISTS "idx_attendances_event_student_time" 
ON "attendances" ("eventId", "studentId", "checkInTime" DESC);

CREATE INDEX IF NOT EXISTS "idx_attendances_event_status" 
ON "attendances" ("eventId", "status");
```

5. **Click "Run Query"**

### Option 3: Using Local psql

```bash
# From your local machine
psql "postgresql://avnadmin:<password>@<your-aiven-host>.aivencloud.com:19044/defaultdb?sslmode=require" -f backend/scripts/fix-attendance-constraint.sql
```

## Verification

After running the fix, test by scanning the same student QR code twice:

```bash
# Should work without "duplicate" error
curl -X POST https://your-backend.onrender.com/api/scan/student \
  -H "Authorization: Bearer YOUR_VOLUNTEER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"qrToken":"STUDENT_QR_TOKEN"}'
```

## What Changed

**Before** (Broken):
```javascript
indexes: [
  {
    unique: true,  // ❌ Prevents multiple scans
    fields: ['eventId', 'studentId']
  }
]
```

**After** (Fixed):
```javascript
indexes: [
  {
    // ✅ Allows multiple scans
    fields: ['eventId', 'studentId', 'checkInTime']
  },
  {
    fields: ['eventId', 'status']
  }
]
```

## Files Modified

1. **backend/src/models/Attendance.sequelize.js** - Removed unique constraint
2. **backend/scripts/fix-attendance-constraint.sql** - Migration script

## Expected Result

✅ Students can check-in and check-out multiple times for the same event
✅ No more "duplicate value for field eventId" errors
✅ Proper attendance tracking with multiple entries per student per event

## Rollback (if needed)

If you need to restore the unique constraint (not recommended):

```sql
-- Delete duplicate records first
DELETE FROM attendances a
WHERE a.id NOT IN (
  SELECT MIN(id)
  FROM attendances
  GROUP BY "eventId", "studentId"
);

-- Then add constraint back
ALTER TABLE attendances
ADD CONSTRAINT attendances_eventId_studentId_key 
UNIQUE ("eventId", "studentId");
```

## Support

- **Error persists**: Check if constraint still exists: `\d attendances` in psql
- **Can't connect**: Verify database credentials in Render environment variables
- **Permission denied**: Ensure you're using the admin database user

---

**Status**: Fix ready to deploy! Run the SQL migration and the duplicate error will be gone! 🚀
