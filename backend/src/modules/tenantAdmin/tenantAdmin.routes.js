import express from 'express';
import {
  createTenantUser,
  getTenantUsers,
  deleteTenantUser
} from './tenantAdmin.controller.js';
import authenticate from '../../middleware/auth.js';
import { requireAdmin } from '../../middleware/roleCheck.js';

const router = express.Router();

// Require authentication & Factory Admin role for staff management
router.use(authenticate);
router.use(requireAdmin);

router.post('/users', createTenantUser);
router.get('/users', getTenantUsers);
router.delete('/users/:userId', deleteTenantUser);

export default router;
