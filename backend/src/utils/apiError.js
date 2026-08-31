/**
 * Custom Error Class for standardizing API error responses
 */
class ApiError extends Error {
  constructor(statusCode, errorConstant, message = 'Something went wrong', errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.error = errorConstant;
    this.message = message;
    this.errors = errors;
    this.success = false;

    Error.captureStackTrace(this, this.constructor);
  }
}

export default ApiError;
