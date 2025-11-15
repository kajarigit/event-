#!/usr/bin/env node

/**
 * MongoDB to PostgreSQL Data Migration Script
 * 
 * This script migrates all data from MongoDB to PostgreSQL (Aiven)
 * - Connects to both databases
 * - Exports data from MongoDB
 * - Transforms ObjectIds to UUIDs
 * - Imports data into PostgreSQL maintaining relationships
 * 
 * Usage: node migrate-data.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// MongoDB Models
const UserMongo = require('../models/User');
const EventMongo = require('../models/Event');
const StallMongo = require('../models/Stall');
const AttendanceMongo = require('../models/Attendance');
const FeedbackMongo = require('../models/Feedback');
const VoteMongo = require('../models/Vote');
const ScanLogMongo = require('../models/ScanLog');

// PostgreSQL Models
const {
  sequelize,
  User: UserPG,
  Event: EventPG,
  Stall: StallPG,
  Attendance: AttendancePG,
  Feedback: FeedbackPG,
  Vote: VotePG,
  ScanLog: ScanLogPG
} = require('../models/index.sequelize');

// ID mapping to convert ObjectId to UUID
const idMap = new Map();

// Generate or retrieve UUID for an ObjectId
function getUUID(objectId) {
  if (!objectId) return null;
  
  const strId = objectId.toString();
  if (idMap.has(strId)) {
    return idMap.get(strId);
  }
  
  const uuid = uuidv4();
  idMap.set(strId, uuid);
  return uuid;
}

// Connect to MongoDB
async function connectMongoDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    throw error;
  }
}

// Connect to PostgreSQL
async function connectPostgreSQL() {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connected');
  } catch (error) {
    console.error('❌ PostgreSQL connection error:', error.message);
    throw error;
  }
}

// Migrate Users
async function migrateUsers() {
  console.log('\n📦 Migrating Users...');
  
  const users = await UserMongo.find().lean();
  console.log(`Found ${users.length} users in MongoDB`);
  
  let migrated = 0;
  let failed = 0;
  
  for (const user of users) {
    try {
      // Map volunteer role to student (or admin if you prefer)
      let role = user.role;
      if (role === 'volunteer') {
        role = 'student'; // Map volunteers to students
      }
      
      // Ensure password exists (use a default if missing)
      const password = user.password || '$2a$10$mZuzc/Rk.oC0/.W6NVrJ3uaI2izmfNwWWFqMWjfe9TFCRZjFbN2ye'; // Bcrypt hash of "Password@123"
      
      const pgUser = {
        id: getUUID(user._id),
        name: user.name,
        email: user.email,
        password: password,
        role: role,
        phone: user.phone || null,
        department: user.department || null,
        year: user.year || null,
        rollNumber: user.rollNumber || user.rollNo || null,
        isActive: user.isActive !== undefined ? user.isActive : true,
        qrToken: user.qrToken || null,
        createdAt: user.createdAt || new Date(),
        updatedAt: user.updatedAt || new Date()
      };
      
      // Use raw SQL to bypass hooks completely
      await sequelize.query(
        `INSERT INTO users (id, name, email, password, role, phone, department, year, "rollNumber", "isActive", "qrToken", "createdAt", "updatedAt")
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        {
          replacements: [
            pgUser.id,
            pgUser.name,
            pgUser.email,
            pgUser.password,
            pgUser.role,
            pgUser.phone,
            pgUser.department,
            pgUser.year,
            pgUser.rollNumber,
            pgUser.isActive,
            pgUser.qrToken,
            pgUser.createdAt,
            pgUser.updatedAt
          ]
        }
      );
      
      migrated++;
      process.stdout.write(`\r  Migrating users: ${migrated}/${users.length}`);
    } catch (error) {
      failed++;
      console.error(`\n  ❌ Failed to migrate user ${user.email}:`, error.message);
    }
  }
  
  console.log(`\n✅ Migrated ${migrated} users (${failed} failed)`);
}

// Migrate Events
async function migrateEvents() {
  console.log('\n📦 Migrating Events...');
  
  const events = await EventMongo.find().lean();
  console.log(`Found ${events.length} events in MongoDB`);
  
  let migrated = 0;
  let failed = 0;
  
  for (const event of events) {
    try {
      await sequelize.query(
        `INSERT INTO events (id, name, description, "startDate", "endDate", venue, "isActive", "maxVotesPerStudent", "allowFeedback", "allowVoting", "qrCodeRequired", "createdAt", "updatedAt")
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        {
          replacements: [
            getUUID(event._id),
            event.name,
            event.description || null,
            event.startDate || new Date(),
            event.endDate || new Date(),
            event.venue || null,
            event.isActive !== undefined ? event.isActive : false,
            event.maxVotesPerStudent || 3,
            event.allowFeedback !== undefined ? event.allowFeedback : true,
            event.allowVoting !== undefined ? event.allowVoting : true,
            event.qrCodeRequired !== undefined ? event.qrCodeRequired : true,
            event.createdAt || new Date(),
            event.updatedAt || new Date()
          ]
        }
      );
      migrated++;
      process.stdout.write(`\r  Migrating events: ${migrated}/${events.length}`);
    } catch (error) {
      failed++;
      console.error(`\n  ❌ Failed to migrate event ${event.name}:`, error.message);
    }
  }
  
  console.log(`\n✅ Migrated ${migrated} events (${failed} failed)`);
}

// Migrate Stalls
async function migrateStalls() {
  console.log('\n📦 Migrating Stalls...');
  
  const stalls = await StallMongo.find().lean();
  console.log(`Found ${stalls.length} stalls in MongoDB`);
  
  let migrated = 0;
  let failed = 0;
  
  for (const stall of stalls) {
    try {
      await sequelize.query(
        `INSERT INTO stalls (id, "eventId", name, description, location, category, "ownerId", "ownerName", "ownerContact", "isActive", "qrToken", "createdAt", "updatedAt")
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        {
          replacements: [
            getUUID(stall._id),
            getUUID(stall.eventId || stall.event),
            stall.name,
            stall.description || null,
            stall.location || null,
            stall.category || null,
            stall.ownerId || stall.owner ? getUUID(stall.ownerId || stall.owner) : null,
            stall.ownerName || null,
            stall.ownerContact || null,
            stall.isActive !== undefined ? stall.isActive : true,
            stall.qrToken || null,
            stall.createdAt || new Date(),
            stall.updatedAt || new Date()
          ]
        }
      );
      migrated++;
      process.stdout.write(`\r  Migrating stalls: ${migrated}/${stalls.length}`);
    } catch (error) {
      failed++;
      console.error(`\n  ❌ Failed to migrate stall ${stall.name}:`, error.message);
    }
  }
  
  console.log(`\n✅ Migrated ${migrated} stalls (${failed} failed)`);
}

// Migrate Attendances
async function migrateAttendances() {
  console.log('\n📦 Migrating Attendances...');
  
  const attendances = await AttendanceMongo.find().lean();
  console.log(`Found ${attendances.length} attendances in MongoDB`);
  
  let migrated = 0;
  let failed = 0;
  
  for (const attendance of attendances) {
    try {
      await sequelize.query(
        `INSERT INTO attendances (id, "eventId", "studentId", "checkInTime", "checkOutTime", status, "createdAt", "updatedAt")
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        {
          replacements: [
            getUUID(attendance._id),
            getUUID(attendance.eventId || attendance.event),
            getUUID(attendance.studentId || attendance.student),
            attendance.checkInTime || attendance.createdAt || new Date(),
            attendance.checkOutTime || null,
            attendance.status || 'checked-in',
            attendance.createdAt || new Date(),
            attendance.updatedAt || new Date()
          ]
        }
      );
      migrated++;
      process.stdout.write(`\r  Migrating attendances: ${migrated}/${attendances.length}`);
    } catch (error) {
      failed++;
      console.error(`\n  ❌ Failed to migrate attendance:`, error.message);
    }
  }
  
  console.log(`\n✅ Migrated ${migrated} attendances (${failed} failed)`);
}

// Migrate Feedbacks
async function migrateFeedbacks() {
  console.log('\n📦 Migrating Feedbacks...');
  
  const feedbacks = await FeedbackMongo.find().lean();
  console.log(`Found ${feedbacks.length} feedbacks in MongoDB`);
  
  let migrated = 0;
  let failed = 0;
  
  for (const feedback of feedbacks) {
    try {
      await sequelize.query(
        `INSERT INTO feedbacks (id, "eventId", "stallId", "studentId", rating, comments, "createdAt", "updatedAt")
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        {
          replacements: [
            getUUID(feedback._id),
            getUUID(feedback.eventId || feedback.event),
            getUUID(feedback.stallId || feedback.stall),
            getUUID(feedback.studentId || feedback.student),
            feedback.rating,
            feedback.comments || feedback.comment || null,
            feedback.createdAt || new Date(),
            feedback.updatedAt || new Date()
          ]
        }
      );
      migrated++;
      process.stdout.write(`\r  Migrating feedbacks: ${migrated}/${feedbacks.length}`);
    } catch (error) {
      failed++;
      console.error(`\n  ❌ Failed to migrate feedback:`, error.message);
    }
  }
  
  console.log(`\n✅ Migrated ${migrated} feedbacks (${failed} failed)`);
}

// Migrate Votes
async function migrateVotes() {
  console.log('\n📦 Migrating Votes...');
  
  const votes = await VoteMongo.find().lean();
  console.log(`Found ${votes.length} votes in MongoDB`);
  
  let migrated = 0;
  let failed = 0;
  
  for (const vote of votes) {
    try {
      await sequelize.query(
        `INSERT INTO votes (id, "eventId", "stallId", "studentId", "createdAt", "updatedAt")
         VALUES (?, ?, ?, ?, ?, ?)`,
        {
          replacements: [
            getUUID(vote._id),
            getUUID(vote.eventId || vote.event),
            getUUID(vote.stallId || vote.stall),
            getUUID(vote.studentId || vote.student),
            vote.createdAt || new Date(),
            vote.updatedAt || new Date()
          ]
        }
      );
      migrated++;
      process.stdout.write(`\r  Migrating votes: ${migrated}/${votes.length}`);
    } catch (error) {
      failed++;
      console.error(`\n  ❌ Failed to migrate vote:`, error.message);
    }
  }
  
  console.log(`\n✅ Migrated ${migrated} votes (${failed} failed)`);
}

// Migrate ScanLogs
async function migrateScanLogs() {
  console.log('\n📦 Migrating ScanLogs...');
  
  const scanLogs = await ScanLogMongo.find().lean();
  console.log(`Found ${scanLogs.length} scan logs in MongoDB`);
  
  let migrated = 0;
  let failed = 0;
  
  for (const log of scanLogs) {
    try {
      await sequelize.query(
        `INSERT INTO scan_logs (id, "userId", "eventId", "stallId", "scanType", "scanTime", status, "errorMessage", "createdAt", "updatedAt")
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        {
          replacements: [
            getUUID(log._id),
            getUUID(log.userId || log.user),
            log.eventId || log.event ? getUUID(log.eventId || log.event) : null,
            log.stallId || log.stall ? getUUID(log.stallId || log.stall) : null,
            log.scanType,
            log.scanTime || log.createdAt || new Date(),
            log.status || 'success',
            log.errorMessage || null,
            log.createdAt || new Date(),
            log.updatedAt || new Date()
          ]
        }
      );
      migrated++;
      process.stdout.write(`\r  Migrating scan logs: ${migrated}/${scanLogs.length}`);
    } catch (error) {
      failed++;
      console.error(`\n  ❌ Failed to migrate scan log:`, error.message);
    }
  }
  
  console.log(`\n✅ Migrated ${migrated} scan logs (${failed} failed)`);
}

// Main migration function
async function migrate() {
  console.log('🚀 Starting MongoDB to PostgreSQL migration...\n');
  
  try {
    // Connect to both databases
    await connectMongoDB();
    await connectPostgreSQL();
    
    // Clear PostgreSQL tables (in correct order to respect foreign keys)
    console.log('\n🗑️  Clearing PostgreSQL tables...');
    await ScanLogPG.destroy({ where: {}, truncate: true, cascade: true });
    await VotePG.destroy({ where: {}, truncate: true, cascade: true });
    await FeedbackPG.destroy({ where: {}, truncate: true, cascade: true });
    await AttendancePG.destroy({ where: {}, truncate: true, cascade: true });
    await StallPG.destroy({ where: {}, truncate: true, cascade: true });
    await EventPG.destroy({ where: {}, truncate: true, cascade: true });
    await UserPG.destroy({ where: {}, truncate: true, cascade: true });
    console.log('✅ Tables cleared');
    
    // Migrate data in correct order (respecting foreign keys)
    await migrateUsers();
    await migrateEvents();
    await migrateStalls();
    await migrateAttendances();
    await migrateFeedbacks();
    await migrateVotes();
    await migrateScanLogs();
    
    // Print summary
    console.log('\n📊 Migration Summary:');
    console.log('====================');
    const userCount = await UserPG.count();
    const eventCount = await EventPG.count();
    const stallCount = await StallPG.count();
    const attendanceCount = await AttendancePG.count();
    const feedbackCount = await FeedbackPG.count();
    const voteCount = await VotePG.count();
    const scanLogCount = await ScanLogPG.count();
    
    console.log(`Users:       ${userCount}`);
    console.log(`Events:      ${eventCount}`);
    console.log(`Stalls:      ${stallCount}`);
    console.log(`Attendances: ${attendanceCount}`);
    console.log(`Feedbacks:   ${feedbackCount}`);
    console.log(`Votes:       ${voteCount}`);
    console.log(`Scan Logs:   ${scanLogCount}`);
    console.log(`Total IDs mapped: ${idMap.size}`);
    
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Close connections
    await mongoose.connection.close();
    await sequelize.close();
    console.log('\n👋 Database connections closed');
  }
}

// Run migration
if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { migrate, getUUID, idMap };
