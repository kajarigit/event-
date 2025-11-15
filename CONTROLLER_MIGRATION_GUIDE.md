# Quick Controller Migration Guide

This guide helps you quickly migrate the remaining controllers from Mongoose to Sequelize.

## 📋 Import Changes (All Controllers)

### OLD (Mongoose):
```javascript
const User = require('../models/User');
const Event = require('../models/Event');
const Stall = require('../models/Stall');
```

### NEW (Sequelize):
```javascript
const { User, Event, Stall, Attendance, Feedback, Vote, ScanLog } = require('../models/index.sequelize');
```

---

## 🔄 Common Query Patterns

### 1. Find By ID
```javascript
// OLD
const user = await User.findById(req.params.id);

// NEW
const user = await User.findByPk(req.params.id);
```

### 2. Find One with Condition
```javascript
// OLD
const user = await User.findOne({ email: req.body.email });

// NEW
const user = await User.findOne({ where: { email: req.body.email } });
```

### 3. Find All with Conditions
```javascript
// OLD
const events = await Event.find({ isActive: true }).sort({ createdAt: -1 }).limit(10);

// NEW
const events = await Event.findAll({
  where: { isActive: true },
  order: [['createdAt', 'DESC']],
  limit: 10
});
```

### 4. Populate / Include Relations
```javascript
// OLD
const stall = await Stall.findById(id).populate('owner').populate('event');

// NEW
const stall = await Stall.findByPk(id, {
  include: [
    { model: User, as: 'owner' },
    { model: Event, as: 'event' }
  ]
});
```

### 5. Count Documents
```javascript
// OLD
const count = await User.countDocuments({ role: 'student' });

// NEW
const count = await User.count({ where: { role: 'student' } });
```

### 6. Update Record
```javascript
// OLD
const user = await User.findByIdAndUpdate(
  id,
  { name: 'New Name' },
  { new: true, runValidators: true }
);

// NEW
const user = await User.findByPk(id);
await user.update({ name: 'New Name' });
// OR
await User.update({ name: 'New Name' }, { where: { id } });
```

### 7. Delete Record
```javascript
// OLD
await User.findByIdAndDelete(id);

// NEW
const user = await User.findByPk(id);
await user.destroy();
// OR
await User.destroy({ where: { id } });
```

### 8. Create Record
```javascript
// OLD
const user = await User.create({ name, email, password });

// NEW
const user = await User.create({ name, email, password }); // Same!
```

### 9. Bulk Create
```javascript
// OLD
await User.insertMany(users);

// NEW
await User.bulkCreate(users, { validate: true });
```

### 10. Complex Queries with Multiple Conditions
```javascript
// OLD
const attendances = await Attendance.find({
  eventId: req.params.eventId,
  status: 'checked-in'
}).populate('student', 'name email');

// NEW
const attendances = await Attendance.findAll({
  where: {
    eventId: req.params.eventId,
    status: 'checked-in'
  },
  include: [{
    model: User,
    as: 'student',
    attributes: ['name', 'email']
  }]
});
```

### 11. Aggregation (e.g., Group By)
```javascript
// OLD (Mongoose Aggregation)
const results = await Vote.aggregate([
  { $match: { eventId: mongoose.Types.ObjectId(eventId) } },
  { $group: { _id: '$stallId', count: { $sum: 1 } } },
  { $sort: { count: -1 } }
]);

// NEW (Sequelize Aggregation)
const { fn, col } = require('sequelize');
const results = await Vote.findAll({
  where: { eventId },
  attributes: [
    'stallId',
    [fn('COUNT', col('id')), 'count']
  ],
  group: ['stallId'],
  order: [[fn('COUNT', col('id')), 'DESC']],
  raw: true
});
```

### 12. Find or Create
```javascript
// OLD
let attendance = await Attendance.findOne({ eventId, studentId });
if (!attendance) {
  attendance = await Attendance.create({ eventId, studentId });
}

// NEW
const [attendance, created] = await Attendance.findOrCreate({
  where: { eventId, studentId },
  defaults: { checkInTime: new Date() }
});
```

### 13. Pagination
```javascript
// OLD
const page = parseInt(req.query.page) || 1;
const limit = parseInt(req.query.limit) || 10;
const skip = (page - 1) * limit;

const users = await User.find().limit(limit).skip(skip);

// NEW
const page = parseInt(req.query.page) || 1;
const limit = parseInt(req.query.limit) || 10;
const offset = (page - 1) * limit;

const users = await User.findAndCountAll({
  limit,
  offset
});
// users.rows = array of records
// users.count = total count
```

### 14. Select Specific Fields
```javascript
// OLD
const users = await User.find().select('name email role');

// NEW
const users = await User.findAll({
  attributes: ['name', 'email', 'role']
});
```

### 15. Exclude Specific Fields
```javascript
// OLD
const users = await User.find().select('-password -qrToken');

// NEW
const users = await User.findAll({
  attributes: { exclude: ['password', 'qrToken'] }
});
```

---

## 🎯 Special Cases

### Check if Record Exists
```javascript
// OLD
const exists = await User.exists({ email });

// NEW
const exists = await User.findOne({ where: { email } }) !== null;
// OR
const count = await User.count({ where: { email } });
const exists = count > 0;
```

### Transactions
```javascript
// NEW (Sequelize has built-in transactions)
const { sequelize } = require('../config/database');

const t = await sequelize.transaction();
try {
  const user = await User.create({ name, email }, { transaction: t });
  const attendance = await Attendance.create({ userId: user.id, eventId }, { transaction: t });
  await t.commit();
} catch (error) {
  await t.rollback();
  throw error;
}
```

### Raw Queries (Last Resort)
```javascript
const [results, metadata] = await sequelize.query(
  'SELECT * FROM users WHERE email = ?',
  {
    replacements: [email],
    type: sequelize.QueryTypes.SELECT
  }
);
```

---

## 🔑 Field Name Changes

| Mongoose | Sequelize |
|----------|-----------|
| `_id` | `id` |
| `user._id` | `user.id` |
| `user.id` (if exists) | `user.id` (same) |

Make sure to update all references:
```javascript
// OLD
generateAccessToken(user._id, user.role)

// NEW
generateAccessToken(user.id, user.role)
```

---

## ⚠️ Common Pitfalls

1. **Forgetting `where` clause**
   ```javascript
   // WRONG
   User.findOne({ email })
   
   // RIGHT
   User.findOne({ where: { email } })
   ```

2. **Forgetting to await**
   ```javascript
   // WRONG
   const user = User.findByPk(id);
   
   // RIGHT
   const user = await User.findByPk(id);
   ```

3. **Using _id instead of id**
   ```javascript
   // WRONG
   generateToken(user._id)
   
   // RIGHT
   generateToken(user.id)
   ```

4. **Wrong include syntax**
   ```javascript
   // WRONG
   User.findByPk(id, { include: 'stalls' })
   
   // RIGHT
   User.findByPk(id, {
     include: [{ model: Stall, as: 'ownedStalls' }]
   })
   ```

---

## 🚀 Testing Each Controller Function

After migrating, test each function:

1. **Start the server**
   ```bash
   cd backend
   npm run dev
   ```

2. **Test with curl or Postman**
   ```bash
   # Register
   curl -X POST http://localhost:5000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"name":"Test","email":"test@test.com","password":"123456"}'
   
   # Login
   curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@test.com","password":"123456"}'
   ```

3. **Check server logs** for SQL queries to verify correct execution

---

## 📝 Checklist for Each Controller

- [ ] Update imports to use Sequelize models
- [ ] Replace all `findById` with `findByPk`
- [ ] Add `where:` clause to `findOne` and `findAll`
- [ ] Update populate to include with model/as
- [ ] Change `_id` to `id` everywhere
- [ ] Update sort to order
- [ ] Update limit/skip to limit/offset
- [ ] Test all functions with Postman/curl
- [ ] Verify responses match expected format

---

*Use this guide as a reference while migrating adminController, studentController, and scanController.*
