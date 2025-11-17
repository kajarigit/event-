# Duplicate Stall Cleanup Script

This script helps you remove duplicate stalls that were created before the duplicate prevention fix.

## Manual Cleanup via Admin Panel

### Step 1: Identify Duplicates
1. Go to **Admin → Stalls**
2. Look for stalls with identical names (like "stall1" appearing multiple times)
3. Check they have the same event, department, location

### Step 2: Keep One, Delete Others
1. Choose which duplicate to keep (usually the first one or the one with most feedback/votes)
2. Click the **Delete (trash)** icon on the duplicates
3. Confirm deletion

### Step 3: Verify
1. Refresh the page
2. Confirm each stall name appears only once per event

---

## Automatic Cleanup via Database (Advanced)

If you have many duplicates, you can use SQL to clean them up:

### Option 1: Direct SQL (PostgreSQL)

```sql
-- Find duplicates
SELECT 
  "eventId", 
  name, 
  COUNT(*) as duplicate_count
FROM stalls
GROUP BY "eventId", name
HAVING COUNT(*) > 1;

-- Delete duplicates, keeping the oldest one
WITH ranked_stalls AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "eventId", name 
      ORDER BY "createdAt" ASC
    ) as rn
  FROM stalls
)
DELETE FROM stalls
WHERE id IN (
  SELECT id 
  FROM ranked_stalls 
  WHERE rn > 1
);
```

### Option 2: Via Backend Console

Create a temporary file: `backend/scripts/cleanup-duplicates.js`

```javascript
const { Stall, sequelize } = require('../src/models/index.sequelize');

async function cleanupDuplicateStalls() {
  try {
    // Find all duplicates
    const [duplicates] = await sequelize.query(`
      SELECT "eventId", name, COUNT(*) as count
      FROM stalls
      GROUP BY "eventId", name
      HAVING COUNT(*) > 1
    `);

    console.log(`Found ${duplicates.length} duplicate stall names`);

    for (const dup of duplicates) {
      // Get all stalls with this name in this event
      const stalls = await Stall.findAll({
        where: {
          eventId: dup.eventId,
          name: dup.name,
        },
        order: [['createdAt', 'ASC']], // Keep oldest
      });

      // Keep first, delete rest
      for (let i = 1; i < stalls.length; i++) {
        console.log(`Deleting duplicate: ${stalls[i].name} (ID: ${stalls[i].id})`);
        await stalls[i].destroy();
      }
    }

    console.log('✅ Cleanup complete!');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    process.exit();
  }
}

cleanupDuplicateStalls();
```

Run with:
```bash
node backend/scripts/cleanup-duplicates.js
```

---

## Prevention Measures (Already Implemented)

### 1. Database Unique Constraint
```javascript
// backend/src/models/Stall.sequelize.js
indexes: [
  {
    unique: true,
    fields: ['eventId', 'name'],
    name: 'unique_stall_per_event'
  }
]
```
- Prevents duplicates at database level
- Error if attempting to create duplicate

### 2. Backend Validation
```javascript
// backend/src/controllers/adminController.sequelize.js
const existingStall = await Stall.findOne({
  where: { eventId, name: name.trim() }
});

if (existingStall) {
  return res.status(400).json({
    message: 'A stall named "..." already exists in this event.'
  });
}
```
- Checks before creating
- Returns clear error message

### 3. Frontend Loading State
```javascript
// frontend/src/pages/Admin/Stalls.jsx
<button
  disabled={createMutation.isLoading}
  className="disabled:opacity-50"
>
  {createMutation.isLoading ? 'Saving...' : 'Create Stall'}
</button>
```
- Button disabled during save
- Shows "Saving..." text
- Prevents multiple clicks

### 4. Error Handling
```javascript
// backend/src/middleware/errorHandler.js
if (err.name === 'SequelizeUniqueConstraintError') {
  message = 'A stall with this name already exists...';
}
```
- Catches unique constraint violations
- Returns user-friendly error

---

## Testing After Fix

### Test 1: Create New Stall
1. Go to Admin → Stalls
2. Click "Add Stall"
3. Fill in details with unique name
4. Click "Create Stall"
5. **Expected**: Success message, stall appears in list

### Test 2: Attempt Duplicate
1. Click "Add Stall" again
2. Use **exact same name** as existing stall
3. Use **same event**
4. Click "Create Stall"
5. **Expected**: Error toast: "A stall named '...' already exists in this event"

### Test 3: Similar Name (Different Case)
1. Try creating stall with "STALL1" when "stall1" exists
2. **Expected**: Should be blocked (case-insensitive check)

### Test 4: Same Name, Different Event
1. Create stall named "Food Stall" in Event A
2. Create stall named "Food Stall" in Event B
3. **Expected**: Both should succeed (different events)

### Test 5: Button Spam Protection
1. Fill in stall form
2. Click "Create Stall" button rapidly 5 times
3. **Expected**: 
   - Button disables after first click
   - Shows "Saving..."
   - Only ONE stall created
   - Success message appears once

---

## Error Messages

### User Will See:
```
❌ A stall named "Food Court" already exists in this event. Please use a different name.
```

### Console Will Show:
```javascript
POST /api/admin/stalls 400
{
  success: false,
  message: "A stall named \"Food Court\" already exists in this event. Please use a different name."
}
```

---

## Migration Notes

### If You Need to Run Database Migration:

The unique constraint will be created automatically when Sequelize syncs models. But if you need manual migration:

```sql
-- Add unique constraint
ALTER TABLE stalls
ADD CONSTRAINT unique_stall_per_event 
UNIQUE ("eventId", name);

-- If you get error about existing duplicates, clean them first
```

### Handling Existing Duplicates:

If constraint fails to add due to existing duplicates:
1. Clean duplicates first (see cleanup script above)
2. Then retry adding constraint
3. Or let Sequelize handle it on next sync

---

## Monitoring

### Check for Duplicates:
```sql
SELECT "eventId", name, COUNT(*) 
FROM stalls 
GROUP BY "eventId", name 
HAVING COUNT(*) > 1;
```

### Count Total Stalls:
```sql
SELECT COUNT(*) FROM stalls;
```

### Count Unique Stall Names per Event:
```sql
SELECT 
  e.name as event_name,
  COUNT(DISTINCT s.name) as unique_stalls
FROM stalls s
JOIN events e ON s."eventId" = e.id
GROUP BY e.name;
```

---

## Rollback (If Needed)

If the unique constraint causes issues:

### Remove Constraint:
```sql
ALTER TABLE stalls
DROP CONSTRAINT IF EXISTS unique_stall_per_event;
```

### Remove from Model:
```javascript
// Remove from Stall.sequelize.js indexes array
```

---

**Status**: ✅ Fix Deployed  
**Protection**: Database + Backend + Frontend  
**Action Required**: Clean up existing duplicates manually via admin panel  
**Testing**: Verify duplicate prevention works after deployment
