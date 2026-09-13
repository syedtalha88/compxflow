import express from 'express';
import {
  createPurchasePayment,
  getPurchasePayments,
  deletePurchasePayment
} from './purchasePayment.controller.js';
import authenticate from '../../middleware/auth.js';
import { requireAdmin } from '../../middleware/roleCheck.js';

const router = express.Router();

router.use(authenticate); // Require authentication for all purchase payment routes

router.post('/', createPurchasePayment);
router.get('/', getPurchasePayments);
router.delete('/:id', requireAdmin, deletePurchasePayment);

export default router;
