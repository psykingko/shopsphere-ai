/**
 * Middleware to extract or generate a correlation ID.
 */
const crypto = require('crypto');

const CORRELATION_ID_HEADER = 'x-correlation-id';

function correlationIdMiddleware(req, res, next) {
  let correlationId = req.headers[CORRELATION_ID_HEADER];

  if (!correlationId) {
    correlationId = crypto.randomUUID();
  }

  req.correlationId = correlationId;
  
  // Set it on the response so the client knows it
  res.setHeader(CORRELATION_ID_HEADER, correlationId);
  
  next();
}

module.exports = correlationIdMiddleware;
