import Expense from '../models/Expense.js';
import ApprovalRule from '../models/ApprovalRule.js';
import User from '../models/User.js';
import { convertCurrency } from '../utils/currencyConverter.js';
import { processReceipt } from '../utils/ocrProcessor.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/receipts';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image and PDF files are allowed'));
  }
});

// @desc    Create expense
// @route   POST /api/expenses
// @access  Private (Employee, Manager, Admin)
export const createExpense = async (req, res) => {
  try {
    // Get company ID and currency (handle both populated and unpopulated cases)
    const companyId = req.user.company?._id || req.user.company;
    const companyCurrency = req.user.company?.currency?.code || 'USD';

    const { title, description, amount, currency, category, expenseDate, merchantName, expenseLines } = req.body;

    // Validate input
    if (!title || !amount || !currency || !category) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Convert currency
    const { convertedAmount, rate } = await convertCurrency(
      parseFloat(amount),
      currency,
      companyCurrency
    );

    // Find applicable approval rule
    const approvalRule = await findApplicableRule(
      companyId,
      convertedAmount,
      category
    );

    // Create expense
    const expense = await Expense.create({
      employee: req.user.id,
      company: companyId,
      title,
      description,
      amount: parseFloat(amount),
      currency,
      convertedAmount,
      companyCurrency,
      exchangeRate: rate,
      category,
      expenseDate: expenseDate || Date.now(),
      merchantName,
      expenseLines: expenseLines || [],
      approvalRule: approvalRule?._id,
      status: 'pending'
    });

    // Initialize approval workflow
    await initializeApprovalWorkflow(expense, req.user);

    const populatedExpense = await Expense.findById(expense._id)
      .populate('employee', 'name email')
      .populate('approvalRule')
      .populate('approvals.approver', 'name email role');

    res.status(201).json({
      success: true,
      data: populatedExpense
    });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Upload and process receipt
// @route   POST /api/expenses/upload-receipt
// @access  Private
export const uploadReceipt = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a file' });
    }

    // Process OCR if image
    let ocrData = null;
    if (req.file.mimetype.startsWith('image/')) {
      try {
        ocrData = await processReceipt(req.file.path);
      } catch (error) {
        console.error('OCR processing error:', error);
        // Continue even if OCR fails
      }
    }

    res.json({
      success: true,
      data: {
        file: {
          filename: req.file.filename,
          path: req.file.path,
          mimetype: req.file.mimetype,
          size: req.file.size
        },
        ocr: ocrData
      }
    });
  } catch (error) {
    console.error('Upload receipt error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all expenses
// @route   GET /api/expenses
// @access  Private
export const getExpenses = async (req, res) => {
  try {
    // Get company ID (handle both populated and unpopulated cases)
    const companyId = req.user.company?._id || req.user.company;

    const { status, category, startDate, endDate } = req.query;

    const query = { company: companyId };

    // Role-based filtering
    if (req.user.role === 'employee') {
      query.employee = req.user.id;
    }

    // Apply filters
    if (status) query.status = status;
    if (category) query.category = category;
    if (startDate || endDate) {
      query.expenseDate = {};
      if (startDate) query.expenseDate.$gte = new Date(startDate);
      if (endDate) query.expenseDate.$lte = new Date(endDate);
    }

    const expenses = await Expense.find(query)
      .populate('employee', 'name email')
      .populate('approvals.approver', 'name email role')
      .sort('-createdAt');

    res.json({
      success: true,
      count: expenses.length,
      data: expenses
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get pending approvals for current user
// @route   GET /api/expenses/pending-approvals
// @access  Private (Manager/Admin)
export const getPendingApprovals = async (req, res) => {
  try {
    // Get company ID (handle both populated and unpopulated cases)
    const companyId = req.user.company?._id || req.user.company;

    const expenses = await Expense.find({
      company: companyId,
      status: 'pending',
      'approvals.approver': req.user.id,
      'approvals.status': 'pending'
    })
      .populate('employee', 'name email')
      .populate('approvals.approver', 'name email role')
      .sort('-createdAt');

    res.json({
      success: true,
      count: expenses.length,
      data: expenses
    });
  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Approve/Reject expense
// @route   PUT /api/expenses/:id/approve
// @access  Private (Manager/Admin/CEO/CFO/CTO/Director)
export const processApproval = async (req, res) => {
  try {
    // Get company ID (handle both populated and unpopulated cases)
    const companyId = req.user.company?._id || req.user.company;

    const { action, comments } = req.body; // action: 'approve' or 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action' });
    }

    const expense = await Expense.findOne({
      _id: req.params.id,
      company: companyId
    }).populate('approvalRule');

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    if (expense.status !== 'pending') {
      return res.status(400).json({ message: 'Expense is not pending approval' });
    }

    // Find approval entry for current user
    const approvalIndex = expense.approvals.findIndex(
      a => a.approver.toString() === req.user.id && a.status === 'pending'
    );

    if (approvalIndex === -1) {
      return res.status(403).json({ message: 'You are not authorized to approve this expense at this time' });
    }

    const approval = expense.approvals[approvalIndex];

    // For sequential approval, check if it's this user's turn
    if (expense.approvalRule) {
      const rule = await ApprovalRule.findById(expense.approvalRule);
      
      if (rule.type === 'sequential') {
        // In sequential mode, only current step approvers can approve
        if (approval.sequence !== expense.currentApprovalStep) {
          return res.status(403).json({ 
            message: `Expense is currently at approval step ${expense.currentApprovalStep}. Please wait for previous approvers to complete their review.` 
          });
        }
      }
    }

    // Update approval status
    expense.approvals[approvalIndex].status = action === 'approve' ? 'approved' : 'rejected';
    expense.approvals[approvalIndex].comments = comments;
    expense.approvals[approvalIndex].approvedAt = new Date();

    // For sequential approval, advance to next step if current step is complete
    if (expense.approvalRule) {
      const rule = await ApprovalRule.findById(expense.approvalRule);
      
      if (rule.type === 'sequential' && action === 'approve') {
        const currentStepApprovals = expense.approvals.filter(a => a.sequence === expense.currentApprovalStep);
        const currentStepComplete = currentStepApprovals.every(a => a.status === 'approved');
        
        if (currentStepComplete) {
          // Move to next step
          const nextStep = expense.currentApprovalStep + 1;
          const hasNextStep = expense.approvals.some(a => a.sequence === nextStep);
          
          if (hasNextStep) {
            expense.currentApprovalStep = nextStep;
          }
        }
      }
    }

    // Check if approval is complete
    const finalStatus = await checkApprovalCompletion(expense);
    expense.status = finalStatus;

    if (finalStatus !== 'pending') {
      expense.finalizedAt = new Date();
    }

    await expense.save();

    const updatedExpense = await Expense.findById(expense._id)
      .populate('employee', 'name email')
      .populate('approvalRule')
      .populate('approvals.approver', 'name email role');

    res.json({
      success: true,
      data: updatedExpense,
      message: action === 'approve' 
        ? finalStatus === 'approved' 
          ? 'Expense approved successfully!' 
          : 'Your approval has been recorded'
        : 'Expense rejected'
    });
  } catch (error) {
    console.error('Process approval error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get expense by ID
// @route   GET /api/expenses/:id
// @access  Private
export const getExpenseById = async (req, res) => {
  try {
    // Get company ID (handle both populated and unpopulated cases)
    const companyId = req.user.company?._id || req.user.company;

    const expense = await Expense.findOne({
      _id: req.params.id,
      company: companyId
    })
      .populate('employee', 'name email')
      .populate('approvalRule')
      .populate('approvals.approver', 'name email role');

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Check authorization
    if (req.user.role === 'employee' && expense.employee._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to view this expense' });
    }

    res.json({
      success: true,
      data: expense
    });
  } catch (error) {
    console.error('Get expense error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Helper function to find applicable approval rule
const findApplicableRule = async (companyId, amount, category) => {
  const rules = await ApprovalRule.find({
    company: companyId,
    isActive: true,
    $or: [
      { categories: { $size: 0 } },
      { categories: category }
    ]
  }).sort('-amountThreshold.min');

  for (const rule of rules) {
    const { min, max } = rule.amountThreshold;
    if (amount >= min && (max === null || amount <= max)) {
      return rule;
    }
  }

  return null;
};

// Helper function to initialize approval workflow
const initializeApprovalWorkflow = async (expense, employee) => {
  const approvals = [];
  let currentSequence = 0;

  if (!expense.approvalRule) {
    // Simple manager approval only
    const company = await employee.populate('company');
    if (company.company.settings.isManagerApprover && employee.manager) {
      approvals.push({
        approver: employee.manager,
        status: 'pending',
        sequence: currentSequence
      });
    }
    expense.approvals = approvals;
    await expense.save();
    return;
  }

  const rule = await ApprovalRule.findById(expense.approvalRule).populate('approvers.user').populate('specificApprover');
  
  // Step 1: Add manager approval if required
  if (rule.requireManagerFirst && employee.manager) {
    approvals.push({
      approver: employee.manager,
      status: 'pending',
      sequence: currentSequence++,
      role: 'manager'
    });
  }

  // Step 2: Add approvers based on rule type
  if (rule.type === 'sequential') {
    // Sequential approval: Manager → CFO → Director → CEO → CTO (in defined sequence)
    const sortedApprovers = [...rule.approvers].sort((a, b) => a.sequence - b.sequence);
    sortedApprovers.forEach(approver => {
      approvals.push({
        approver: approver.user._id,
        status: 'pending',
        sequence: currentSequence++,
        role: approver.user.role
      });
    });
  } else if (rule.type === 'percentage') {
    // Percentage approval: All approvers vote simultaneously (except excluded roles)
    rule.approvers.forEach(approver => {
      approvals.push({
        approver: approver.user._id,
        status: 'pending',
        sequence: currentSequence, // Same sequence for all (parallel voting)
        role: approver.user.role
      });
    });
  } else if (rule.type === 'specific') {
    // Specific approver rule: Only CFO (or specified person) needs to approve
    if (rule.specificApprover) {
      approvals.push({
        approver: rule.specificApprover._id,
        status: 'pending',
        sequence: currentSequence,
        role: rule.specificApprover.role
      });
    }
  } else if (rule.type === 'hybrid') {
    // Hybrid: Sequential approvers + percentage OR specific approver
    // Add sequential approvers first
    if (rule.approvers && rule.approvers.length > 0) {
      const sortedApprovers = [...rule.approvers].sort((a, b) => a.sequence - b.sequence);
      sortedApprovers.forEach(approver => {
        approvals.push({
          approver: approver.user._id,
          status: 'pending',
          sequence: currentSequence,
          role: approver.user.role
        });
      });
    }
    
    // Add specific approver if defined
    if (rule.specificApprover) {
      approvals.push({
        approver: rule.specificApprover._id,
        status: 'pending',
        sequence: currentSequence,
        role: rule.specificApprover.role
      });
    }
  }

  expense.approvals = approvals;
  expense.currentApprovalStep = 0;
  await expense.save();
};

// Helper function to check if approval is complete
const checkApprovalCompletion = async (expense) => {
  // Check if any rejection
  const hasRejection = expense.approvals.some(a => a.status === 'rejected');
  if (hasRejection) {
    return 'rejected';
  }

  if (!expense.approvalRule) {
    // Simple manager approval only
    const allApproved = expense.approvals.every(a => a.status === 'approved');
    return allApproved ? 'approved' : 'pending';
  }

  const rule = await ApprovalRule.findById(expense.approvalRule).populate('specificApprover');

  if (rule.type === 'sequential') {
    // Sequential approval: All approvers in sequence must approve
    // Check if current step is approved
    const currentStepApprovals = expense.approvals.filter(a => a.sequence === expense.currentApprovalStep);
    const currentStepComplete = currentStepApprovals.every(a => a.status === 'approved');
    
    if (!currentStepComplete) {
      return 'pending';
    }
    
    // Check if all approvals are complete
    const allApproved = expense.approvals.every(a => a.status === 'approved');
    return allApproved ? 'approved' : 'pending';
    
  } else if (rule.type === 'percentage') {
    // Percentage approval: X% of approvers (excluding specified roles) must approve
    // Example: If 60% of (Manager, CEO, CTO, Director) approve → auto-approve (CFO excluded)
    
    // Get approvals excluding the roles specified in excludeRolesFromPercentage
    const eligibleApprovals = expense.approvals.filter(a => 
      !rule.excludeRolesFromPercentage || 
      !rule.excludeRolesFromPercentage.includes(a.role)
    );
    
    if (eligibleApprovals.length === 0) {
      return 'pending';
    }
    
    const approvedCount = eligibleApprovals.filter(a => a.status === 'approved').length;
    const percentage = (approvedCount / eligibleApprovals.length) * 100;
    
    return percentage >= rule.percentageRequired ? 'approved' : 'pending';
    
  } else if (rule.type === 'specific') {
    // Specific approver rule: If CFO (or specific person) approves → auto-approve
    const specificApproval = expense.approvals.find(
      a => a.approver.toString() === rule.specificApprover._id.toString()
    );
    return specificApproval?.status === 'approved' ? 'approved' : 'pending';
    
  } else if (rule.type === 'hybrid') {
    // Hybrid rule: Percentage OR Specific Approver (whichever is satisfied first)
    
    // Check specific approver first (CFO auto-approval)
    if (rule.specificApprover) {
      const specificApproval = expense.approvals.find(
        a => a.approver.toString() === rule.specificApprover._id.toString()
      );
      if (specificApproval?.status === 'approved') {
        return 'approved';
      }
    }
    
    // Check percentage rule
    if (rule.percentageRequired) {
      // Get eligible approvals (excluding specific roles like CFO)
      const eligibleApprovals = expense.approvals.filter(a => 
        !rule.excludeRolesFromPercentage || 
        !rule.excludeRolesFromPercentage.includes(a.role)
      );
      
      if (eligibleApprovals.length > 0) {
        const approvedCount = eligibleApprovals.filter(a => a.status === 'approved').length;
        const percentage = (approvedCount / eligibleApprovals.length) * 100;
        
        if (percentage >= rule.percentageRequired) {
          return 'approved';
        }
      }
    }
  }

  return 'pending';
};

// @desc    Delete expense
// @route   DELETE /api/expenses/:id
// @access  Private (Admin or Expense Owner)
export const deleteExpense = async (req, res) => {
  try {
    const companyId = req.user.company?._id || req.user.company;
    
    const expense = await Expense.findOne({
      _id: req.params.id,
      company: companyId
    });

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Only admin or the expense owner can delete
    if (req.user.role !== 'admin' && expense.employee.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this expense' });
    }

    // Delete the expense
    await expense.deleteOne();

    res.json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
