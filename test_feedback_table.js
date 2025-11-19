const { Feedback, Event, User } = require('./backend/src/models/index.sequelize');

async function testFeedbackTable() {
  try {
    console.log('🔍 Testing Feedback table...');
    
    // Test 1: Check if table exists by counting records
    const feedbackCount = await Feedback.count();
    console.log(`✅ Feedback table exists with ${feedbackCount} records`);
    
    // Test 2: Get a sample of feedback records
    const sampleFeedbacks = await Feedback.findAll({ 
      limit: 3,
      attributes: ['id', 'eventId', 'stallId', 'studentId', 'rating']
    });
    console.log('📊 Sample feedback records:');
    sampleFeedbacks.forEach((feedback, index) => {
      console.log(`   ${index + 1}. ID: ${feedback.id}, Event: ${feedback.eventId}, Student: ${feedback.studentId}, Rating: ${feedback.rating}`);
    });
    
    // Test 3: Check events that have feedbacks
    const eventsWithFeedbacks = await Feedback.findAll({
      attributes: [
        'eventId',
        [require('sequelize').fn('COUNT', require('sequelize').col('Feedback.id')), 'feedbackCount']
      ],
      group: ['eventId'],
      limit: 5,
      raw: true
    });
    console.log('🎪 Events with feedback counts:');
    eventsWithFeedbacks.forEach((item, index) => {
      console.log(`   ${index + 1}. Event ID: ${item.eventId}, Feedbacks: ${item.feedbackCount}`);
    });
    
    // Test 4: Check students who gave feedbacks
    const studentsWithFeedbacks = await Feedback.findAll({
      attributes: [
        'studentId',
        [require('sequelize').fn('COUNT', require('sequelize').col('Feedback.id')), 'feedbackCount']
      ],
      group: ['studentId'],
      order: [[require('sequelize').fn('COUNT', require('sequelize').col('Feedback.id')), 'DESC']],
      limit: 5,
      raw: true
    });
    console.log('👥 Top students by feedback count:');
    studentsWithFeedbacks.forEach((item, index) => {
      console.log(`   ${index + 1}. Student ID: ${item.studentId}, Feedbacks: ${item.feedbackCount}`);
    });
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error testing feedback table:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testFeedbackTable();