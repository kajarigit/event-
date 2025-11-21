// Script to create test stalls and feedbacks for the current event
const { sequelize } = require('./backend/src/config/database');
const Stall = require('./backend/src/models/Stall.sequelize');
const Feedback = require('./backend/src/models/Feedback.sequelize');
const User = require('./backend/src/models/User.sequelize');
const crypto = require('crypto');

async function createTestData() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');

    const eventId = 'd61239d5-c439-4f55-a489-e810b0a8de4d';
    
    // Create some test students first
    const students = [];
    for (let i = 1; i <= 10; i++) {
      const student = await User.findOrCreate({
        where: { email: `student${i}@test.com` },
        defaults: {
          id: crypto.randomUUID(),
          name: `Test Student ${i}`,
          email: `student${i}@test.com`,
          password: 'password123',
          role: 'student',
          phone: `987654321${i}`,
          regNo: `REG00${i}`,
          faculty: 'Engineering',
          department: i <= 3 ? 'Computer Science' : i <= 6 ? 'Electronics' : 'Mechanical',
          programme: 'B.Tech',
          year: Math.floor(Math.random() * 4) + 1,
          isActive: true,
          isVerified: true
        }
      });
      students.push(student[0]);
    }
    console.log('✅ Created 10 test students');

    // Create test stalls for the event
    const stallsData = [
      {
        stallNumber: 'CS001',
        name: 'AI Innovation Hub',
        department: 'Computer Science',
        category: 'Technology',
        description: 'Latest AI innovations and machine learning demos',
        location: 'Block A, Ground Floor',
        ownerName: 'Dr. John Smith',
        ownerContact: '9876543210',
        isActive: true,
        eventId
      },
      {
        stallNumber: 'EE002', 
        name: 'Robotics Workshop',
        department: 'Electronics',
        category: 'Engineering',
        description: 'Interactive robotics demonstrations',
        location: 'Block B, First Floor',
        ownerName: 'Prof. Sarah Johnson',
        ownerContact: '9876543211',
        isActive: true,
        eventId
      },
      {
        stallNumber: 'ME003',
        name: 'Sustainable Energy',
        department: 'Mechanical',
        category: 'Environment',
        description: 'Renewable energy solutions showcase',
        location: 'Block C, Ground Floor',
        ownerName: 'Dr. Mike Wilson',
        ownerContact: '9876543212',
        isActive: true,
        eventId
      },
      {
        stallNumber: 'CS004',
        name: 'Web Development Center',
        department: 'Computer Science',
        category: 'Technology',
        description: 'Modern web technologies and frameworks',
        location: 'Block A, Second Floor',
        ownerName: 'Ms. Emily Davis',
        ownerContact: '9876543213',
        isActive: true,
        eventId
      },
      {
        stallNumber: 'EE005',
        name: 'IoT Solutions Hub',
        department: 'Electronics',
        category: 'Technology',
        description: 'Internet of Things applications',
        location: 'Block B, Ground Floor',
        ownerName: 'Dr. Robert Brown',
        ownerContact: '9876543214',
        isActive: true,
        eventId
      }
    ];

    const createdStalls = [];
    for (const stallData of stallsData) {
      const stall = await Stall.create({
        id: crypto.randomUUID(),
        ...stallData
      });
      createdStalls.push(stall);
    }
    console.log('✅ Created 5 test stalls');

    // Create feedbacks for each stall
    let feedbackCount = 0;
    for (const stall of createdStalls) {
      // Create 3-7 random feedbacks per stall
      const numFeedbacks = Math.floor(Math.random() * 5) + 3;
      
      for (let i = 0; i < numFeedbacks; i++) {
        const student = students[Math.floor(Math.random() * students.length)];
        
        // Generate realistic ratings (slightly positive bias)
        const qualityRating = Math.floor(Math.random() * 3) + 3; // 3-5
        const serviceRating = Math.floor(Math.random() * 3) + 3; // 3-5
        const innovationRating = Math.floor(Math.random() * 4) + 2; // 2-5
        const presentationRating = Math.floor(Math.random() * 3) + 3; // 3-5
        const valueRating = Math.floor(Math.random() * 4) + 2; // 2-5
        
        const averageRating = (qualityRating + serviceRating + innovationRating + presentationRating + valueRating) / 5;

        const comments = [
          'Great innovation and presentation!',
          'Very impressive work, keep it up!',
          'Good concept, could use some improvements.',
          'Excellent execution and clear explanation.',
          'Innovative approach to solving real problems.',
          'Well organized and informative display.',
          'Creative solution with practical applications.'
        ];

        try {
          await Feedback.create({
            id: crypto.randomUUID(),
            stallId: stall.id,
            studentId: student.id,
            eventId: eventId,
            qualityRating,
            serviceRating,
            innovationRating,
            presentationRating,
            valueRating,
            averageRating: Math.round(averageRating * 100) / 100,
            rating: Math.round(averageRating), // Backward compatibility
            comments: comments[Math.floor(Math.random() * comments.length)]
          });
          feedbackCount++;
        } catch (error) {
          // Skip if feedback already exists for this student-stall combination
          if (error.name !== 'SequelizeUniqueConstraintError') {
            console.error('Error creating feedback:', error.message);
          }
        }
      }
    }

    console.log(`✅ Created ${feedbackCount} test feedbacks`);
    console.log('\n📊 Test Data Summary:');
    console.log(`- Event ID: ${eventId}`);
    console.log(`- Stalls Created: ${createdStalls.length}`);
    console.log(`- Students: ${students.length}`);
    console.log(`- Feedbacks: ${feedbackCount}`);
    console.log('\n🎯 You can now test the feedback analytics dashboard!');
    
  } catch (error) {
    console.error('❌ Error creating test data:', error);
  } finally {
    await sequelize.close();
    process.exit();
  }
}

// Run the script
createTestData();