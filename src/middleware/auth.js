import jwt from 'jsonwebtoken';
import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * Authentication middleware
 * Verifies JWT Access Token from Authorization header
 * Attaches req.user = { userId, tenantId, role }
 */
export const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Access token is required');
  }

  const token = authHeader.split(' ')[1];

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new ApiError(500, 'SERVER_ERROR', 'Server misconfiguration');
  }

  try {
    const decoded = jwt.verify(token, secret);

    if (decoded.type !== 'access') {
      throw new ApiError(401, 'UNAUTHORIZED', 'Invalid token type');
    }

    req.user = {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      role: decoded.role
    };

    // CRITICAL: Tenant Isolation Enforcement
    // Ensures a user from Tenant A cannot access Tenant B's data by spoofing the slug header
    if (req.tenant && req.tenant.id.toString() !== decoded.tenantId.toString()) {
      throw new ApiError(403, 'TENANT_MISMATCH', 'Access token does not match the requested tenant context');
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new ApiError(401, 'TOKEN_EXPIRED', 'Access token has expired');
    }
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(401, 'UNAUTHORIZED', 'Invalid access token');
  }
});

export default authenticate;
