const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ItemLocation = sequelize.define('ItemLocation', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    item_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'items',
        key: 'id'
      }
    },
    location_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'locations',
        key: 'id'
      }
    },
    minimum_quantity: {
      type: DataTypes.DECIMAL(12, 4),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      },
      get() {
        const rawValue = this.getDataValue('minimum_quantity');
        return rawValue !== null && rawValue !== undefined ? parseFloat(rawValue) : rawValue;
      }
    }
  }, {
    tableName: 'item_locations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['item_id', 'location_id'],
        name: 'unique_item_location'
      }
    ]
  });

  // Define associations
  ItemLocation.associate = function(models) {
    // ItemLocation belongs to Item
    ItemLocation.belongsTo(models.Item, {
      foreignKey: 'item_id',
      as: 'item'
    });
    
    // ItemLocation belongs to Location
    ItemLocation.belongsTo(models.Location, {
      foreignKey: 'location_id',
      as: 'location'
    });
  };

  return ItemLocation;
};
