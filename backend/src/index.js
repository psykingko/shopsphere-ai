const config = require('./config/env');
const logger = require('./utils/logger');
const { validateConnection, closePool } = require('./config/database');
const app = require('./app');

async function startServer() {
  try {
    // Validate database connection before starting the server
    await validateConnection();
    logger.info('Successfully connected to PostgreSQL');

    const server = app.listen(config.port, () => {
      logger.info(`Backend server started on port ${config.port} in ${config.nodeEnv} mode`);
    });

    // Graceful Shutdown Handling
    const shutdown = async (signal) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      
      server.close(async (err) => {
        if (err) {
          logger.error('Error during HTTP server closure', { error: err.message });
        } else {
          logger.info('HTTP server closed');
        }
        
        await closePool();
        logger.info('PostgreSQL pool closed');
        
        process.exit(err ? 1 : 0);
      });
      
      // Force shutdown if it takes too long
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (err) {
    logger.error('Failed to start server', { error: err.message, stack: err.stack });
    process.exit(1);
  }
}

startServer();
