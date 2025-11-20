const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ScanLog = sequelize.define('ScanLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  eventId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'events',
      key: 'id'
    },
    onDelete: 'SET NULL'
  },
  stallId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'stalls',
      key: 'id'
    },
    onDelete: 'SET NULL'
  },
  scannedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'The volunteer/admin who performed the scan (references either users or volunteers table)'
  },
  scannedByType: {
    type: DataTypes.ENUM('user', 'volunteer'),
    allowNull: true,
    defaultValue: 'volunteer',
    comment: 'Indicates whether scannedBy refers to users table or volunteers table'
  },
  gate: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Gate 1',
    comment: 'Gate location where the scan was performed'
  },
  scanType: {
    type: DataTypes.ENUM('check-in', 'check-out', 'vote', 'feedback'),
    allowNull: false
  },
  scanTime: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  status: {
    type: DataTypes.ENUM('success', 'failed', 'duplicate'),
    defaultValue: 'success'
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'scan_logs',
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['eventId']
    },
    {
      fields: ['scanType']
    },
    {
      fields: ['scanTime']
    }
  ]
});

// Define associations
ScanLog.associate = function(models) {
  // ScanLog belongs to a volunteer (scanner)
  ScanLog.belongsTo(models.Volunteer, {
    foreignKey: 'scannedBy',
    as: 'scanner'
  });
  
  // ScanLog belongs to a user (scanned student)
  ScanLog.belongsTo(models.User, {
    foreignKey: 'scannedUser',
    as: 'student'
  });
  
  // ScanLog belongs to an event
  ScanLog.belongsTo(models.Event, {
    foreignKey: 'eventId',
    as: 'event'
  });
};

module.exports = ScanLog;
