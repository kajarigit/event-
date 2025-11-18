require('dotenv').config();
const { Sequelize } = require('sequelize');

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

async function checkCulturalEventStalls() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    // Get Cultural Fest 2025 event
    const [events] = await sequelize.query(`
      SELECT * FROM events 
      WHERE name = 'Cultural Fest 2025'
      LIMIT 1
    `);

    if (events.length === 0) {
      console.log('❌ Cultural Fest 2025 not found!');
      
      // Show all events
      const [allEvents] = await sequelize.query(`SELECT * FROM events ORDER BY "createdAt" DESC`);
      console.log('\n📅 Available Events:');
      allEvents.forEach((event, idx) => {
        console.log(`${idx + 1}. ${event.name} (${event.id}) - Active: ${event.isActive}`);
      });
      return;
    }

    const culturalEvent = events[0];
    console.log('🎭 Cultural Fest 2025 Event:');
    console.log(`   ID: ${culturalEvent.id}`);
    console.log(`   Name: ${culturalEvent.name}`);
    console.log(`   Active: ${culturalEvent.isActive}`);
    console.log('');

    // Get all stalls for this event
    const [stalls] = await sequelize.query(`
      SELECT * FROM stalls 
      WHERE "eventId" = $1
      ORDER BY name
    `, {
      bind: [culturalEvent.id]
    });

    console.log(`🏪 Stalls in Cultural Fest 2025: (${stalls.length} total)\n`);
    console.log('='.repeat(100));

    if (stalls.length === 0) {
      console.log('❌ NO STALLS FOUND IN THIS EVENT!');
      console.log('\nThis is why students get "stall not found" error!');
      console.log('The stalls array is empty when the frontend tries to find the scanned stall.\n');
      
      // Check all stalls in database
      const [allStalls] = await sequelize.query(`SELECT * FROM stalls ORDER BY "createdAt" DESC`);
      console.log(`\n📦 All Stalls in Database: (${allStalls.length} total)\n`);
      allStalls.forEach((stall, idx) => {
        console.log(`${idx + 1}. ${stall.name}`);
        console.log(`   ID: ${stall.id}`);
        console.log(`   Event ID: ${stall.eventId}`);
        console.log(`   Department: ${stall.department}`);
        console.log(`   Match Cultural Event: ${stall.eventId === culturalEvent.id ? '✅ YES' : '❌ NO'}`);
        console.log('');
      });
    } else {
      stalls.forEach((stall, idx) => {
        console.log(`${idx + 1}. ${stall.name}`);
        console.log(`   Stall ID: ${stall.id}`);
        console.log(`   Event ID: ${stall.eventId}`);
        console.log(`   Department: ${stall.department}`);
        console.log(`   Description: ${stall.description || 'N/A'}`);
        console.log(`   Created: ${new Date(stall.createdAt).toLocaleString()}`);
        console.log('-'.repeat(100));
      });

      console.log('\n✅ These are the stalls that should appear in the frontend dropdown!');
      console.log(`✅ When student scans QR, the stall ID should match one of these ${stalls.length} stalls.`);
    }

    // Check what API would return
    console.log('\n\n📡 Testing Student API Endpoint (GET /api/student/stalls?eventId=...)');
    console.log('='.repeat(100));
    console.log(`Endpoint: GET /api/student/stalls?eventId=${culturalEvent.id}`);
    console.log(`Expected Response: Array of ${stalls.length} stalls`);
    console.log('');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

checkCulturalEventStalls();
