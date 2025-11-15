const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const QRCode = require('qrcode');

/**
 * Generate JWT access token
 */
const generateAccessToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

/**
 * Generate JWT refresh token
 */
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' }
  );
};

/**
 * Verify JWT token
 */
const verifyToken = (token, isRefresh = false) => {
  try {
    const secret = isRefresh 
      ? (process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET)
      : process.env.JWT_SECRET;
    
    return jwt.verify(token, secret);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

/**
 * Generate QR token (signed payload)
 * @param {Object} payload - Data to encode { userId, eventId, type }
 * @param {String} expiresIn - Expiry duration (e.g., '24h')
 */
const generateQRToken = (payload, expiresIn = '24h') => {
  const token = jwt.sign(
    {
      ...payload,
      nonce: crypto.randomBytes(16).toString('hex'),
    },
    process.env.QR_SECRET || process.env.JWT_SECRET,
    { expiresIn }
  );
  return token;
};

/**
 * Verify QR token
 */
const verifyQRToken = (token) => {
  try {
    return jwt.verify(
      token,
      process.env.QR_SECRET || process.env.JWT_SECRET
    );
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('QR code has expired');
    }
    throw new Error('Invalid QR code');
  }
};

/**
 * Generate QR code image (base64 or URL)
 * @param {String} data - Data to encode (usually the QR token)
 * @param {Object} options - QR code options
 */
const generateQRCodeImage = async (data, options = {}) => {
  try {
    const qrOptions = {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      width: 300,
      ...options,
    };

    // Generate base64 data URL
    const qrCodeDataURL = await QRCode.toDataURL(data, qrOptions);
    return qrCodeDataURL;
  } catch (error) {
    throw new Error(`Failed to generate QR code: ${error.message}`);
  }
};

/**
 * Generate student QR token with embedded data
 */
const generateStudentQR = async (studentId, eventId) => {
  const token = generateQRToken(
    {
      studentId,
      eventId,
      type: 'student',
    },
    process.env.QR_TOKEN_EXPIRY || '24h'
  );

  // Generate QR code image
  const qrImage = await generateQRCodeImage(token);

  return {
    token,
    qrImage,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  };
};

/**
 * Generate stall QR token
 */
const generateStallQR = async (stallId, eventId) => {
  const token = generateQRToken(
    {
      stallId,
      eventId,
      type: 'stall',
    },
    '365d' // Stall QR codes don't expire
  );

  // Create JSON data for student scanner
  const qrData = JSON.stringify({
    stallId,
    eventId,
    type: 'stall',
    token
  });

  const qrImage = await generateQRCodeImage(qrData);

  return {
    token,
    qrData,
    qrImage,
  };
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  generateQRToken,
  verifyQRToken,
  generateQRCodeImage,
  generateStudentQR,
  generateStallQR,
};
