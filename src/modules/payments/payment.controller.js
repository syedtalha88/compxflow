import mongoose from 'mongoose';
import Payment from '../../models/Payment.js';
import Invoice from '../../models/Invoice.js';
import cloudinary from '../../config/cloudinary.js';
import ApiError from '../../utils/apiError.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { successResponse } from '../../utils/apiResponse.js';

/**
 * POST /api/payments
 * Body: { invoiceId, amount, receiptImageUrl, receiptImagePublicId }
 * Creates payment and atomically updates Invoice totals
 */
export const createPayment = asyncHandler(async (req, res) => {
  const tenantId = req.tenant.id;
  const role = req.user.role;
  const { invoiceId, amount, receiptImageUrl, receiptImagePublicId } = req.body;

  if (!invoiceId || !amount || !receiptImageUrl || !receiptImagePublicId) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'invoiceId, amount, receiptImageUrl, and receiptImagePublicId are required');
  }

  const paymentAmount = parseFloat(amount);
  if (isNaN(paymentAmount) || paymentAmount <= 0) {
    throw new ApiError(400, 'INVALID_AMOUNT', 'Payment amount must be greater than 0');
  }

  if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
    throw new ApiError(400, 'INVALID_ID', 'Invalid invoice ID format');
  }

  const invoice = await Invoice.findOne({ _id: invoiceId, tenantId });
  if (!invoice) {
    throw new ApiError(404, 'INVOICE_NOT_FOUND', 'Invoice not found for this tenant');
  }

  // FIN-05: Idempotency check to prevent duplicate payments on double-clicks
  const existingPayment = await Payment.findOne({ receiptImagePublicId, tenantId });
  if (existingPayment) {
    throw new ApiError(409, 'DUPLICATE_PAYMENT', 'A payment with this receipt image has already been recorded');
  }

  if (paymentAmount > invoice.amountPending) {
    throw new ApiError(400, 'OVERPAYMENT', `Payment amount (INR ${paymentAmount}) cannot exceed the pending invoice amount (INR ${invoice.amountPending})`);
  }

  let payment;

  // Session transaction for atomic payment creation + invoice update
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    payment = new Payment({
      tenantId,
      invoiceId,
      amount: paymentAmount,
      receiptImageUrl,
      receiptImagePublicId
    });
    await payment.save({ session });

    // FIN-06: Optimistic Concurrency Control (OCC) to prevent Lost Updates
    const newPending = invoice.amountPending - paymentAmount;
    const newStatus = newPending <= 0 ? 'paid' : 'partially_paid';

    const updatedInvoice = await Invoice.findOneAndUpdate(
      { 
        _id: invoiceId, 
        tenantId,
        amountReceived: invoice.amountReceived // OCC check
      },
      {
        $inc: { amountReceived: paymentAmount },
        $set: { amountPending: newPending, status: newStatus }
      },
      { new: true, session }
    );

    if (!updatedInvoice) {
      throw new ApiError(409, 'CONCURRENT_MODIFICATION', 'The invoice was modified by another transaction. Please try again.');
    }

    await session.commitTransaction();
  } catch (txError) {
    await session.abortTransaction();

    // Fallback if standalone MongoDB without replica set
    if (txError.message && txError.message.includes('Transaction numbers are only allowed')) {
      // Fallback without session
      payment = await Payment.create({
        tenantId,
        invoiceId,
        amount: paymentAmount,
        receiptImageUrl,
        receiptImagePublicId
      });

      const newPending = invoice.amountPending - paymentAmount;
      const newStatus = newPending <= 0 ? 'paid' : 'partially_paid';

      const updatedInvoice = await Invoice.findOneAndUpdate(
        { _id: invoiceId, tenantId, amountReceived: invoice.amountReceived },
        {
          $inc: { amountReceived: paymentAmount },
          $set: { amountPending: newPending, status: newStatus }
        },
        { new: true }
      );

      if (!updatedInvoice) {
        // If OCC fails here, payment is orphaned, but at least the invoice total is not corrupted.
        throw new ApiError(409, 'CONCURRENT_MODIFICATION', 'The invoice was modified by another request. Payment recorded but invoice totals may need manual sync.');
      }
    } else {
      throw txError;
    }
  } finally {
    session.endSession();
  }

  const paymentObj = payment.toObject();
  if (role === 'member') {
    delete paymentObj.amount;
  }

  return successResponse(res, 201, paymentObj, 'Payment recorded successfully');
});

/**
 * GET /api/payments
 * Query: ?invoiceId=&startDate=&endDate=
 */
export const getPayments = asyncHandler(async (req, res) => {
  const tenantId = req.tenant.id;
  const role = req.user.role;
  const { invoiceId, startDate, endDate } = req.query;

  const query = { tenantId };

  if (invoiceId) {
    if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
      throw new ApiError(400, 'INVALID_ID', 'Invalid invoice ID format');
    }
    query.invoiceId = invoiceId;
  }

  if (startDate || endDate) {
    query.capturedAt = {};
    if (startDate) {
      query.capturedAt.$gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.capturedAt.$lte = end;
    }
  }

  const payments = await Payment.find(query).sort({ capturedAt: -1 });

  const sanitizedPayments = payments.map(p => {
    const pObj = p.toObject();
    if (role === 'member') {
      delete pObj.amount;
    }
    return pObj;
  });

  return successResponse(res, 200, sanitizedPayments, 'Payments retrieved successfully');
});

/**
 * DELETE /api/payments/:id (Admin Only)
 * Reverses payment totals on Invoice and deletes Cloudinary receipt image
 */
export const deletePayment = asyncHandler(async (req, res) => {
  const tenantId = req.tenant.id;
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'INVALID_ID', 'Invalid payment ID format');
  }

  const payment = await Payment.findOne({ _id: id, tenantId });
  if (!payment) {
    throw new ApiError(404, 'PAYMENT_NOT_FOUND', 'Payment record not found');
  }

  const invoice = await Invoice.findOne({ _id: payment.invoiceId, tenantId });

  // Delete Cloudinary receipt image
  if (payment.receiptImagePublicId) {
    try {
      await cloudinary.uploader.destroy(payment.receiptImagePublicId);
    } catch (err) {
      console.error('Cloudinary destroy receipt error:', err.message);
    }
  }

  // Reverse invoice totals atomically
  if (invoice) {
    const newReceived = Math.max(0, invoice.amountReceived - payment.amount);
    const newPending = Math.max(0, invoice.totalAmount - newReceived);
    
    let newStatus = 'pending';
    if (newPending <= 0) newStatus = 'paid';
    else if (newReceived > 0) newStatus = 'partially_paid';

    await Invoice.findOneAndUpdate(
      { _id: payment.invoiceId, tenantId, amountReceived: invoice.amountReceived }, // OCC check
      {
        $set: {
          amountReceived: newReceived,
          amountPending: newPending,
          status: newStatus
        }
      }
    );
  }

  await Payment.deleteOne({ _id: id, tenantId });

  return successResponse(res, 200, {}, 'Payment deleted and invoice totals reversed successfully');
});

export default {
  createPayment,
  getPayments,
  deletePayment
};
