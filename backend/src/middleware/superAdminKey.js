import crypto from 'crypto';
import ApiError from '../utils/apiError.js';

/**
 * Super Admin Key Verification Middleware
 * 
 * Reads SUPER_ADMIN_KEY from process.env. Returns 403 immediately if
 * the key is missing or wrong. Never logs or returns the expected key.
 * Must be the first middleware on all /api/super-admin routes.
 * Uses timing-safe comparison to prevent side-channel attacks.
 */
const requireSuperAdminKey = (req, res, next) => {
  const providedKey = req.headers['x-super-admin-key'];
  const expectedKey = process.env.SUPER_ADMIN_KEY;

  if (!expectedKey) {
    return next(new ApiError(500, 'CONFIG_ERROR', 'Super admin key is not configured'));
  }

  if (!providedKey) {
    return next(new ApiError(403, 'FORBIDDEN', 'Access denied'));
  }

  // Timing-safe comparison to prevent character-by-character brute force
  const providedBuf = Buffer.from(providedKey);
  const expectedBuf = Buffer.from(expectedKey);

  if (providedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(providedBuf, expectedBuf)) {
    return next(new ApiError(403, 'FORBIDDEN', 'Access denied'));
  }

  next();
};

export default requireSuperAdminKey;
