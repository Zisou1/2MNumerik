'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('lot_locations', 'reserved_quantity', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('lot_locations', 'reserved_quantity');
  }
};
