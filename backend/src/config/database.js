const { Sequelize } = require('sequelize');
const logger = require('./logger');

// PostgreSQL connection configuration
let sequelize;

if (process.env.DATABASE_URL) {
  // Use DATABASE_URL if provided (Render/production)
  // Remove ?sslmode=require from URL as we handle SSL in dialectOptions
  const cleanUrl = process.env.DATABASE_URL.replace(/\?sslmode=require$/, '');
  
  sequelize = new Sequelize(cleanUrl, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false // Accept Aiven's self-signed certificates
      }
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
      underscored: false,
      createdAt: 'createdAt',
      updatedAt: 'updatedAt'
    }
  });
} else {
  // Use individual environment variables (local development)
  sequelize = new Sequelize(
    process.env.DB_NAME || 'defaultdb',
    process.env.DB_USER || 'avnadmin',
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 19044,
      dialect: 'postgres',
      dialectOptions: {
        ssl: process.env.DB_SSL === 'true' ? {
          require: true,
          rejectUnauthorized: false
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
        underscored: false,
        createdAt: 'createdAt',
        updatedAt: 'updatedAt'
      }
    }
  );
}

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
