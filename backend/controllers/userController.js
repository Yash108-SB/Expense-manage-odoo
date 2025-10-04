import User from '../models/User.js';
import { generateSimplePassword } from '../utils/passwordGenerator.js';
import { sendWelcomeEmail, sendPasswordResetEmail } from '../utils/emailService.js';

// @desc    Get all users in company
// @route   GET /api/users
// @access  Private (Admin/Manager)
export const getUsers = async (req, res) => {
  try {
    // Get company ID (handle both populated and unpopulated cases)
    const companyId = req.user.company?._id || req.user.company;

    const users = await User.find({ company: companyId })
      .select('-password')
      .populate('manager', 'name email')
      .sort('-createdAt');

    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Create new user (employee/manager)
// @route   POST /api/users
// @access  Private (Admin)
export const createUser = async (req, res) => {
  try {
    // Get company ID (handle both populated and unpopulated cases)
    const companyId = req.user.company?._id || req.user.company;

    const { email, name, role, managerId, autoGeneratePassword, password, sendEmail } = req.body;

    // Validate input
    if (!email || !name || !role) {
      return res.status(400).json({ message: 'Please provide email, name, and role' });
    }

    // Generate password if auto-generate is enabled, otherwise use provided password
    let userPassword;
    let generatedPassword = null;

    if (autoGeneratePassword) {
      userPassword = generateSimplePassword();
      generatedPassword = userPassword;
    } else {
      if (!password) {
        return res.status(400).json({ message: 'Please provide a password or enable auto-generate' });
      }
      userPassword = password;
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Validate manager if provided
    if (managerId) {
      const manager = await User.findOne({ 
        _id: managerId, 
        company: companyId,
        role: { $in: ['manager', 'admin', 'ceo', 'cfo', 'cto', 'director'] }
      });

      if (!manager) {
        return res.status(400).json({ message: 'Invalid manager' });
      }
    }

    // Create user
    const user = await User.create({
      email,
      password: userPassword,
      name,
      role,
      company: companyId,
      manager: managerId || null
    });

    // Send welcome email if requested
    let emailSent = false;
    let emailError = null;

    if (sendEmail && generatedPassword) {
      try {
        await sendWelcomeEmail(
          {
            email: user.email,
            name: user.name,
            password: generatedPassword,
            role: user.role
          },
          req.user.company.name
        );
        emailSent = true;
      } catch (error) {
        console.error('Email sending failed:', error);
        emailError = 'User created but email failed to send';
      }
    }

    // Return user without password
    const userData = await User.findById(user._id)
      .select('-password')
      .populate('manager', 'name email');

    res.status(201).json({
      success: true,
      data: userData,
      generatedPassword: generatedPassword, // Only returned if auto-generated
      emailSent,
      emailError,
      message: emailSent 
        ? 'User created successfully and credentials sent via email' 
        : 'User created successfully'
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin)
export const updateUser = async (req, res) => {
  try {
    // Get company ID (handle both populated and unpopulated cases)
    const companyId = req.user.company?._id || req.user.company;

    const { name, role, managerId, isActive } = req.body;

    // Find user
    const user = await User.findOne({ 
      _id: req.params.id,
      company: companyId
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent self-deactivation
    if (user._id.toString() === req.user.id && isActive === false) {
      return res.status(400).json({ message: 'You cannot deactivate your own account' });
    }

    // Update fields
    if (name) user.name = name;
    if (role) user.role = role;
    if (managerId !== undefined) user.manager = managerId;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    const updatedUser = await User.findById(user._id)
      .select('-password')
      .populate('manager', 'name email');

    res.json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin)
export const deleteUser = async (req, res) => {
  try {
    // Get company ID (handle both populated and unpopulated cases)
    const companyId = req.user.company?._id || req.user.company;

    const user = await User.findOne({ 
      _id: req.params.id,
      company: companyId
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent self-deletion
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    await user.deleteOne();

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get managers and executives list
// @route   GET /api/users/managers
// @access  Private (Admin)
export const getManagers = async (req, res) => {
  try {
    // Get company ID (handle both populated and unpopulated cases)
    const companyId = req.user.company?._id || req.user.company;

    const managers = await User.find({ 
      company: companyId,
      role: { $in: ['manager', 'admin', 'ceo', 'cfo', 'cto', 'director'] },
      isActive: true
    })
      .select('-password')
      .sort('name');

    res.json({
      success: true,
      count: managers.length,
      data: managers
    });
  } catch (error) {
    console.error('Get managers error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Resend welcome email to user with new password
// @route   POST /api/users/:id/resend-welcome
// @access  Private (Admin)
export const resendWelcomeEmail = async (req, res) => {
  try {
    // Get company ID (handle both populated and unpopulated cases)
    const companyId = req.user.company?._id || req.user.company;

    // Find user
    const user = await User.findOne({ 
      _id: req.params.id,
      company: companyId
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate new password
    const newPassword = generateSimplePassword();
    user.password = newPassword;
    await user.save();

    // Send welcome email with new credentials
    try {
      await sendWelcomeEmail(
        {
          email: user.email,
          name: user.name,
          password: newPassword,
          role: user.role
        },
        req.user.company.name
      );

      res.json({
        success: true,
        message: 'Welcome email sent successfully with new password',
        generatedPassword: newPassword
      });
    } catch (error) {
      console.error('Email sending failed:', error);
      res.status(500).json({ 
        message: 'Password was reset but email failed to send',
        error: error.message,
        generatedPassword: newPassword
      });
    }
  } catch (error) {
    console.error('Resend welcome email error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Send welcome emails to multiple users
// @route   POST /api/users/bulk-welcome-email
// @access  Private (Admin)
export const sendBulkWelcomeEmail = async (req, res) => {
  try {
    // Get company ID (handle both populated and unpopulated cases)
    const companyId = req.user.company?._id || req.user.company;

    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'Please provide an array of user IDs' });
    }

    // Find users
    const users = await User.find({ 
      _id: { $in: userIds },
      company: companyId
    });

    if (users.length === 0) {
      return res.status(404).json({ message: 'No users found' });
    }

    const results = [];

    // Process each user
    for (const user of users) {
      const newPassword = generateSimplePassword();
      user.password = newPassword;
      await user.save();

      try {
        await sendWelcomeEmail(
          {
            email: user.email,
            name: user.name,
            password: newPassword,
            role: user.role
          },
          req.user.company.name
        );

        results.push({
          userId: user._id,
          email: user.email,
          name: user.name,
          success: true,
          generatedPassword: newPassword
        });
      } catch (error) {
        console.error(`Email failed for ${user.email}:`, error);
        results.push({
          userId: user._id,
          email: user.email,
          name: user.name,
          success: false,
          error: error.message,
          generatedPassword: newPassword
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    res.json({
      success: true,
      message: `Emails sent: ${successCount} succeeded, ${failCount} failed`,
      successCount,
      failCount,
      results
    });
  } catch (error) {
    console.error('Bulk welcome email error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Send password reset email to user
// @route   POST /api/users/:id/password-reset-email
// @access  Private (Admin)
export const sendPasswordResetEmailToUser = async (req, res) => {
  try {
    // Get company ID (handle both populated and unpopulated cases)
    const companyId = req.user.company?._id || req.user.company;

    // Find user
    const user = await User.findOne({ 
      _id: req.params.id,
      company: companyId
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate a simple reset token (in production, use JWT or secure token)
    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    try {
      await sendPasswordResetEmail(user.email, user.name, resetToken);

      res.json({
        success: true,
        message: 'Password reset email sent successfully',
        resetToken // For testing purposes, remove in production
      });
    } catch (error) {
      console.error('Email sending failed:', error);
      res.status(500).json({ 
        message: 'Failed to send password reset email',
        error: error.message
      });
    }
  } catch (error) {
    console.error('Send password reset email error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
