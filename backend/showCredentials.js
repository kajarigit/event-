require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Event = require('./src/models/Event');
const Stall = require('./src/models/Stall');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected\n');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

const showCredentials = async () => {
  try {
    const admins = await User.find({ role: 'admin' }).select('name email');
    const volunteers = await User.find({ role: 'volunteer' }).select('name email assignedGate');
    const students = await User.find({ role: 'student' }).select('name email rollNo department').limit(10);
    const events = await Event.find().select('name isActive startDate endDate');
    const stalls = await Stall.find().select('name department location isActive');

    console.log('='.repeat(70));
    console.log('🎉 EVENT MANAGEMENT SYSTEM - LOGIN CREDENTIALS');
    console.log('='.repeat(70));

    console.log('\n🔐 ADMIN ACCOUNTS:');
    console.log('-'.repeat(70));
    admins.forEach((admin, i) => {
      console.log(`\n${i + 1}. ${admin.name}`);
      console.log(`   📧 Email: ${admin.email}`);
      console.log(`   🔑 Password: admin123`);
    });

    console.log('\n\n👷 VOLUNTEER ACCOUNTS:');
    console.log('-'.repeat(70));
    volunteers.forEach((vol, i) => {
      console.log(`\n${i + 1}. ${vol.name}`);
      console.log(`   📧 Email: ${vol.email}`);
      console.log(`   🔑 Password: volunteer123`);
      console.log(`   🚪 Gate: ${vol.assignedGate || 'Not assigned'}`);
    });

    console.log('\n\n🎓 STUDENT ACCOUNTS (First 10):');
    console.log('-'.repeat(70));
    students.forEach((student, i) => {
      console.log(`\n${i + 1}. ${student.name}`);
      console.log(`   📧 Email: ${student.email}`);
      console.log(`   🔑 Password: student123`);
      console.log(`   🎫 Roll: ${student.rollNo || 'N/A'}`);
      console.log(`   🏫 Dept: ${student.department || 'N/A'}`);
    });

    const totalStudents = await User.countDocuments({ role: 'student' });
    if (totalStudents > 10) {
      console.log(`\n   ... and ${totalStudents - 10} more students (all have password: student123)`);
    }

    console.log('\n\n📅 EVENTS:');
    console.log('-'.repeat(70));
    if (events.length > 0) {
      events.forEach((event, i) => {
        console.log(`\n${i + 1}. ${event.name}`);
        console.log(`   Status: ${event.isActive ? '✅ Active' : '❌ Inactive'}`);
        console.log(`   Start: ${event.startDate.toDateString()}`);
        console.log(`   End: ${event.endDate.toDateString()}`);
      });
    } else {
      console.log('\n   No events found. Create one via Admin panel!');
    }

    console.log('\n\n🏪 STALLS:');
    console.log('-'.repeat(70));
    if (stalls.length > 0) {
      console.log(`   Total Stalls: ${stalls.length}\n`);
      stalls.slice(0, 5).forEach((stall, i) => {
        console.log(`   ${i + 1}. ${stall.name} (${stall.department}) - ${stall.location}`);
      });
      if (stalls.length > 5) {
        console.log(`   ... and ${stalls.length - 5} more stalls`);
      }
    } else {
      console.log('\n   No stalls found. Create them via Admin panel!');
    }

    console.log('\n' + '='.repeat(70));
    console.log('🌐 APPLICATION URLs:');
    console.log('='.repeat(70));
    console.log('\n   Frontend: http://localhost:3000');
    console.log('   Backend API: http://localhost:5000/api');
    console.log('\n' + '='.repeat(70));
    console.log('📝 QUICK START:');
    console.log('='.repeat(70));
    console.log('\n   1. Login as Admin: admin@event.com / admin123');
    console.log('   2. Create/manage events and stalls');
    console.log('   3. Test volunteer: volunteer1@event.com / volunteer123');
    console.log('   4. Test student: student1@event.com / student123');
    console.log('\n' + '='.repeat(70));
    console.log('✅ Ready to test! Happy coding! 🚀');
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
  }
};

connectDB().then(() => {
  showCredentials();
});
