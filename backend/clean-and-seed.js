require('dotenv').config();
const { Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Import models
const User = require('./src/models/User.sequelize');
const Event = require('./src/models/Event.sequelize');
const Stall = require('./src/models/Stall.sequelize');
const Attendance = require('./src/models/Attendance.sequelize');
const Vote = require('./src/models/Vote.sequelize');
const Feedback = require('./src/models/Feedback.sequelize');
const ScanLog = require('./src/models/ScanLog.sequelize');
// const OTP = require('./src/models/OTP.sequelize'); // Skip if not exists

// Database connection
const databaseUrl = process.env.DATABASE_URL || 
  `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  }
});

async function cleanAndSeed() {
  try {
    console.log('🔌 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');

    // Clean all tables in correct order (respecting foreign keys)
    console.log('\n🧹 Cleaning database...');
    await ScanLog.destroy({ where: {}, force: true });
    console.log('  ✓ ScanLogs cleaned');
    
    await Vote.destroy({ where: {}, force: true });
    console.log('  ✓ Votes cleaned');
    
    await Feedback.destroy({ where: {}, force: true });
    console.log('  ✓ Feedbacks cleaned');
    
    await Attendance.destroy({ where: {}, force: true });
    console.log('  ✓ Attendances cleaned');
    
    await Stall.destroy({ where: {}, force: true });
    console.log('  ✓ Stalls cleaned');
    
    await Event.destroy({ where: {}, force: true });
    console.log('  ✓ Events cleaned');
    
    // await OTP.destroy({ where: {}, force: true });
    // console.log('  ✓ OTPs cleaned');
    
    await User.destroy({ where: {}, force: true });
    console.log('  ✓ Users cleaned');

    console.log('\n✅ Database cleaned successfully');

    // Seed data
    console.log('\n🌱 Seeding database...');

    // 1. Create Users
    console.log('\n👥 Creating users...');
    const adminPassword = await bcrypt.hash('Admin@123', 10);
    const studentPassword = await bcrypt.hash('Student@123', 10);
    const volunteerPassword = await bcrypt.hash('Volunteer@123', 10);

    const admin = await User.create({
      name: 'System Admin',
      email: 'admin@example.com',
      password: adminPassword,
      role: 'admin',
      department: 'Administration',
      isActive: true
    });
    console.log('  ✓ Admin created:', admin.email);

    const volunteer = await User.create({
      name: 'John Volunteer',
      email: 'volunteer@example.com',
      password: volunteerPassword,
      role: 'volunteer',
      department: 'CSE',
      rollNumber: 'VOL001',
      phoneNumber: '9876543210',
      isActive: true
    });
    console.log('  ✓ Volunteer created:', volunteer.email);

    // Create students from different departments
    const departments = ['CSE', 'ECE', 'MECH', 'CIVIL', 'IT', 'EEE'];
    const students = [];
    
    for (let i = 0; i < 20; i++) {
      const dept = departments[i % departments.length];
      const student = await User.create({
        name: `Student ${i + 1}`,
        email: `student${i + 1}@example.com`,
        password: studentPassword,
        role: 'student',
        department: dept,
        rollNumber: `21${dept}${String(i + 1).padStart(3, '0')}`,
        year: String(2 + (i % 3)),
        section: String.fromCharCode(65 + (i % 3)), // A, B, C
        phoneNumber: `98765432${String(i + 10).padStart(2, '0')}`,
        isActive: true
      });
      students.push(student);
    }
    console.log(`  ✓ Created ${students.length} students`);

    // 2. Create Events
    console.log('\n📅 Creating events...');
    const event1 = await Event.create({
      name: 'Annual Tech Fest 2025',
      description: 'Annual technology festival showcasing student innovations',
      location: 'Main Campus Grounds',
      startDate: new Date('2025-12-15T09:00:00'),
      endDate: new Date('2025-12-17T18:00:00'),
      isActive: true,
      createdBy: admin.id,
      settings: {
        allowVoting: true,
        allowFeedback: true,
        maxVotesPerStudent: 3
      }
    });
    console.log('  ✓ Event created:', event1.name);

    const event2 = await Event.create({
      name: 'Cultural Fest 2025',
      description: 'Cultural festival celebrating diversity',
      location: 'Auditorium Complex',
      startDate: new Date('2025-11-20T10:00:00'),
      endDate: new Date('2025-11-22T20:00:00'),
      isActive: false,
      createdBy: admin.id,
      settings: {
        allowVoting: true,
        allowFeedback: true
      }
    });
    console.log('  ✓ Event created:', event2.name);

    // 3. Create Stalls with ownerPassword
    console.log('\n🏪 Creating stalls...');
    const stallsData = [
      // CSE Department
      { name: 'AI & ML Showcase', department: 'CSE', desc: 'Latest AI and Machine Learning projects' },
      { name: 'Web Development Hub', department: 'CSE', desc: 'Modern web applications and frameworks' },
      { name: 'Cybersecurity Zone', department: 'CSE', desc: 'Network security and ethical hacking demos' },
      
      // ECE Department
      { name: 'IoT Innovation Lab', department: 'ECE', desc: 'Internet of Things projects and demos' },
      { name: 'Robotics Arena', department: 'ECE', desc: 'Autonomous robots and automation' },
      { name: 'Communication Systems', department: 'ECE', desc: 'Modern communication technologies' },
      
      // MECH Department
      { name: 'Mechanical Marvels', department: 'MECH', desc: 'Innovative mechanical designs' },
      { name: 'CAD/CAM Workshop', department: 'MECH', desc: 'Computer-aided design demonstrations' },
      { name: 'Automotive Tech', department: 'MECH', desc: 'Latest automotive innovations' },
      
      // CIVIL Department
      { name: 'Structural Models', department: 'CIVIL', desc: 'Bridge and building models' },
      { name: 'Smart Construction', department: 'CIVIL', desc: 'Modern construction techniques' },
      
      // IT Department
      { name: 'Cloud Computing', department: 'IT', desc: 'Cloud technologies and services' },
      { name: 'Mobile App Dev', department: 'IT', desc: 'Cross-platform mobile applications' },
      
      // EEE Department
      { name: 'Power Systems', department: 'EEE', desc: 'Electrical power generation and distribution' },
      { name: 'Renewable Energy', department: 'EEE', desc: 'Solar and wind energy projects' },
    ];

    const stalls = [];
    for (const [index, stallData] of stallsData.entries()) {
      const password = crypto.randomBytes(4).toString('hex'); // Generate 8-char password
      
      const stall = await Stall.create({
        name: stallData.name,
        description: stallData.desc,
        department: stallData.department,
        location: `Hall ${String.fromCharCode(65 + Math.floor(index / 5))}, Stall ${(index % 5) + 1}`,
        eventId: event1.id,
        ownerName: `${stallData.department} Team`,
        ownerEmail: `${stallData.department.toLowerCase()}team${index + 1}@example.com`,
        ownerContact: `987654${String(3210 + index).slice(-4)}`,
        ownerPassword: password, // Store the generated password
        isActive: true
      });
      
      stalls.push(stall);
      console.log(`  ✓ Stall created: ${stall.name} (Dept: ${stall.department}, Password: ${password})`);
    }

    // 4. Create Attendances
    console.log('\n✅ Creating attendances...');
    let attendanceCount = 0;
    for (const student of students.slice(0, 15)) { // 15 students attended
      await Attendance.create({
        studentId: student.id, // Changed from userId to studentId
        eventId: event1.id,
        checkInTime: new Date(),
        status: 'checked-in',
        scannedBy: volunteer.id
      });
      attendanceCount++;
    }
    console.log(`  ✓ Created ${attendanceCount} attendances`);

    // 5. Create Votes (students vote for stalls in their department)
    console.log('\n🗳️ Creating votes...');
    let voteCount = 0;
    for (const student of students.slice(0, 15)) {
      // Each student votes for 1-3 stalls from their department
      const deptStalls = stalls.filter(s => s.department === student.department);
      const numVotes = Math.min(Math.floor(Math.random() * 3) + 1, deptStalls.length);
      
      for (let i = 0; i < numVotes; i++) {
        const stall = deptStalls[i];
        await Vote.create({
          studentId: student.id, // Changed from userId to studentId
          stallId: stall.id,
          eventId: event1.id,
          volunteerId: volunteer.id // Changed from submittedBy to volunteerId
        });
        voteCount++;
      }
    }
    console.log(`  ✓ Created ${voteCount} votes`);

    // 6. Create Feedbacks
    console.log('\n💬 Creating feedbacks...');
    let feedbackCount = 0;
    const feedbackComments = [
      'Excellent presentation and innovative ideas!',
      'Very informative and well organized',
      'Great work! Keep it up',
      'Impressive project with practical applications',
      'Good effort, needs more explanation',
      'Outstanding demonstration',
      'Interesting concept and execution'
    ];

    for (const student of students.slice(0, 12)) {
      // Each student gives feedback to 1-2 stalls from their department
      const deptStalls = stalls.filter(s => s.department === student.department);
      const numFeedbacks = Math.min(Math.floor(Math.random() * 2) + 1, deptStalls.length);
      
      for (let i = 0; i < numFeedbacks; i++) {
        const stall = deptStalls[i];
        const rating = Math.floor(Math.random() * 2) + 4; // 4 or 5 stars
        const comment = feedbackComments[Math.floor(Math.random() * feedbackComments.length)];
        
        await Feedback.create({
          studentId: student.id, // Changed from userId to studentId
          stallId: stall.id,
          eventId: event1.id,
          rating: rating,
          comment: comment,
          isAnonymous: Math.random() > 0.5,
          volunteerId: volunteer.id // Changed from submittedBy to volunteerId
        });
        feedbackCount++;
      }
    }
    console.log(`  ✓ Created ${feedbackCount} feedbacks`);

    // 7. Refresh stall statistics
    console.log('\n📊 Refreshing stall statistics...');
    for (const stall of stalls) {
      const totalVotes = await Vote.count({ where: { stallId: stall.id } });
      const feedbacks = await Feedback.findAll({ where: { stallId: stall.id } });
      const totalFeedbacks = feedbacks.length;
      const averageRating = totalFeedbacks > 0
        ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / totalFeedbacks
        : 0;

      await stall.update({
        totalVotes,
        totalFeedbacks,
        averageRating: parseFloat(averageRating.toFixed(2))
      });
    }
    console.log('  ✓ Stall statistics updated');

    // Summary
    console.log('\n📈 Seeding Summary:');
    console.log('==================');
    console.log(`✓ Users: ${students.length + 2} (1 admin, 1 volunteer, ${students.length} students)`);
    console.log(`✓ Events: 2 (1 active, 1 inactive)`);
    console.log(`✓ Stalls: ${stalls.length} (all with ownerPassword)`);
    console.log(`✓ Attendances: ${attendanceCount}`);
    console.log(`✓ Votes: ${voteCount}`);
    console.log(`✓ Feedbacks: ${feedbackCount}`);

    console.log('\n🔐 Login Credentials:');
    console.log('====================');
    console.log('Admin:');
    console.log('  Email: admin@example.com');
    console.log('  Password: Admin@123');
    console.log('\nVolunteer:');
    console.log('  Email: volunteer@example.com');
    console.log('  Password: Volunteer@123');
    console.log('\nStudents:');
    console.log('  Email: student1@example.com to student20@example.com');
    console.log('  Password: Student@123');
    console.log('\nStall Owners (use Stall ID + Password from above)');

    console.log('\n✅ Database cleaned and seeded successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the script
cleanAndSeed();
