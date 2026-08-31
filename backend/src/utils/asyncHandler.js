/**
 * Async handler utility to wrap async route handlers
 * Catches promise rejections and forwards them to Express error handler
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
