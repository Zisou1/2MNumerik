const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Transformation = sequelize.define('Transformation', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    reference_number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    status: {
      type: DataTypes.ENUM('draft', 'in_progress', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'draft'
    },
    type: {
      type: DataTypes.ENUM('internal', 'subcontracted'),
      allowNull: false,
      defaultValue: 'internal'
    },
    input_item_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    input_lot_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    input_quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1
      }
    },
    from_location_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    output_item_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    output_lot_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    output_quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1
      }
    },
    to_location_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    subcontractor_location_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    created_by: {
      type: DataTypes.STRING,
      allowNull: false
    },
    completed_by: {
      type: DataTypes.STRING,
      allowNull: true
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'transformations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  Transformation.associate = function(models) {
    Transformation.belongsTo(models.Item, {
      foreignKey: 'input_item_id',
      as: 'inputItem'
    });

    Transformation.belongsTo(models.Lot, {
      foreignKey: 'input_lot_id',
      as: 'inputLot'
    });

    Transformation.belongsTo(models.Location, {
      foreignKey: 'from_location_id',
      as: 'fromLocation'
    });

    Transformation.belongsTo(models.Item, {
      foreignKey: 'output_item_id',
      as: 'outputItem'
    });

    Transformation.belongsTo(models.Lot, {
      foreignKey: 'output_lot_id',
      as: 'outputLot'
    });

    Transformation.belongsTo(models.Location, {
      foreignKey: 'to_location_id',
      as: 'toLocation'
    });

    Transformation.belongsTo(models.Location, {
      foreignKey: 'subcontractor_location_id',
      as: 'subcontractorLocation'
    });
  };

  return Transformation;
};
