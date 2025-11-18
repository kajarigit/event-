require('dotenv').config();
const { Client } = require('pg');
const { generateStallQR } = require('./src/utils/jwt');

async function regenerateStallQRCodes() {
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

    // Get active event
    const eventResult = await client.query(`
      SELECT id, name
      FROM events
      WHERE "isActive" = true
      LIMIT 1;
    `);

    if (eventResult.rows.length === 0) {
      console.log('❌ No active event found!');
      return;
    }

    const activeEvent = eventResult.rows[0];
    console.log(`📅 Active Event: ${activeEvent.name}`);
    console.log(`   ID: ${activeEvent.id}\n`);

    // Get all stalls in the active event
    const stallsResult = await client.query(`
      SELECT id, name, "eventId"
      FROM stalls
      WHERE "eventId" = $1
      ORDER BY name;
    `, [activeEvent.id]);

    console.log(`🏪 Found ${stallsResult.rows.length} stalls to regenerate QR codes\n`);

    for (const stall of stallsResult.rows) {
      console.log(`🔄 Regenerating QR for: ${stall.name}`);
      console.log(`   Stall ID: ${stall.id}`);
      console.log(`   Event ID: ${stall.eventId}`);

      // Generate new QR code
      const qrResult = await generateStallQR(stall.id, stall.eventId);
      
      // Update stall with new QR TOKEN (JWT, not the image!)
      // The qrResult contains: { token: 'JWT...', qrData: '{"stallId":...}', qrImage: 'data:image...' }
      // We need to save the TOKEN (JWT) to database, not the image
      await client.query(`
        UPDATE stalls
        SET "qrToken" = $1
        WHERE id = $2;
      `, [qrResult.token, stall.id]);

      console.log(`   ✅ QR Code regenerated successfully`);
      console.log(`   QR Data contains:`);
      console.log(`      - stallId: ${stall.id}`);
      console.log(`      - eventId: ${stall.eventId}`);
      console.log(`      - type: stall\n`);
    }

    console.log(`\n🎉 All ${stallsResult.rows.length} QR codes regenerated successfully!`);
    console.log('\n💡 Next Steps:');
    console.log('   1. Go to admin dashboard');
    console.log('   2. View each stall to see the new QR code');
    console.log('   3. Print/display the new QR codes');
    console.log('   4. Students can now scan and submit feedback!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await client.end();
  }
}

regenerateStallQRCodes();
