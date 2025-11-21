const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StudentEventAttendanceSummary = sequelize.define('StudentEventAttendanceSummary', {
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
  totalValidDuration: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Total valid attendance duration in seconds across all days'
  },
  totalNullifiedDuration: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Total nullified duration in seconds due to improper checkouts'
  },
  totalSessions: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Total number of attendance sessions'
  },
  nullifiedSessions: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of sessions that were nullified'
  },
  lastCheckInTime: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Most recent check-in time'
  },
  currentStatus: {
    type: DataTypes.ENUM('checked-out', 'checked-in'),
    defaultValue: 'checked-out',
    comment: 'Current attendance status of the student'
  },
  hasImproperCheckouts: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Flag to track if student has any improper checkout warnings'
  },
  lastActivityDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Date of last attendance activity'
  }
}, {
  tableName: 'student_event_attendance_summaries',
  indexes: [
    {
      unique: true,
      fields: ['eventId', 'studentId']
    },
    {
      fields: ['eventId', 'currentStatus']
    },
    {
      fields: ['hasImproperCheckouts']
    }
  ]
});

module.exports = StudentEventAttendanceSummary;