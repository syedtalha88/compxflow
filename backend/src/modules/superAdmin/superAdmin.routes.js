import express from 'express';
import requireSuperAdminKey from '../../middleware/superAdminKey.js';
import {
  getDashboardStats,
  listTenants,
  getTenantDetail,
  updateTenant,
  deleteTenant,
  createTenantByAdmin
} from './superAdmin.controller.js';

const router = express.Router();

// All super admin routes require the secret key as the FIRST middleware
router.use(requireSuperAdminKey);

// Platform overview dashboard
router.get('/dashboard', getDashboardStats);

// Tenant CRUD
router.get('/tenants', listTenants);
router.get('/tenants/:id', getTenantDetail);
router.post('/tenants', createTenantByAdmin);
router.put('/tenants/:id', updateTenant);
router.delete('/tenants/:id', deleteTenant);

export default router;
