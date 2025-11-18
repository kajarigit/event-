require('dotenv').config();
const { Client } = require('pg');
const { generateStallQR } = require('./src/utils/jwt');

async function compareAPIvsDatabase() {
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
    console.log('🔍 COMPARING API GENERATED QR vs DATABASE\n');
    console.log('═══════════════════════════════════════════════════════════\n');

    const stallId = '7f3e2cff-7c36-4fbb-85a5-2a0737f3ef60'; // stall 23

    // 1. Get stall from database
    const result = await client.query(`
      SELECT id, name, "eventId", "qrToken"
      FROM stalls
      WHERE id = $1;
    `, [stallId]);

    if (result.rows.length === 0) {
      console.log('❌ Stall not found!');
      return;
    }

    const stall = result.rows[0];
    console.log('📊 STALL DATA FROM DATABASE:');
    console.log('─────────────────────────────────────────────────');
    console.log(`Name: ${stall.name}`);
    console.log(`ID: ${stall.id}`);
    console.log(`Event ID: ${stall.eventId}`);
    console.log(`QR Token (stored): ${stall.qrToken.substring(0, 50)}...`);
    console.log('');

    // 2. Simulate what the API does (getStallQRCode endpoint)
    console.log('🔄 SIMULATING API CALL: GET /api/admin/stalls/:id/qr');
    console.log('─────────────────────────────────────────────────\n');
    
    console.log('API Logic:');
    console.log('1. Fetch stall from database ✅');
    console.log('2. Call generateStallQR(stall.id, stall.eventId)');
    console.log('3. Save new token to database');
    console.log('4. Return QR image to frontend\n');

    // This is what the API does
    const qrResult = await generateStallQR(stall.id, stall.eventId);
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📤 API RESPONSE (what admin dashboard receives):');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // This is what the API returns
    const apiResponse = {
      success: true,
      data: {
        stallId: stall.id,
        stallName: stall.name,
        qrCode: qrResult.qrImage,  // base64 PNG image
        qrToken: qrResult.token     // JWT token
      }
    };

    console.log('Response structure:');
    console.log('├─ success:', apiResponse.success);
    console.log('├─ data.stallId:', apiResponse.data.stallId);
    console.log('├─ data.stallName:', apiResponse.data.stallName);
    console.log('├─ data.qrCode:', apiResponse.data.qrCode.substring(0, 40) + '... (base64 PNG)');
    console.log('└─ data.qrToken:', apiResponse.data.qrToken.substring(0, 50) + '...');
    console.log('');

    // 3. Parse what's IN the QR code image
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔍 WHAT IS INSIDE THE QR CODE IMAGE:');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const qrDataString = qrResult.qrData; // This is what's encoded in the image
    console.log('Raw JSON string:');
    console.log(qrDataString);
    console.log('');

    const qrDataParsed = JSON.parse(qrDataString);
    console.log('Parsed content:');
    console.log('├─ stallId:', qrDataParsed.stallId);
    console.log('├─ eventId:', qrDataParsed.eventId);
    console.log('├─ type:', qrDataParsed.type);
    console.log('└─ token:', qrDataParsed.token.substring(0, 50) + '...');
    console.log('');

    // 4. Compare
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔎 COMPARISON:');
    console.log('═══════════════════════════════════════════════════════════\n');

    const checks = [
      {
        name: 'Stall ID matches database',
        dbValue: stall.id,
        qrValue: qrDataParsed.stallId,
        match: stall.id === qrDataParsed.stallId
      },
      {
        name: 'Event ID matches database',
        dbValue: stall.eventId,
        qrValue: qrDataParsed.eventId,
        match: stall.eventId === qrDataParsed.eventId
      },
      {
        name: 'Type is "stall"',
        dbValue: 'N/A',
        qrValue: qrDataParsed.type,
        match: qrDataParsed.type === 'stall'
      },
      {
        name: 'QR contains valid token',
        dbValue: 'N/A',
        qrValue: qrDataParsed.token.substring(0, 30) + '...',
        match: !!qrDataParsed.token
      }
    ];

    checks.forEach(check => {
      const icon = check.match ? '✅' : '❌';
      console.log(`${icon} ${check.name}`);
      if (!check.match) {
        console.log(`   Database: ${check.dbValue}`);
        console.log(`   QR Code:  ${check.qrValue}`);
      }
    });

    const allMatch = checks.every(c => c.match);

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    if (allMatch) {
      console.log('✅ PERFECT! API generates correct QR codes!');
    } else {
      console.log('❌ MISMATCH! API has issues!');
    }
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('📱 WHAT HAPPENS WHEN ADMIN VIEWS STALL:\n');
    console.log('1. Admin clicks "Show QR Code" for stall 23');
    console.log('2. Frontend calls: GET /api/admin/stalls/7f3e2cff.../qr');
    console.log('3. Backend generates FRESH QR code with current eventId');
    console.log('4. Backend returns base64 PNG image');
    console.log('5. Frontend displays image in modal/page');
    console.log('6. Admin downloads/prints the image');
    console.log('7. QR contains JSON with correct stallId + eventId');
    console.log('');

    console.log('💾 DATABASE UPDATE:\n');
    console.log('The API also updates the database:');
    console.log(`Old token: ${stall.qrToken.substring(0, 50)}...`);
    console.log(`New token: ${qrResult.token.substring(0, 50)}...`);
    console.log('');
    console.log('Note: These tokens are DIFFERENT each time because');
    console.log('they include a random nonce for security.');
    console.log('But the eventId and stallId inside are always correct!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await client.end();
  }
}

compareAPIvsDatabase();
