import ApiError from '../utils/apiError.js';

/**
 * Middleware to restrict access to specific user roles
 * @param {...string} allowedRoles - List of allowed roles ('admin', 'member')
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'UNAUTHORIZED', 'Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, 'FORBIDDEN', 'You do not have permission to perform this action'));
    }

    next();
  };
};

/**
 * Pre-configured middleware for Admin-only routes
 */
export const requireAdmin = requireRole('admin');

export default {
  requireRole,
  requireAdmin
};
