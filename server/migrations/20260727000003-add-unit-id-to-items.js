'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add unit_id column to items table
    await queryInterface.addColumn('items', 'unit_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'units',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // 2. Populate unit_id for existing items by matching items.unit to units.symbol
    await queryInterface.sequelize.query(`
      UPDATE items i
      INNER JOIN units u ON i.unit = u.symbol
      SET i.unit_id = u.id
    `);

    // 3. Fallback: For any items where unit didn't match a symbol, set unit_id to the 'unite' unit ID
    await queryInterface.sequelize.query(`
      UPDATE items
      SET unit_id = (SELECT id FROM units WHERE symbol = 'unite' LIMIT 1)
      WHERE unit_id IS NULL
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('items', 'unit_id');
  }
};
