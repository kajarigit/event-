const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const Stall = sequelize.define('Stall', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  eventId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'events',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true
  },
  ownerId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'SET NULL'
  },
  ownerName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  ownerContact: {
    type: DataTypes.STRING,
    allowNull: true
  },
  ownerEmail: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  ownerPassword: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Password for stall owner dashboard access'
  },
  plainTextPassword: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Plain text password for admin viewing (NOT for authentication)'
  },
  department: {
    type: DataTypes.STRING,
    allowNull: true
  },
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
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  qrToken: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'stalls',
  indexes: [
    {
      fields: ['eventId']
    },
    {
      fields: ['ownerId']
    },
    {
      unique: true,
      fields: ['eventId', 'name'],
      name: 'unique_stall_per_event'
    }
  ],
  hooks: {
    beforeCreate: async (stall) => {
      // Store plain text password for admin viewing, then hash for authentication
      if (stall.ownerPassword && !stall.ownerPassword.startsWith('$2')) {
        stall.plainTextPassword = stall.ownerPassword; // Store plain text for admin
        const salt = await bcrypt.genSalt(10);
        stall.ownerPassword = await bcrypt.hash(stall.ownerPassword, salt);
      }
    },
    beforeUpdate: async (stall) => {
      // Store plain text password for admin viewing, then hash for authentication
      if (stall.changed('ownerPassword') && stall.ownerPassword && !stall.ownerPassword.startsWith('$2')) {
        stall.plainTextPassword = stall.ownerPassword; // Store plain text for admin
        const salt = await bcrypt.genSalt(10);
        stall.ownerPassword = await bcrypt.hash(stall.ownerPassword, salt);
      }
    }
  }
});

// Instance method to match owner password
Stall.prototype.matchOwnerPassword = async function(enteredPassword) {
  if (!this.ownerPassword) return false;
  
  // Handle both hashed and plain text passwords for backward compatibility
  if (this.ownerPassword.startsWith('$2')) {
    // Already hashed - use bcrypt compare
    return await bcrypt.compare(enteredPassword, this.ownerPassword);
  } else {
    // Plain text comparison (for legacy data)
    return enteredPassword === this.ownerPassword;
  }
};

// Don't return sensitive information in JSON by default
Stall.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.ownerPassword; // Remove hashed password from JSON output
  delete values.plainTextPassword; // Remove plain text password from JSON output
  return values;
};

// Method for admin to get stall data with plain text password
Stall.prototype.toAdminJSON = function() {
  const values = { ...this.get() };
  delete values.ownerPassword; // Remove hashed password, keep plain text
  return values;
};

module.exports = Stall;
