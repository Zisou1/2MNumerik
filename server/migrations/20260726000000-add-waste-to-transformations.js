'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('transformations', 'waste_quantity', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Quantity wasted/lost during production'
    });

    await queryInterface.addColumn('transformations', 'waste_reason', {
      type: Sequelize.ENUM('calage_machine', 'chute_de_coupe', 'erreur_impression', 'autre'),
      allowNull: true,
      comment: 'Reason for production waste'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('transformations', 'waste_reason');
    await queryInterface.removeColumn('transformations', 'waste_quantity');
  }
};
