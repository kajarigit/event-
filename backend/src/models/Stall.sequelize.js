const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Stall = sequelize.define('Stall', {
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
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true
  },
  ownerId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'SET NULL'
  },
  ownerName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  ownerContact: {
    type: DataTypes.STRING,
    allowNull: true
  },
  ownerEmail: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  department: {
    type: DataTypes.STRING,
    allowNull: true
  },
  participants: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('participants');
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value) {
      this.setDataValue('participants', JSON.stringify(value));
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  qrToken: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'stalls',
  indexes: [
    {
      fields: ['eventId']
    },
    {
      fields: ['ownerId']
    }
  ]
});

module.exports = Stall;
