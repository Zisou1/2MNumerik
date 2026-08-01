'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('items', 'purchase_uom', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'unite',
      comment: 'Purchase unit of measure (e.g. rame, rouleau, bidon)'
    });

    await queryInterface.addColumn('items', 'usage_uom', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'unite',
      comment: 'Usage/consumption unit of measure (e.g. feuille, m2, litre)'
    });

    await queryInterface.addColumn('items', 'conversion_factor', {
      type: Sequelize.DECIMAL(10, 4),
      allowNull: false,
      defaultValue: 1.0000,
      comment: 'Number of usage units in 1 purchase unit'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('items', 'conversion_factor');
    await queryInterface.removeColumn('items', 'usage_uom');
    await queryInterface.removeColumn('items', 'purchase_uom');
  }
};
