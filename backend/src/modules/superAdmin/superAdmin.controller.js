import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Tenant from '../../models/Tenant.js';
import User from '../../models/User.js';
import TenantUser from '../../models/TenantUser.js';
import Invoice from '../../models/Invoice.js';
import Purchase from '../../models/Purchase.js';
import Expense from '../../models/Expense.js';
import Payment from '../../models/Payment.js';
import PurchasePayment from '../../models/PurchasePayment.js';
import OcrJob from '../../models/OcrJob.js';
import RefreshToken from '../../models/RefreshToken.js';
import cloudinary from '../../config/cloudinary.js';
import ApiError from '../../utils/apiError.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { successResponse, paginatedResponse } from '../../utils/apiResponse.js';
import escapeRegex from '../../utils/escapeRegex.js';

// ─── 1. GET /api/super-admin/dashboard ──────────────────────────────────────────
// Platform overview: tenant counts, record counts, recently registered tenants
export const getDashboardStats = asyncHandler(async (req, res) => {
  const [
    totalTenants,
    activeTenants,
    suspendedTenants,
    freePlanTenants,
    proPlanTenants,
    totalInvoices,
    totalPurchases,
    totalExpenses,
    recentTenants
  ] = await Promise.all([
    Tenant.countDocuments(),
    Tenant.countDocuments({ status: 'active' }),
    Tenant.countDocuments({ status: 'suspended' }),
    Tenant.countDocuments({ plan: 'free' }),
    Tenant.countDocuments({ plan: 'pro' }),
    Invoice.countDocuments(),
    Purchase.countDocuments(),
    Expense.countDocuments(),
    Tenant.find().sort({ createdAt: -1 }).limit(5).lean()
  ]);

  return successResponse(res, 200, {
    tenants: {
      total: totalTenants,
      active: activeTenants,
      suspended: suspendedTenants,
      free: freePlanTenants,
      pro: proPlanTenants
    },
    records: {
      invoices: totalInvoices,
      purchases: totalPurchases,
      expenses: totalExpenses
    },
    recentTenants: recentTenants.map(t => ({
      id: t._id,
      name: t.name,
      slug: t.slug,
      plan: t.plan || 'free',
      status: t.status || 'active',
      createdAt: t.createdAt
    }))
  }, 'Platform dashboard stats retrieved');
});

// ─── 2. GET /api/super-admin/tenants ────────────────────────────────────────────
// Paginated tenant list with search, status filter, plan filter
export const listTenants = asyncHandler(async (req, res) => {
  const {
    search = '',
    status = '',
    plan = '',
    page = 1,
    limit = 20
  } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const filter = {};

  if (status && ['active', 'suspended'].includes(status)) {
    filter.status = status;
  }
  if (plan && ['free', 'pro'].includes(plan)) {
    filter.plan = plan;
  }
  if (search.trim()) {
    const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
    filter.$or = [
      { name: searchRegex },
      { slug: searchRegex }
    ];
  }

  const [total, tenants] = await Promise.all([
    Tenant.countDocuments(filter),
    Tenant.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean()
  ]);

  // Batch-fetch invoice counts for all tenants on this page
  const tenantIds = tenants.map(t => t._id);
  const invoiceCounts = await Invoice.aggregate([
    { $match: { tenantId: { $in: tenantIds } } },
    { $group: { _id: '$tenantId', count: { $sum: 1 } } }
  ]);
  const invoiceCountMap = {};
  invoiceCounts.forEach(ic => { invoiceCountMap[ic._id.toString()] = ic.count; });

  const data = tenants.map(t => ({
    id: t._id,
    name: t.name,
    slug: t.slug,
    plan: t.plan || 'free',
    status: t.status || 'active',
    invoices: invoiceCountMap[t._id.toString()] || 0,
    createdAt: t.createdAt
  }));

  return paginatedResponse(res, 200, data, {
    page: pageNum,
    limit: limitNum,
    total,
    pages: Math.ceil(total / limitNum)
  }, 'Tenants retrieved');
});

// ─── 3. GET /api/super-admin/tenants/:id ────────────────────────────────────────
// Deep-dive detail for a single tenant
export const getTenantDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'INVALID_ID', 'Invalid tenant ID format');
  }

  const tenant = await Tenant.findById(id).lean();
  if (!tenant) {
    throw new ApiError(404, 'TENANT_NOT_FOUND', 'Tenant not found');
  }

  // Users associated with this tenant (no password/pin hashes)
  const tenantUsers = await TenantUser.find({ tenantId: tenant._id }).lean();
  const userIds = tenantUsers.map(tu => tu.userId);
  const users = await User.find({ _id: { $in: userIds } }).select('email createdAt').lean();
  const userMap = {};
  users.forEach(u => { userMap[u._id.toString()] = u; });

  const usersData = tenantUsers.map(tu => {
    const u = userMap[tu.userId.toString()];
    return {
      id: tu.userId,
      email: u?.email || 'unknown',
      role: tu.role,
      createdAt: u?.createdAt || tu.createdAt
    };
  });

  // Record counts
  const [invoiceCount, purchaseCount, expenseCount, ocrJobCount] = await Promise.all([
    Invoice.countDocuments({ tenantId: tenant._id }),
    Purchase.countDocuments({ tenantId: tenant._id }),
    Expense.countDocuments({ tenantId: tenant._id }),
    OcrJob.countDocuments({ tenantId: tenant._id })
  ]);

  // Monthly invoice activity — last 6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const monthlyActivity = await Invoice.aggregate([
    {
      $match: {
        tenantId: tenant._id,
        createdAt: { $gte: sixMonthsAgo }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        count: { $sum: 1 },
        totalValue: { $sum: '$totalAmount' }
      }
    },
    { $sort: { '_id.year': -1, '_id.month': -1 } }
  ]);

  const monthlyActivityData = monthlyActivity.map(m => ({
    year: m._id.year,
    month: m._id.month,
    label: `${m._id.year}-${String(m._id.month).padStart(2, '0')}`,
    invoiceCount: m.count,
    totalValue: m.totalValue
  }));

  // Recent invoices — last 5
  const recentInvoices = await Invoice.find({ tenantId: tenant._id })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('billNo customerName totalAmount status createdAt')
    .lean();

  return successResponse(res, 200, {
    tenant: {
      id: tenant._id,
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.plan || 'free',
      status: tenant.status || 'active',
      createdAt: tenant.createdAt
    },
    users: usersData,
    counts: {
      invoices: invoiceCount,
      purchases: purchaseCount,
      expenses: expenseCount,
      ocrJobs: ocrJobCount
    },
    monthlyActivity: monthlyActivityData,
    recentInvoices: recentInvoices.map(inv => ({
      id: inv._id,
      billNo: inv.billNo,
      customerName: inv.customerName,
      totalAmount: inv.totalAmount,
      status: inv.status,
      createdAt: inv.createdAt
    }))
  }, 'Tenant detail retrieved');
});

// ─── 4. PUT /api/super-admin/tenants/:id ────────────────────────────────────────
// Update tenant status (active/suspended) or plan (free/pro)
export const updateTenant = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, plan } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'INVALID_ID', 'Invalid tenant ID format');
  }

  const tenant = await Tenant.findById(id);
  if (!tenant) {
    throw new ApiError(404, 'TENANT_NOT_FOUND', 'Tenant not found');
  }

  if (status && ['active', 'suspended'].includes(status)) {
    tenant.status = status;
  }
  if (plan && ['free', 'pro'].includes(plan)) {
    tenant.plan = plan;
  }

  await tenant.save();

  return successResponse(res, 200, {
    id: tenant._id,
    name: tenant.name,
    slug: tenant.slug,
    plan: tenant.plan,
    status: tenant.status
  }, `Tenant '${tenant.name}' updated successfully`);
});

// ─── 5. DELETE /api/super-admin/tenants/:id ─────────────────────────────────────
// Cascading delete with Cloudinary cleanup. Requires x-confirm-delete header = slug.
export const deleteTenant = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'INVALID_ID', 'Invalid tenant ID format');
  }

  const tenant = await Tenant.findById(id).lean();
  if (!tenant) {
    throw new ApiError(404, 'TENANT_NOT_FOUND', 'Tenant not found');
  }

  // Second layer of protection: x-confirm-delete header must match slug exactly
  const confirmSlug = req.headers['x-confirm-delete'];
  if (!confirmSlug || confirmSlug !== tenant.slug) {
    throw new ApiError(400, 'CONFIRMATION_REQUIRED', 'Delete confirmation header must match the tenant slug exactly');
  }

  const tenantId = tenant._id;

  // ── Collect all Cloudinary public IDs to bulk-delete ──
  const cloudinaryPublicIds = [];

  const invoices = await Invoice.find({ tenantId }).select('billImagePublicId').lean();
  invoices.forEach(inv => {
    if (inv.billImagePublicId) cloudinaryPublicIds.push(inv.billImagePublicId);
  });

  const payments = await Payment.find({ tenantId }).select('receiptImagePublicId').lean();
  payments.forEach(p => {
    if (p.receiptImagePublicId) cloudinaryPublicIds.push(p.receiptImagePublicId);
  });

  const purchases = await Purchase.find({ tenantId }).select('billImagePublicId').lean();
  purchases.forEach(p => {
    if (p.billImagePublicId) cloudinaryPublicIds.push(p.billImagePublicId);
  });

  const purchasePayments = await PurchasePayment.find({ tenantId }).select('receiptImagePublicId').lean();
  purchasePayments.forEach(pp => {
    if (pp.receiptImagePublicId) cloudinaryPublicIds.push(pp.receiptImagePublicId);
  });

  const expenses = await Expense.find({ tenantId }).select('imagePublicId').lean();
  expenses.forEach(e => {
    if (e.imagePublicId) cloudinaryPublicIds.push(e.imagePublicId);
  });

  // ── Delete Cloudinary images in batches of 100 ──
  if (cloudinaryPublicIds.length > 0) {
    const batchSize = 100;
    for (let i = 0; i < cloudinaryPublicIds.length; i += batchSize) {
      const batch = cloudinaryPublicIds.slice(i, i + batchSize);
      try {
        await cloudinary.api.delete_resources(batch);
      } catch (cloudErr) {
        // Log but don't block deletion — images may already be gone
        console.error(`Cloudinary batch delete warning (batch ${Math.floor(i / batchSize) + 1}):`, cloudErr.message);
      }
    }
  }

  // ── Cascading database delete (order matters for referential integrity) ──
  await Payment.deleteMany({ tenantId });
  await Invoice.deleteMany({ tenantId });
  await PurchasePayment.deleteMany({ tenantId });
  await Purchase.deleteMany({ tenantId });
  await Expense.deleteMany({ tenantId });
  await OcrJob.deleteMany({ tenantId });
  await TenantUser.deleteMany({ tenantId });
  await RefreshToken.deleteMany({ tenantId });
  await Tenant.findByIdAndDelete(tenantId);

  // Note: User documents are NOT deleted (per spec — emails may be reused across tenants)

  return successResponse(res, 200, {
    deletedTenantSlug: tenant.slug,
    cloudinaryImagesDeleted: cloudinaryPublicIds.length
  }, `Tenant '${tenant.name}' and all associated data permanently deleted`);
});

// ─── 6. POST /api/super-admin/tenants ───────────────────────────────────────────
// Provision a new factory tenant with initial admin user
export const createTenantByAdmin = asyncHandler(async (req, res) => {
  const { tenantName, slug, adminEmail, adminPassword } = req.body;

  if (!tenantName || !slug || !adminEmail || !adminPassword) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'tenantName, slug, adminEmail, and adminPassword are required');
  }

  const cleanSlug = slug.trim().toLowerCase();

  // Validate slug format
  const slugRegex = /^[a-z0-9-]+$/;
  if (cleanSlug.length < 3 || cleanSlug.length > 30 || !slugRegex.test(cleanSlug)) {
    throw new ApiError(400, 'INVALID_SLUG', 'Slug must be 3-30 lowercase alphanumeric characters or hyphens only');
  }

  if (adminPassword.length < 8) {
    throw new ApiError(400, 'WEAK_PASSWORD', 'Password must be at least 8 characters long');
  }

  // Check duplicate slug
  const existingTenant = await Tenant.findOne({ slug: cleanSlug });
  if (existingTenant) {
    throw new ApiError(409, 'SLUG_TAKEN', `Subdomain slug '${cleanSlug}' is already registered`);
  }

  // Attempt atomic transaction, fall back for standalone Mongo
  const session = await mongoose.startSession();
  let tenant, user;

  try {
    session.startTransaction();

    tenant = new Tenant({ name: tenantName.trim(), slug: cleanSlug, status: 'active' });
    await tenant.save({ session });

    let existingUser = await User.findOne({ email: adminEmail.toLowerCase().trim() }).session(session);
    if (!existingUser) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(adminPassword, salt);
      existingUser = new User({ email: adminEmail.toLowerCase().trim(), passwordHash });
      await existingUser.save({ session });
    }

    user = existingUser;

    const tenantUser = new TenantUser({
      tenantId: tenant._id,
      userId: user._id,
      role: 'admin'
    });
    await tenantUser.save({ session });

    await session.commitTransaction();
  } catch (txErr) {
    await session.abortTransaction();
    if (txErr.message && txErr.message.includes('Transaction numbers are only allowed')) {
      // Fallback for standalone Mongo without replica set
      tenant = await Tenant.create({ name: tenantName.trim(), slug: cleanSlug, status: 'active' });

      let existingUser = await User.findOne({ email: adminEmail.toLowerCase().trim() });
      if (!existingUser) {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(adminPassword, salt);
        existingUser = await User.create({ email: adminEmail.toLowerCase().trim(), passwordHash });
      }
      user = existingUser;

      await TenantUser.create({ tenantId: tenant._id, userId: user._id, role: 'admin' });
    } else {
      throw txErr;
    }
  } finally {
    session.endSession();
  }

  return successResponse(res, 201, {
    tenant: {
      id: tenant._id,
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.plan || 'free',
      status: tenant.status || 'active'
    },
    adminUser: { id: user._id, email: user.email, role: 'admin' }
  }, `Factory workspace '${tenant.name}' provisioned successfully`);
});
