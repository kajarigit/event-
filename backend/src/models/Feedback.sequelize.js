const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Feedback = sequelize.define('Feedback', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  eventId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'events',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  stallId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'stalls',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  studentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    }
  },
  // New 5-category rating system
  qualityRating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    },
    comment: 'Product/Service Quality Rating (1-5)'
  },
  serviceRating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    },
    comment: 'Customer Service Rating (1-5)'
  },
  innovationRating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    },
    comment: 'Innovation/Creativity Rating (1-5)'
  },
  presentationRating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    },
    comment: 'Presentation/Display Rating (1-5)'
  },
  valueRating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    },
    comment: 'Value for Money Rating (1-5)'
  },
  averageRating: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: false,
    comment: 'Calculated average of all 5 ratings'
  },
  comments: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'feedbacks',
  indexes: [
    {
      unique: true,
      fields: ['eventId', 'stallId', 'studentId']
    }
  ]
});

module.exports = Feedback;
