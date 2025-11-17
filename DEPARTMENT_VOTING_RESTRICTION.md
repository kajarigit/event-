# Department-Based Voting Restriction

## 📋 Feature Overview

**Requirement**: Students can give feedback to any stall, but voting is restricted to stalls from their own department only.

**Implementation**: 
- Backend validation prevents cross-department voting
- Frontend automatically filters to show only department stalls
- Clear UI messaging explains the restriction

## 🎯 Business Rules

### Feedback (No Restriction)
✅ Students can give feedback to **ANY stall** regardless of department
- Open feedback encourages cross-department interaction
- Helps all stalls improve based on diverse input
- Students can scan QR codes of any stall

### Voting (Department Restricted)
🔒 Students can only vote for stalls from **THEIR OWN department**
- Ensures fair competition within departments
- Prevents vote manipulation across departments
- Maintains department-level excellence standards

### Example Scenarios

**Scenario 1: Computer Science Student**
- Department: Computer Science
- Can give feedback to: ALL stalls (CS, Mechanical, Civil, etc.)
- Can vote for: ONLY Computer Science stalls
- Reason: Fair competition within CS department

**Scenario 2: Mechanical Engineering Student**
- Department: Mechanical Engineering
- Can give feedback to: ALL stalls
- Can vote for: ONLY Mechanical Engineering stalls
- Cannot vote for: CS, Civil, Electrical stalls

## 🔧 Implementation Details

### Backend Validation

**File**: `backend/src/controllers/studentController.sequelize.js`

**Function**: `castVote()`

**Changes Made**:
1. Fetch student details including department
2. Fetch stall details including department
3. Compare student.department with stall.department
4. Reject vote if departments don't match

**Code**:
```javascript
// Get student details with department
const student = await User.findByPk(studentId);

// Get stall details
const stall = await Stall.findByPk(stallId);

// DEPARTMENT RESTRICTION
if (student.department && stall.department) {
  if (student.department !== stall.department) {
    return res.status(403).json({
      success: false,
      message: `You can only vote for stalls from your department (${student.department}). This stall is from ${stall.department}.`,
    });
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "message": "You can only vote for stalls from your department (Computer Science). This stall is from Mechanical Engineering."
}
```

### Frontend Filtering

**File**: `frontend/src/pages/Student/Voting.jsx`

**Changes Made**:
1. Removed department filter dropdown (no longer needed)
2. Automatically filter stalls to student's department
3. Added prominent notice about restriction
4. Updated instructions
5. Added special message when no department stalls available

**Automatic Filtering**:
```javascript
const getAvailableStalls = (currentRank) => {
  let availableStalls = stalls.filter(...);
  
  // DEPARTMENT RESTRICTION
  if (user?.department) {
    availableStalls = availableStalls.filter(
      stall => stall.department === user.department
    );
  }
  
  return availableStalls;
};
```

**Department Stalls Count**:
```javascript
const departmentStallsCount = user?.department 
  ? stalls.filter(stall => stall.department === user.department).length 
  : stalls.length;
```

### UI Components Added

#### 1. Department Restriction Notice (Blue Banner)
- **Position**: Top of voting page, after event selector
- **Content**: 
  - Clear explanation of restriction
  - Student's department name
  - Count of available stalls from department
  - Note about feedback being open to all
- **Color**: Blue (informational)

#### 2. No Department Stalls Warning (Orange Banner)
- **Position**: After instructions
- **Condition**: Shows when total stalls > 0 but department stalls = 0
- **Content**:
  - Alert that no stalls from student's department
  - Total stalls count
  - Reminder about feedback availability
- **Color**: Orange (warning)

#### 3. Updated Instructions
- Changed from "top 3 favorite stalls" to "top 3 favorite stalls from your department"
- Added bold department restriction line
- Shows student's department name

## 📋 Testing Guide

### Test Case 1: Same Department Voting (Should Work)

**Setup**:
1. Create student: John (Computer Science)
2. Create stall: AI Lab (Computer Science)

**Steps**:
1. Login as John
2. Go to Voting page
3. Select event
4. Should see blue banner: "You can only vote for stalls from Computer Science"
5. Should see AI Lab in dropdown
6. Select AI Lab for Rank 1
7. Click "Vote for Rank 1"

**Expected**:
✅ Success toast: "Vote cast successfully!"
✅ Vote recorded in database
✅ AI Lab appears in "Your Current Votes"

### Test Case 2: Cross-Department Voting (Should Fail - Backend)

**Setup**:
1. Student: John (Computer Science)
2. Stall: Robotics (Mechanical Engineering)

**Steps**:
1. Try to vote via API (bypassing frontend filter):
```bash
POST /api/student/vote
{
  "eventId": "event-123",
  "stallId": "robotics-stall-id",
  "rank": 1
}
```

**Expected**:
❌ 403 Forbidden
❌ Error: "You can only vote for stalls from your department (Computer Science). This stall is from Mechanical Engineering."

### Test Case 3: Frontend Filter Check

**Setup**:
1. Student: Sarah (Civil Engineering)
2. Event has:
   - 2 CS stalls
   - 3 Mechanical stalls
   - 5 Civil stalls

**Steps**:
1. Login as Sarah (Civil)
2. Go to Voting page
3. Check stall dropdowns

**Expected**:
✅ Blue banner shows: "Available stalls from Civil Engineering: 5 stalls"
✅ Dropdowns show ONLY 5 Civil stalls
✅ CS and Mechanical stalls NOT visible

### Test Case 4: No Department Stalls

**Setup**:
1. Student: Mike (Electrical Engineering)
2. Event has stalls from: CS, Mechanical, Civil (NO Electrical stalls)

**Steps**:
1. Login as Mike
2. Go to Voting page
3. Select event

**Expected**:
✅ Blue banner: "Available stalls from Electrical Engineering: 0 stalls"
✅ Orange warning box appears
✅ Message: "There are 10 total stalls, but none from your department (Electrical Engineering)"
✅ Dropdowns show "-- Select Stall --" with no options
✅ Vote buttons disabled

### Test Case 5: Feedback Still Works (No Restriction)

**Setup**:
1. Student: John (Computer Science)
2. Stall: Robotics (Mechanical Engineering)

**Steps**:
1. Login as John (CS)
2. Go to Feedback page
3. Click "Open Camera to Scan Stall QR"
4. Scan Robotics (Mechanical) stall QR

**Expected**:
✅ Camera works
✅ Scan successful: "✅ Scanned: Robotics!"
✅ Feedback form appears
✅ Can rate and submit feedback
✅ Success: "Feedback submitted successfully!"

**Confirmation**: Feedback has NO department restriction

## 🎨 UI/UX Improvements

### Before (Issues)
❌ Students could see and attempt to vote for all stalls
❌ Would get confusing error message after trying to vote
❌ No clear explanation of rules
❌ Department filter was optional (could be ignored)

### After (Improvements)
✅ Clear blue banner explains restriction upfront
✅ Automatic filtering (can't see other departments' stalls)
✅ Shows count of available stalls from department
✅ Updated instructions mention department restriction
✅ Special message when no department stalls available
✅ Distinguishes voting vs feedback rules clearly

## 🔒 Security & Validation

### Multi-Layer Protection

**Layer 1: Frontend Filter**
- Automatically filters stalls to student's department
- User cannot see stalls from other departments in dropdown
- Prevents accidental cross-department vote attempts

**Layer 2: Backend Validation**
- Even if frontend is bypassed (API direct call, browser manipulation)
- Backend validates student.department === stall.department
- Returns clear error message if mismatch
- Prevents vote from being saved

**Layer 3: Database Integrity**
- Votes table has foreign keys
- Cannot orphan votes if student/stall deleted
- Maintains referential integrity

### Attack Scenarios

**Scenario 1: Browser DevTools Manipulation**
- Attacker: Modifies frontend JavaScript to remove filter
- Frontend: Shows all stalls
- Attacker: Selects stall from different department
- Backend: ❌ Rejects with 403 error
- Result: ✅ Attack prevented

**Scenario 2: Direct API Call**
- Attacker: Calls POST /api/student/vote directly
- Attacker: Sends stallId from different department
- Backend: ❌ Validates departments, rejects
- Result: ✅ Attack prevented

**Scenario 3: Modified Department**
- Attacker: Changes their department in database
- System: Uses current department from database
- Result: ✅ Will vote based on actual current department

## 📊 Database Queries

### Check Votes by Department
```sql
SELECT 
  u.department as student_dept,
  s.department as stall_dept,
  COUNT(*) as vote_count,
  CASE 
    WHEN u.department = s.department THEN 'Valid'
    ELSE 'INVALID - Cross-Department!'
  END as status
FROM votes v
JOIN users u ON v."studentId" = u.id
JOIN stalls s ON v."stallId" = s.id
GROUP BY u.department, s.department
ORDER BY student_dept, stall_dept;
```

### Find Invalid Cross-Department Votes
```sql
SELECT 
  v.id,
  u.name as student_name,
  u.department as student_dept,
  s.name as stall_name,
  s.department as stall_dept,
  v."createdAt"
FROM votes v
JOIN users u ON v."studentId" = u.id
JOIN stalls s ON v."stallId" = s.id
WHERE u.department != s.department
  AND u.department IS NOT NULL
  AND s.department IS NOT NULL;
```

### Cleanup Invalid Votes (if any exist)
```sql
-- CAUTION: Only run if you find invalid votes from above query
DELETE FROM votes
WHERE id IN (
  SELECT v.id
  FROM votes v
  JOIN users u ON v."studentId" = u.id
  JOIN stalls s ON v."stallId" = s.id
  WHERE u.department != s.department
    AND u.department IS NOT NULL
    AND s.department IS NOT NULL
);
```

## 📈 Impact Analysis

### Positive Impacts
✅ **Fairness**: Ensures fair competition within departments
✅ **Quality**: Departments compete on their own merits
✅ **Clarity**: Students understand rules immediately
✅ **UX**: Better experience with clear restrictions
✅ **Data Integrity**: Prevents invalid votes

### Potential Concerns
⚠️ **Limited Voting**: Students in small departments may have fewer options
⚠️ **No Cross-Department Recognition**: Can't vote for impressive work from other departments

### Solutions to Concerns
✅ **Feedback System**: Students CAN give feedback to any stall (cross-department)
✅ **Multiple Categories**: Event organizers can create department-specific and cross-department awards
✅ **Clear Communication**: UI explains both voting and feedback rules

## 🎯 Feature Comparison

| Feature | Feedback | Voting |
|---------|----------|--------|
| **Department Restriction** | ❌ None | ✅ Own department only |
| **Who can participate** | All students | All students |
| **What they can interact with** | ANY stall | ONLY own department stalls |
| **Purpose** | Improve all stalls | Recognize excellence in department |
| **Rating** | 1-5 stars + comments | Top 3 ranking (3, 2, 1 points) |
| **Limit** | Once per stall | Max 3 stalls total |
| **UI** | QR scanner shows all | Dropdown filtered by department |

## 🔄 Related Features

### Works With
- ✅ Check-in system (both require check-in)
- ✅ Event management (voting per event)
- ✅ Stall management (uses stall department)
- ✅ User management (uses user department)

### Independent From
- 🔀 Feedback system (different rules)
- 🔀 Attendance tracking (separate feature)
- 🔀 QR code scanning (used by feedback, not voting)

## 📝 Admin Considerations

### Setup Requirements
1. **Students must have department** set in their profile
2. **Stalls must have department** specified
3. **Departments must match exactly** (case-sensitive)

### Best Practices
- Use consistent department names (e.g., "Computer Science" not "CS" or "Comp Sci")
- Set departments during bulk upload
- Validate department data before event starts
- Create stalls evenly across departments if possible

### Reporting
- Can track votes by department
- Can see which departments have most engagement
- Can identify departments with no stalls
- Can generate department-wise leaderboards

## 🚀 Deployment Checklist

- [x] Backend validation implemented
- [x] Frontend filtering implemented
- [x] UI notices added
- [x] Instructions updated
- [x] Error messages clear
- [x] Testing guide created
- [x] Documentation complete
- [ ] Test with real data
- [ ] Verify edge cases
- [ ] Deploy to production
- [ ] Monitor for issues

## 📞 Support

### Common Questions

**Q: Can I vote for stalls from other departments?**
A: No, voting is restricted to your own department. However, you can give feedback to any stall.

**Q: Why can't I see all stalls in voting?**
A: The system automatically filters to show only stalls from your department. This ensures fair competition.

**Q: I'm in Civil Engineering but see no stalls to vote for?**
A: This means there are currently no stalls from the Civil Engineering department in this event. Check with event organizers.

**Q: Can I give feedback to stalls from other departments?**
A: Yes! Feedback is open to all stalls regardless of department. Only voting is restricted.

**Q: What if I'm in multiple departments?**
A: The system uses your primary department from your profile. Contact admin if you need to change it.

---

**Status**: ✅ Complete and ready for deployment  
**Priority**: High - Core business logic  
**Impact**: All students, all voting functionality  
**Testing**: Required before production
