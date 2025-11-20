const { ScanLog, User, Volunteer, Event } = require('./src/models/index.sequelize');

async function debugVolunteerScans() {
  try {
    console.log('=== Debugging Volunteer Recent Scans ===\n');
    
    // Check total scan logs
    const scanCount = await ScanLog.count();
    console.log(`📊 Total scan logs: ${scanCount}`);
    
    // Check volunteer scans
    const volunteerScans = await ScanLog.count({ where: { scannedByType: 'volunteer' } });
    console.log(`👥 Volunteer scans: ${volunteerScans}`);
    
    // Check total volunteers
    const volunteers = await Volunteer.count();
    console.log(`🤝 Total volunteers: ${volunteers}\n`);
    
    // Get sample volunteer
    const sampleVolunteer = await Volunteer.findOne();
    if (sampleVolunteer) {
      console.log(`📋 Sample volunteer: ${sampleVolunteer.name} (ID: ${sampleVolunteer.id})\n`);
      
      // Get scans by this volunteer
      const volunteerScanLogs = await ScanLog.findAll({
        where: { 
          scannedBy: sampleVolunteer.id,
          scannedByType: 'volunteer'
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'rollNumber', 'department'],
          },
          {
            model: Event,
            as: 'event',
            attributes: ['id', 'name'],
          },
        ],
        order: [['scanTime', 'DESC']],
        limit: 5
      });
      
      console.log(`🔍 Recent scans by ${sampleVolunteer.name}: ${volunteerScanLogs.length} found`);
      
      if (volunteerScanLogs.length > 0) {
        volunteerScanLogs.forEach((scan, index) => {
          console.log(`\n${index + 1}. Scan ID: ${scan.id}`);
          console.log(`   Type: ${scan.scanType}`);
          console.log(`   Time: ${scan.scanTime}`);
          console.log(`   Gate: ${scan.gate}`);
          console.log(`   Student: ${scan.user?.name || 'N/A'}`);
          console.log(`   Roll: ${scan.user?.rollNumber || 'N/A'}`);
          console.log(`   Event: ${scan.event?.name || 'N/A'}`);
        });
      } else {
        console.log('❌ No scans found for this volunteer');
      }
    } else {
      console.log('❌ No volunteers found in database');
    }
    
    // Check all scans (regardless of type)
    console.log('\n=== All Recent Scans ===');
    const allScans = await ScanLog.findAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'rollNumber'],
        }
      ],
      order: [['scanTime', 'DESC']],
      limit: 3
    });
    
    console.log(`📋 Recent scans (any type): ${allScans.length} found`);
    allScans.forEach((scan, index) => {
      console.log(`\n${index + 1}. Scan by: ${scan.scannedByType || 'unknown'} (${scan.scannedBy})`);
      console.log(`   Student: ${scan.user?.name || 'N/A'} (${scan.user?.rollNumber || 'N/A'})`);
      console.log(`   Type: ${scan.scanType}`);
      console.log(`   Time: ${scan.scanTime}`);
    });
    
  } catch (error) {
    console.error('❌ Error debugging volunteer scans:', error);
  }
  
  process.exit(0);
}

debugVolunteerScans();