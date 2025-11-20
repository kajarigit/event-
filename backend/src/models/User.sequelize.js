const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true, // Email no longer required
    unique: false, // Remove unique constraint
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('admin', 'student', 'stall_owner'),
    allowNull: false,
    defaultValue: 'student'
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  regNo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  faculty: {
    type: DataTypes.STRING,
    allowNull: true
  },
  department: {
    type: DataTypes.STRING,
    allowNull: true
  },
  programme: {
    type: DataTypes.STRING,
    allowNull: true
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  qrToken: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  birthDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Student birth date for verification'
  },
  permanentAddressPinCode: {
    type: DataTypes.STRING(10),
    allowNull: true,
    comment: 'Permanent address PIN code for verification'
  },
  isFirstLogin: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Flag to track if student needs to complete verification'
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Flag to track if student has completed verification'
  }
}, {
  tableName: 'users',
  hooks: {
    beforeCreate: async (user) => {
      // Validate role-based requirements
      if (user.role === 'admin' || user.role === 'stall_owner') {
        if (!user.email) {
          throw new Error(`Email is required for ${user.role} role`);
        }
      }
      if (user.role === 'student') {
        if (!user.regNo) {
          throw new Error('Registration number (regNo) is required for students');
        }
      }
      
      // Hash password
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      // Validate role-based requirements on update
      if (user.changed('role') || user.changed('email') || user.changed('regNo')) {
        if (user.role === 'admin' || user.role === 'stall_owner') {
          if (!user.email) {
            throw new Error(`Email is required for ${user.role} role`);
          }
        }
        if (user.role === 'student') {
          if (!user.regNo) {
            throw new Error('Registration number (regNo) is required for students');
          }
        }
      }
      
      // Hash password if changed
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

// Instance method to match password
User.prototype.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Don't return password in JSON
User.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.password;
  return values;
};

module.exports = User;
