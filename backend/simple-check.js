require('dotenv').config();
const { sequelize } = require('./src/config/database');

async function simpleCheck() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');

    // Check stalls table
    const stallsResult = await sequelize.query('SELECT COUNT(*) as count FROM stalls WHERE "isActive" = true');
    console.log('Total active stalls:', stallsResult[0][0].count);

    // Check feedbacks table  
    const feedbacksResult = await sequelize.query('SELECT COUNT(*) as count FROM feedbacks');
    console.log('Total feedbacks:', feedbacksResult[0][0].count);

    // Check specific event from logs
    const eventId = 'd61239d5-c439-4f55-a489-e810b0a8de4d';
    const eventStalls = await sequelize.query('SELECT COUNT(*) as count FROM stalls WHERE "eventId" = ? AND "isActive" = true', {
      replacements: [eventId]
    });
    console.log('Stalls for event ' + eventId + ':', eventStalls[0][0].count);

    // Get sample stalls with their event IDs
    const sampleStalls = await sequelize.query('SELECT "eventId", name FROM stalls WHERE "isActive" = true LIMIT 5');
    console.log('\nSample stalls:');
    sampleStalls[0].forEach(stall => {
      console.log('- ' + stall.name + ' (Event: ' + stall.eventId + ')');
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
    process.exit();
  }
}

simpleCheck();