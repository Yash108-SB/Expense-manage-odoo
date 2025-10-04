import mongoose from 'mongoose';

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true
  },
  country: {
    type: String,
    required: [true, 'Country is required']
  },
  currency: {
    code: {
      type: String,
      required: true,
      uppercase: true
    },
    symbol: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    }
  },
  settings: {
    isManagerApprover: {
      type: Boolean,
      default: true
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Company', companySchema);
