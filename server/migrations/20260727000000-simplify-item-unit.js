'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add single unit column
    await queryInterface.addColumn('items', 'unit', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'unite',
      comment: 'Primary unit of measure (e.g. palette, rame, m2, litre, boite, unite)'
    });

    // Remove legacy multi-unit columns
    await queryInterface.removeColumn('items', 'conversion_factor');
    await queryInterface.removeColumn('items', 'usage_uom');
    await queryInterface.removeColumn('items', 'purchase_uom');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('items', 'purchase_uom', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'unite'
    });
    await queryInterface.addColumn('items', 'usage_uom', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'unite'
    });
    await queryInterface.addColumn('items', 'conversion_factor', {
      type: Sequelize.DECIMAL(10, 4),
      allowNull: false,
      defaultValue: 1.0000
    });
    await queryInterface.removeColumn('items', 'unit');
  }
};
