require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function checkAdminPassword() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? {
      rejectUnauthorized: false
    } : false
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Get admin user
    const result = await client.query(`
      SELECT email, password, role, name 
      FROM users 
      WHERE email = 'admin@example.com'
      LIMIT 1;
    `);

    if (result.rows.length === 0) {
      console.log('❌ Admin user not found!');
      return;
    }

    const admin = result.rows[0];
    console.log('📧 Email:', admin.email);
    console.log('👤 Name:', admin.name);
    console.log('🔐 Role:', admin.role);
    console.log('🔑 Password Hash:', admin.password.substring(0, 30) + '...');
    console.log();

    // Test password
    const testPasswords = ['Admin@123', 'admin123', 'Admin123'];
    
    for (const pwd of testPasswords) {
      const isMatch = await bcrypt.compare(pwd, admin.password);
      console.log(`Testing "${pwd}": ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkAdminPassword();
