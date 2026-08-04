const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AuditLog = sequelize.define('AuditLog', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    action: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    table_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    record_id: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    old_values: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    new_values: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    session_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    additional_info: {
      type: DataTypes.TEXT,
      allowNull: true,
    }
  }, {
    tableName: 'audit_logs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  });

  AuditLog.associate = (models) => {
    AuditLog.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  };

  return AuditLog;
};
