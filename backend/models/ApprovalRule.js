import mongoose from 'mongoose';

const approvalRuleSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['sequential', 'percentage', 'specific', 'hybrid'],
    required: true
  },
  // Sequential approval configuration
  approvers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    sequence: {
      type: Number,
      required: true
    },
    role: {
      type: String,
      trim: true
    }
  }],
  // Percentage-based approval
  percentageRequired: {
    type: Number,
    min: 1,
    max: 100,
    default: null
  },
  // Exclude specific roles from percentage calculation (e.g., CFO for auto-approval)
  excludeRolesFromPercentage: [{
    type: String,
    enum: ['ceo', 'cfo', 'cto', 'director', 'manager']
  }],
  // Specific approver rule
  specificApprover: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // Require manager approval first (before other approvers)
  requireManagerFirst: {
    type: Boolean,
    default: false
  },
  // Threshold conditions
  amountThreshold: {
    min: {
      type: Number,
      default: 0
    },
    max: {
      type: Number,
      default: null
    }
  },
  // Categories this rule applies to
  categories: [{
    type: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('ApprovalRule', approvalRuleSchema);
