const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OTP = sequelize.define('OTP', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    otp: {
      type: DataTypes.STRING(6),
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    isUsed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    purpose: {
      type: DataTypes.ENUM('password_reset', 'email_verification'),
      defaultValue: 'password_reset',
    },
  }, {
    tableName: 'otps',
    timestamps: true,
    indexes: [
      {
        fields: ['userId', 'isUsed'],
      },
      {
        fields: ['expiresAt'],
      },
    ],
  });

  // Associations
  OTP.associate = (models) => {
    OTP.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });
  };

  return OTP;
};
