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

async function migrateScanLogsStructure() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    console.log('📋 Migrating scan_logs table structure...\n');

    // Step 1: Check if the table exists
    const [tableExists] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'scan_logs'
    `);

    if (tableExists.length === 0) {
      console.log('❌ scan_logs table not found!');
      await sequelize.close();
      return;
    }

    // Step 2: Check current columns
    const [currentColumns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'scan_logs'
      ORDER BY column_name
    `);

    console.log('📋 Current scan_logs columns:');
    currentColumns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });
    console.log();

    // Step 3: Check if scannedByType column already exists
    const scannedByTypeExists = currentColumns.some(col => col.column_name === 'scannedByType');

    if (!scannedByTypeExists) {
      console.log('📝 Adding scannedByType column...');
      
      // Create the enum type first
      await sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE scanner_type_enum AS ENUM ('user', 'volunteer');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      // Add the scannedByType column
      await sequelize.query(`
        ALTER TABLE scan_logs 
        ADD COLUMN "scannedByType" scanner_type_enum DEFAULT 'volunteer'
      `);
      
      console.log('✅ Added scannedByType column');
    } else {
      console.log('ℹ️  scannedByType column already exists');
    }

    // Step 4: Remove foreign key constraint on scannedBy if it exists
    console.log('📝 Checking foreign key constraints on scannedBy...');
    
    const [fkConstraints] = await sequelize.query(`
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'scan_logs'
        AND kcu.column_name = 'scannedBy'
    `);

    if (fkConstraints.length > 0) {
      console.log('📝 Dropping foreign key constraint on scannedBy...');
      const constraintName = fkConstraints[0].constraint_name;
      await sequelize.query(`
        ALTER TABLE scan_logs 
        DROP CONSTRAINT "${constraintName}"
      `);
      console.log(`✅ Dropped constraint: ${constraintName}`);
    } else {
      console.log('ℹ️  No foreign key constraint found on scannedBy column');
    }

    // Step 5: Update existing scan logs to set proper scannedByType
    console.log('📝 Updating existing scan logs...');
    
    // Get all scan logs with scannedBy values
    const [existingScans] = await sequelize.query(`
      SELECT id, "scannedBy", "scannedByType"
      FROM scan_logs 
      WHERE "scannedBy" IS NOT NULL
    `);

    if (existingScans.length > 0) {
      console.log(`📊 Found ${existingScans.length} scan logs with scannedBy values`);
      
      // Check which scannedBy values exist in users table vs volunteers table
      let userScanners = 0;
      let volunteerScanners = 0;
      let unknownScanners = 0;

      for (const scan of existingScans) {
        // Check if scannedBy exists in users table
        const [userExists] = await sequelize.query(`
          SELECT id FROM users WHERE id = :scannedBy AND role != 'volunteer'
        `, {
          replacements: { scannedBy: scan.scannedBy }
        });

        // Check if scannedBy exists in volunteers table
        const [volunteerExists] = await sequelize.query(`
          SELECT id FROM volunteers WHERE id = :scannedBy
        `, {
          replacements: { scannedBy: scan.scannedBy }
        });

        let newType = null;
        if (userExists.length > 0) {
          newType = 'user';
          userScanners++;
        } else if (volunteerExists.length > 0) {
          newType = 'volunteer';
          volunteerScanners++;
        } else {
          // Default to volunteer for unknown IDs (safer assumption)
          newType = 'volunteer';
          unknownScanners++;
        }

        // Update the scan log
        await sequelize.query(`
          UPDATE scan_logs 
          SET "scannedByType" = :newType
          WHERE id = :scanId
        `, {
          replacements: { newType, scanId: scan.id }
        });
      }

      console.log('📊 Updated scan logs:');
      console.log(`  - User scanners: ${userScanners}`);
      console.log(`  - Volunteer scanners: ${volunteerScanners}`);
      console.log(`  - Unknown scanners (defaulted to volunteer): ${unknownScanners}`);
    } else {
      console.log('ℹ️  No existing scan logs with scannedBy values found');
    }

    // Step 6: Display final structure
    const [finalColumns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'scan_logs'
      ORDER BY column_name
    `);

    console.log('\n📋 Final scan_logs table structure:');
    console.log('='.repeat(80));
    finalColumns.forEach(col => {
      const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
      console.log(`${col.column_name.padEnd(20)} | ${col.data_type.padEnd(25)} | ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}${defaultVal}`);
    });
    console.log('='.repeat(80));

    // Step 7: Test the new structure
    const [sampleScans] = await sequelize.query(`
      SELECT id, "userId", "scannedBy", "scannedByType", "scanType", "scanTime"
      FROM scan_logs 
      ORDER BY "scanTime" DESC
      LIMIT 5
    `);

    if (sampleScans.length > 0) {
      console.log('\n📋 Sample scan logs (latest 5):');
      console.log('='.repeat(100));
      console.log('ID'.padEnd(8) + 'User ID'.padEnd(8) + 'Scanner ID'.padEnd(10) + 'Scanner Type'.padEnd(15) + 'Scan Type'.padEnd(12) + 'Time');
      console.log('-'.repeat(100));
      sampleScans.forEach(scan => {
        const id = scan.id.substring(0, 7).padEnd(8);
        const userId = scan.userId ? scan.userId.substring(0, 7).padEnd(8) : 'NULL'.padEnd(8);
        const scannerId = scan.scannedBy ? scan.scannedBy.substring(0, 9).padEnd(10) : 'NULL'.padEnd(10);
        const scannerType = (scan.scannedByType || 'NULL').padEnd(15);
        const scanType = (scan.scanType || 'NULL').padEnd(12);
        const time = scan.scanTime ? scan.scanTime.toISOString().substring(0, 19) : 'NULL';
        
        console.log(`${id}${userId}${scannerId}${scannerType}${scanType}${time}`);
      });
      console.log('='.repeat(100));
    }

    console.log('\n✅ Scan logs structure migration completed successfully!');
    console.log('\n📝 NEXT STEPS:');
    console.log('1. Update scan log controllers to use scannedByType field');
    console.log('2. Update any analytics that reference scan logs');
    console.log('3. Test volunteer and admin scanning functionality');

  } catch (error) {
    console.error('❌ Migration error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await sequelize.close();
  }
}

// Add this check for direct execution
if (require.main === module) {
  migrateScanLogsStructure();
}

module.exports = migrateScanLogsStructure;