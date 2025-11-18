require('dotenv').config();
const { Client } = require('pg');
const QRCode = require('qrcode');
const jwt = require('jsonwebtoken');

async function decodeQRFromImage() {
  console.log('🔍 Checking what is actually stored in database...\n');

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

    const result = await client.query(`
      SELECT id, name, "qrToken", "eventId"
      FROM stalls
      WHERE name = 'stall 23'
      LIMIT 1;
    `);

    if (result.rows.length === 0) {
      console.log('❌ Stall 23 not found!');
      return;
    }

    const stall = result.rows[0];
    console.log('🏪 Stall 23 Database Data:');
    console.log('─────────────────────────────────────────────────');
    console.log(`Name: ${stall.name}`);
    console.log(`ID: ${stall.id}`);
    console.log(`Event ID: ${stall.eventId}`);
    console.log(`\nQR Token (in database):`);
    console.log(`Type: ${stall.qrToken.startsWith('data:image') ? '❌ IMAGE (WRONG!)' : '✅ JWT (CORRECT!)'}`);
    console.log(`Length: ${stall.qrToken.length} chars`);
    console.log(`First 100 chars: ${stall.qrToken.substring(0, 100)}\n`);

    if (!stall.qrToken.startsWith('data:image')) {
      // It's a JWT token - decode it
      try {
        const decoded = jwt.decode(stall.qrToken);
        console.log('🔓 Decoded JWT Token:');
        console.log(`   stallId: ${decoded.stallId}`);
        console.log(`   eventId: ${decoded.eventId}`);
        console.log(`   type: ${decoded.type}`);
        console.log(`   Event ID matches database: ${decoded.eventId === stall.eventId ? '✅ YES' : '❌ NO'}`);
      } catch (e) {
        console.log('❌ Failed to decode JWT:', e.message);
      }
    } else {
      console.log('⚠️  WARNING: Database contains IMAGE instead of JWT token!');
      console.log('   This is wrong - should be a JWT token.');
    }

    console.log('\n\n📱 IMPORTANT:');
    console.log('The database only stores the JWT TOKEN for verification.');
    console.log('The QR CODE IMAGE is generated fresh each time by the API.');
    console.log('\nTo get the correct QR code:');
    console.log('1. Go to admin dashboard on Render');
    console.log('2. View stall 23');
    console.log('3. Click "Show QR Code" or similar button');
    console.log('4. The API will generate a FRESH QR code with current data');
    console.log('5. Download and print that NEW QR code');
    console.log('\n⚠️  DO NOT use old QR codes - they have wrong event IDs!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

decodeQRFromImage();
