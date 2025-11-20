// Load environment variables
require('dotenv').config();

const { connectDB } = require('./src/config/database');
const User = require('./src/models/User.sequelize');
const Volunteer = require('./src/models/Volunteer.sequelize');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');

const reseedDatabase = async () => {
  try {
    console.log('🚀 Starting database re-seed...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');

    // Clear existing test data (optional - comment out if you want to keep existing data)
    console.log('🗑️ Skipping data clearing due to foreign key constraints...');
    console.log('💡 Adding new test credentials alongside existing data...');

    console.log('👥 Creating admin users...');
    
    // Create admin users
    const adminUsers = [
      {
        name: 'Super Admin',
        email: 'admin@example.com',
        password: 'Admin@123',
        role: 'admin',
        department: 'Administration',
        faculty: 'Management',
        isActive: true
      },
      {
        name: 'Event Administrator',
        email: 'event.admin@example.com',
        password: 'Admin@123',
        role: 'admin',
        department: 'Event Management',
        faculty: 'Administration',
        isActive: true
      }
    ];

    for (const adminData of adminUsers) {
      // Check if admin already exists
      const existingAdmin = await User.findOne({ where: { email: adminData.email } });
      if (!existingAdmin) {
        await User.create(adminData);
        console.log(`✅ Created admin: ${adminData.email}`);
      } else {
        console.log(`ℹ️  Admin already exists: ${adminData.email}`);
      }
    }

    console.log('🎓 Creating student users...');
    
    // Create student users
    const studentUsers = [
      {
        name: 'Student One',
        email: 'student1@example.com',
        password: 'Student@123',
        role: 'student',
        regNo: 'STU001',
        department: 'Computer Science',
        faculty: 'School of Engineering',
        programme: 'B.Tech Computer Science',
        year: 2024,
        isActive: true
      },
      {
        name: 'Student Two',
        regNo: 'STU002', // No email - should work for students
        password: 'Student@123',
        role: 'student',
        department: 'Electronics',
        faculty: 'School of Engineering', 
        programme: 'B.Tech Electronics',
        year: 2023,
        isActive: true
      },
      {
        name: 'Student Three',
        email: 'student3@example.com',
        password: 'Student@123',
        role: 'student',
        regNo: 'STU003',
        department: 'Mechanical',
        faculty: 'School of Engineering',
        programme: 'B.Tech Mechanical',
        year: 2024,
        isActive: true
      }
    ];

    for (const studentData of studentUsers) {
      // Check if student already exists
      const existingStudent = await User.findOne({ 
        where: { 
          [Op.or]: [
            { email: studentData.email || '' },
            { regNo: studentData.regNo }
          ]
        } 
      });
      if (!existingStudent) {
        await User.create(studentData);
        console.log(`✅ Created student: ${studentData.regNo} (${studentData.email || 'no email'})`);
      } else {
        console.log(`ℹ️  Student already exists: ${studentData.regNo}`);
      }
    }

    console.log('🏪 Creating stall owner...');
    
    // Create stall owner
    const stallOwner = {
      name: 'Stall Owner',
      email: 'stall@example.com',
      password: 'Stall@123',
      role: 'stall_owner',
      department: 'Business',
      faculty: 'Commerce',
      isActive: true
    };

    // Check if stall owner already exists
    const existingStallOwner = await User.findOne({ where: { email: stallOwner.email } });
    if (!existingStallOwner) {
      await User.create(stallOwner);
      console.log(`✅ Created stall owner: ${stallOwner.email}`);
    } else {
      console.log(`ℹ️  Stall owner already exists: ${stallOwner.email}`);
    }

    console.log('👨‍💼 Creating volunteers...');
    
    // Create volunteers
    const volunteers = [
      {
        name: 'Volunteer One',
        email: 'vol1@example.com',
        password: 'volunteer123',
        volunteerId: 'VOL001',
        department: 'Computer Science',
        faculty: 'School of Engineering',
        programme: 'B.Tech Computer Science',
        year: 2023,
        permissions: {
          canScanQR: true,
          canManageAttendance: true,
          canViewReports: false
        },
        shiftStart: '09:00',
        shiftEnd: '17:00',
        joinDate: '2024-01-15',
        isActive: true
      },
      {
        name: 'Volunteer Two', 
        volunteerId: 'VOL002', // No email - should work for volunteers
        password: 'volunteer123',
        department: 'Electronics',
        faculty: 'School of Engineering',
        programme: 'B.Tech Electronics',
        year: 2023,
        permissions: {
          canScanQR: true,
          canManageAttendance: true,
          canViewReports: true
        },
        shiftStart: '10:00',
        shiftEnd: '18:00',
        joinDate: '2024-02-01',
        isActive: true
      },
      {
        name: 'Volunteer Three',
        email: 'vol3@example.com', 
        volunteerId: 'VOL003',
        password: 'volunteer123',
        department: 'Management',
        faculty: 'Business School',
        programme: 'MBA',
        year: 2024,
        permissions: {
          canScanQR: true,
          canManageAttendance: false,
          canViewReports: false
        },
        shiftStart: '08:00',
        shiftEnd: '16:00',
        joinDate: '2024-03-01',
        isActive: true
      }
    ];

    for (const volunteerData of volunteers) {
      // Check if volunteer already exists
      const existingVolunteer = await Volunteer.findOne({ 
        where: { 
          [Op.or]: [
            { email: volunteerData.email || '' },
            { volunteerId: volunteerData.volunteerId }
          ]
        } 
      });
      if (!existingVolunteer) {
        await Volunteer.create(volunteerData);
        console.log(`✅ Created volunteer: ${volunteerData.volunteerId} (${volunteerData.email || 'no email'})`);
      } else {
        console.log(`ℹ️  Volunteer already exists: ${volunteerData.volunteerId}`);
      }
    }

    console.log('\n🎯 Testing password hashing...');
    
    // Test password verification
    const testVolunteer = await Volunteer.findOne({ 
      where: { volunteerId: 'VOL001' } 
    });
    
    if (testVolunteer) {
      console.log('🔍 Testing volunteer password verification...');
      console.log(`Volunteer: ${testVolunteer.name} (${testVolunteer.volunteerId})`);
      console.log(`Stored password hash length: ${testVolunteer.password ? testVolunteer.password.length : 'N/A'}`);
      
      if (testVolunteer.password) {
        try {
          // Use bcrypt directly to test password verification
          const isValidPassword = await bcrypt.compare('volunteer123', testVolunteer.password);
          console.log(`Password verification result: ${isValidPassword}`);
          
          if (isValidPassword) {
            console.log('✅ Password hashing and verification working correctly!');
          } else {
            console.log('❌ Password verification failed!');
          }
        } catch (error) {
          console.log('❌ Password verification error:', error.message);
        }
      } else {
        console.log('❌ No password found for volunteer!');
      }
    } else {
      console.log('❌ Test volunteer VOL001 not found!');
    }

    console.log('\n📋 Summary of created credentials:');
    console.log('==========================================');
    console.log('👨‍💼 ADMINS:');
    console.log('  • admin@example.com / Admin@123');
    console.log('  • event.admin@example.com / Admin@123');
    console.log('');
    console.log('🎓 STUDENTS:');
    console.log('  • Email: student1@example.com / Student@123');
    console.log('  • RegNo: STU002 / Student@123 (no email)');
    console.log('  • Email: student3@example.com / Student@123');
    console.log('  • RegNo: STU003 / Student@123');
    console.log('');
    console.log('🏪 STALL OWNERS:');
    console.log('  • stall@example.com / Stall@123');
    console.log('');
    console.log('👨‍💼 VOLUNTEERS:');
    console.log('  • Email: vol1@example.com / volunteer123');
    console.log('  • ID: VOL001 / volunteer123');
    console.log('  • ID: VOL002 / volunteer123 (no email)');
    console.log('  • Email: vol3@example.com / volunteer123');
    console.log('  • ID: VOL003 / volunteer123');
    console.log('==========================================');

    console.log('✅ Database re-seeding completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error re-seeding database:', error);
    process.exit(1);
  }
};

reseedDatabase();