// Script to check data for current event
const { sequelize } = require('./backend/src/config/database');

async function checkEventData() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');

    const eventId = 'd61239d5-c439-4f55-a489-e810b0a8de4d';
    
    // Check stalls
    const stallsResult = await sequelize.query(
      'SELECT COUNT(*) as count FROM stalls WHERE "eventId" = $1 AND "isActive" = true',
      {
        bind: [eventId],
        type: sequelize.QueryTypes.SELECT
      }
    );
    
    // Check feedbacks  
    const feedbacksResult = await sequelize.query(
      'SELECT COUNT(*) as count FROM feedbacks WHERE "eventId" = $1',
      {
        bind: [eventId],
        type: sequelize.QueryTypes.SELECT
      }
    );
    
    // Get some sample stalls if they exist
    const sampleStalls = await sequelize.query(
      'SELECT id, name, department FROM stalls WHERE "eventId" = $1 AND "isActive" = true LIMIT 5',
      {
        bind: [eventId],
        type: sequelize.QueryTypes.SELECT
      }
    );

    console.log('\n📊 Current Event Data:');
    console.log(`Event ID: ${eventId}`);
    console.log(`Active Stalls: ${stallsResult[0].count}`);
    console.log(`Total Feedbacks: ${feedbacksResult[0].count}`);
    
    if (sampleStalls.length > 0) {
      console.log('\n🏪 Sample Stalls:');
      sampleStalls.forEach((stall, index) => {
        console.log(`${index + 1}. ${stall.name} (${stall.department})`);
      });
    } else {
      console.log('\n❌ No stalls found for this event!');
      console.log('💡 Run: node create-test-data-for-event.js to create sample data');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.name === 'SequelizeConnectionRefusedError') {
      console.log('\n💡 Database connection failed. Make sure:');
      console.log('1. PostgreSQL is running');
      console.log('2. Backend environment is properly configured');
      console.log('3. Database credentials are correct');
    }
  } finally {
    await sequelize.close();
    process.exit();
  }
}

checkEventData();