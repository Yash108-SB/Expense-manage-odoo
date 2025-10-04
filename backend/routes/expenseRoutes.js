import express from 'express';
import {
  createExpense,
  getExpenses,
  getExpenseById,
  getPendingApprovals,
  processApproval,
  uploadReceipt,
  upload,
  deleteExpense
} from '../controllers/expenseController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/', createExpense);
router.get('/', getExpenses);
router.post('/upload-receipt', upload.single('receipt'), uploadReceipt);
router.get('/pending-approvals', authorize('admin', 'manager', 'ceo', 'cfo', 'cto', 'director'), getPendingApprovals);
router.get('/:id', getExpenseById);
router.put('/:id/approve', authorize('admin', 'manager', 'ceo', 'cfo', 'cto', 'director'), processApproval);
router.delete('/:id', deleteExpense);

export default router;
