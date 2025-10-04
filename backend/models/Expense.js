import mongoose from 'mongoose';

const expenseLineSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    required: true
  }
});

const expenseSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Expense title is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: 0
  },
  currency: {
    type: String,
    required: true,
    uppercase: true
  },
  convertedAmount: {
    type: Number,
    required: true
  },
  companyCurrency: {
    type: String,
    required: true,
    uppercase: true
  },
  exchangeRate: {
    type: Number,
    default: 1
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Travel', 'Food', 'Office Supplies', 'Equipment', 'Utilities', 'Marketing', 'Training', 'Entertainment', 'Other']
  },
  expenseDate: {
    type: Date,
    required: [true, 'Expense date is required'],
    default: Date.now
  },
  expenseLines: [expenseLineSchema],
  merchantName: {
    type: String,
    trim: true
  },
  receipt: {
    filename: String,
    path: String,
    mimetype: String,
    size: Number
  },
  ocrData: {
    extractedText: String,
    confidence: Number,
    extractedAt: Date
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  currentApprovalStep: {
    type: Number,
    default: 0
  },
  approvalRule: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ApprovalRule'
  },
  approvals: [{
    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['admin', 'ceo', 'cfo', 'cto', 'director', 'manager', 'employee']
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    comments: String,
    approvedAt: Date,
    sequence: Number
  }],
  submittedAt: {
    type: Date,
    default: Date.now
  },
  finalizedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
expenseSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Expense', expenseSchema);
