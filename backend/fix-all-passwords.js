require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function fixAllPasswords() {
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

    // Fix passwords
    const passwordUpdates = [
      { role: 'admin', password: 'Admin@123' },
      { role: 'volunteer', password: 'Volunteer@123' },
      { role: 'student', password: 'Student@123' }
    ];

    for (const update of passwordUpdates) {
      console.log(`🔐 Hashing password for ${update.role}s...`);
      const hashedPassword = await bcrypt.hash(update.password, 10);
      
      const result = await client.query(`
        UPDATE users 
        SET password = $1 
        WHERE role = $2
        RETURNING email;
      `, [hashedPassword, update.role]);
      
      console.log(`✅ Updated ${result.rowCount} ${update.role}(s)`);
      result.rows.forEach(row => {
        console.log(`   - ${row.email}`);
      });
      console.log();
    }

    console.log('🎉 All passwords updated successfully!\n');
    console.log('📋 Login Credentials:');
    console.log('==================');
    console.log('Admin:');
    console.log('  Email: admin@example.com');
    console.log('  Password: Admin@123\n');
    console.log('Volunteer:');
    console.log('  Email: volunteer@example.com');
    console.log('  Password: Volunteer@123\n');
    console.log('Students:');
    console.log('  Email: student1@example.com to student20@example.com');
    console.log('  Password: Student@123');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

fixAllPasswords();
