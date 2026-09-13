import mongoose from 'mongoose';
import Purchase from '../../models/Purchase.js';
import PurchasePayment from '../../models/PurchasePayment.js';
import cloudinary from '../../config/cloudinary.js';
import ApiError from '../../utils/apiError.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { successResponse, paginatedResponse } from '../../utils/apiResponse.js';
import escapeRegex from '../../utils/escapeRegex.js';

/**
 * Helper to strip monetary fields if user role is 'member' (Rule #7)
 */
const sanitizePurchaseForRole = (purchaseDoc, role) => {
  const purchase = purchaseDoc.toObject ? purchaseDoc.toObject() : { ...purchaseDoc };
  if (role === 'member') {
    delete purchase.totalAmount;
    delete purchase.amountPaid;
    delete purchase.amountPending;
  }
  return purchase;
};

/**
 * GET /api/purchases
 * Query: ?status=pending&page=1&limit=20&search=&startDate=&endDate=
 */
export const getPurchases = asyncHandler(async (req, res) => {
  const tenantId = req.tenant.id;
  const role = req.user.role;
  const { status, search, startDate, endDate, page = 1, limit = 20 } = req.query;

  const query = { tenantId };

  // Status Filter
  if (status && ['pending', 'partially_paid', 'paid'].includes(status)) {
    query.status = status;
  }

  // Search Filter (billNo or supplierName)
  if (search && search.trim() !== '') {
    const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
    query.$or = [
      { billNo: searchRegex },
      { supplierName: searchRegex }
    ];
  }

  // Date Range Filter
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      query.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      if (!endDate.includes('T')) {
        end.setHours(23, 59, 59, 999);
      }
      query.createdAt.$lte = end;
    }
  }

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const total = await Purchase.countDocuments(query);
  const purchases = await Purchase.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  const sanitizedPurchases = purchases.map(pur => sanitizePurchaseForRole(pur, role));

  return paginatedResponse(res, 200, sanitizedPurchases, {
    page: pageNum,
    limit: limitNum,
    total,
    pages: Math.ceil(total / limitNum)
  }, 'Purchases retrieved successfully');
});

/**
 * POST /api/purchases
 * Body: { billNo, supplierName, totalAmount, billImageUrl, billImagePublicId }
 */
export const createPurchase = asyncHandler(async (req, res) => {
  const tenantId = req.tenant.id;
  const role = req.user.role;
  const { billNo, supplierName, totalAmount, billImageUrl, billImagePublicId } = req.body;

  if (!billNo || !supplierName || totalAmount === undefined || !billImageUrl || !billImagePublicId) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'billNo, supplierName, totalAmount, billImageUrl, and billImagePublicId are required');
  }

  const parsedAmount = parseFloat(totalAmount);
  if (isNaN(parsedAmount) || parsedAmount < 0) {
    throw new ApiError(400, 'INVALID_AMOUNT', 'Total amount must be a non-negative number');
  }

  const cleanBillNo = billNo.trim().toUpperCase();

  // Check duplicate bill number within same tenant
  const existingPurchase = await Purchase.findOne({ tenantId, billNo: cleanBillNo });
  if (existingPurchase) {
    throw new ApiError(409, 'DUPLICATE_BILL_NO', `A purchase bill with number '${cleanBillNo}' already exists for this factory`);
  }

  const purchase = new Purchase({
    tenantId,
    billNo: cleanBillNo,
    supplierName: supplierName.trim(),
    totalAmount: parsedAmount,
    amountPaid: 0,
    billImageUrl,
    billImagePublicId
  });

  await purchase.save(); // Pre-validate hook computes amountPending & status

  const sanitized = sanitizePurchaseForRole(purchase, role);
  return successResponse(res, 201, sanitized, 'Purchase record created successfully');
});

/**
 * GET /api/purchases/:id
 * Single purchase details + populated purchase payments array
 */
export const getPurchaseById = asyncHandler(async (req, res) => {
  const tenantId = req.tenant.id;
  const role = req.user.role;
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'INVALID_ID', 'Invalid purchase ID format');
  }

  const purchase = await Purchase.findOne({ _id: id, tenantId });
  if (!purchase) {
    throw new ApiError(404, 'PURCHASE_NOT_FOUND', 'Purchase record not found');
  }

  const payments = await PurchasePayment.find({ tenantId, purchaseId: id }).sort({ capturedAt: -1 });

  const sanitizedPurchase = sanitizePurchaseForRole(purchase, role);

  const sanitizedPayments = payments.map(p => {
    const pObj = p.toObject();
    if (role === 'member') {
      delete pObj.amount;
    }
    return pObj;
  });

  return successResponse(res, 200, {
    ...sanitizedPurchase,
    payments: sanitizedPayments
  }, 'Purchase details retrieved successfully');
});

/**
 * PUT /api/purchases/:id (Admin Only)
 * Body: { supplierName, totalAmount }
 */
export const updatePurchase = asyncHandler(async (req, res) => {
  const tenantId = req.tenant.id;
  const role = req.user.role;
  const { id } = req.params;
  const { supplierName, totalAmount } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'INVALID_ID', 'Invalid purchase ID format');
  }

  const purchase = await Purchase.findOne({ _id: id, tenantId });
  if (!purchase) {
    throw new ApiError(404, 'PURCHASE_NOT_FOUND', 'Purchase record not found');
  }

  if (supplierName) purchase.supplierName = supplierName.trim();
  if (totalAmount !== undefined) {
    const parsed = parseFloat(totalAmount);
    if (isNaN(parsed) || parsed < 0) {
      throw new ApiError(400, 'INVALID_AMOUNT', 'Total amount must be a non-negative number');
    }
    purchase.totalAmount = parsed;
  }

  await purchase.save(); // Pre-validate hook recalculates pending amount & status

  const sanitized = sanitizePurchaseForRole(purchase, role);
  return successResponse(res, 200, sanitized, 'Purchase updated successfully');
});

/**
 * DELETE /api/purchases/:id (Admin Only)
 * Cascade deletes Purchase, PurchasePayment records, and Cloudinary images
 */
export const deletePurchase = asyncHandler(async (req, res) => {
  const tenantId = req.tenant.id;
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'INVALID_ID', 'Invalid purchase ID format');
  }

  const purchase = await Purchase.findOne({ _id: id, tenantId });
  if (!purchase) {
    throw new ApiError(404, 'PURCHASE_NOT_FOUND', 'Purchase record not found');
  }

  // Find all purchase payments for Cloudinary image cleanup
  const payments = await PurchasePayment.find({ tenantId, purchaseId: id });

  // Delete main bill image from Cloudinary
  if (purchase.billImagePublicId) {
    try {
      await cloudinary.uploader.destroy(purchase.billImagePublicId);
    } catch (err) {
      console.error('Cloudinary destroy purchase bill error:', err.message);
    }
  }

  // Delete all payment receipt images from Cloudinary
  for (const pay of payments) {
    if (pay.receiptImagePublicId) {
      try {
        await cloudinary.uploader.destroy(pay.receiptImagePublicId);
      } catch (err) {
        console.error('Cloudinary destroy purchase payment receipt error:', err.message);
      }
    }
  }

  // Cascade delete in MongoDB
  await PurchasePayment.deleteMany({ tenantId, purchaseId: id });
  await Purchase.deleteOne({ _id: id, tenantId });

  return successResponse(res, 200, {}, 'Purchase record and associated payments deleted successfully');
});

export default {
  getPurchases,
  createPurchase,
  getPurchaseById,
  updatePurchase,
  deletePurchase
};
