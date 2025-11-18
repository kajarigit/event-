require('dotenv').config();
const { generateStallQR } = require('./src/utils/jwt');

async function verifyQRFormatMatch() {
  console.log('🔍 VERIFYING QR FORMAT MATCH\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  const stallId = '7f3e2cff-7c36-4fbb-85a5-2a0737f3ef60';
  const eventId = 'd61239d5-c439-4f55-a489-e810b0a8de4d';

  console.log('📋 Input Data:');
  console.log(`   Stall ID: ${stallId}`);
  console.log(`   Event ID: ${eventId}`);
  console.log('');

  // Generate QR code
  const qrResult = await generateStallQR(stallId, eventId);

  console.log('═══════════════════════════════════════════════════════════');
  console.log('📤 WHAT BACKEND GENERATES (in QR code):');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('Raw JSON string that goes into QR image:');
  console.log(qrResult.qrData);
  console.log('');

  // Parse to show structure
  const generated = JSON.parse(qrResult.qrData);
  console.log('Parsed structure:');
  console.log('├─ stallId:', generated.stallId);
  console.log('├─ eventId:', generated.eventId);
  console.log('├─ type:', generated.type);
  console.log('└─ token:', generated.token.substring(0, 50) + '...');
  console.log('');

  console.log('═══════════════════════════════════════════════════════════');
  console.log('📥 WHAT FRONTEND SCANNER EXPECTS:');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('Required fields:');
  console.log('├─ stallId: string (UUID)');
  console.log('├─ eventId: string (UUID)');
  console.log('├─ type: string (must be "stall")');
  console.log('└─ token: string (JWT, optional)');
  console.log('');

  console.log('Validation checks:');
  console.log('1. JSON.parse(decodedText) must succeed');
  console.log('2. type === "stall"');
  console.log('3. eventId === selectedEvent (from student UI)');
  console.log('4. stallId must exist in stalls list');
  console.log('');

  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ VERIFICATION RESULTS:');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Check if generated data matches expected format
  const checks = [
    {
      name: 'Has stallId field',
      result: !!generated.stallId,
      value: generated.stallId
    },
    {
      name: 'stallId is valid UUID format',
      result: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(generated.stallId),
      value: generated.stallId
    },
    {
      name: 'Has eventId field',
      result: !!generated.eventId,
      value: generated.eventId
    },
    {
      name: 'eventId is valid UUID format',
      result: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(generated.eventId),
      value: generated.eventId
    },
    {
      name: 'Has type field',
      result: !!generated.type,
      value: generated.type
    },
    {
      name: 'type === "stall"',
      result: generated.type === 'stall',
      value: generated.type
    },
    {
      name: 'Has token field',
      result: !!generated.token,
      value: 'JWT token (336 chars)'
    },
    {
      name: 'JSON is parseable',
      result: true,
      value: 'Successfully parsed'
    }
  ];

  checks.forEach(check => {
    const icon = check.result ? '✅' : '❌';
    console.log(`${icon} ${check.name}`);
    if (!check.result) {
      console.log(`   Expected: true, Got: ${check.result}`);
      console.log(`   Value: ${check.value}`);
    }
  });

  const allPassed = checks.every(c => c.result);
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  if (allPassed) {
    console.log('🎉 PERFECT MATCH! QR format is correct!');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log('📱 Scanner Flow:');
    console.log('1. Student scans QR code');
    console.log('2. Scanner extracts:', qrResult.qrData);
    console.log('3. Frontend parses JSON ✅');
    console.log('4. Extracts stallId:', generated.stallId);
    console.log('5. Extracts eventId:', generated.eventId);
    console.log('6. Validates type === "stall" ✅');
    console.log('7. Checks eventId matches selected event');
    console.log('8. Finds stall in list');
    console.log('9. Shows feedback form ✅');
    console.log('');
    
    console.log('⚠️  IMPORTANT:');
    console.log('The QR code format is CORRECT.');
    console.log('If scanning fails, the issue is:');
    console.log('');
    console.log('Option 1: OLD QR CODE');
    console.log('  - You are scanning an old printed QR code');
    console.log('  - That QR has wrong eventId from previous event');
    console.log('  - Solution: Download NEW QR from admin dashboard');
    console.log('');
    console.log('Option 2: WRONG EVENT SELECTED');
    console.log('  - Student selected wrong event in dropdown');
    console.log('  - eventId in QR != selectedEvent in UI');
    console.log('  - Solution: Select "Cultural Fest 2025"');
    console.log('');
    console.log('Option 3: STALL NOT IN EVENT');
    console.log('  - Stall was moved to different event');
    console.log('  - Frontend can\'t find stallId in stalls list');
    console.log('  - Solution: Check stall\'s eventId in database');
    
  } else {
    console.log('❌ FORMAT MISMATCH! Need to fix QR generation!');
    console.log('═══════════════════════════════════════════════════════════\n');
  }
}

verifyQRFormatMatch().catch(console.error);
