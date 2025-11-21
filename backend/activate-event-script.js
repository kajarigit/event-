require('dotenv').config();
const { sequelize } = require('./src/config/database');

async function activateEvent() {
  try {
    await sequelize.authenticate();
    
    // Activate the Annual Tech Fest 2025 (the one with more data)
    const eventId = 'd91b251b-48db-4f22-8f09-15d1f8c7022b';
    
    const result = await sequelize.query(
      'UPDATE events SET "isActive" = true WHERE id = ?',
      { replacements: [eventId], type: sequelize.QueryTypes.UPDATE }
    );
    
    console.log('✅ Event activated:', eventId);
    console.log('Updated rows:', result[1]);
    
    // Verify the update
    const check = await sequelize.query(
      'SELECT name, "isActive" FROM events WHERE id = ?',
      { replacements: [eventId], type: sequelize.QueryTypes.SELECT }
    );
    
    console.log('Event status:', check[0]);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
    process.exit();
  }
}

activateEvent();