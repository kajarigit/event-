const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const cron = require('node-cron');
const logger = require('../config/logger');

const BACKUP_DIR = path.join(__dirname, '../../backups');
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS) || 30;

/**
 * Ensure backup directory exists
 */
async function ensureBackupDirectory() {
  try {
    await fs.access(BACKUP_DIR);
  } catch {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    logger.info('Backup directory created:', BACKUP_DIR);
  }
}

/**
 * Create database backup
 */
async function createBackup() {
  await ensureBackupDirectory();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-${timestamp}.sql`;
  const filepath = path.join(BACKUP_DIR, filename);
  const gzFilepath = `${filepath}.gz`;

  // Database connection details
  const {
    DB_HOST = 'localhost',
    DB_PORT = '5432',
    DB_NAME = 'event_management',
    DB_USER = 'postgres',
    DB_PASSWORD,
  } = process.env;

  const dumpCommand = `PGPASSWORD="${DB_PASSWORD}" pg_dump -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -F p -f ${filepath}`;

  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    logger.info('Starting database backup:', filename);

    exec(dumpCommand, async (error, stdout, stderr) => {
      if (error) {
        logger.error('Backup failed:', {
          error: error.message,
          stderr,
        });
        return reject(error);
      }

      try {
        // Compress the backup file
        await new Promise((resolveCompress, rejectCompress) => {
          exec(`gzip ${filepath}`, (compressError) => {
            if (compressError) {
              logger.warn('Compression failed, keeping uncompressed backup:', compressError.message);
              resolveCompress();
            } else {
              resolveCompress();
            }
          });
        });

        // Get file size
        let finalFilepath = gzFilepath;
        let fileSize;
        
        try {
          const stats = await fs.stat(gzFilepath);
          fileSize = stats.size;
        } catch {
          // If gzip failed, use original file
          finalFilepath = filepath;
          const stats = await fs.stat(filepath);
          fileSize = stats.size;
        }

        const duration = Date.now() - startTime;
        const sizeInMB = (fileSize / (1024 * 1024)).toFixed(2);

        logger.info('✅ Database backup completed successfully:', {
          filename: path.basename(finalFilepath),
          size: `${sizeInMB}MB`,
          duration: `${duration}ms`,
          filepath: finalFilepath,
        });

        // Clean old backups
        await cleanOldBackups();

        resolve({
          success: true,
          filename: path.basename(finalFilepath),
          filepath: finalFilepath,
          size: fileSize,
          sizeInMB: `${sizeInMB}MB`,
          duration,
        });
      } catch (err) {
        logger.error('Post-backup processing failed:', err);
        reject(err);
      }
    });
  });
}

/**
 * Clean old backup files
 */
async function cleanOldBackups() {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const now = Date.now();
    const maxAge = RETENTION_DAYS * 24 * 60 * 60 * 1000; // Convert days to milliseconds

    let deletedCount = 0;

    for (const file of files) {
      if (!file.startsWith('backup-')) continue;

      const filepath = path.join(BACKUP_DIR, file);
      const stats = await fs.stat(filepath);
      const age = now - stats.mtimeMs;

      if (age > maxAge) {
        await fs.unlink(filepath);
        deletedCount++;
        logger.info('Deleted old backup:', file);
      }
    }

    if (deletedCount > 0) {
      logger.info(`Cleaned ${deletedCount} old backup(s)`);
    }
  } catch (error) {
    logger.error('Failed to clean old backups:', error);
  }
}

/**
 * Restore database from backup
 */
async function restoreBackup(backupFilename) {
  const filepath = path.join(BACKUP_DIR, backupFilename);

  // Check if file exists
  try {
    await fs.access(filepath);
  } catch {
    throw new Error(`Backup file not found: ${backupFilename}`);
  }

  const {
    DB_HOST = 'localhost',
    DB_PORT = '5432',
    DB_NAME = 'event_management',
    DB_USER = 'postgres',
    DB_PASSWORD,
  } = process.env;

  // Decompress if needed
  let sqlFilepath = filepath;
  if (filepath.endsWith('.gz')) {
    sqlFilepath = filepath.replace('.gz', '');
    await new Promise((resolve, reject) => {
      exec(`gunzip -k ${filepath}`, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  const restoreCommand = `PGPASSWORD="${DB_PASSWORD}" psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -f ${sqlFilepath}`;

  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    logger.warn('Starting database restore:', backupFilename);
    logger.warn('⚠️  This will overwrite the current database!');

    exec(restoreCommand, async (error, stdout, stderr) => {
      // Clean up decompressed file if it was created
      if (filepath.endsWith('.gz')) {
        try {
          await fs.unlink(sqlFilepath);
        } catch (cleanupError) {
          logger.warn('Failed to clean up decompressed file:', cleanupError.message);
        }
      }

      if (error) {
        logger.error('Restore failed:', {
          error: error.message,
          stderr,
        });
        return reject(error);
      }

      const duration = Date.now() - startTime;

      logger.info('✅ Database restored successfully:', {
        filename: backupFilename,
        duration: `${duration}ms`,
      });

      resolve({
        success: true,
        filename: backupFilename,
        duration,
      });
    });
  });
}

/**
 * List available backups
 */
async function listBackups() {
  await ensureBackupDirectory();

  const files = await fs.readdir(BACKUP_DIR);
  const backups = [];

  for (const file of files) {
    if (!file.startsWith('backup-')) continue;

    const filepath = path.join(BACKUP_DIR, file);
    const stats = await fs.stat(filepath);

    backups.push({
      filename: file,
      size: stats.size,
      sizeInMB: (stats.size / (1024 * 1024)).toFixed(2),
      createdAt: stats.mtime,
      age: Math.floor((Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24)), // days
    });
  }

  // Sort by creation date (newest first)
  backups.sort((a, b) => b.createdAt - a.createdAt);

  return backups;
}

/**
 * Get backup statistics
 */
async function getBackupStats() {
  const backups = await listBackups();

  const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);
  const oldestBackup = backups.length > 0 ? backups[backups.length - 1] : null;
  const newestBackup = backups.length > 0 ? backups[0] : null;

  return {
    totalBackups: backups.length,
    totalSize: totalSize,
    totalSizeInMB: (totalSize / (1024 * 1024)).toFixed(2),
    oldestBackup: oldestBackup ? {
      filename: oldestBackup.filename,
      createdAt: oldestBackup.createdAt,
      age: `${oldestBackup.age} days`,
    } : null,
    newestBackup: newestBackup ? {
      filename: newestBackup.filename,
      createdAt: newestBackup.createdAt,
      age: `${newestBackup.age} days`,
    } : null,
    retentionDays: RETENTION_DAYS,
  };
}

/**
 * Schedule automated backups
 */
function scheduleBackups() {
  if (process.env.BACKUP_ENABLED !== 'true') {
    logger.info('Automated backups disabled');
    return;
  }

  // Default: Daily at 2 AM
  const schedule = process.env.BACKUP_SCHEDULE || '0 2 * * *';

  cron.schedule(schedule, async () => {
    try {
      logger.info('Automated backup started (scheduled)');
      await createBackup();
    } catch (error) {
      logger.error('Scheduled backup failed:', error);
    }
  }, {
    timezone: process.env.TZ || 'UTC',
  });

  logger.info(`✅ Automated backups scheduled: ${schedule}`);
}

module.exports = {
  createBackup,
  restoreBackup,
  listBackups,
  getBackupStats,
  scheduleBackups,
  cleanOldBackups,
};
