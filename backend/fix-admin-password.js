require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function updateAdminPassword() {
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

    // Hash the password properly
    console.log('🔐 Hashing password "Admin@123"...');
    const hashedPassword = await bcrypt.hash('Admin@123', 10);
    console.log('✅ Password hashed successfully');
    console.log('Hash:', hashedPassword.substring(0, 30) + '...\n');

    // Update admin password
    console.log('📝 Updating admin password...');
    await client.query(`
      UPDATE users 
      SET password = $1 
      WHERE email = 'admin@example.com';
    `, [hashedPassword]);
    console.log('✅ Admin password updated!\n');

    // Verify
    const result = await client.query(`
      SELECT password FROM users WHERE email = 'admin@example.com';
    `);
    
    const isMatch = await bcrypt.compare('Admin@123', result.rows[0].password);
    console.log('🔍 Verification:');
    console.log(`   Password "Admin@123": ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}`);

    if (isMatch) {
      console.log('\n🎉 Success! You can now login with:');
      console.log('   Email: admin@example.com');
      console.log('   Password: Admin@123');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

updateAdminPassword();
