/**
 * Database optimization script for handling 10,000+ students
 * Creates indexes and optimizations for high-volume operations
 */

require('dotenv').config();
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

async function optimize() {
  try {
    console.log('🚀 Starting database optimization for scale...');
    
    // Add indexes for attendance queries (most frequent)
    console.log('📊 Creating attendance indexes...');
    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_attendance_student_event 
       ON attendances("studentId", "eventId")`,
      { type: QueryTypes.RAW }
    );
    
    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_attendance_event_status 
       ON attendances("eventId", status)`,
      { type: QueryTypes.RAW }
    );
    
    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_attendance_checkout 
       ON attendances("checkOutTime")`,
      { type: QueryTypes.RAW }
    );

    // Add indexes for voting (high volume)
    console.log('🗳️  Creating vote indexes...');
    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_votes_student_event 
       ON votes("studentId", "eventId")`,
      { type: QueryTypes.RAW }
    );
    
    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_votes_stall 
       ON votes("stallId")`,
      { type: QueryTypes.RAW }
    );

    // Add indexes for feedback
    console.log('💬 Creating feedback indexes...');
    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_feedback_student_event 
       ON feedbacks("studentId", "eventId")`,
      { type: QueryTypes.RAW }
    );
    
    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_feedback_stall 
       ON feedbacks("stallId")`,
      { type: QueryTypes.RAW }
    );

    // Add indexes for users (for joins)
    console.log('👥 Creating user indexes...');
    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_users_role 
       ON users(role)`,
      { type: QueryTypes.RAW }
    );
    
    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_users_department 
       ON users(department)`,
      { type: QueryTypes.RAW }
    );

    // Add indexes for events
    console.log('📅 Creating event indexes...');
    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_events_active 
       ON events("isActive")`,
      { type: QueryTypes.RAW }
    );

    // Add indexes for stalls
    console.log('🏪 Creating stall indexes...');
    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_stalls_event 
       ON stalls("eventId")`,
      { type: QueryTypes.RAW }
    );

    // Analyze tables for query optimization
    console.log('🔍 Analyzing tables...');
    await sequelize.query('ANALYZE attendances', { type: QueryTypes.RAW });
    await sequelize.query('ANALYZE votes', { type: QueryTypes.RAW });
    await sequelize.query('ANALYZE feedbacks', { type: QueryTypes.RAW });
    await sequelize.query('ANALYZE users', { type: QueryTypes.RAW });
    await sequelize.query('ANALYZE events', { type: QueryTypes.RAW });
    await sequelize.query('ANALYZE stalls', { type: QueryTypes.RAW });

    console.log('✅ Database optimization completed successfully!');
    console.log('📈 Database is now optimized for 10,000+ concurrent students');
    process.exit(0);
  } catch (error) {
    console.error('❌ Optimization failed:', error);
    process.exit(1);
  }
}

optimize();
