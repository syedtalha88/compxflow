/**
 * Standard API Response helpers strictly conforming to ARCHITECTURE.md
 */

export const successResponse = (res, statusCode = 200, data = {}, message = 'Success') => {
  return res.status(statusCode).json({
    success: true,
    data,
    message
  });
};

export const paginatedResponse = (res, statusCode = 200, data = [], pagination = {}, message = 'Success') => {
  return res.status(statusCode).json({
    success: true,
    data,
    pagination: {
      page: pagination.page || 1,
      limit: pagination.limit || 20,
      total: pagination.total || 0,
      pages: pagination.pages || 0
    },
    message
  });
};

export const errorResponse = (res, statusCode = 500, errorConstant = 'INTERNAL_SERVER_ERROR', message = 'An unexpected error occurred') => {
  return res.status(statusCode).json({
    success: false,
    error: errorConstant,
    message
  });
};

export default {
  success: successResponse,
  paginated: paginatedResponse,
  error: errorResponse
};
