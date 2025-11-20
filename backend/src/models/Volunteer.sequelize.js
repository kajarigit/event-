const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const Volunteer = sequelize.define('Volunteer', {
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
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  volunteerId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Unique volunteer identifier for volunteer login'
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
  permissions: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {
      canScanQR: true,
      canManageAttendance: true,
      canViewReports: false
    },
    comment: 'Volunteer-specific permissions'
  },
  assignedEvents: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
    comment: 'Array of event IDs assigned to this volunteer'
  },
  shiftStart: {
    type: DataTypes.TIME,
    allowNull: true,
    comment: 'Volunteer shift start time'
  },
  shiftEnd: {
    type: DataTypes.TIME,
    allowNull: true,
    comment: 'Volunteer shift end time'
  },
  supervisorId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Reference to supervisor (admin or senior volunteer)'
  },
  joinDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Date when volunteer joined'
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  isFirstLogin: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Flag to track if volunteer needs to complete onboarding'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Admin notes about the volunteer'
  }
}, {
  tableName: 'volunteers',
  indexes: [
    {
      unique: true,
      fields: ['volunteerId']
    },
    {
      fields: ['department']
    },
    {
      fields: ['isActive']
    }
  ],
  hooks: {
    beforeCreate: async (volunteer) => {
      // Validate required fields
      if (!volunteer.volunteerId) {
        throw new Error('Volunteer ID is required for volunteers');
      }
      
      // Hash password
      if (volunteer.password) {
        const salt = await bcrypt.genSalt(10);
        volunteer.password = await bcrypt.hash(volunteer.password, salt);
      }
    },
    beforeUpdate: async (volunteer) => {
      // Hash password if changed
      if (volunteer.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        volunteer.password = await bcrypt.hash(volunteer.password, salt);
      }
    }
  }
});

// Instance method to match password
Volunteer.prototype.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Don't return password in JSON
Volunteer.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.password;
  return values;
};

// Define associations
Volunteer.associate = function(models) {
  // Volunteer has many scan logs (scans performed by this volunteer)
  Volunteer.hasMany(models.ScanLog, {
    foreignKey: 'scannedBy',
    as: 'scans'
  });
};

module.exports = Volunteer;