require('dotenv').config();
const { Client } = require('pg');

async function fixEvents() {
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

    // Get the Annual Tech Fest event (the one with most stalls)
    const techFestResult = await client.query(`
      SELECT id, name, "isActive" 
      FROM events 
      WHERE name = 'Annual Tech Fest 2025';
    `);

    if (techFestResult.rows.length > 0) {
      const techFest = techFestResult.rows[0];
      console.log(`📅 Found: ${techFest.name}`);
      console.log(`   ID: ${techFest.id}`);
      console.log(`   Currently Active: ${techFest.isActive ? '✅ Yes' : '❌ No'}\n`);

      if (!techFest.isActive) {
        console.log('🔧 Activating Annual Tech Fest 2025...');
        
        // Deactivate all other events
        await client.query(`UPDATE events SET "isActive" = false;`);
        console.log('  ✓ Deactivated all events');
        
        // Activate the Tech Fest
        await client.query(`
          UPDATE events 
          SET "isActive" = true 
          WHERE id = $1;
        `, [techFest.id]);
        console.log('  ✓ Activated Annual Tech Fest 2025\n');

        console.log('✅ Success! Annual Tech Fest 2025 is now the active event');
        console.log('\n📊 Event Status:');
        
        const allEvents = await client.query(`
          SELECT name, "isActive", 
          (SELECT COUNT(*) FROM stalls WHERE "eventId" = events.id) as stall_count
          FROM events;
        `);
        
        allEvents.rows.forEach(event => {
          console.log(`  ${event.isActive ? '✅' : '❌'} ${event.name} (${event.stall_count} stalls)`);
        });
      } else {
        console.log('ℹ️  Event is already active');
      }
    } else {
      console.log('❌ Annual Tech Fest 2025 not found');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

fixEvents();
