import express from 'express';
import {
  getApprovalRules,
  createApprovalRule,
  updateApprovalRule,
  deleteApprovalRule
} from '../controllers/approvalRuleController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', authorize('admin', 'manager', 'ceo', 'cfo', 'cto', 'director'), getApprovalRules);
router.post('/', authorize('admin'), createApprovalRule);
router.put('/:id', authorize('admin'), updateApprovalRule);
router.delete('/:id', authorize('admin'), deleteApprovalRule);

export default router;
