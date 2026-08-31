import express from 'express';
import {
  createPayment,
  getPayments,
  deletePayment
} from './payment.controller.js';
import authenticate from '../../middleware/auth.js';
import { requireAdmin } from '../../middleware/roleCheck.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getPayments);
router.post('/', createPayment);
router.delete('/:id', requireAdmin, deletePayment);

export default router;
