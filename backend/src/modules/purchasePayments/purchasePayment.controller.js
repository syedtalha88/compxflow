import mongoose from 'mongoose';
import PurchasePayment from '../../models/PurchasePayment.js';
import Purchase from '../../models/Purchase.js';
import cloudinary from '../../config/cloudinary.js';
import ApiError from '../../utils/apiError.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { successResponse } from '../../utils/apiResponse.js';

/**
 * POST /api/purchase-payments
 * Body: { purchaseId, amount, receiptImageUrl, receiptImagePublicId }
 * Creates purchase payment and atomically updates Purchase totals
 */
export const createPurchasePayment = asyncHandler(async (req, res) => {
  const tenantId = req.tenant.id;
  const role = req.user.role;
  const { purchaseId, amount, receiptImageUrl, receiptImagePublicId } = req.body;

  if (!purchaseId || !amount || !receiptImageUrl || !receiptImagePublicId) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'purchaseId, amount, receiptImageUrl, and receiptImagePublicId are required');
  }

  const paymentAmount = parseFloat(amount);
  if (isNaN(paymentAmount) || paymentAmount <= 0) {
    throw new ApiError(400, 'INVALID_AMOUNT', 'Payment amount must be greater than 0');
  }

  if (!mongoose.Types.ObjectId.isValid(purchaseId)) {
    throw new ApiError(400, 'INVALID_ID', 'Invalid purchase ID format');
  }

  const purchase = await Purchase.findOne({ _id: purchaseId, tenantId });
  if (!purchase) {
    throw new ApiError(404, 'PURCHASE_NOT_FOUND', 'Purchase record not found for this tenant');
  }

  // FIN-05: Idempotency check to prevent duplicate payments on double-clicks
  const existingPayment = await PurchasePayment.findOne({ receiptImagePublicId, tenantId });
  if (existingPayment) {
    throw new ApiError(409, 'DUPLICATE_PAYMENT', 'A payment with this receipt image has already been recorded');
  }

  if (paymentAmount > purchase.amountPending) {
    throw new ApiError(400, 'OVERPAYMENT', `Payment amount (INR ${paymentAmount}) cannot exceed the pending purchase amount (INR ${purchase.amountPending})`);
  }

  let payment;

  // Session transaction for atomic payment creation + purchase update
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    payment = new PurchasePayment({
      tenantId,
      purchaseId,
      amount: paymentAmount,
      receiptImageUrl,
      receiptImagePublicId
    });
    await payment.save({ session });

    // FIN-06: Optimistic Concurrency Control (OCC) to prevent Lost Updates
    const newPending = purchase.amountPending - paymentAmount;
    const newStatus = newPending <= 0 ? 'paid' : 'partially_paid';

    const updatedPurchase = await Purchase.findOneAndUpdate(
      { 
        _id: purchaseId, 
        tenantId,
        amountPaid: purchase.amountPaid // OCC check
      },
      {
        $inc: { amountPaid: paymentAmount },
        $set: { amountPending: newPending, status: newStatus }
      },
      { new: true, session }
    );

    if (!updatedPurchase) {
      throw new ApiError(409, 'CONCURRENT_MODIFICATION', 'The purchase was modified by another transaction. Please try again.');
    }

    await session.commitTransaction();
  } catch (txError) {
    await session.abortTransaction();

    // Fallback if standalone MongoDB without replica set
    if (txError.message && txError.message.includes('Transaction numbers are only allowed')) {
      // Fallback without session
      payment = await PurchasePayment.create({
        tenantId,
        purchaseId,
        amount: paymentAmount,
        receiptImageUrl,
        receiptImagePublicId
      });

      const newPending = purchase.amountPending - paymentAmount;
      const newStatus = newPending <= 0 ? 'paid' : 'partially_paid';

      const updatedPurchase = await Purchase.findOneAndUpdate(
        { _id: purchaseId, tenantId, amountPaid: purchase.amountPaid },
        {
          $inc: { amountPaid: paymentAmount },
          $set: { amountPending: newPending, status: newStatus }
        },
        { new: true }
      );

      if (!updatedPurchase) {
        throw new ApiError(409, 'CONCURRENT_MODIFICATION', 'The purchase was modified by another request. Payment recorded but purchase totals may need manual sync.');
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

  return successResponse(res, 201, paymentObj, 'Purchase payment recorded successfully');
});

/**
 * GET /api/purchase-payments
 * Query: ?purchaseId=&startDate=&endDate=
 */
export const getPurchasePayments = asyncHandler(async (req, res) => {
  const tenantId = req.tenant.id;
  const role = req.user.role;
  const { purchaseId, startDate, endDate } = req.query;

  const query = { tenantId };

  if (purchaseId) {
    if (!mongoose.Types.ObjectId.isValid(purchaseId)) {
      throw new ApiError(400, 'INVALID_ID', 'Invalid purchase ID format');
    }
    query.purchaseId = purchaseId;
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

  const payments = await PurchasePayment.find(query).sort({ capturedAt: -1 });

  const sanitizedPayments = payments.map(p => {
    const pObj = p.toObject();
    if (role === 'member') {
      delete pObj.amount;
    }
    return pObj;
  });

  return successResponse(res, 200, sanitizedPayments, 'Purchase payments retrieved successfully');
});

/**
 * DELETE /api/purchase-payments/:id (Admin Only)
 * Reverses payment totals on Purchase and deletes Cloudinary receipt image
 */
export const deletePurchasePayment = asyncHandler(async (req, res) => {
  const tenantId = req.tenant.id;
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'INVALID_ID', 'Invalid purchase payment ID format');
  }

  const payment = await PurchasePayment.findOne({ _id: id, tenantId });
  if (!payment) {
    throw new ApiError(404, 'PAYMENT_NOT_FOUND', 'Purchase payment record not found');
  }

  const purchase = await Purchase.findOne({ _id: payment.purchaseId, tenantId });

  // Delete Cloudinary receipt image
  if (payment.receiptImagePublicId) {
    try {
      await cloudinary.uploader.destroy(payment.receiptImagePublicId);
    } catch (err) {
      console.error('Cloudinary destroy purchase receipt error:', err.message);
    }
  }

  // Reverse purchase totals atomically
  if (purchase) {
    const newPaid = Math.max(0, purchase.amountPaid - payment.amount);
    const newPending = Math.max(0, purchase.totalAmount - newPaid);
    
    let newStatus = 'pending';
    if (newPending <= 0) newStatus = 'paid';
    else if (newPaid > 0) newStatus = 'partially_paid';

    await Purchase.findOneAndUpdate(
      { _id: payment.purchaseId, tenantId, amountPaid: purchase.amountPaid }, // OCC check
      {
        $set: {
          amountPaid: newPaid,
          amountPending: newPending,
          status: newStatus
        }
      }
    );
  }

  await PurchasePayment.deleteOne({ _id: id, tenantId });

  return successResponse(res, 200, {}, 'Purchase payment deleted and purchase totals reversed successfully');
});

export default {
  createPurchasePayment,
  getPurchasePayments,
  deletePurchasePayment
};
