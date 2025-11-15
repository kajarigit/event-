require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Event = require('../models/Event');
const Stall = require('../models/Stall');
const { generateStallQR } = require('../utils/jwt');

const seedDatabase = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Event.deleteMany({}),
      Stall.deleteMany({}),
    ]);
    console.log('Cleared existing data');

    // Create admin user
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'admin123',
      role: 'admin',
      department: 'Administration',
    });
    console.log('Admin created:', admin.email);

    // Create sample students
    const students = await User.insertMany([
      {
        name: 'Rahul Sharma',
        email: 'rahul@student.com',
        password: 'student123',
        role: 'student',
        rollNo: 'CS2023001',
        programme: 'B.Tech',
        department: 'Computer Science',
        phone: '+919876543210',
      },
      {
        name: 'Priya Singh',
        email: 'priya@student.com',
        password: 'student123',
        role: 'student',
        rollNo: 'EC2023015',
        programme: 'B.Tech',
        department: 'Electronics',
        phone: '+919876543211',
      },
      {
        name: 'Amit Kumar',
        email: 'amit@student.com',
        password: 'student123',
        role: 'student',
        rollNo: 'ME2023042',
        programme: 'B.Tech',
        department: 'Mechanical',
        phone: '+919876543212',
      },
    ]);
    console.log(`Created ${students.length} students`);

    // Create sample volunteers
    const volunteers = await User.insertMany([
      {
        name: 'Volunteer One',
        email: 'volunteer1@example.com',
        password: 'volunteer123',
        role: 'volunteer',
        assignedGate: 'Gate A',
        department: 'Event Management',
      },
      {
        name: 'Volunteer Two',
        email: 'volunteer2@example.com',
        password: 'volunteer123',
        role: 'volunteer',
        assignedGate: 'Gate B',
        department: 'Event Management',
      },
    ]);
    console.log(`Created ${volunteers.length} volunteers`);

    // Create sample event
    const event = await Event.create({
      name: 'Tech Fest 2025',
      description: 'Annual technical festival showcasing departmental innovations',
      startTime: new Date('2025-11-20T09:00:00'),
      endTime: new Date('2025-11-22T18:00:00'),
      isActive: true,
      allowVoting: true,
      allowFeedback: true,
      maxVotesPerStudent: 3,
      venue: 'Main Campus',
      capacity: 15000,
      createdBy: admin._id,
    });
    console.log('Event created:', event.name);

    // Create sample stalls
    const departments = ['Computer Science', 'Electronics', 'Mechanical', 'Civil', 'Chemical'];
    const stallNames = [
      'Robotics Lab',
      'IoT Innovations',
      'AI & ML Showcase',
      'Web Development',
      'Mobile Apps',
      'Automation Systems',
      'Renewable Energy',
      'Smart City Models',
      'Drone Technology',
      'VR/AR Experience',
    ];

    const stallData = [];
    for (let i = 0; i < stallNames.length; i++) {
      const dept = departments[i % departments.length];
      const qrData = await generateStallQR('temp', event._id);
      
      stallData.push({
        name: stallNames[i],
        department: dept,
        programme: 'B.Tech',
        description: `Showcasing latest ${stallNames[i].toLowerCase()} projects and innovations`,
        ownerName: `Prof. ${['Kumar', 'Sharma', 'Singh', 'Patel', 'Verma'][i % 5]}`,
        ownerContact: `+9198765432${10 + i}`,
        ownerEmail: `stall${i + 1}@college.edu`,
        qrToken: qrData.token,
        location: `Hall ${Math.ceil((i + 1) / 2)}, Booth ${i + 1}`,
        eventId: event._id,
        isActive: true,
      });
    }

    const stalls = await Stall.insertMany(stallData);
    console.log(`Created ${stalls.length} stalls`);

    console.log('\n✅ Database seeded successfully!');
    console.log('\nDefault Credentials:');
    console.log('==================');
    console.log('Admin:');
    console.log('  Email: admin@example.com');
    console.log('  Password: admin123\n');
    console.log('Student:');
    console.log('  Email: rahul@student.com');
    console.log('  Password: student123\n');
    console.log('Volunteer:');
    console.log('  Email: volunteer1@example.com');
    console.log('  Password: volunteer123\n');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
