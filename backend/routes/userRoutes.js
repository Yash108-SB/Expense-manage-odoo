import express from 'express';
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getManagers,
  resendWelcomeEmail,
  sendBulkWelcomeEmail,
  sendPasswordResetEmailToUser
} from '../controllers/userController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', authorize('admin', 'manager'), getUsers);
router.post('/', authorize('admin'), createUser);
router.get('/managers', authorize('admin'), getManagers);

// Email routes
router.post('/bulk-welcome-email', authorize('admin'), sendBulkWelcomeEmail);
router.post('/:id/resend-welcome', authorize('admin'), resendWelcomeEmail);
router.post('/:id/password-reset-email', authorize('admin'), sendPasswordResetEmailToUser);

// User management routes
router.put('/:id', authorize('admin'), updateUser);
router.delete('/:id', authorize('admin'), deleteUser);

export default router;
