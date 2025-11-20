const { User, Volunteer } = require('../models/index.sequelize');

/**
 * Get scanner information by ID and type
 * @param {string} scannerId - The UUID of the scanner
 * @param {string} scannerType - Either 'user' or 'volunteer'
 * @returns {Promise<Object|null>} Scanner object with basic info
 */
async function getScannerById(scannerId, scannerType) {
  if (!scannerId || !scannerType) {
    return null;
  }

  try {
    if (scannerType === 'volunteer') {
      const volunteer = await Volunteer.findByPk(scannerId, {
        attributes: ['id', 'name', 'volunteerId', 'department', 'isActive']
      });
      
      if (volunteer) {
        return {
          id: volunteer.id,
          name: volunteer.name,
          identifier: volunteer.volunteerId,
          department: volunteer.department,
          isActive: volunteer.isActive,
          type: 'volunteer'
        };
      }
    } else if (scannerType === 'user') {
      const user = await User.findByPk(scannerId, {
        attributes: ['id', 'name', 'email', 'role', 'department', 'isActive']
      });
      
      if (user) {
        return {
          id: user.id,
          name: user.name,
          identifier: user.email,
          department: user.department,
          role: user.role,
          isActive: user.isActive,
          type: 'user'
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching scanner:', error.message);
    return null;
  }
}

/**
 * Get enhanced scan logs with scanner information
 * @param {Array} scanLogs - Array of scan log objects
 * @returns {Promise<Array>} Enhanced scan logs with scanner info
 */
async function enrichScanLogsWithScanners(scanLogs) {
  const enrichedLogs = await Promise.all(
    scanLogs.map(async (log) => {
      const scanner = await getScannerById(log.scannedBy, log.scannedByType);
      
      return {
        ...log,
        scanner: scanner ? {
          id: scanner.id,
          name: scanner.name,
          identifier: scanner.identifier,
          department: scanner.department,
          type: scanner.type,
          isActive: scanner.isActive
        } : null
      };
    })
  );
  
  return enrichedLogs;
}

/**
 * Create a new scan log entry
 * @param {Object} scanData - Scan log data
 * @param {string} scannerId - ID of the scanner (volunteer or user)
 * @param {string} scannerType - Type of scanner ('volunteer' or 'user')
 * @returns {Promise<Object>} Created scan log
 */
async function createScanLog(scanData, scannerId = null, scannerType = 'volunteer') {
  const { ScanLog } = require('../models/index.sequelize');
  
  const scanLogData = {
    ...scanData,
    scannedBy: scannerId,
    scannedByType: scannerType
  };
  
  const scanLog = await ScanLog.create(scanLogData);
  return scanLog;
}

/**
 * Validate scanner permissions
 * @param {string} scannerId - Scanner ID
 * @param {string} scannerType - Scanner type
 * @param {string} requiredPermission - Permission to check
 * @returns {Promise<boolean>} Whether scanner has permission
 */
async function validateScannerPermission(scannerId, scannerType, requiredPermission = 'canScanQR') {
  if (scannerType === 'user') {
    // Users (admins) have all permissions
    const user = await User.findByPk(scannerId);
    return user && user.isActive && (user.role === 'admin');
  } else if (scannerType === 'volunteer') {
    const volunteer = await Volunteer.findByPk(scannerId);
    if (!volunteer || !volunteer.isActive) {
      return false;
    }
    
    // Check volunteer permissions
    const permissions = volunteer.permissions || {};
    return permissions[requiredPermission] === true;
  }
  
  return false;
}

module.exports = {
  getScannerById,
  enrichScanLogsWithScanners,
  createScanLog,
  validateScannerPermission
};