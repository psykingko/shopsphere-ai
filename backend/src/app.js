const express = require('express');
const correlationIdMiddleware = require('./middleware/correlationId');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const { pool } = require('./config/database');

const cookieParser = require('cookie-parser');

const app = express();

// Built-in middleware for parsing JSON
app.use(express.json());
app.use(cookieParser());

// 1. Correlation ID Middleware
app.use(correlationIdMiddleware);

// 2. Request Logging Middleware (Minimal)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      correlationId: req.correlationId,
      durationMs: duration
    });
  });
  next();
});

// 3. Routes
const authRoutes = require('./routes/authRoutes');
const customerRoutes = require('./routes/customerRoutes');

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/customers', customerRoutes);

app.get('/health', async (req, res, next) => {
  try {
    // Check DB connectivity
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      database: 'connected'
    });
  } catch (err) {
    logger.error('Health check database connection failed', {
      error: err.message,
      correlationId: req.correlationId
    });
    // In accordance with best practices, return 503 if DB is unavailable
    res.status(503).json({
      status: 'degraded',
      database: 'disconnected'
    });
  }
});

// 4. 404 Handling
app.use((req, res, next) => {
  res.status(404).json({
    error: {
      message: 'Not Found',
      correlationId: req.correlationId,
      code: 'NOT_FOUND'
    }
  });
});

// 5. Central Error Handler
app.use(errorHandler);

module.exports = app;
