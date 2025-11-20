require('dotenv').config();
const { sequelize } = require('./src/config/database');

async function checkRegNo() {
  try {
    await sequelize.authenticate();
    
    const [results] = await sequelize.query(`
      SELECT id, name, "regNo", email, role
      FROM users
      WHERE role = 'student'
      LIMIT 5
    `);

    console.log('Sample students:');
    console.log(JSON.stringify(results, null, 2));
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkRegNo();
