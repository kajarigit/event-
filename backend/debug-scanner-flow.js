require('dotenv').config();
const { Sequelize } = require('sequelize');
const { generateStallQR } = require('./src/utils/jwt');

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

async function debugScannerFlow() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    // Get stall 23 data
    const [stalls] = await sequelize.query(`
      SELECT * FROM stalls 
      WHERE name = 'stall 23'
      LIMIT 1
    `);

    const stall = stalls[0];
    console.log('📦 Stall from Database:');
    console.log(`- ID: ${stall.id}`);
    console.log(`- Name: ${stall.name}`);
    console.log(`- Event ID: ${stall.eventId}`);
    console.log('');

    // Generate QR code (what admin sees)
    const qrResult = await generateStallQR(stall.id, stall.eventId);
    const qrDataString = qrResult.qrData; // This goes in QR code
    
    console.log('📱 QR Code Data (what student scans):');
    console.log(qrDataString);
    console.log('');

    // Parse QR data (what scanner does)
    const scannedData = JSON.parse(qrDataString);
    console.log('🔍 Scanner parses QR and extracts:');
    console.log(`- stallId: ${scannedData.stallId}`);
    console.log(`- eventId: ${scannedData.eventId}`);
    console.log(`- type: ${scannedData.type}`);
    console.log('');

    // Get student's selected event
    const [events] = await sequelize.query(`
      SELECT * FROM events 
      WHERE name = 'Cultural Fest 2025'
      LIMIT 1
    `);

    const selectedEvent = events[0];
    console.log('🎭 Event selected by student:');
    console.log(`- ID: ${selectedEvent.id}`);
    console.log(`- Name: ${selectedEvent.name}`);
    console.log('');

    // Check if event IDs match
    const eventMatch = scannedData.eventId === selectedEvent.id;
    console.log('🔐 Validation Step 1: Event ID Match');
    console.log(`- QR eventId: ${scannedData.eventId}`);
    console.log(`- Selected eventId: ${selectedEvent.id}`);
    console.log(`- Match: ${eventMatch ? '✅ YES' : '❌ NO'}`);
    console.log('');

    if (!eventMatch) {
      console.log('❌ ERROR: Stall not found in this event!');
      console.log('This is what the student sees!');
      console.log('');
      return;
    }

    // Get all stalls for the selected event
    const [eventStalls] = await sequelize.query(`
      SELECT * FROM stalls 
      WHERE "eventId" = $1
    `, {
      bind: [selectedEvent.id]
    });

    console.log('🏪 Stalls in selected event (Cultural Fest 2025):');
    eventStalls.forEach((s, i) => {
      console.log(`${i + 1}. ${s.name} (${s.id})`);
    });
    console.log('');

    // Check if scanned stall is in the list
    const stallFound = eventStalls.find(s => s.id === scannedData.stallId);
    console.log('🔍 Validation Step 2: Stall in Event');
    console.log(`- Looking for stallId: ${scannedData.stallId}`);
    console.log(`- Found in event stalls: ${stallFound ? '✅ YES' : '❌ NO'}`);
    console.log('');

    if (!stallFound) {
      console.log('❌ ERROR: Stall not found in this event!');
      console.log('Even though event IDs match, stall is not in the stall list!');
      console.log('');
    } else {
      console.log('✅ SUCCESS! Stall found and validated!');
      console.log('Student can now submit feedback!');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

debugScannerFlow();
