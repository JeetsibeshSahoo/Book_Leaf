import config from '../config/index.js';

/**
 * Custom application error class that attaches HTTP status codes
 * and optional validation error details.
 */
export class ApiError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Invalid request data', errors = []) {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = 'Authentication required. Please log in.') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Access denied. You do not have permission.') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Requested resource not found') {
    return new ApiError(404, message);
  }

  static internal(message = 'An unexpected internal server error occurred') {
    return new ApiError(500, message);
  }
}

/**
 * Global Express error handling middleware.
 * Intercepts all thrown errors and formats them into a clean, uniform JSON response.
 */
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || [];

  // Handle common PostgreSQL database error codes gracefully
  if (err.code) {
    switch (err.code) {
      case '23505': // Unique violation (e.g., duplicate email)
        statusCode = 409;
        message = 'A record with this information already exists.';
        break;
      case '23503': // Foreign key violation (e.g. invalid book_id)
        statusCode = 400;
        message = 'Referenced related item does not exist.';
        break;
      case '22P02': // Invalid text representation (e.g. invalid UUID format)
        statusCode = 400;
        message = 'Invalid ID format provided.';
        break;
      default:
        // Other SQL errors
        if (statusCode === 500) {
          message = 'Database operation failed.';
        }
    }
  }

  // Log full stack trace in development for easy debugging
  if (config.nodeEnv === 'development') {
    console.error(`[Error] ${req.method} ${req.url} -> Status ${statusCode}:`, err);
  }

  // Return consistent, human-readable JSON payload
  return res.status(statusCode).json({
    success: false,
    error: {
      statusCode,
      message,
      ...(errors.length > 0 && { details: errors }),
      ...(config.nodeEnv === 'development' && { stack: err.stack }),
    },
  });
};

/**
 * 404 Route Not Found middleware for non-existent endpoints
 */
export const notFoundHandler = (req, res, next) => {
  next(ApiError.notFound(`Endpoint not found: [${req.method}] ${req.originalUrl}`));
};