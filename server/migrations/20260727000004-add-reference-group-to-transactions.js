'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('transactions', 'reference_group', {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'Reference group number for multi-item batch transfers (e.g. TR-20260727-001)'
    });

    await queryInterface.addIndex('transactions', ['reference_group'], {
      name: 'idx_transactions_reference_group'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('transactions', 'idx_transactions_reference_group');
    await queryInterface.removeColumn('transactions', 'reference_group');
  }
};
