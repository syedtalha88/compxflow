import mongoose from 'mongoose';
import Invoice from '../../models/Invoice.js';
import Payment from '../../models/Payment.js';
import cloudinary from '../../config/cloudinary.js';
import ApiError from '../../utils/apiError.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { successResponse, paginatedResponse } from '../../utils/apiResponse.js';
import escapeRegex from '../../utils/escapeRegex.js';

/**
 * Helper to strip monetary fields if user role is 'member' (Rule #7)
 */
const sanitizeInvoiceForRole = (invoiceDoc, role) => {
  const invoice = invoiceDoc.toObject ? invoiceDoc.toObject() : { ...invoiceDoc };
  if (role === 'member') {
    delete invoice.totalAmount;
    delete invoice.amountReceived;
    delete invoice.amountPending;
  }
  return invoice;
};

/**
 * GET /api/invoices
 * Query: ?status=pending&page=1&limit=20&search=&startDate=&endDate=
 */
export const getInvoices = asyncHandler(async (req, res) => {
  const tenantId = req.tenant.id;
  const role = req.user.role;

  const { status, search, startDate, endDate, page = 1, limit = 20 } = req.query;

  const query = { tenantId };

  // Status Filter
  if (status && ['pending', 'partially_paid', 'paid'].includes(status)) {
    query.status = status;
  }

  // Search Filter (billNo or customerName)
  if (search && search.trim() !== '') {
    const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
    query.$or = [
      { billNo: searchRegex },
      { customerName: searchRegex }
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
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const total = await Invoice.countDocuments(query);
  const invoices = await Invoice.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  const sanitizedInvoices = invoices.map(inv => sanitizeInvoiceForRole(inv, role));

  return paginatedResponse(res, 200, sanitizedInvoices, {
    page: pageNum,
    limit: limitNum,
    total,
    pages: Math.ceil(total / limitNum)
  }, 'Invoices retrieved successfully');
});

/**
 * POST /api/invoices
 * Body: { billNo, customerName, totalAmount, billImageUrl, billImagePublicId }
 */
export const createInvoice = asyncHandler(async (req, res) => {
  const tenantId = req.tenant.id;
  const role = req.user.role;
  const { billNo, customerName, totalAmount, billImageUrl, billImagePublicId } = req.body;

  if (!billNo || !customerName || totalAmount === undefined || !billImageUrl || !billImagePublicId) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'billNo, customerName, totalAmount, billImageUrl, and billImagePublicId are required');
  }

  const parsedAmount = parseFloat(totalAmount);
  if (isNaN(parsedAmount) || parsedAmount < 0) {
    throw new ApiError(400, 'INVALID_AMOUNT', 'Invoice total amount cannot be negative');
  }

  const cleanBillNo = billNo.trim().toUpperCase();

  // Check duplicate bill number within same tenant
  const existingInvoice = await Invoice.findOne({ tenantId, billNo: cleanBillNo });
  if (existingInvoice) {
    throw new ApiError(409, 'DUPLICATE_BILL_NO', `A bill with number '${cleanBillNo}' already exists for this factory`);
  }

  const invoice = new Invoice({
    tenantId,
    billNo: cleanBillNo,
    customerName: customerName.trim(),
    totalAmount: parseFloat(totalAmount),
    amountReceived: 0,
    billImageUrl,
    billImagePublicId
  });

  await invoice.save(); // Pre-validate hook computes amountPending & status

  const sanitized = sanitizeInvoiceForRole(invoice, role);
  return successResponse(res, 201, sanitized, 'Invoice created successfully');
});

/**
 * GET /api/invoices/:id
 * Single invoice details + populated payments array
 */
export const getInvoiceById = asyncHandler(async (req, res) => {
  const tenantId = req.tenant.id;
  const role = req.user.role;
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'INVALID_ID', 'Invalid invoice ID format');
  }

  const invoice = await Invoice.findOne({ _id: id, tenantId });
  if (!invoice) {
    throw new ApiError(404, 'INVOICE_NOT_FOUND', 'Invoice not found');
  }

  const payments = await Payment.find({ tenantId, invoiceId: id }).sort({ capturedAt: -1 });

  const sanitizedInvoice = sanitizeInvoiceForRole(invoice, role);

  // Strip payment amounts if member role
  const sanitizedPayments = payments.map(p => {
    const pObj = p.toObject();
    if (role === 'member') {
      delete pObj.amount;
    }
    return pObj;
  });

  return successResponse(res, 200, {
    ...sanitizedInvoice,
    payments: sanitizedPayments
  }, 'Invoice details retrieved successfully');
});

/**
 * PUT /api/invoices/:id (Admin Only)
 * Body: { customerName, totalAmount }
 */
export const updateInvoice = asyncHandler(async (req, res) => {
  const tenantId = req.tenant.id;
  const { id } = req.params;
  const { customerName, totalAmount } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'INVALID_ID', 'Invalid invoice ID format');
  }

  const invoice = await Invoice.findOne({ _id: id, tenantId });
  if (!invoice) {
    throw new ApiError(404, 'INVOICE_NOT_FOUND', 'Invoice not found');
  }

  if (customerName) {
    invoice.customerName = customerName.trim();
  }

  if (totalAmount !== undefined) {
    const parsedAmount = parseFloat(totalAmount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      throw new ApiError(400, 'INVALID_AMOUNT', 'Invoice total amount cannot be negative');
    }
    invoice.totalAmount = parsedAmount;
  }

  await invoice.save(); // Pre-validate hook recalculates pending amount & status

  return successResponse(res, 200, invoice, 'Invoice updated successfully');
});

/**
 * DELETE /api/invoices/:id (Admin Only)
 * Deletes invoice, associated payments, and Cloudinary images
 */
export const deleteInvoice = asyncHandler(async (req, res) => {
  const tenantId = req.tenant.id;
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'INVALID_ID', 'Invalid invoice ID format');
  }

  const invoice = await Invoice.findOne({ _id: id, tenantId });
  if (!invoice) {
    throw new ApiError(404, 'INVOICE_NOT_FOUND', 'Invoice not found');
  }

  const payments = await Payment.find({ tenantId, invoiceId: id });

  // Delete bill image from Cloudinary
  if (invoice.billImagePublicId) {
    try {
      await cloudinary.uploader.destroy(invoice.billImagePublicId);
    } catch (err) {
      console.error('Cloudinary destroy error for bill image:', err.message);
    }
  }

  // Delete payment receipt images from Cloudinary
  for (const payment of payments) {
    if (payment.receiptImagePublicId) {
      try {
        await cloudinary.uploader.destroy(payment.receiptImagePublicId);
      } catch (err) {
        console.error('Cloudinary destroy error for receipt image:', err.message);
      }
    }
  }

  // Delete payments & invoice document
  await Payment.deleteMany({ tenantId, invoiceId: id });
  await Invoice.deleteOne({ _id: id, tenantId });

  return successResponse(res, 200, {}, 'Invoice and associated payments deleted successfully');
});

export default {
  getInvoices,
  createInvoice,
  getInvoiceById,
  updateInvoice,
  deleteInvoice
};
