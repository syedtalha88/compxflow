import express from 'express';
import {
  getDayReport,
  getMonthReport,
  getRangeReport,
  exportPdfReport,
  exportExcelReport
} from './report.controller.js';
import authenticate from '../../middleware/auth.js';
import { requireAdmin } from '../../middleware/roleCheck.js';

const router = express.Router();

// Require authentication & Admin role for all report routes (Rule #7 & Phase 6 Checkpoint 201)
router.use(authenticate);
router.use(requireAdmin);

router.get('/day', getDayReport);
router.get('/month', getMonthReport);
router.get('/range', getRangeReport);
router.get('/export/pdf', exportPdfReport);
router.get('/export/excel', exportExcelReport);

export default router;
