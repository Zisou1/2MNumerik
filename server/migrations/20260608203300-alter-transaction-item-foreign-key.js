'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Drop existing cascade foreign key constraint
    await queryInterface.removeConstraint('transactions', 'transactions_ibfk_1');

    // Add new restricted foreign key constraint
    await queryInterface.addConstraint('transactions', {
      fields: ['item_id'],
      type: 'foreign key',
      name: 'transactions_ibfk_1',
      references: {
        table: 'items',
        field: 'id'
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });
  },

  async down(queryInterface, Sequelize) {
    // Drop restricted constraint
    await queryInterface.removeConstraint('transactions', 'transactions_ibfk_1');

    // Re-add cascade constraint
    await queryInterface.addConstraint('transactions', {
      fields: ['item_id'],
      type: 'foreign key',
      name: 'transactions_ibfk_1',
      references: {
        table: 'items',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  }
};
