import express from 'express';
import {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense
} from './expense.controller.js';
import authenticate from '../../middleware/auth.js';
import { requireAdmin } from '../../middleware/roleCheck.js';

const router = express.Router();

router.use(authenticate); // Require authentication for all expense routes

router.get('/', getExpenses);
router.post('/', createExpense);
router.put('/:id', requireAdmin, updateExpense);
router.delete('/:id', requireAdmin, deleteExpense);

export default router;
