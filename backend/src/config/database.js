const { Sequelize } = require('sequelize');
const logger = require('./logger');

// PostgreSQL connection configuration
// Use DATABASE_URL if provided, otherwise construct from individual env vars
const databaseUrl = process.env.DATABASE_URL || 
  `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: process.env.DB_SSL === 'true' ? {
      require: true,
      rejectUnauthorized: false // Accept self-signed certificates
    } : false
  },
  logging: (msg) => logger.debug(msg),
  pool: {
    max: 20,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    timestamps: true,
    underscored: false, // Keep camelCase field names
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  }
});

// Test connection
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    logger.info(`PostgreSQL Connected: ${sequelize.config.host}`);
    
    // Sync models in development (creates tables if they don't exist)
    if (process.env.NODE_ENV === 'development') {
      // Don't use sync in production, use migrations instead
      // await sequelize.sync({ alter: true });
      logger.info('PostgreSQL models synced');
    }
  } catch (error) {
    logger.error(`PostgreSQL connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
