require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Event = require('./src/models/Event');
const Stall = require('./src/models/Stall');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

const seedUsers = async () => {
  try {
    // Check if users already exist
    const existingAdminCount = await User.countDocuments({ role: 'admin' });
    const existingStudentCount = await User.countDocuments({ role: 'student' });
    const existingVolunteerCount = await User.countDocuments({ role: 'volunteer' });

    console.log(`📊 Current database status:`);
    console.log(`   Admins: ${existingAdminCount}`);
    console.log(`   Volunteers: ${existingVolunteerCount}`);
    console.log(`   Students: ${existingStudentCount}\n`);

    // Create Admin Users (only if none exist)
    const admins = [];
    if (existingAdminCount === 0) {
      admins.push(
        {
          name: 'Admin User',
          email: 'admin@event.com',
          password: 'admin123',
          role: 'admin',
          isActive: true,
        },
        {
          name: 'Super Admin',
          email: 'superadmin@event.com',
          password: 'admin123',
          role: 'admin',
          isActive: true,
        }
      );
    }

    // Create Volunteer Users
    const volunteers = [
      {
        name: 'John Volunteer',
        email: 'volunteer1@event.com',
        password: 'volunteer123',
        role: 'volunteer',
        assignedGate: 'Main Gate',
        phone: '9876543210',
        isActive: true,
      },
      {
        name: 'Jane Volunteer',
        email: 'volunteer2@event.com',
        password: 'volunteer123',
        role: 'volunteer',
        assignedGate: 'Side Gate',
        phone: '9876543211',
        isActive: true,
      },
      {
        name: 'Bob Volunteer',
        email: 'volunteer3@event.com',
        password: 'volunteer123',
        role: 'volunteer',
        assignedGate: 'Main Gate',
        phone: '9876543212',
        isActive: true,
      },
    ];

    // Create Student Users
    const departments = ['CSE', 'ECE', 'ME', 'CE', 'EEE', 'IT'];
    const programmes = ['B.Tech', 'M.Tech', 'MBA', 'MCA'];
    const students = [];

    for (let i = 1; i <= 50; i++) {
      const dept = departments[Math.floor(Math.random() * departments.length)];
      const prog = programmes[Math.floor(Math.random() * programmes.length)];
      
      students.push({
        name: `Student ${i}`,
        email: `student${i}@event.com`,
        password: 'student123',
        role: 'student',
        rollNo: `${dept}${2021 + Math.floor(i / 13)}${String(i).padStart(3, '0')}`,
        department: dept,
        programme: prog,
        phone: `98765432${String(i).padStart(2, '0')}`,
        isActive: true,
      });
    }

    // Insert all users
    console.log('👥 Creating users...');
    
    let createdAdmins = [];
    let createdVolunteers = [];
    let createdStudents = [];
    
    if (admins.length > 0) {
      createdAdmins = await User.insertMany(admins);
      console.log(`✅ Created ${createdAdmins.length} admin users`);
    } else {
      createdAdmins = await User.find({ role: 'admin' });
      console.log(`ℹ️  Using existing ${createdAdmins.length} admin users`);
    }
    
    if (volunteers.length > 0) {
      createdVolunteers = await User.insertMany(volunteers);
      console.log(`✅ Created ${createdVolunteers.length} volunteer users`);
    } else {
      createdVolunteers = await User.find({ role: 'volunteer' });
      console.log(`ℹ️  Using existing ${createdVolunteers.length} volunteer users`);
    }
    
    if (students.length > 0) {
      createdStudents = await User.insertMany(students);
      console.log(`✅ Created ${createdStudents.length} student users`);
    } else {
      createdStudents = await User.find({ role: 'student' });
      console.log(`ℹ️  Using existing ${createdStudents.length} student users`);
    }
    // Create sample event
    console.log('\n📅 Creating sample event...');
    
    let event = await Event.findOne({ name: 'Tech Fest 2025' });
    
    if (!event) {
      event = await Event.create({
        name: 'Tech Fest 2025',
        description: 'Annual technical festival showcasing innovation and creativity',
        startDate: new Date('2025-12-01T09:00:00'),
        endDate: new Date('2025-12-03T18:00:00'),
        venue: 'Main Campus',
        isActive: true,
        allowVoting: true,
        allowFeedback: true,
        maxVotesPerStudent: 3,
      });
      console.log(`✅ Created event: ${event.name}`);
    } else {
      console.log(`ℹ️  Using existing event: ${event.name}`);
    }

    // Create sample stalls
    console.log('\n🏪 Creating sample stalls...');
    
    const existingStallsCount = await Stall.countDocuments({ eventId: event._id });
    
    let createdStalls = [];
    
    if (existingStallsCount === 0) {
      const stallNames = [
        'Robotics Arena',
        'AI & ML Zone',
        'Web Development Hub',
        'Mobile App Studio',
        'IoT Innovation',
        'Blockchain Corner',
        'Gaming Zone',
        'AR/VR Experience',
        'Cybersecurity Lab',
        'Data Science Desk',
        '3D Printing Workshop',
        'Drone Technology',
        'Cloud Computing',
        'Hardware Hacking',
        'Green Tech',
      ];

      const stalls = stallNames.map((name, index) => ({
        name,
        description: `Explore the world of ${name}`,
        department: departments[index % departments.length],
        eventId: event._id,
        contactPerson: `Contact ${index + 1}`,
        contactEmail: `stall${index + 1}@event.com`,
        contactPhone: `9876500${String(index + 1).padStart(3, '0')}`,
        location: `Hall ${Math.floor(index / 3) + 1}, Booth ${(index % 3) + 1}`,
        isActive: true,
      }));

      createdStalls = await Stall.insertMany(stalls);
      console.log(`✅ Created ${createdStalls.length} stalls`);
    } else {
      createdStalls = await Stall.find({ eventId: event._id });
      console.log(`ℹ️  Using existing ${createdStalls.length} stalls`);
    }

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 DATABASE SEEDED SUCCESSFULLY!');
    console.log('='.repeat(50));
    console.log('\n👥 USER ACCOUNTS CREATED:\n');
    
    console.log('🔐 ADMIN ACCOUNTS:');
    admins.forEach(admin => {
      console.log(`   Email: ${admin.email}`);
      console.log(`   Password: ${admin.password}`);
      console.log('');
    });

    console.log('👷 VOLUNTEER ACCOUNTS:');
    volunteers.forEach(vol => {
      console.log(`   Email: ${vol.email}`);
      console.log(`   Password: ${vol.password}`);
      console.log(`   Gate: ${vol.assignedGate}`);
      console.log('');
    });

    console.log('🎓 STUDENT ACCOUNTS (Sample):');
    students.slice(0, 5).forEach(student => {
      console.log(`   Email: ${student.email}`);
      console.log(`   Password: ${student.password}`);
      console.log(`   Roll: ${student.rollNo}`);
      console.log('');
    });
    console.log(`   ... and ${students.length - 5} more students`);

    console.log('\n📅 EVENT CREATED:');
    console.log(`   Name: ${event.name}`);
    console.log(`   Date: ${event.startDate.toDateString()} - ${event.endDate.toDateString()}`);

    console.log('\n🏪 STALLS CREATED:');
    console.log(`   Total: ${createdStalls.length} stalls`);
    createdStalls.slice(0, 5).forEach(stall => {
      console.log(`   - ${stall.name} (${stall.department})`);
    });
    console.log(`   ... and ${createdStalls.length - 5} more stalls`);

    console.log('\n' + '='.repeat(50));
    console.log('🎉 You can now login and test the application!');
    console.log('='.repeat(50) + '\n');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
  }
};

// Run the seed script
connectDB().then(() => {
  seedUsers();
});
