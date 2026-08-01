'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Lots table: initial_quantity
    await queryInterface.changeColumn('lots', 'initial_quantity', {
      type: Sequelize.DECIMAL(12, 4),
      allowNull: false
    });

    // 2. Lot_locations table: quantity, minimum_quantity, reserved_quantity
    await queryInterface.changeColumn('lot_locations', 'quantity', {
      type: Sequelize.DECIMAL(12, 4),
      allowNull: false,
      defaultValue: 0.0000
    });

    await queryInterface.changeColumn('lot_locations', 'minimum_quantity', {
      type: Sequelize.DECIMAL(12, 4),
      allowNull: false,
      defaultValue: 0.0000
    });

    await queryInterface.changeColumn('lot_locations', 'reserved_quantity', {
      type: Sequelize.DECIMAL(12, 4),
      allowNull: false,
      defaultValue: 0.0000
    });

    // 3. Transactions table: quantity
    await queryInterface.changeColumn('transactions', 'quantity', {
      type: Sequelize.DECIMAL(12, 4),
      allowNull: false
    });

    // 4. Transformations table: input_quantity, output_quantity, waste_quantity
    await queryInterface.changeColumn('transformations', 'input_quantity', {
      type: Sequelize.DECIMAL(12, 4),
      allowNull: false
    });

    await queryInterface.changeColumn('transformations', 'output_quantity', {
      type: Sequelize.DECIMAL(12, 4),
      allowNull: false
    });

    await queryInterface.changeColumn('transformations', 'waste_quantity', {
      type: Sequelize.DECIMAL(12, 4),
      allowNull: false,
      defaultValue: 0.0000
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('lots', 'initial_quantity', {
      type: Sequelize.INTEGER,
      allowNull: false
    });

    await queryInterface.changeColumn('lot_locations', 'quantity', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });

    await queryInterface.changeColumn('lot_locations', 'minimum_quantity', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });

    await queryInterface.changeColumn('lot_locations', 'reserved_quantity', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });

    await queryInterface.changeColumn('transactions', 'quantity', {
      type: Sequelize.INTEGER,
      allowNull: false
    });

    await queryInterface.changeColumn('transformations', 'input_quantity', {
      type: Sequelize.INTEGER,
      allowNull: false
    });

    await queryInterface.changeColumn('transformations', 'output_quantity', {
      type: Sequelize.INTEGER,
      allowNull: false
    });

    await queryInterface.changeColumn('transformations', 'waste_quantity', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
  }
};
