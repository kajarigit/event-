const nodemailer = require('nodemailer');
const logger = require('../config/logger');

// Create transporter
const createTransporter = () => {
  // Check if email is configured
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER) {
    logger.warn('Email service not configured. Emails will not be sent.');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

// Send email with user credentials
const sendCredentialsEmail = async (userEmail, userName, password, role) => {
  try {
    const transporter = createTransporter();
    
    if (!transporter) {
      logger.info(`Email not sent to ${userEmail} - Email service not configured`);
      return { success: false, message: 'Email service not configured' };
    }

    const roleDescriptions = {
      student: 'Student Portal',
      volunteer: 'Volunteer Portal',
      admin: 'Admin Dashboard',
    };

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'Event Management System'}" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: 'Your Account Credentials - Event Management System',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background: #f9fafb;
              padding: 30px;
              border: 1px solid #e5e7eb;
            }
            .credentials-box {
              background: white;
              border-left: 4px solid #667eea;
              padding: 20px;
              margin: 20px 0;
              border-radius: 5px;
            }
            .credential-item {
              margin: 10px 0;
            }
            .credential-label {
              font-weight: bold;
              color: #4b5563;
            }
            .credential-value {
              color: #1f2937;
              font-size: 16px;
              background: #f3f4f6;
              padding: 8px 12px;
              border-radius: 4px;
              display: inline-block;
              margin-top: 5px;
            }
            .button {
              display: inline-block;
              background: #667eea;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              color: #6b7280;
              font-size: 12px;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
            }
            .warning {
              background: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 15px;
              margin: 20px 0;
              border-radius: 5px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Welcome to Event Management System</h1>
          </div>
          
          <div class="content">
            <h2>Hello ${userName}!</h2>
            <p>Your account has been created successfully. Below are your login credentials:</p>
            
            <div class="credentials-box">
              <div class="credential-item">
                <div class="credential-label">Email / Username:</div>
                <div class="credential-value">${userEmail}</div>
              </div>
              
              <div class="credential-item">
                <div class="credential-label">Password:</div>
                <div class="credential-value">${password}</div>
              </div>
              
              <div class="credential-item">
                <div class="credential-label">Role:</div>
                <div class="credential-value">${role.charAt(0).toUpperCase() + role.slice(1)}</div>
              </div>
              
              <div class="credential-item">
                <div class="credential-label">Access Portal:</div>
                <div class="credential-value">${roleDescriptions[role] || 'Portal'}</div>
              </div>
            </div>
            
            <div class="warning">
              <strong>⚠️ Important Security Notice:</strong>
              <p style="margin: 5px 0 0 0;">Please change your password after your first login to keep your account secure.</p>
            </div>
            
            <center>
              <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}" class="button">
                Login Now
              </a>
            </center>
            
            <h3>Next Steps:</h3>
            <ol>
              <li>Click the "Login Now" button above or visit the portal</li>
              <li>Enter your email and password</li>
              <li>Change your password from your profile settings</li>
              <li>Complete your profile information</li>
            </ol>
            
            <p>If you have any questions or need assistance, please contact the administrator.</p>
          </div>
          
          <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
            <p>&copy; ${new Date().getFullYear()} Event Management System. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
      text: `
Welcome to Event Management System!

Hello ${userName},

Your account has been created successfully.

Login Credentials:
- Email: ${userEmail}
- Password: ${password}
- Role: ${role.charAt(0).toUpperCase() + role.slice(1)}
- Portal: ${roleDescriptions[role] || 'Portal'}

IMPORTANT: Please change your password after your first login.

Login URL: ${process.env.CLIENT_URL || 'http://localhost:3000'}

If you have any questions, please contact the administrator.

---
This is an automated email. Please do not reply.
© ${new Date().getFullYear()} Event Management System
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Credentials email sent to ${userEmail}: ${info.messageId}`);
    
    return {
      success: true,
      messageId: info.messageId,
      message: 'Email sent successfully',
    };
  } catch (error) {
    logger.error(`Failed to send email to ${userEmail}: ${error.message}`);
    return {
      success: false,
      message: error.message,
    };
  }
};

// Send bulk credentials emails
const sendBulkCredentialsEmails = async (users) => {
  const results = {
    sent: [],
    failed: [],
    total: users.length,
  };

  for (const user of users) {
    const result = await sendCredentialsEmail(
      user.email,
      user.name,
      user.password,
      user.role
    );

    if (result.success) {
      results.sent.push(user.email);
    } else {
      results.failed.push({ email: user.email, error: result.message });
    }
  }

  logger.info(`Bulk email results: ${results.sent.length}/${results.total} sent successfully`);
  
  return results;
};

module.exports = {
  sendCredentialsEmail,
  sendBulkCredentialsEmails,
};
