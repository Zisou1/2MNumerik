const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OrderProduct = sequelize.define('OrderProduct', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    order_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'orders',
        key: 'id'
      },
      comment: 'Foreign key to orders table'
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id'
      },
      comment: 'Foreign key to products table'
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1
      },
      comment: 'Quantity of this specific product in the order'
    },
    unit_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Price per unit for this product in this order (optional)'
    },
    finitions: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'JSON array of selected finitions for this product in this order. Each finition object contains: {finition_id, additional_cost, additional_time}'
    }
  }, {
    tableName: 'order_products',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['order_id', 'product_id'],
        name: 'unique_order_product'
      }
    ]
  });

  // Define associations
  OrderProduct.associate = function(models) {
    // OrderProduct belongs to Order
    OrderProduct.belongsTo(models.Order, {
      foreignKey: 'order_id',
      as: 'order'
    });
    
    // OrderProduct belongs to Product
    OrderProduct.belongsTo(models.Product, {
      foreignKey: 'product_id',
      as: 'product'
    });
  };

  return OrderProduct;
};
