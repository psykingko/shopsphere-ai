/**
 * Simple environment configuration validation.
 * Uses native Node.js process.env.
 */

function validateEnv() {
  const requiredVars = [
    'NODE_ENV',
    'BACKEND_PORT',
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD'
  ];

  const missing = [];

  for (const envVar of requiredVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    console.error(`[FATAL] Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  return {
    nodeEnv: process.env.NODE_ENV,
    port: parseInt(process.env.BACKEND_PORT, 10),
    db: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    }
  };
}

const config = validateEnv();

module.exports = config;
