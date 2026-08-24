/**
 * Simple centralized structured logger.
 * Uses native console methods but formats them as JSON for standard observability.
 */

const formatMessage = (level, message, meta = {}) => {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta
  });
};

const logger = {
  info: (message, meta) => console.log(formatMessage('INFO', message, meta)),
  warn: (message, meta) => console.warn(formatMessage('WARN', message, meta)),
  error: (message, meta) => console.error(formatMessage('ERROR', message, meta)),
  debug: (message, meta) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(formatMessage('DEBUG', message, meta));
    }
  }
};

module.exports = logger;
