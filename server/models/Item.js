const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Item = sequelize.define('Item', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    unit: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'unite'
    },
    unit_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'units',
        key: 'id'
      }
    }
  }, {
    tableName: 'items',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Define associations
  Item.associate = function(models) {
    // Item belongs to Unit
    Item.belongsTo(models.Unit, {
      foreignKey: 'unit_id',
      as: 'unitInfo'
    });

    // Item has many lots
    Item.hasMany(models.Lot, {
      foreignKey: 'item_id',
      as: 'lots'
    });
    
    // Item has many transactions
    Item.hasMany(models.Transaction, {
      foreignKey: 'item_id',
      as: 'transactions'
    });

    // Item has many item locations
    Item.hasMany(models.ItemLocation, {
      foreignKey: 'item_id',
      as: 'itemLocations'
    });
  };

  return Item;
};