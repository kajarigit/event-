# 🎯 Department Standardization & CSV Normalization

## Overview
Implemented department dropdown standardization and automatic CSV data normalization to handle typos, case variations, and spacing issues.

---

## ✅ What Was Fixed

### 1. **Department Dropdown (Frontend)**
- **Before:** Free text input → inconsistent data (cse, CSE, Cse, Computer Science, etc.)
- **After:** Standardized dropdown with 17 predefined departments
- **Applies to:**
  - User creation form (Students, Volunteers, Admins)
  - Stall creation form
  - Both manual entry and bulk upload

### 2. **CSV Data Normalization (Backend)**
- **Handles:**
  - ✅ Case variations (CSE → Computer Science and Engineering)
  - ✅ Abbreviations (cse, cs, ece, eee, mech, it, aids, etc.)
  - ✅ Extra spaces ("Computer  Science" → "Computer Science")
  - ✅ Common typos and variations
  - ✅ Email normalization (UPPERCASE → lowercase)
  - ✅ String field trimming

---

## 📝 Standard Departments List

```javascript
1.  Computer Science and Engineering
2.  Electronics and Communication Engineering
3.  Electrical and Electronics Engineering
4.  Mechanical Engineering
5.  Civil Engineering
6.  Information Technology
7.  Artificial Intelligence and Data Science
8.  Chemical Engineering
9.  Biotechnology
10. Mathematics
11. Physics
12. Chemistry
13. English
14. Management Studies
15. Operations
16. Administration
17. Other
```

---

## 🔄 Department Aliases (Auto-Normalized)

### Computer Science Engineering:
- `cse`, `cs`, `computer science`, `csit`, `comp sci` → `Computer Science and Engineering`

### Electronics & Communication:
- `ece`, `ec`, `electronics` → `Electronics and Communication Engineering`

### Electrical & Electronics:
- `eee`, `ee`, `electrical` → `Electrical and Electronics Engineering`

### Mechanical:
- `mech`, `me`, `mechanical` → `Mechanical Engineering`

### Civil:
- `civil`, `ce` → `Civil Engineering`

### Information Technology:
- `it`, `info tech`, `information tech` → `Information Technology`

### AI & Data Science:
- `ai`, `aids`, `ai&ds`, `data science` → `Artificial Intelligence and Data Science`

### Others:
- `chem` → `Chemical Engineering`
- `biotech`, `bt` → `Biotechnology`
- `maths`, `math` → `Mathematics`
- `mba`, `mgmt` → `Management Studies`
- `ops` → `Operations`
- `admin` → `Administration`

**Anything else** → `Other`

---

## 💻 Code Changes

### Frontend Files:

**1. `frontend/src/constants/departments.js` (NEW)**
```javascript
export const DEPARTMENTS = [...]; // 17 standard departments
export const DEPARTMENT_ALIASES = {...}; // 40+ aliases
export function normalizeDepartment(input) {...}
export function getDepartmentAbbr(department) {...}
```

**2. `frontend/src/pages/Admin/Users.jsx`**
- Changed department field from `<input>` to `<select>`
- Dropdown with all standard departments

**3. `frontend/src/pages/Admin/Stalls.jsx`**
- Changed department field from `<input>` to `<select>`
- Dropdown with all standard departments

### Backend Files:

**1. `backend/src/utils/normalization.js` (NEW)**
```javascript
function normalizeDepartment(input) {...}
function normalizeString(input) {...}
function normalizeEmail(input) {...}
```

**2. `backend/src/controllers/adminController.sequelize.js`**
- Updated `bulkUploadUsers()` to normalize:
  - Departments (with alias mapping)
  - Names, emails, phone numbers
  - Registration numbers
  - Faculties, programmes
- Updated `bulkUploadStalls()` to normalize:
  - Department names
  - Owner names, emails, contacts
  - Stall names, locations, categories

---

## 📊 CSV Examples

### Before Normalization (Messy CSV):
```csv
name,email,department,regNo
John Doe,JOHN.DOE@EMAIL.COM,  cse  ,2024CS001
Jane Smith,jane.smith@email.com,computer science,2024CS002
Mike Lee,Mike@EMAIL.com,ece,2024EC001
Sara Khan,sara@email.com,Electrical & Electronics,2024EE001
```

### After Normalization (Clean Database):
```csv
name,email,department,regNo
John Doe,john.doe@email.com,Computer Science and Engineering,2024CS001
Jane Smith,jane.smith@email.com,Computer Science and Engineering,2024CS002
Mike Lee,mike@email.com,Electronics and Communication Engineering,2024EC001
Sara Khan,sara@email.com,Electrical and Electronics Engineering,2024EE001
```

---

## 🎯 How It Works

### Manual Entry (Frontend):
1. User clicks "Add User" or "Add Stall"
2. Sees dropdown with 17 standard departments
3. Selects from list (no typos possible)
4. Data sent to backend is already standardized ✅

### CSV Upload (Backend):
1. User uploads CSV with messy data
2. Backend reads each row
3. For each field:
   - **Department:** Checks aliases, normalizes to standard name
   - **Email:** Converts to lowercase, trims spaces
   - **Name/RegNo/etc:** Trims spaces, removes extra whitespace
4. Creates records with clean, standardized data ✅

### Example Normalization Flow:
```
CSV Input: "  CSE  "
  ↓
Trim & Lowercase: "cse"
  ↓
Check Aliases: DEPARTMENT_ALIASES["cse"]
  ↓
Get Standard Name: "Computer Science and Engineering"
  ↓
Store in Database: "Computer Science and Engineering" ✅
```

---

## 🧪 Testing

### Test Manual Entry:
1. Go to Admin → Users
2. Click "Add User"
3. Check department field → Should be dropdown
4. Select "Computer Science and Engineering"
5. Save → Check database → Should match exactly

### Test CSV Upload:
1. Create CSV with messy data:
```csv
name,email,department,role
Test User 1,TEST@EMAIL.COM,  cse  ,student
Test User 2,user2@email.com,computer science,student
Test User 3,USER3@EMAIL.COM,ece,volunteer
```

2. Upload via "Bulk Upload" button
3. Check database:
   - Emails should be lowercase
   - Departments should be standardized
   - No extra spaces

### Test Stalls:
1. Go to Admin → Stalls
2. Create stall manually → Department dropdown works
3. Upload stalls CSV with "cse", "it", "mech" → All normalized

---

## 📌 Benefits

1. **Data Consistency:** All departments use exact same names
2. **Reporting Accuracy:** Analytics group by department work correctly
3. **User Friendly:** Dropdown prevents typos
4. **CSV Flexibility:** Accepts common abbreviations and variations
5. **Database Integrity:** No duplicate departments with different spellings
6. **Search & Filter:** Department filtering works reliably

---

## 🚀 Deployment

### Files Changed:
```
frontend/src/constants/departments.js (NEW)
frontend/src/pages/Admin/Users.jsx (MODIFIED)
frontend/src/pages/Admin/Stalls.jsx (MODIFIED)
backend/src/utils/normalization.js (NEW)
backend/src/controllers/adminController.sequelize.js (MODIFIED)
```

### Deploy:
```bash
git add .
git commit -m "feat: Add department standardization and CSV normalization"
git push origin master
```

Render will auto-deploy in 3-5 minutes.

---

## 📋 CSV Template Update

Users uploading CSVs can now use abbreviations:

### Old Way (Still works):
```csv
department
Computer Science and Engineering
Electronics and Communication Engineering
```

### New Way (Also works):
```csv
department
CSE
ECE
IT
MECH
AI&DS
```

Both will normalize to full department names! ✅

---

**Status:** ✅ Complete  
**Breaking Changes:** None (backward compatible)  
**Database Migration:** Not required  
**Testing:** Manual entry + CSV upload
