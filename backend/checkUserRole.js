require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

async function checkUser() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find user by ID or email
    const userId = '673568f47d68cc1c584e7872'; // Student 46's ID from the event ID in URL
    
    // Try to find by partial match or just list some students
    const students = await User.find({ role: 'student' }).limit(10).select('name email role rollNo');
    
    console.log('\n=== Students in Database ===');
    students.forEach(student => {
      console.log(`ID: ${student._id}`);
      console.log(`Name: ${student.name}`);
      console.log(`Email: ${student.email}`);
      console.log(`Role: ${student.role}`);
      console.log(`Roll No: ${student.rollNo}`);
      console.log('---');
    });

    // Check if there's a student with ID ending in the event ID
    console.log('\n=== Checking specific user from token ===');
    const allUsers = await User.find({}).select('name email role');
    console.log(`Total users: ${allUsers.length}`);
    
    const roleCount = {};
    allUsers.forEach(user => {
      roleCount[user.role] = (roleCount[user.role] || 0) + 1;
    });
    console.log('Role distribution:', roleCount);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUser();
