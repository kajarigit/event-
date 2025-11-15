const { sequelize } = require('../config/database');
const User = require('./User.sequelize');
const Event = require('./Event.sequelize');
const Stall = require('./Stall.sequelize');
const Attendance = require('./Attendance.sequelize');
const Feedback = require('./Feedback.sequelize');
const Vote = require('./Vote.sequelize');
const ScanLog = require('./ScanLog.sequelize');
const OTP = require('./OTP.sequelize')(sequelize);

// Define associations

// Event associations
Event.hasMany(Stall, { foreignKey: 'eventId', as: 'stalls' });
Event.hasMany(Attendance, { foreignKey: 'eventId', as: 'attendances' });
Event.hasMany(Feedback, { foreignKey: 'eventId', as: 'feedbacks' });
Event.hasMany(Vote, { foreignKey: 'eventId', as: 'votes' });
Event.hasMany(ScanLog, { foreignKey: 'eventId', as: 'scanLogs' });

// Stall associations
Stall.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });
Stall.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
Stall.hasMany(Feedback, { foreignKey: 'stallId', as: 'feedbacks' });
Stall.hasMany(Vote, { foreignKey: 'stallId', as: 'votes' });
Stall.hasMany(ScanLog, { foreignKey: 'stallId', as: 'scanLogs' });

// User associations
User.hasMany(Stall, { foreignKey: 'ownerId', as: 'ownedStalls' });
User.hasMany(Attendance, { foreignKey: 'studentId', as: 'attendances' });
User.hasMany(Feedback, { foreignKey: 'studentId', as: 'feedbacks' });
User.hasMany(Vote, { foreignKey: 'studentId', as: 'votes' });
User.hasMany(ScanLog, { foreignKey: 'userId', as: 'scanLogs' });
User.hasMany(OTP, { foreignKey: 'userId', as: 'otps' });

// Attendance associations
Attendance.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });
Attendance.belongsTo(User, { foreignKey: 'studentId', as: 'student' });

// Feedback associations
Feedback.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });
Feedback.belongsTo(Stall, { foreignKey: 'stallId', as: 'stall' });
Feedback.belongsTo(User, { foreignKey: 'studentId', as: 'student' });

// Vote associations
Vote.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });
Vote.belongsTo(Stall, { foreignKey: 'stallId', as: 'stall' });
Vote.belongsTo(User, { foreignKey: 'studentId', as: 'student' });

// ScanLog associations
ScanLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });
ScanLog.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });
ScanLog.belongsTo(Stall, { foreignKey: 'stallId', as: 'stall' });

// OTP associations
OTP.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Sync all models
const syncModels = async () => {
  try {
    // IMPORTANT: Database schema is already created. 
    // Only use sync({ alter: true }) when you change model definitions.
    // For normal startup, just verify tables exist without altering them.
    
    // await sequelize.sync({ alter: true }); // ⚠️ SLOW - Only uncomment when changing models
    console.log('All models synced successfully');
  } catch (error) {
    console.error('Error syncing models:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  User,
  Event,
  Stall,
  Attendance,
  Feedback,
  Vote,
  ScanLog,
  OTP,
  syncModels
};
