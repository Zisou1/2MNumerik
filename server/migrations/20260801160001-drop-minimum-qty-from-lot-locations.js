'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // We check if it exists just to be safe before dropping
    const tableInfo = await queryInterface.describeTable('lot_locations');
    if (tableInfo.minimum_quantity) {
      await queryInterface.removeColumn('lot_locations', 'minimum_quantity');
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('lot_locations');
    if (!tableInfo.minimum_quantity) {
      await queryInterface.addColumn('lot_locations', 'minimum_quantity', {
        type: Sequelize.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0
      });
    }
  }
};
