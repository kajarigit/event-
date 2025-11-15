require('dotenv').config();
const { sequelize } = require('./src/config/database');
const User = require('./src/models/User.sequelize');
const Event = require('./src/models/Event.sequelize');
const Stall = require('./src/models/Stall.sequelize');

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seed...\n');

    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL\n');

    // Sync models (create tables if they don't exist)
    await sequelize.sync({ force: true }); // WARNING: This will drop all tables!
    console.log('✅ Database synced (all tables dropped and recreated)\n');

    // Create admin user (password will be hashed by beforeCreate hook)
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@event.com',
      password: 'Password@123',  // Plain password - will be hashed by model hook
      role: 'admin',
      department: 'Administration',
      isActive: true,
    });
    console.log('✅ Admin created:', admin.email);
    console.log('   Password: Password@123\n');

    // Create sample students (password will be hashed by beforeCreate hook)
    const studentData = [
      {
        name: 'Rahul Sharma',
        email: 'rahul@student.com',
        password: 'Student@123',  // Plain password - will be hashed by model hook
        role: 'student',
        rollNumber: 'CS2023001',
        department: 'Computer Science',
        year: 3,
        phone: '+919876543210',
        isActive: true,
      },
      {
        name: 'Priya Singh',
        email: 'priya@student.com',
        password: 'Student@123',  // Plain password - will be hashed by model hook
        role: 'student',
        rollNumber: 'EC2023015',
        department: 'Electronics',
        year: 2,
        phone: '+919876543211',
        isActive: true,
      },
      {
        name: 'Amit Kumar',
        email: 'amit@student.com',
        password: 'Student@123',  // Plain password - will be hashed by model hook
        role: 'student',
        rollNumber: 'ME2023042',
        department: 'Mechanical',
        year: 4,
        phone: '+919876543212',
        isActive: true,
      },
      {
        name: 'Sneha Patel',
        email: 'sneha@student.com',
        password: 'Student@123',  // Plain password - will be hashed by model hook
        role: 'student',
        rollNumber: 'CS2023002',
        department: 'Computer Science',
        year: 3,
        phone: '+919876543213',
        isActive: true,
      },
      {
        name: 'Karan Verma',
        email: 'karan@student.com',
        password: 'Student@123',  // Plain password - will be hashed by model hook
        role: 'student',
        rollNumber: 'EE2023025',
        department: 'Electrical',
        year: 2,
        phone: '+919876543214',
        isActive: true,
      },
    ];

    // Use bulkCreate with individualHooks to trigger password hashing
    const students = await User.bulkCreate(studentData, { individualHooks: true });
    console.log(`✅ Created ${students.length} students`);
    console.log('   Password: Student@123\n');

    // Create sample events
    const events = await Event.bulkCreate([
      {
        name: 'Tech Fest 2025',
        description: 'Annual technology festival showcasing innovation and creativity',
        startDate: new Date('2025-11-20'),
        endDate: new Date('2025-11-22'),
        venue: 'Main Campus Ground',
        isActive: true,
        maxVotesPerStudent: 3,
        allowFeedback: true,
        allowVoting: true,
        qrCodeRequired: true,
      },
      {
        name: 'Cultural Night',
        description: 'Celebration of arts, music, and culture',
        startDate: new Date('2025-12-01'),
        endDate: new Date('2025-12-01'),
        venue: 'Auditorium',
        isActive: true,
        maxVotesPerStudent: 5,
        allowFeedback: true,
        allowVoting: true,
        qrCodeRequired: false,
      },
    ]);
    console.log(`✅ Created ${events.length} events\n`);

    // Create volunteer user
    const volunteer = await User.create({
      name: 'Volunteer User',
      email: 'volunteer@event.com',
      password: 'Volunteer@123',  // Plain password - will be hashed by model hook
      role: 'volunteer',
      department: 'Event Management',
      phone: '+919876543219',
      isActive: true,
    });
    console.log('✅ Volunteer created:', volunteer.email);
    console.log('   Password: Volunteer@123\n');

    // Create sample stalls
    const stallOwner = await User.create({
      name: 'John Doe',
      email: 'john@stallowner.com',
      password: 'Student@123',  // Plain password - will be hashed by model hook
      role: 'stall_owner',
      phone: '+919876543220',
      isActive: true,
    });

    const stalls = await Stall.bulkCreate([
      {
        eventId: events[0].id,
        name: 'Robotics Exhibition',
        description: 'Latest innovations in robotics and automation',
        location: 'Hall A - Booth 1',
        category: 'Technology',
        ownerId: stallOwner.id,
        ownerName: 'John Doe',
        ownerContact: '+919876543220',
        isActive: true,
      },
      {
        eventId: events[0].id,
        name: 'AI & ML Showcase',
        description: 'Artificial Intelligence and Machine Learning projects',
        location: 'Hall A - Booth 2',
        category: 'Technology',
        ownerId: stallOwner.id,
        ownerName: 'John Doe',
        ownerContact: '+919876543220',
        isActive: true,
      },
      {
        eventId: events[0].id,
        name: 'Food Court',
        description: 'Delicious food and refreshments',
        location: 'Outdoor Area',
        category: 'Food & Beverage',
        ownerId: stallOwner.id,
        ownerName: 'John Doe',
        ownerContact: '+919876543220',
        isActive: true,
      },
    ]);
    console.log(`✅ Created ${stalls.length} stalls\n`);

    console.log('🎉 Database seeded successfully!\n');
    console.log('📊 Summary:');
    console.log('   - 1 Admin user');
    console.log('   - 5 Student users');
    console.log('   - 1 Stall owner');
    console.log('   - 2 Events');
    console.log('   - 3 Stalls\n');
    
    console.log('🔑 Login Credentials:');
    console.log('   Admin:   admin@event.com / Password@123');
    console.log('   Student: rahul@student.com / Student@123');
    console.log('   Student: priya@student.com / Student@123');
    console.log('   Student: amit@student.com / Student@123\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
