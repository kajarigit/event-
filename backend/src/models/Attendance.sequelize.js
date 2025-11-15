const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Attendance = sequelize.define('Attendance', {
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
  studentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  checkInTime: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  checkOutTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('checked-in', 'checked-out'),
    defaultValue: 'checked-in'
  }
}, {
  tableName: 'attendances',
  indexes: [
    {
      // Non-unique index for querying (removed unique constraint to allow multiple check-ins/check-outs)
      fields: ['eventId', 'studentId', 'checkInTime']
    },
    {
      // Index for status queries
      fields: ['eventId', 'status']
    }
  ]
});

module.exports = Attendance;
