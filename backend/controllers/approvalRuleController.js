import ApprovalRule from '../models/ApprovalRule.js';
import User from '../models/User.js';

// @desc    Get all approval rules
// @route   GET /api/approval-rules
// @access  Private (Admin/Manager)
export const getApprovalRules = async (req, res) => {
  try {
    // Get company ID (handle both populated and unpopulated cases)
    const companyId = req.user.company?._id || req.user.company;

    const rules = await ApprovalRule.find({ company: companyId })
      .populate('approvers.user', 'name email role')
      .populate('specificApprover', 'name email role')
      .sort('-createdAt');

    res.json({
      success: true,
      count: rules.length,
      data: rules
    });
  } catch (error) {
    console.error('Get approval rules error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Create approval rule
// @route   POST /api/approval-rules
// @access  Private (Admin)
export const createApprovalRule = async (req, res) => {
  try {
    // Get company ID (handle both populated and unpopulated cases)
    const companyId = req.user.company?._id || req.user.company;

    const {
      name,
      description,
      type,
      approvers,
      percentageRequired,
      specificApproverId,
      amountThreshold,
      categories
    } = req.body;

    // Validate input
    if (!name || !type) {
      return res.status(400).json({ message: 'Please provide name and type' });
    }

    // Validate type-specific fields
    if (type === 'sequential' || type === 'hybrid') {
      if (!approvers || approvers.length === 0) {
        return res.status(400).json({ message: 'Approvers are required for sequential/hybrid rules' });
      }

      // Validate all approvers exist and belong to company
      for (const approver of approvers) {
        const user = await User.findOne({
          _id: approver.userId,
          company: companyId,
          role: { $in: ['manager', 'admin', 'ceo', 'cfo', 'cto', 'director'] }
        });

        if (!user) {
          return res.status(400).json({ message: `Invalid approver: ${approver.userId}` });
        }
      }
    }

    if ((type === 'percentage' || type === 'hybrid') && !percentageRequired) {
      return res.status(400).json({ message: 'Percentage required for percentage-based rules' });
    }

    if (type === 'specific' && !specificApproverId) {
      return res.status(400).json({ message: 'Specific approver required for specific approver rules' });
    }

    // Format approvers
    const formattedApprovers = approvers?.map(a => ({
      user: a.userId,
      sequence: a.sequence,
      role: a.role || ''
    })) || [];

    // Create approval rule
    const rule = await ApprovalRule.create({
      company: companyId,
      name,
      description,
      type,
      approvers: formattedApprovers,
      percentageRequired,
      specificApprover: specificApproverId,
      amountThreshold: amountThreshold || { min: 0, max: null },
      categories: categories || []
    });

    const populatedRule = await ApprovalRule.findById(rule._id)
      .populate('approvers.user', 'name email role')
      .populate('specificApprover', 'name email role');

    res.status(201).json({
      success: true,
      data: populatedRule
    });
  } catch (error) {
    console.error('Create approval rule error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update approval rule
// @route   PUT /api/approval-rules/:id
// @access  Private (Admin)
export const updateApprovalRule = async (req, res) => {
  try {
    // Get company ID (handle both populated and unpopulated cases)
    const companyId = req.user.company?._id || req.user.company;

    const rule = await ApprovalRule.findOne({
      _id: req.params.id,
      company: companyId
    });

    if (!rule) {
      return res.status(404).json({ message: 'Approval rule not found' });
    }

    const {
      name,
      description,
      type,
      approvers,
      percentageRequired,
      specificApproverId,
      amountThreshold,
      categories,
      isActive
    } = req.body;

    // Update fields
    if (name) rule.name = name;
    if (description !== undefined) rule.description = description;
    if (type) rule.type = type;
    if (percentageRequired !== undefined) rule.percentageRequired = percentageRequired;
    if (specificApproverId !== undefined) rule.specificApprover = specificApproverId;
    if (amountThreshold) rule.amountThreshold = amountThreshold;
    if (categories) rule.categories = categories;
    if (isActive !== undefined) rule.isActive = isActive;

    if (approvers) {
      rule.approvers = approvers.map(a => ({
        user: a.userId,
        sequence: a.sequence,
        role: a.role || ''
      }));
    }

    await rule.save();

    const updatedRule = await ApprovalRule.findById(rule._id)
      .populate('approvers.user', 'name email role')
      .populate('specificApprover', 'name email role');

    res.json({
      success: true,
      data: updatedRule
    });
  } catch (error) {
    console.error('Update approval rule error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete approval rule
// @route   DELETE /api/approval-rules/:id
// @access  Private (Admin)
export const deleteApprovalRule = async (req, res) => {
  try {
    // Get company ID (handle both populated and unpopulated cases)
    const companyId = req.user.company?._id || req.user.company;

    const rule = await ApprovalRule.findOne({
      _id: req.params.id,
      company: companyId
    });

    if (!rule) {
      return res.status(404).json({ message: 'Approval rule not found' });
    }

    await rule.deleteOne();

    res.json({
      success: true,
      message: 'Approval rule deleted successfully'
    });
  } catch (error) {
    console.error('Delete approval rule error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
