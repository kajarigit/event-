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

/**
 * Send stall QR code email for feedback scanning
 * @param {Object} stall - Stall object with name, ownerEmail, ownerName
 * @param {string} qrCodeDataURL - QR code image as data URL
 * @param {Object} event - Event object with name
 */
const sendStallQRCode = async (stall, qrCodeDataURL, event) => {
  // Check if email is configured
  if (!transporter) {
    console.warn(`📧 Email not configured. Stall QR email not sent to ${stall.ownerEmail}`);
    return { success: false, error: 'Email service not configured' };
  }

  const mailOptions = {
    from: `"Event Management System" <${process.env.EMAIL_USER}>`,
    to: stall.ownerEmail,
    subject: `🎪 Your Stall QR Code - ${stall.name} | ${event.name}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .stall-info { background: white; padding: 20px; border-left: 4px solid #f5576c; margin: 20px 0; border-radius: 5px; }
          .info-item { margin: 10px 0; }
          .info-label { font-weight: bold; color: #f5576c; }
          .info-value { color: #333; }
          .qr-container { text-align: center; background: white; padding: 30px; margin: 20px 0; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .qr-code { max-width: 300px; width: 100%; height: auto; border: 5px solid #f5576c; border-radius: 10px; }
          .instructions { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 20px; margin: 20px 0; border-radius: 5px; }
          .instruction-step { margin: 15px 0; padding-left: 25px; position: relative; }
          .instruction-step:before { content: "✓"; position: absolute; left: 0; color: #2196f3; font-weight: bold; font-size: 18px; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          .highlight { background: #fff9c4; padding: 2px 6px; border-radius: 3px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎪 Your Stall QR Code</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px;">Ready for Feedback Collection!</p>
          </div>
          
          <div class="content">
            <p>Hello <strong>${stall.ownerName || 'Stall Owner'}</strong>,</p>
            
            <p>Your stall has been successfully registered! Below is your unique QR code for collecting student feedback.</p>
            
            <div class="stall-info">
              <h3 style="margin-top: 0; color: #f5576c;">📋 Stall Information</h3>
              <div class="info-item">
                <span class="info-label">Stall Name:</span>
                <span class="info-value">${stall.name}</span>
              </div>
              ${stall.department ? `
              <div class="info-item">
                <span class="info-label">Department:</span>
                <span class="info-value">${stall.department}</span>
              </div>
              ` : ''}
              ${stall.location ? `
              <div class="info-item">
                <span class="info-label">Location:</span>
                <span class="info-value">${stall.location}</span>
              </div>
              ` : ''}
              ${stall.category ? `
              <div class="info-item">
                <span class="info-label">Category:</span>
                <span class="info-value">${stall.category}</span>
              </div>
              ` : ''}
              <div class="info-item">
                <span class="info-label">Event:</span>
                <span class="info-value">${event.name}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Contact:</span>
                <span class="info-value">${stall.ownerContact || 'N/A'}</span>
              </div>
            </div>
            
            <div class="qr-container">
              <h3 style="margin-top: 0; color: #f5576c;">📱 Your Feedback QR Code</h3>
              <img src="${qrCodeDataURL}" alt="Stall QR Code" class="qr-code" />
              <p style="margin: 15px 0 0 0; color: #666; font-size: 14px;">
                Students scan this to provide feedback and vote for your stall
              </p>
            </div>
            
            <div class="instructions">
              <h3 style="margin-top: 0; color: #2196f3;">📖 How to Use Your QR Code</h3>
              
              <div class="instruction-step">
                <strong>Print this QR code</strong> and display it prominently at your stall
              </div>
              
              <div class="instruction-step">
                <strong>Ask students to scan</strong> the QR code with their phones after visiting
              </div>
              
              <div class="instruction-step">
                Students can <strong>vote and give feedback</strong> for your stall
              </div>
              
              <div class="instruction-step">
                <strong>Track your votes</strong> in real-time through the admin dashboard
              </div>
              
              <div class="instruction-step">
                <strong>Collect valuable feedback</strong> to improve your stall
              </div>
            </div>
            
            <div class="warning">
              <strong>⚠️ Important Tips:</strong>
              <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                <li>Keep this email safe - you can reprint the QR code anytime</li>
                <li>Display the QR code where students can easily see it</li>
                <li>Students must be <span class="highlight">checked in</span> to the event to vote</li>
                <li>Each student can vote once per stall</li>
                <li>Voting and feedback are anonymous</li>
              </ul>
            </div>
            
            <h3 style="color: #f5576c;">🏆 Compete for Top Stall!</h3>
            <p>
              The stalls with the most votes will be featured on the leaderboard. 
              Encourage students to visit and vote for your stall!
            </p>
            
            <p style="margin-top: 30px;">
              If you have any questions or need a replacement QR code, please contact the event administrator.
            </p>
            
            <p>Good luck with your stall! 🎉</p>
            
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
    console.log(`✅ Stall QR email sent to ${stall.ownerEmail}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Failed to send stall QR email to ${stall.ownerEmail}:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send Stall Owner Dashboard Credentials with QR Code
 */
const sendStallOwnerCredentials = async (stall, qrCodeDataURL, event, password) => {
  // Check if email is configured
  if (!transporter) {
    console.warn(`📧 Email not configured. Stall credentials email not sent to ${stall.ownerEmail}`);
    return { success: false, error: 'Email service not configured' };
  }

  const dashboardUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const loginUrl = `${dashboardUrl}/stall-owner/login`;

  const mailOptions = {
    from: `"Event Management System" <${process.env.EMAIL_USER}>`,
    to: stall.ownerEmail,
    subject: `🏪 Stall Owner Dashboard Access - ${stall.name} | ${event.name}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 700px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .credentials-box { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 25px; margin: 25px 0; border-radius: 10px; box-shadow: 0 4px 15px rgba(245,87,108,0.3); }
          .credential-item { background: rgba(255,255,255,0.2); padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid white; }
          .credential-label { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.9; margin-bottom: 5px; }
          .credential-value { font-size: 20px; font-weight: bold; font-family: 'Courier New', monospace; letter-spacing: 1px; }
          .stall-info { background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; border-radius: 5px; }
          .info-item { margin: 10px 0; }
          .info-label { font-weight: bold; color: #667eea; }
          .info-value { color: #333; }
          .qr-container { text-align: center; background: white; padding: 30px; margin: 20px 0; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .qr-code { max-width: 300px; width: 100%; height: auto; border: 5px solid #667eea; border-radius: 10px; }
          .features { background: #e8eaf6; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 5px; }
          .feature-item { margin: 12px 0; padding-left: 25px; position: relative; }
          .feature-item:before { content: "✓"; position: absolute; left: 0; color: #667eea; font-weight: bold; font-size: 18px; }
          .login-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; box-shadow: 0 4px 15px rgba(102,126,234,0.4); }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; }
          .highlight { background: #fff9c4; padding: 2px 6px; border-radius: 3px; font-weight: bold; color: #333; }
          .dashboard-preview { background: white; padding: 20px; margin: 20px 0; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏪 Welcome to Stall Owner Dashboard!</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px;">Your credentials and QR code are ready</p>
          </div>
          
          <div class="content">
            <p>Hello <strong>${stall.ownerName || 'Stall Owner'}</strong>,</p>
            
            <p>Congratulations! Your stall <strong>"${stall.name}"</strong> has been successfully registered for <strong>${event.name}</strong>.</p>
            
            <div class="credentials-box">
              <h3 style="margin-top: 0; text-align: center;">🔐 Your Dashboard Login Credentials</h3>
              
              <div class="credential-item">
                <div class="credential-label">Stall ID (Username)</div>
                <div class="credential-value">${stall.id}</div>
              </div>
              
              <div class="credential-item">
                <div class="credential-label">Password</div>
                <div class="credential-value">${password}</div>
              </div>
              
              <div style="text-align: center; margin-top: 20px;">
                <a href="${loginUrl}" class="login-button">🚀 Login to Dashboard</a>
              </div>
            </div>
            
            <div class="warning">
              <strong>⚠️ Important Security Notice:</strong>
              <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                <li>Keep these credentials safe and <strong>do not share</strong> them with anyone</li>
                <li>You can change your password after first login</li>
                <li>If you forget your credentials, contact the event administrator</li>
              </ul>
            </div>
            
            <div class="stall-info">
              <h3 style="margin-top: 0; color: #667eea;">📋 Stall Information</h3>
              <div class="info-item">
                <span class="info-label">Stall Name:</span>
                <span class="info-value">${stall.name}</span>
              </div>
              ${stall.department ? `
              <div class="info-item">
                <span class="info-label">Department:</span>
                <span class="info-value">${stall.department}</span>
              </div>
              ` : ''}
              ${stall.location ? `
              <div class="info-item">
                <span class="info-label">Location:</span>
                <span class="info-value">${stall.location}</span>
              </div>
              ` : ''}
              <div class="info-item">
                <span class="info-label">Event:</span>
                <span class="info-value">${event.name}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Event Dates:</span>
                <span class="info-value">${new Date(event.startDate).toLocaleDateString()} - ${new Date(event.endDate).toLocaleDateString()}</span>
              </div>
            </div>
            
            <div class="qr-container">
              <h3 style="margin-top: 0; color: #667eea;">📱 Your Stall QR Code</h3>
              <p>Display this QR code at your stall for students to scan:</p>
              <img src="${qrCodeDataURL}" alt="Stall QR Code" class="qr-code" />
              <p style="margin: 15px 0 0 0; font-size: 14px; color: #666;">
                Students will scan this code to give you votes and feedback!
              </p>
            </div>
            
            <div class="dashboard-preview">
              <h3 style="margin-top: 0; color: #667eea;">📊 Dashboard Features</h3>
              <p>Your dashboard provides real-time tracking of your stall's performance:</p>
              
              <div class="features">
                <div class="feature-item">
                  <strong>Live Rankings:</strong> See your position among stalls in your department updated every 5 seconds
                </div>
                <div class="feature-item">
                  <strong>Real-time Votes:</strong> Track every vote as it comes in with student details
                </div>
                <div class="feature-item">
                  <strong>Instant Feedback:</strong> Read student reviews and ratings immediately
                </div>
                <div class="feature-item">
                  <strong>Competition Stats:</strong> Monitor your gap to the leader and see top competitors
                </div>
                <div class="feature-item">
                  <strong>Position Alerts:</strong> Get notified when you move up or down in rankings
                </div>
                <div class="feature-item">
                  <strong>Activity Feed:</strong> Live stream of all votes and feedbacks received
                </div>
                <div class="feature-item">
                  <strong>Analytics Charts:</strong> Visual breakdown of ratings and voting trends
                </div>
                <div class="feature-item">
                  <strong>QR Code Access:</strong> Display your QR code directly from the dashboard
                </div>
              </div>
            </div>
            
            <div style="background: #e8f5e9; border-left: 4px solid #4caf50; padding: 20px; margin: 20px 0; border-radius: 5px;">
              <h3 style="margin-top: 0; color: #2e7d32;">🎯 How to Use Your Dashboard</h3>
              <ol style="margin: 0; padding-left: 20px;">
                <li style="margin: 10px 0;"><strong>Login:</strong> Visit <a href="${loginUrl}">${loginUrl}</a></li>
                <li style="margin: 10px 0;"><strong>Enter Credentials:</strong> Use your Stall ID and Password above</li>
                <li style="margin: 10px 0;"><strong>Display QR Code:</strong> Click "Show QR Code" and display it at your stall</li>
                <li style="margin: 10px 0;"><strong>Monitor Live:</strong> Keep the dashboard open to see votes and rankings in real-time</li>
                <li style="margin: 10px 0;"><strong>Engage Students:</strong> Encourage visitors to scan and vote!</li>
                <li style="margin: 10px 0;"><strong>Track Competition:</strong> See where you stand compared to other stalls in your department</li>
              </ol>
            </div>
            
            <div style="background: #fff3e0; border-left: 4px solid #ff9800; padding: 20px; margin: 20px 0; border-radius: 5px;">
              <h3 style="margin-top: 0; color: #e65100;">🏆 Competition Tips</h3>
              <ul style="margin: 0; padding-left: 20px;">
                <li style="margin: 10px 0;">You compete <strong>only with stalls in your department</strong> (${stall.department || 'your category'})</li>
                <li style="margin: 10px 0;">Rankings update <strong>automatically every 5 seconds</strong></li>
                <li style="margin: 10px 0;"><strong>Display your QR code prominently</strong> for easy scanning</li>
                <li style="margin: 10px 0;"><strong>Engage with visitors</strong> to encourage votes and feedback</li>
                <li style="margin: 10px 0;"><strong>Read feedbacks</strong> to improve your stall experience</li>
                <li style="margin: 10px 0;"><strong>Keep the dashboard visible</strong> to monitor your position in real-time</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" class="login-button" style="font-size: 18px;">
                🚀 Access Your Dashboard Now
              </a>
            </div>
            
            <div class="warning">
              <strong>📞 Need Help?</strong>
              <p style="margin: 10px 0 0 0;">
                If you have any questions or issues accessing your dashboard, please contact the event organizers.
              </p>
            </div>
            
            <div class="footer">
              <p><strong>Event Management System</strong></p>
              <p>This email contains sensitive login information. Please keep it secure.</p>
              <p style="margin-top: 10px;">Dashboard URL: <a href="${loginUrl}">${loginUrl}</a></p>
              <p style="margin-top: 5px;">Event: ${event.name}</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Stall owner credentials email sent to ${stall.ownerEmail}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Failed to send stall credentials email to ${stall.ownerEmail}:`, error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendWelcomeEmail,
  sendPasswordResetOTP,
  sendNewPassword,
  sendStallQRCode,
  sendStallOwnerCredentials,
};
