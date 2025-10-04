import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Expense from '../models/Expense.js';
import ApprovalRule from '../models/ApprovalRule.js';

dotenv.config();

const seedDatabase = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // Clear existing data
    console.log('Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Company.deleteMany({}),
      Expense.deleteMany({}),
      ApprovalRule.deleteMany({})
    ]);
    console.log('✓ Database cleared');

    // Create Company
    console.log('Creating company...');
    const company = await Company.create({
      name: 'Demo Tech Solutions',
      country: 'United States',
      currency: {
        code: 'USD',
        symbol: '$',
        name: 'US Dollar'
      },
      settings: {
        isManagerApprover: true
      }
    });
    console.log('✓ Company created');

    // Create Admin User
    console.log('Creating admin user...');
    const admin = await User.create({
      email: 'admin@demo.com',
      password: 'admin123',
      name: 'Admin User',
      role: 'admin',
      company: company._id,
      isActive: true
    });
    console.log('✓ Admin created');

    // Create Manager
    console.log('Creating manager...');
    const manager = await User.create({
      email: 'manager@demo.com',
      password: 'manager123',
      name: 'Jane Manager',
      role: 'manager',
      company: company._id,
      isActive: true
    });
    console.log('✓ Manager created');

    // Create Employees
    console.log('Creating employees...');
    const employee1 = await User.create({
      email: 'john@demo.com',
      password: 'employee123',
      name: 'John Employee',
      role: 'employee',
      company: company._id,
      manager: manager._id,
      isActive: true
    });

    const employee2 = await User.create({
      email: 'sarah@demo.com',
      password: 'employee123',
      name: 'Sarah Developer',
      role: 'employee',
      company: company._id,
      manager: manager._id,
      isActive: true
    });
    console.log('✓ Employees created');

    // Create Approval Rules
    console.log('Creating approval rules...');
    const rule1 = await ApprovalRule.create({
      company: company._id,
      name: 'Standard Approval (Under $500)',
      description: 'Manager approval for expenses under $500',
      type: 'sequential',
      approvers: [
        { user: manager._id, sequence: 0, role: 'Manager' }
      ],
      amountThreshold: { min: 0, max: 500 },
      categories: [],
      isActive: true
    });

    const rule2 = await ApprovalRule.create({
      company: company._id,
      name: 'High Value Approval (Over $500)',
      description: 'Manager + Admin approval for high-value expenses',
      type: 'sequential',
      approvers: [
        { user: manager._id, sequence: 0, role: 'Manager' },
        { user: admin._id, sequence: 1, role: 'Admin' }
      ],
      amountThreshold: { min: 500, max: null },
      categories: [],
      isActive: true
    });
    console.log('✓ Approval rules created');

    // Create Sample Expenses
    console.log('Creating sample expenses...');
    
    // Pending expense for employee1
    await Expense.create({
      employee: employee1._id,
      company: company._id,
      title: 'Client Lunch Meeting',
      description: 'Lunch with potential client to discuss project requirements',
      amount: 85.50,
      currency: 'USD',
      convertedAmount: 85.50,
      companyCurrency: 'USD',
      exchangeRate: 1,
      category: 'Food',
      expenseDate: new Date('2025-10-01'),
      merchantName: 'The Italian Restaurant',
      status: 'pending',
      approvalRule: rule1._id,
      approvals: [
        { approver: manager._id, status: 'pending', sequence: 0 }
      ],
      expenseLines: [
        { description: 'Main Course', amount: 45.00, category: 'Food' },
        { description: 'Drinks', amount: 25.50, category: 'Food' },
        { description: 'Tip', amount: 15.00, category: 'Food' }
      ]
    });

    // Approved expense
    await Expense.create({
      employee: employee1._id,
      company: company._id,
      title: 'Office Supplies - Notebooks',
      description: 'Purchased notebooks and pens for team',
      amount: 45.00,
      currency: 'USD',
      convertedAmount: 45.00,
      companyCurrency: 'USD',
      exchangeRate: 1,
      category: 'Office Supplies',
      expenseDate: new Date('2025-09-28'),
      merchantName: 'Staples',
      status: 'approved',
      approvalRule: rule1._id,
      approvals: [
        { 
          approver: manager._id, 
          status: 'approved', 
          sequence: 0,
          comments: 'Approved - necessary supplies',
          approvedAt: new Date('2025-09-29')
        }
      ],
      finalizedAt: new Date('2025-09-29')
    });

    // High-value pending expense
    await Expense.create({
      employee: employee2._id,
      company: company._id,
      title: 'Conference Registration - TechCon 2025',
      description: 'Annual technology conference registration fee',
      amount: 1250.00,
      currency: 'USD',
      convertedAmount: 1250.00,
      companyCurrency: 'USD',
      exchangeRate: 1,
      category: 'Training',
      expenseDate: new Date('2025-10-02'),
      merchantName: 'TechCon Events',
      status: 'pending',
      approvalRule: rule2._id,
      approvals: [
        { approver: manager._id, status: 'pending', sequence: 0 },
        { approver: admin._id, status: 'pending', sequence: 1 }
      ]
    });

    // Rejected expense
    await Expense.create({
      employee: employee2._id,
      company: company._id,
      title: 'Personal Laptop Purchase',
      description: 'New laptop for personal use',
      amount: 1500.00,
      currency: 'USD',
      convertedAmount: 1500.00,
      companyCurrency: 'USD',
      exchangeRate: 1,
      category: 'Equipment',
      expenseDate: new Date('2025-09-25'),
      merchantName: 'Best Buy',
      status: 'rejected',
      approvalRule: rule2._id,
      approvals: [
        { 
          approver: manager._id, 
          status: 'rejected', 
          sequence: 0,
          comments: 'This appears to be a personal expense, not eligible for company reimbursement',
          approvedAt: new Date('2025-09-26')
        }
      ],
      finalizedAt: new Date('2025-09-26')
    });

    // Travel expense
    await Expense.create({
      employee: employee1._id,
      company: company._id,
      title: 'Flight to NYC - Client Meeting',
      description: 'Round trip flight for client presentation',
      amount: 450.00,
      currency: 'USD',
      convertedAmount: 450.00,
      companyCurrency: 'USD',
      exchangeRate: 1,
      category: 'Travel',
      expenseDate: new Date('2025-10-03'),
      merchantName: 'American Airlines',
      status: 'pending',
      approvalRule: rule1._id,
      approvals: [
        { approver: manager._id, status: 'pending', sequence: 0 }
      ]
    });

    console.log('✓ Sample expenses created');

    console.log('\n========================================');
    console.log('Database seeding completed! 🎉');
    console.log('========================================\n');
    console.log('Test Accounts:');
    console.log('-------------------');
    console.log('Admin:');
    console.log('  Email: admin@demo.com');
    console.log('  Password: admin123\n');
    console.log('Manager:');
    console.log('  Email: manager@demo.com');
    console.log('  Password: manager123\n');
    console.log('Employees:');
    console.log('  Email: john@demo.com');
    console.log('  Password: employee123');
    console.log('  Email: sarah@demo.com');
    console.log('  Password: employee123\n');
    console.log('Sample Data:');
    console.log('  - 5 expenses (2 pending, 1 approved, 1 rejected, 1 travel)');
    console.log('  - 2 approval rules');
    console.log('  - 1 company with USD currency\n');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
