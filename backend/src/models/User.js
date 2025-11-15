const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    },
    rollNo: {
      type: String,
      sparse: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    programme: {
      type: String,
      enum: ['B.Tech', 'M.Tech', 'MBA', 'MCA', 'PhD', 'Other'],
      trim: true
    },
    department: {
      type: String,
      trim: true,
      index: true
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false
    },
    role: {
      type: String,
      enum: ['student', 'volunteer', 'admin'],
      default: 'student',
      required: true,
      index: true
    },
    phone: {
      type: String,
      trim: true,
      match: [/^\+?[\d\s-()]+$/, 'Please provide a valid phone number']
    },
    isActive: {
      type: Boolean,
      default: true
    },
    // For volunteers
    assignedGate: {
      type: String,
      trim: true
    },
    shiftStart: {
      type: Date
    },
    shiftEnd: {
      type: Date
    },
    // QR token for students
    qrToken: {
      type: String,
      sparse: true,
      unique: true
    },
    qrTokenExpiry: {
      type: Date
    },
    lastLogin: {
      type: Date
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
userSchema.index({ role: 1, department: 1 });
userSchema.index({ email: 1, role: 1 });

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Get public profile
userSchema.methods.getPublicProfile = function () {
  const user = this.toObject();
  delete user.password;
  delete user.__v;
  return user;
};

module.exports = mongoose.model('User', userSchema);
