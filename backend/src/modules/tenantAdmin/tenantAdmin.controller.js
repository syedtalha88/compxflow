import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../../models/User.js';
import TenantUser from '../../models/TenantUser.js';
import ApiError from '../../utils/apiError.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { successResponse } from '../../utils/apiResponse.js';

/**
 * POST /api/tenant-admin/users
 * Factory Admin creates staff member account ('member' role)
 */
export const createTenantUser = asyncHandler(async (req, res) => {
  const tenantId = req.tenant.id;
  const { email, password, role = 'member' } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'email and password are required');
  }

  if (password.length < 8) {
    throw new ApiError(400, 'WEAK_PASSWORD', 'Password must be at least 8 characters long');
  }

  const userRole = role === 'admin' ? 'admin' : 'member';
  const cleanEmail = email.toLowerCase().trim();

  let user = await User.findOne({ email: cleanEmail });
  let existingUser = false;
  if (!user) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    user = await User.create({ email: cleanEmail, passwordHash });
  } else {
    existingUser = true;
  }

  const existingMapping = await TenantUser.findOne({ tenantId, userId: user._id });
  if (existingMapping) {
    throw new ApiError(409, 'USER_EXISTS', 'User is already assigned to this factory workspace');
  }

  const tenantUser = await TenantUser.create({
    tenantId,
    userId: user._id,
    role: userRole
  });

  const message = existingUser
    ? `Existing account '${cleanEmail}' linked to workspace. Note: the password you provided was not applied — the user retains their existing password.`
    : `Staff member '${cleanEmail}' added to workspace successfully`;

  return successResponse(res, 201, {
    id: tenantUser._id,
    userId: user._id,
    email: user.email,
    role: tenantUser.role,
    existingAccount: existingUser
  }, message);
});

/**
 * GET /api/tenant-admin/users
 * List all staff members assigned to this factory workspace
 */
export const getTenantUsers = asyncHandler(async (req, res) => {
  const tenantId = req.tenant.id;

  const tenantUsers = await TenantUser.find({ tenantId }).populate('userId', 'email createdAt');

  const staffList = tenantUsers.map(tu => ({
    id: tu._id,
    userId: tu.userId?._id,
    email: tu.userId?.email,
    role: tu.role,
    joinedAt: tu.createdAt
  }));

  return successResponse(res, 200, staffList, 'Staff members retrieved successfully');
});

/**
 * DELETE /api/tenant-admin/users/:userId
 * Remove staff member access from workspace
 */
export const deleteTenantUser = asyncHandler(async (req, res) => {
  const tenantId = req.tenant.id;
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, 'INVALID_ID', 'Invalid user ID format');
  }

  const mapping = await TenantUser.findOne({ tenantId, userId });
  if (!mapping) {
    throw new ApiError(404, 'USER_NOT_FOUND', 'Staff member assignment not found in this workspace');
  }

  // Prevent admin from deleting themselves
  if (req.user.userId.toString() === userId.toString()) {
    throw new ApiError(400, 'CANNOT_DELETE_SELF', 'You cannot remove your own admin access');
  }

  await TenantUser.deleteOne({ _id: mapping._id });

  return successResponse(res, 200, {}, 'Staff member access removed successfully');
});

export default {
  createTenantUser,
  getTenantUsers,
  deleteTenantUser
};
