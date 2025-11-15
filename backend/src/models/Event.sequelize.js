const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Event = sequelize.define('Event', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: true,  // Make optional
    defaultValue: DataTypes.NOW  // Default to current time
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true,  // Make optional
    defaultValue: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)  // Default to 7 days from now
  },
  venue: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  manuallyStarted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Admin manually started the event'
  },
  manuallyEnded: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Admin manually ended the event'
  },
  maxVotesPerStudent: {
    type: DataTypes.INTEGER,
    defaultValue: 3
  },
  allowFeedback: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  allowVoting: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  qrCodeRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'events'
});

module.exports = Event;
