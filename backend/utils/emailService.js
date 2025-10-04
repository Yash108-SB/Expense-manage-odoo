import nodemailer from 'nodemailer';

// Create transporter
const createTransporter = () => {
  // If email credentials are provided, use them (production or development)
  // Otherwise, use ethereal email for testing
  
  if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD && process.env.EMAIL_HOST) {
    // Real SMTP configuration with provided credentials
    console.log('Using configured SMTP:', process.env.EMAIL_HOST);
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  } else {
    // Fallback to ethereal email for testing (no credentials provided)
    console.log('No email credentials found, using ethereal.email (fake SMTP)');
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: 'test@ethereal.email',
        pass: 'test123'
      }
    });
  }
};

/**
 * Send welcome email with credentials to new user
 * @param {Object} userData - User data
 * @param {string} userData.email - User email
 * @param {string} userData.name - User name
 * @param {string} userData.password - Generated password
 * @param {string} userData.role - User role
 * @param {string} companyName - Company name
 */
export const sendWelcomeEmail = async (userData, companyName) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'Expense Management System'}" <${process.env.EMAIL_FROM || 'noreply@expensehub.com'}>`,
      to: userData.email,
      subject: `Welcome to ${companyName} - Your Account Credentials`,
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
              background: linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background: #f9fafb;
              padding: 30px;
              border: 1px solid #e5e7eb;
              border-top: none;
            }
            .credentials {
              background: white;
              padding: 20px;
              border-radius: 8px;
              border-left: 4px solid #0ea5e9;
              margin: 20px 0;
            }
            .credential-item {
              margin: 10px 0;
              padding: 10px;
              background: #f3f4f6;
              border-radius: 5px;
            }
            .credential-label {
              font-weight: bold;
              color: #0369a1;
            }
            .credential-value {
              font-family: monospace;
              font-size: 16px;
              color: #1f2937;
            }
            .button {
              display: inline-block;
              background: #0ea5e9;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              padding: 20px;
              color: #6b7280;
              font-size: 14px;
              border-top: 1px solid #e5e7eb;
              margin-top: 20px;
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
            <h1>Welcome to ${companyName}!</h1>
          </div>
          
          <div class="content">
            <h2>Hello ${userData.name},</h2>
            
            <p>Your account has been created for the Expense Management System. You can now log in and start managing your expenses.</p>
            
            <div class="credentials">
              <h3>Your Login Credentials:</h3>
              
              <div class="credential-item">
                <span class="credential-label">Email:</span><br>
                <span class="credential-value">${userData.email}</span>
              </div>
              
              <div class="credential-item">
                <span class="credential-label">Temporary Password:</span><br>
                <span class="credential-value">${userData.password}</span>
              </div>
              
              <div class="credential-item">
                <span class="credential-label">Role:</span><br>
                <span class="credential-value">${userData.role.charAt(0).toUpperCase() + userData.role.slice(1)}</span>
              </div>
            </div>
            
            <div class="warning">
              <strong>⚠️ Important Security Notice:</strong>
              <p>This is a temporary password. For your security, please change your password after your first login.</p>
            </div>
            
            <center>
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" class="button">
                Login to Your Account
              </a>
            </center>
            
            <h3>What's Next?</h3>
            <ul>
              <li>Log in using the credentials above</li>
              <li>Change your password immediately</li>
              <li>Complete your profile</li>
              <li>Start submitting expenses</li>
            </ul>
            
            <p>If you have any questions or need assistance, please contact your system administrator.</p>
          </div>
          
          <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
            <p>&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
      text: `
Welcome to ${companyName}!

Hello ${userData.name},

Your account has been created for the Expense Management System.

Your Login Credentials:
Email: ${userData.email}
Temporary Password: ${userData.password}
Role: ${userData.role}

IMPORTANT: This is a temporary password. Please change it after your first login.

Login URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/login

If you have any questions, please contact your system administrator.

© ${new Date().getFullYear()} ${companyName}
      `
    };

    const info = await transporter.sendMail(mailOptions);

    console.log('Email sent successfully:', info.messageId);
    
    // For development, log the preview URL
    if (process.env.NODE_ENV !== 'production') {
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: nodemailer.getTestMessageUrl(info)
    };
  } catch (error) {
    console.error('Email sending error:', error);
    throw new Error('Failed to send welcome email');
  }
};

/**
 * Send password reset email
 * @param {string} email - User email
 * @param {string} name - User name
 * @param {string} resetToken - Reset token
 */
export const sendPasswordResetEmail = async (email, name, resetToken) => {
  try {
    const transporter = createTransporter();
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'Expense Management System'}" <${process.env.EMAIL_FROM || 'noreply@expensehub.com'}>`,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <h2>Password Reset Request</h2>
        <p>Hello ${name},</p>
        <p>You requested to reset your password. Click the button below to reset it:</p>
        <a href="${resetUrl}" style="display: inline-block; background: #0ea5e9; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Password reset email error:', error);
    throw new Error('Failed to send password reset email');
  }
};

/**
 * Test email configuration
 */
export const testEmailConfig = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✓ Email configuration is valid');
    return true;
  } catch (error) {
    console.error('✗ Email configuration error:', error.message);
    return false;
  }
};
