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
    logging: console.log,
  }
);

async function fixOrphanedScans() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    console.log('🧹 Fixing orphaned scan logs...\n');

    // Step 1: Find orphaned scan logs
    const [orphanedScans] = await sequelize.query(`
      SELECT 
        sl.id,
        sl."scannedBy",
        sl."scannedByType",
        sl."createdAt"
      FROM scan_logs sl
      LEFT JOIN volunteers v ON sl."scannedByType" = 'volunteer' AND sl."scannedBy" = v.id
      LEFT JOIN users u ON sl."scannedByType" = 'user' AND sl."scannedBy" = u.id
      WHERE (
        (sl."scannedByType" = 'volunteer' AND v.id IS NULL) OR
        (sl."scannedByType" = 'user' AND u.id IS NULL)
      )
      ORDER BY sl."createdAt"
    `);

    console.log(`📋 Found ${orphanedScans.length} orphaned scan logs:`);
    orphanedScans.forEach((log, index) => {
      console.log(`  ${index + 1}. ${log.id} - ${log.scannedByType} scanner (${log.scannedBy}) - ${log.createdAt}`);
    });
    console.log();

    if (orphanedScans.length > 0) {
      // Option 1: Delete orphaned scan logs
      console.log('🗑️  Deleting orphaned scan logs...');
      
      const orphanedIds = orphanedScans.map(log => `'${log.id}'`).join(',');
      const [deletedLogs] = await sequelize.query(`
        DELETE FROM scan_logs 
        WHERE id IN (${orphanedIds})
        RETURNING id, "scannedBy", "scannedByType"
      `);

      console.log(`✅ Deleted ${deletedLogs.length} orphaned scan logs`);
      deletedLogs.forEach((deleted, index) => {
        console.log(`  ${index + 1}. Deleted: ${deleted.id} (${deleted.scannedByType} - ${deleted.scannedBy})`);
      });
    }

    // Step 2: Verify cleanup
    console.log('\n🔍 Verifying cleanup...');
    
    const [remainingOrphans] = await sequelize.query(`
      SELECT 
        sl.id,
        sl."scannedBy",
        sl."scannedByType"
      FROM scan_logs sl
      LEFT JOIN volunteers v ON sl."scannedByType" = 'volunteer' AND sl."scannedBy" = v.id
      LEFT JOIN users u ON sl."scannedByType" = 'user' AND sl."scannedBy" = u.id
      WHERE (
        (sl."scannedByType" = 'volunteer' AND v.id IS NULL) OR
        (sl."scannedByType" = 'user' AND u.id IS NULL)
      )
    `);

    if (remainingOrphans.length === 0) {
      console.log('✅ No orphaned scan logs remaining');
    } else {
      console.log(`⚠️  ${remainingOrphans.length} orphaned scan logs still exist`);
    }

    // Step 3: Show current scan log status
    const [scanLogStatus] = await sequelize.query(`
      SELECT 
        sl."scannedByType",
        COUNT(*) as count,
        COUNT(CASE WHEN sl."scannedByType" = 'volunteer' AND v.id IS NOT NULL THEN 1 END) as valid_volunteers,
        COUNT(CASE WHEN sl."scannedByType" = 'user' AND u.id IS NOT NULL THEN 1 END) as valid_users
      FROM scan_logs sl
      LEFT JOIN volunteers v ON sl."scannedByType" = 'volunteer' AND sl."scannedBy" = v.id
      LEFT JOIN users u ON sl."scannedByType" = 'user' AND sl."scannedBy" = u.id
      GROUP BY sl."scannedByType"
      ORDER BY sl."scannedByType"
    `);

    console.log('\n📊 Current scan log status:');
    scanLogStatus.forEach(status => {
      const validCount = status.scannedByType === 'volunteer' ? status.valid_volunteers : status.valid_users;
      console.log(`  - ${status.scannedByType}: ${status.count} total, ${validCount} valid`);
    });

    console.log('\n✅ Orphaned scan log cleanup completed!');

  } catch (error) {
    console.error('❌ Error fixing orphaned scans:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  fixOrphanedScans();
}

module.exports = fixOrphanedScans;