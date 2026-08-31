import express from 'express';
import {
  getInvoices,
  createInvoice,
  getInvoiceById,
  updateInvoice,
  deleteInvoice
} from './invoice.controller.js';
import authenticate from '../../middleware/auth.js';
import { requireAdmin } from '../../middleware/roleCheck.js';

const router = express.Router();

// Apply authentication to all invoice routes
router.use(authenticate);

router.get('/', getInvoices);
router.post('/', createInvoice);
router.get('/:id', getInvoiceById);

// Admin-only operations
router.put('/:id', requireAdmin, updateInvoice);
router.delete('/:id', requireAdmin, deleteInvoice);

export default router;
