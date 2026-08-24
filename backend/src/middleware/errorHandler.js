/**
 * Centralized error handler middleware.
 */
const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  const correlationId = req.correlationId || 'unknown';
  
  // Log the full error internally
  logger.error(err.message || 'Unknown Error', {
    correlationId,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // Provide a consistent, sanitized response to the client
  const statusCode = err.status || err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  res.status(statusCode).json({
    error: {
      message: isProduction && statusCode === 500 ? 'Internal Server Error' : err.message,
      correlationId,
      code: err.code || 'INTERNAL_ERROR'
    }
  });
}

module.exports = errorHandler;
