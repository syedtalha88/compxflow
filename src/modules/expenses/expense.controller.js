import mongoose from 'mongoose';
import Expense from '../../models/Expense.js';
import cloudinary from '../../config/cloudinary.js';
import ApiError from '../../utils/apiError.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { successResponse, paginatedResponse } from '../../utils/apiResponse.js';
import escapeRegex from '../../utils/escapeRegex.js';

const ALLOWED_CATEGORIES = ['salary', 'utilities', 'maintenance', 'raw_material', 'rent', 'electricity', 'transport', 'other'];

/**
 * Helper to strip amount if user role is 'member' (Rule #7)
 */
const sanitizeExpenseForRole = (expenseDoc, role) => {
  const expense = expenseDoc.toObject ? expenseDoc.toObject() : { ...expenseDoc };
  if (role === 'member') {
    delete expense.amount;
  }
  return expense;
};

/**
 * GET /api/expenses
 * Query: ?category=&startDate=&endDate=&search=&page=1&limit=20
 */
export const getExpenses = asyncHandler(async (req, res) => {
  const tenantId = req.tenant.id;
  const role = req.user.role;
  const { category, search, startDate, endDate, page = 1, limit = 20 } = req.query;

  const query = { tenantId };

  if (category && ALLOWED_CATEGORIES.includes(category)) {
    query.category = category;
  }

  if (search && search.trim() !== '') {
    query.description = new RegExp(escapeRegex(search.trim()), 'i');
  }

  if (startDate || endDate) {
    query.date = {};
    if (startDate) {
      query.date.$gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.date.$lte = end;
    }
  }

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const total = await Expense.countDocuments(query);
  const expenses = await Expense.find(query)
    .sort({ date: -1, createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  const sanitizedExpenses = expenses.map(exp => sanitizeExpenseForRole(exp, role));

  return paginatedResponse(res, 200, sanitizedExpenses, {
    page: pageNum,
    limit: limitNum,
    total,
    pages: Math.ceil(total / limitNum)
  }, 'Expenses retrieved successfully');
});

/**
 * POST /api/expenses
 * Body: { amount, category, description, date, imageUrl, imagePublicId }
 */
export const createExpense = asyncHandler(async (req, res) => {
  const tenantId = req.tenant.id;
  const role = req.user.role;
  const { amount, category, description, date, imageUrl, imagePublicId } = req.body;

  if (amount === undefined || !category || !date) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'amount, category, and date are required');
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    throw new ApiError(400, 'INVALID_AMOUNT', 'Expense amount must be greater than 0');
  }

  if (!ALLOWED_CATEGORIES.includes(category)) {
    throw new ApiError(400, 'INVALID_CATEGORY', `Category must be one of: ${ALLOWED_CATEGORIES.join(', ')}`);
  }

  const expenseDate = new Date(date);
  if (isNaN(expenseDate.getTime())) {
    throw new ApiError(400, 'INVALID_DATE', 'Invalid expense date format');
  }

  const expense = new Expense({
    tenantId,
    amount: parsedAmount,
    category,
    description: description ? description.trim() : '',
    imageUrl: imageUrl || null,
    imagePublicId: imagePublicId || null,
    date: expenseDate
  });

  await expense.save();

  const sanitized = sanitizeExpenseForRole(expense, role);
  return successResponse(res, 201, sanitized, 'Expense recorded successfully');
});

/**
 * PUT /api/expenses/:id (Admin Only)
 * Body: { amount, category, description, date, imageUrl, imagePublicId }
 */
export const updateExpense = asyncHandler(async (req, res) => {
  const tenantId = req.tenant.id;
  const role = req.user.role;
  const { id } = req.params;
  const { amount, category, description, date, imageUrl, imagePublicId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'INVALID_ID', 'Invalid expense ID format');
  }

  const expense = await Expense.findOne({ _id: id, tenantId });
  if (!expense) {
    throw new ApiError(404, 'EXPENSE_NOT_FOUND', 'Expense record not found');
  }

  if (amount !== undefined) {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      throw new ApiError(400, 'INVALID_AMOUNT', 'Expense amount must be greater than 0');
    }
    expense.amount = parsed;
  }

  if (category) {
    if (!ALLOWED_CATEGORIES.includes(category)) {
      throw new ApiError(400, 'INVALID_CATEGORY', `Category must be one of: ${ALLOWED_CATEGORIES.join(', ')}`);
    }
    expense.category = category;
  }

  if (description !== undefined) {
    expense.description = description.trim();
  }

  if (date) {
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      throw new ApiError(400, 'INVALID_DATE', 'Invalid expense date format');
    }
    expense.date = parsedDate;
  }

  if (imageUrl !== undefined) expense.imageUrl = imageUrl;
  if (imagePublicId !== undefined) expense.imagePublicId = imagePublicId;

  await expense.save();

  const sanitized = sanitizeExpenseForRole(expense, role);
  return successResponse(res, 200, sanitized, 'Expense updated successfully');
});

/**
 * DELETE /api/expenses/:id (Admin Only)
 * Deletes expense and cleans up Cloudinary image if exists
 */
export const deleteExpense = asyncHandler(async (req, res) => {
  const tenantId = req.tenant.id;
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'INVALID_ID', 'Invalid expense ID format');
  }

  const expense = await Expense.findOne({ _id: id, tenantId });
  if (!expense) {
    throw new ApiError(404, 'EXPENSE_NOT_FOUND', 'Expense record not found');
  }

  if (expense.imagePublicId) {
    try {
      await cloudinary.uploader.destroy(expense.imagePublicId);
    } catch (err) {
      console.error('Cloudinary destroy expense image error:', err.message);
    }
  }

  await Expense.deleteOne({ _id: id, tenantId });

  return successResponse(res, 200, {}, 'Expense deleted successfully');
});

export default {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense
};
