require('dotenv').config();
const { sequelize } = require('./src/config/database');

async function checkAllEvents() {
  try {
    await sequelize.authenticate();
    console.log('Checking data for all events...');

    const events = await sequelize.query(
      'SELECT id, name, "isActive" FROM events ORDER BY "createdAt" DESC',
      { type: sequelize.QueryTypes.SELECT }
    );

    console.log('Found', events.length, 'events\n');

    for (const event of events) {
      const stallsResult = await sequelize.query(
        'SELECT COUNT(*) as count FROM stalls WHERE "eventId" = ? AND "isActive" = true',
        { replacements: [event.id], type: sequelize.QueryTypes.SELECT }
      );
      
      const feedbacksResult = await sequelize.query(
        'SELECT COUNT(*) as count FROM feedbacks WHERE "eventId" = ?',
        { replacements: [event.id], type: sequelize.QueryTypes.SELECT }
      );
      
      console.log(`Event: ${event.name || 'No Name'}`);
      console.log(`  ID: ${event.id}`);
      console.log(`  Active: ${event.isActive}`);
      console.log(`  Stalls: ${stallsResult[0].count}`);
      console.log(`  Feedbacks: ${feedbacksResult[0].count}`);
      
      if (stallsResult[0].count > 0) {
        console.log('  ✅ HAS DATA');
      }
      console.log('---');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
    process.exit();
  }
}

checkAllEvents();