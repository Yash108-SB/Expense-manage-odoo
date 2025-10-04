import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const API_URL = `${BASE_URL}/api`;

console.log('\n=================================');
console.log('📧 EMAIL API TESTING SCRIPT');
console.log('=================================\n');

// You need to provide these values
const ADMIN_EMAIL = 'admin@example.com'; // Change to your admin email
const ADMIN_PASSWORD = 'admin123'; // Change to your admin password
const TEST_USER_ID = null; // Will be filled after creating a test user

let adminToken = null;

// Helper function to make API calls
async function apiCall(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${API_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (adminToken) {
      config.headers['Authorization'] = `Bearer ${adminToken}`;
    }

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message,
      details: error.response?.data
    };
  }
}

// Test functions
async function loginAsAdmin() {
  console.log('🔐 Logging in as admin...');
  const result = await apiCall('POST', '/auth/login', {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  });

  if (result.success && result.data.token) {
    adminToken = result.data.token;
    console.log('✅ Admin login successful\n');
    return true;
  } else {
    console.log('❌ Admin login failed:', result.error);
    console.log('   Please update ADMIN_EMAIL and ADMIN_PASSWORD in this script\n');
    return false;
  }
}

async function testCreateUserWithEmail() {
  console.log('📝 Testing: Create User with Welcome Email...');
  const result = await apiCall('POST', '/users', {
    email: `test.user.${Date.now()}@example.com`,
    name: 'Test User',
    role: 'employee',
    autoGeneratePassword: true,
    sendEmail: true
  });

  if (result.success) {
    console.log('✅ User created successfully');
    console.log('   Email:', result.data.data.email);
    console.log('   Generated Password:', result.data.generatedPassword);
    console.log('   Email Sent:', result.data.emailSent ? 'Yes' : 'No');
    console.log('   User ID:', result.data.data._id);
    console.log();
    return result.data.data._id;
  } else {
    console.log('❌ Failed:', result.error);
    console.log();
    return null;
  }
}

async function testResendWelcomeEmail(userId) {
  console.log('📧 Testing: Resend Welcome Email...');
  const result = await apiCall('POST', `/users/${userId}/resend-welcome`);

  if (result.success) {
    console.log('✅ Welcome email resent successfully');
    console.log('   New Password:', result.data.generatedPassword);
    console.log();
  } else {
    console.log('❌ Failed:', result.error);
    console.log();
  }
}

async function testBulkWelcomeEmail(userIds) {
  console.log('📬 Testing: Bulk Welcome Email...');
  const result = await apiCall('POST', '/users/bulk-welcome-email', {
    userIds: userIds
  });

  if (result.success) {
    console.log('✅ Bulk emails sent');
    console.log('   Success Count:', result.data.successCount);
    console.log('   Fail Count:', result.data.failCount);
    console.log('   Results:');
    result.data.results.forEach(r => {
      console.log(`      - ${r.email}: ${r.success ? '✓' : '✗'} (Password: ${r.generatedPassword})`);
    });
    console.log();
  } else {
    console.log('❌ Failed:', result.error);
    console.log();
  }
}

async function testPasswordResetEmail(userId) {
  console.log('🔑 Testing: Password Reset Email...');
  const result = await apiCall('POST', `/users/${userId}/password-reset-email`);

  if (result.success) {
    console.log('✅ Password reset email sent');
    console.log('   Reset Token:', result.data.resetToken);
    console.log();
  } else {
    console.log('❌ Failed:', result.error);
    console.log();
  }
}

async function getAllUsers() {
  console.log('👥 Fetching all users...');
  const result = await apiCall('GET', '/users');

  if (result.success) {
    console.log('✅ Users fetched successfully');
    console.log('   Total Users:', result.data.count);
    return result.data.data;
  } else {
    console.log('❌ Failed:', result.error);
    return [];
  }
}

// Main test flow
async function runTests() {
  try {
    // Step 1: Login
    const loginSuccess = await loginAsAdmin();
    if (!loginSuccess) {
      console.log('\n⚠️  Cannot proceed without admin login.');
      console.log('Please update ADMIN_EMAIL and ADMIN_PASSWORD in this script.\n');
      process.exit(1);
    }

    // Step 2: Create test user with email
    const testUserId1 = await testCreateUserWithEmail();
    if (!testUserId1) {
      console.log('⚠️  Skipping remaining tests due to user creation failure\n');
      process.exit(1);
    }

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 3: Create another test user
    const testUserId2 = await testCreateUserWithEmail();

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 4: Test resend welcome email
    await testResendWelcomeEmail(testUserId1);

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 5: Test bulk email (if we have multiple users)
    if (testUserId2) {
      await testBulkWelcomeEmail([testUserId1, testUserId2]);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Step 6: Test password reset email
    await testPasswordResetEmail(testUserId1);

    // Step 7: Show all users
    const users = await getAllUsers();
    console.log('\n📋 Current Users in System:');
    users.forEach(user => {
      console.log(`   - ${user.name} (${user.email}) - ${user.role}`);
    });

    console.log('\n=================================');
    console.log('✅ ALL TESTS COMPLETED!');
    console.log('=================================\n');

    console.log('📧 Check the email inbox for test emails.');
    console.log('🔍 Review the output above for generated passwords.\n');

  } catch (error) {
    console.error('\n❌ Test execution error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    await axios.get(`${API_URL}/health`);
    return true;
  } catch (error) {
    return false;
  }
}

// Start tests
console.log('🔍 Checking if server is running...');
checkServer().then(isRunning => {
  if (isRunning) {
    console.log('✅ Server is running\n');
    runTests();
  } else {
    console.log('❌ Server is not running!');
    console.log(`   Please start the server first: npm start`);
    console.log(`   Server URL: ${BASE_URL}\n`);
    process.exit(1);
  }
});
