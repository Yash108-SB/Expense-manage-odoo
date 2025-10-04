import { sendWelcomeEmail, testEmailConfig } from './utils/emailService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('\n=================================');
console.log('📧 EMAIL CONFIGURATION TEST');
console.log('=================================\n');

// Display current configuration
console.log('Current Email Configuration:');
console.log('---------------------------');
console.log('EMAIL_HOST:', process.env.EMAIL_HOST || '❌ NOT SET');
console.log('EMAIL_PORT:', process.env.EMAIL_PORT || '❌ NOT SET');
console.log('EMAIL_USER:', process.env.EMAIL_USER || '❌ NOT SET');
console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '✓ SET (hidden)' : '❌ NOT SET');
console.log('EMAIL_FROM:', process.env.EMAIL_FROM || '❌ NOT SET');
console.log('EMAIL_FROM_NAME:', process.env.EMAIL_FROM_NAME || '❌ NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV || 'NOT SET');
console.log('\n');

// Test email configuration
console.log('Testing email configuration...\n');
testEmailConfig()
  .then(isValid => {
    if (isValid) {
      console.log('\n✅ Email configuration is valid!\n');
      
      // Ask if user wants to send test email
      console.log('Sending test welcome email...\n');
      
      const testUserData = {
        email: process.env.EMAIL_USER, // Send to yourself for testing
        name: 'Test User',
        password: 'TestPassword123!',
        role: 'employee'
      };
      
      return sendWelcomeEmail(testUserData, 'Test Company');
    } else {
      console.log('\n❌ Email configuration is invalid!\n');
      console.log('Please check your .env file and ensure:');
      console.log('1. EMAIL_HOST is set (e.g., smtp.gmail.com)');
      console.log('2. EMAIL_USER is your full email address');
      console.log('3. EMAIL_PASSWORD is your app password (not regular password)');
      console.log('4. All values are correct\n');
      process.exit(1);
    }
  })
  .then(result => {
    if (result && result.success) {
      console.log('\n✅ Test email sent successfully!');
      console.log('📬 Message ID:', result.messageId);
      if (result.previewUrl) {
        console.log('🔗 Preview URL:', result.previewUrl);
      }
      console.log('\n📧 Check your inbox at:', process.env.EMAIL_USER);
      console.log('\n=================================');
      console.log('✅ ALL TESTS PASSED!');
      console.log('=================================\n');
      process.exit(0);
    }
  })
  .catch(error => {
    console.error('\n❌ Error:', error.message);
    console.log('\nCommon Issues:');
    console.log('-------------');
    console.log('1. Gmail: Make sure you use App Password, not regular password');
    console.log('   Get it from: https://myaccount.google.com/apppasswords');
    console.log('2. Verify EMAIL_USER is your full email address');
    console.log('3. Check for typos in .env file');
    console.log('4. Restart backend after changing .env\n');
    process.exit(1);
  });
