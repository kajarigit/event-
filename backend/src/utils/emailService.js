const transporter = require('../config/email');

/**
 * Send welcome email with login credentials
 * @param {Object} user - User object with email, name, rollNumber
 * @param {string} password - Plain text password
 * @param {string} role - User role (student/volunteer)
 */
const sendWelcomeEmail = async (user, password, role = 'student') => {
  // Check if email is configured
  if (!transporter) {
    console.warn(`📧 Email not configured. Welcome email not sent to ${user.email}`);
    return { success: false, error: 'Email service not configured' };
  }

  const mailOptions = {
    from: `"Event Management System" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: '🎉 Welcome to Event Management System - Your Login Credentials',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .credentials { background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; border-radius: 5px; }
          .credential-item { margin: 10px 0; }
          .credential-label { font-weight: bold; color: #667eea; }
          .credential-value { font-family: monospace; background: #f0f0f0; padding: 5px 10px; border-radius: 3px; display: inline-block; }
          .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to Event Management System!</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${user.name}</strong>,</p>
            
            <p>Your account has been successfully created! You can now access all event features including QR code generation, voting, and feedback.</p>
            
            <div class="credentials">
              <h3>📋 Your Login Credentials</h3>
              <div class="credential-item">
                <span class="credential-label">Roll Number / ID:</span>
                <span class="credential-value">${user.rollNumber}</span>
              </div>
              <div class="credential-item">
                <span class="credential-label">Email:</span>
                <span class="credential-value">${user.email}</span>
              </div>
              <div class="credential-item">
                <span class="credential-label">Password:</span>
                <span class="credential-value">${password}</span>
              </div>
              <div class="credential-item">
                <span class="credential-label">Role:</span>
                <span class="credential-value">${role.toUpperCase()}</span>
              </div>
            </div>
            
            <div class="warning">
              <strong>⚠️ Important Security Notice:</strong>
              <ul>
                <li>Please change your password after your first login</li>
                <li>Do not share your credentials with anyone</li>
                <li>Keep this email safe for future reference</li>
              </ul>
            </div>
            
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" class="button">
                🚀 Login Now
              </a>
            </div>
            
            <p><strong>What you can do:</strong></p>
            <ul>
              <li>✅ Generate your QR code for event check-in</li>
              <li>🗳️ Vote for your favorite stalls</li>
              <li>💬 Provide feedback on events</li>
              <li>📊 View your attendance history</li>
            </ul>
            
            <p>If you have any questions or face any issues, please contact the event support team.</p>
            
            <p>Best regards,<br><strong>Event Management Team</strong></p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
            <p>&copy; ${new Date().getFullYear()} Event Management System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent to ${user.email}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Failed to send welcome email to ${user.email}:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send OTP for password reset
 * @param {string} email - User email
 * @param {string} otp - 6-digit OTP
 * @param {string} name - User name
 */
const sendPasswordResetOTP = async (email, otp, name = 'User') => {
  // Check if email is configured
  if (!transporter) {
    console.warn(`📧 Email not configured. OTP not sent to ${email}`);
    return { success: false, error: 'Email service not configured' };
  }

  const mailOptions = {
    from: `"Event Management System" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '🔐 Password Reset OTP - Event Management System',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .otp-box { background: white; padding: 30px; text-align: center; border: 3px dashed #f5576c; margin: 20px 0; border-radius: 10px; }
          .otp-code { font-size: 36px; font-weight: bold; color: #f5576c; letter-spacing: 8px; font-family: monospace; }
          .warning { background: #ffe5e5; border-left: 4px solid #f5576c; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${name}</strong>,</p>
            
            <p>We received a request to reset your password. Use the OTP below to verify your identity and reset your password.</p>
            
            <div class="otp-box">
              <p style="margin: 0; color: #666; font-size: 14px;">Your One-Time Password (OTP)</p>
              <div class="otp-code">${otp}</div>
              <p style="margin: 10px 0 0 0; color: #999; font-size: 12px;">Valid for 10 minutes</p>
            </div>
            
            <div class="warning">
              <strong>⚠️ Security Alert:</strong>
              <ul>
                <li>This OTP is valid for <strong>10 minutes only</strong></li>
                <li>Never share this OTP with anyone</li>
                <li>If you didn't request this, please ignore this email</li>
                <li>Your password will remain unchanged unless you complete the reset process</li>
              </ul>
            </div>
            
            <p>After entering the OTP, you will receive a new password via email.</p>
            
            <p>If you didn't request a password reset, please contact our support team immediately.</p>
            
            <p>Best regards,<br><strong>Event Management Team</strong></p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
            <p>&copy; ${new Date().getFullYear()} Event Management System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent to ${email}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Failed to send OTP email to ${email}:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send new password after successful OTP verification
 * @param {string} email - User email
 * @param {string} newPassword - New password
 * @param {string} name - User name
 */
const sendNewPassword = async (email, newPassword, name = 'User') => {
  // Check if email is configured
  if (!transporter) {
    console.warn(`📧 Email not configured. New password not sent to ${email}`);
    return { success: false, error: 'Email service not configured' };
  }

  const mailOptions = {
    from: `"Event Management System" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '✅ Password Reset Successful - Event Management System',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .password-box { background: white; padding: 20px; border-left: 4px solid #4facfe; margin: 20px 0; border-radius: 5px; }
          .password-value { font-family: monospace; background: #f0f0f0; padding: 10px 15px; border-radius: 3px; font-size: 18px; font-weight: bold; color: #4facfe; display: inline-block; margin: 10px 0; }
          .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Password Reset Successful!</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${name}</strong>,</p>
            
            <p>Your password has been successfully reset. Here is your new password:</p>
            
            <div class="password-box">
              <p style="margin: 0; font-weight: bold;">Your New Password:</p>
              <div class="password-value">${newPassword}</div>
            </div>
            
            <div class="warning">
              <strong>⚠️ Important Security Steps:</strong>
              <ul>
                <li>Please login with this new password immediately</li>
                <li><strong>Change this password</strong> after logging in for security</li>
                <li>Do not share this password with anyone</li>
                <li>Keep this email safe for reference</li>
              </ul>
            </div>
            
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" class="button">
                🚀 Login Now
              </a>
            </div>
            
            <p>If you didn't request this password reset, please contact our support team immediately as your account may be compromised.</p>
            
            <p>Best regards,<br><strong>Event Management Team</strong></p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
            <p>&copy; ${new Date().getFullYear()} Event Management System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ New password email sent to ${email}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Failed to send new password email to ${email}:`, error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendWelcomeEmail,
  sendPasswordResetOTP,
  sendNewPassword,
};
