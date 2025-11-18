require('dotenv').config();
const { Sequelize } = require('sequelize');
const jwt = require('jsonwebtoken');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
    logging: false,
  }
);

async function compareStallQRTokens() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    // Get Cultural Fest 2025 event
    const [events] = await sequelize.query(`
      SELECT * FROM events 
      WHERE name = 'Cultural Fest 2025'
      LIMIT 1
    `);

    const culturalEvent = events[0];
    console.log('🎭 Cultural Fest 2025 Event ID:', culturalEvent.id);
    console.log('');

    // Get stall 22 and stall 23
    const [stalls] = await sequelize.query(`
      SELECT * FROM stalls 
      WHERE name IN ('stall 22', 'stall 23')
      ORDER BY name
    `);

    console.log('=' .repeat(100));
    console.log('COMPARING STALL 22 vs STALL 23 QR TOKENS');
    console.log('='.repeat(100));
    console.log('');

    for (const stall of stalls) {
      console.log(`📦 ${stall.name.toUpperCase()}:`);
      console.log(`   Stall ID: ${stall.id}`);
      console.log(`   Event ID in DB: ${stall.eventId}`);
      console.log(`   Event ID Match: ${stall.eventId === culturalEvent.id ? '✅ CORRECT' : '❌ WRONG'}`);
      console.log('');

      if (stall.qrToken) {
        try {
          // Decode JWT without verification to see the payload
          const decoded = jwt.decode(stall.qrToken);
          
          console.log(`   📱 QR Token (JWT) Payload:`);
          console.log(`      stallId: ${decoded.stallId}`);
          console.log(`      eventId: ${decoded.eventId}`);
          console.log(`      type: ${decoded.type}`);
          console.log('');

          console.log(`   🔍 Validation:`);
          console.log(`      JWT stallId matches DB: ${decoded.stallId === stall.id ? '✅' : '❌'}`);
          console.log(`      JWT eventId matches DB: ${decoded.eventId === stall.eventId ? '✅' : '❌'}`);
          console.log(`      JWT eventId matches Cultural Fest: ${decoded.eventId === culturalEvent.id ? '✅' : '❌'}`);
          console.log(`      Type is 'stall': ${decoded.type === 'stall' ? '✅' : '❌'}`);
          console.log('');

          if (decoded.eventId !== culturalEvent.id) {
            // Try to find which event this QR belongs to
            const [qrEvent] = await sequelize.query(`
              SELECT * FROM events WHERE id = $1 LIMIT 1
            `, { bind: [decoded.eventId] });

            if (qrEvent.length > 0) {
              console.log(`   ⚠️  QR CODE IS FOR: "${qrEvent[0].name}" (${qrEvent[0].id})`);
              console.log(`   ⚠️  SHOULD BE FOR: "Cultural Fest 2025" (${culturalEvent.id})`);
              console.log(`   ❌ THIS IS WHY IT FAILS!`);
            } else {
              console.log(`   ❌ QR code has event ID that doesn't exist in database!`);
            }
            console.log('');
          }

        } catch (err) {
          console.log(`   ❌ Error decoding JWT: ${err.message}`);
          console.log('');
        }
      } else {
        console.log(`   ❌ NO QR TOKEN IN DATABASE!`);
        console.log('');
      }

      console.log('-'.repeat(100));
      console.log('');
    }

    console.log('\n📊 SUMMARY:');
    console.log('If stall 22 works but stall 23 gives "different event" error:');
    console.log('- Stall 22 QR has correct event ID');
    console.log('- Stall 23 QR has WRONG event ID (probably old event)');
    console.log('');
    console.log('SOLUTION: Regenerate QR token for stall 23!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

compareStallQRTokens();
