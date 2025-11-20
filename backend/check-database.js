// Load environment variables
require('dotenv').config();

const { connectDB } = require('./src/config/database');
const User = require('./src/models/User.sequelize');
const Volunteer = require('./src/models/Volunteer.sequelize');

const checkDatabase = async () => {
  try {
    console.log('🔍 Checking database contents...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');

    console.log('\n👥 USERS TABLE:');
    console.log('='*50);
    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'regNo', 'role', 'isActive'],
      order: [['role', 'ASC'], ['name', 'ASC']]
    });
    
    users.forEach(user => {
      console.log(`${user.role.toUpperCase()}: ${user.name}`);
      console.log(`  Email: ${user.email || 'N/A'}`);
      console.log(`  RegNo: ${user.regNo || 'N/A'}`);
      console.log(`  Active: ${user.isActive}`);
      console.log('  ---');
    });

    console.log('\n👨‍💼 VOLUNTEERS TABLE:');
    console.log('='*50);
    const volunteers = await Volunteer.findAll({
      attributes: ['id', 'name', 'email', 'volunteerId', 'isActive'],
      order: [['name', 'ASC']]
    });
    
    volunteers.forEach(volunteer => {
      console.log(`VOLUNTEER: ${volunteer.name}`);
      console.log(`  Email: ${volunteer.email || 'N/A'}`);
      console.log(`  Volunteer ID: ${volunteer.volunteerId}`);
      console.log(`  Active: ${volunteer.isActive}`);
      console.log('  ---');
    });

    console.log(`\n📊 SUMMARY:`);
    console.log(`Total Users: ${users.length}`);
    console.log(`Total Volunteers: ${volunteers.length}`);
    console.log(`Admins: ${users.filter(u => u.role === 'admin').length}`);
    console.log(`Students: ${users.filter(u => u.role === 'student').length}`);
    console.log(`Stall Owners: ${users.filter(u => u.role === 'stall_owner').length}`);

    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
    process.exit(1);
  }
};

checkDatabase();