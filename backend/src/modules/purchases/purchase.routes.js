import express from 'express';
import {
  getPurchases,
  createPurchase,
  getPurchaseById,
  updatePurchase,
  deletePurchase
} from './purchase.controller.js';
import authenticate from '../../middleware/auth.js';
import { requireAdmin } from '../../middleware/roleCheck.js';

const router = express.Router();

router.use(authenticate); // Require authentication for all purchase routes

router.get('/', getPurchases);
router.post('/', createPurchase);
router.get('/:id', getPurchaseById);
router.put('/:id', requireAdmin, updatePurchase);
router.delete('/:id', requireAdmin, deletePurchase);

export default router;
