require('dotenv').config();
const { Client } = require('pg');
const jwt = require('jsonwebtoken');

async function checkQRData() {
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
      SELECT id, name, "isActive"
      FROM events
      WHERE "isActive" = true
      LIMIT 1;
    `);

    const activeEvent = eventResult.rows[0];
    console.log('📅 Active Event:');
    console.log(`   Name: ${activeEvent.name}`);
    console.log(`   ID: ${activeEvent.id}\n`);

    // Get stalls with QR tokens
    const stallsResult = await client.query(`
      SELECT id, name, "eventId", "qrToken"
      FROM stalls
      WHERE "eventId" = $1
      ORDER BY name;
    `, [activeEvent.id]);

    console.log(`🏪 Stalls in Active Event:\n`);

    for (const stall of stallsResult.rows) {
      console.log(`╔════════════════════════════════════════════════`);
      console.log(`║ Stall: ${stall.name}`);
      console.log(`╠════════════════════════════════════════════════`);
      console.log(`║ Stall ID: ${stall.id}`);
      console.log(`║ Event ID: ${stall.eventId}`);
      console.log(`║ Event Matches Active: ${stall.eventId === activeEvent.id ? '✅ YES' : '❌ NO'}`);
      
      if (stall.qrToken) {
        console.log(`║ QR Token exists: ✅ Yes`);
        console.log(`║ QR Token length: ${stall.qrToken.length} chars`);
        console.log(`║ QR Token (first 100): ${stall.qrToken.substring(0, 100)}...`);
        
        // Try to decode the JWT token
        try {
          const decoded = jwt.decode(stall.qrToken);
          console.log(`║`);
          console.log(`║ 🔍 DECODED QR TOKEN:`);
          console.log(`║    Type: ${decoded.type || 'N/A'}`);
          console.log(`║    Stall ID: ${decoded.stallId || 'N/A'}`);
          console.log(`║    Event ID: ${decoded.eventId || 'N/A'}`);
          console.log(`║    Event ID Matches: ${decoded.eventId === activeEvent.id ? '✅ YES' : '❌ NO - THIS IS THE PROBLEM!'}`);
          
          if (decoded.eventId !== activeEvent.id) {
            console.log(`║`);
            console.log(`║ ⚠️  WARNING: QR code has WRONG event ID!`);
            console.log(`║    Expected: ${activeEvent.id}`);
            console.log(`║    Got: ${decoded.eventId}`);
          }
        } catch (decodeError) {
          console.log(`║ ❌ Could not decode QR token: ${decodeError.message}`);
        }
      } else {
        console.log(`║ QR Token exists: ❌ NO - Need to generate!`);
      }
      
      console.log(`╚════════════════════════════════════════════════\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkQRData();
