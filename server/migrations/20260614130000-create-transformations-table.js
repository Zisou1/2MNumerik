'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('transformations', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      reference_number: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      status: {
        type: Sequelize.ENUM('draft', 'in_progress', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'draft'
      },
      type: {
        type: Sequelize.ENUM('internal', 'subcontracted'),
        allowNull: false,
        defaultValue: 'internal'
      },
      input_item_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'items',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      input_lot_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'lots',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      input_quantity: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      from_location_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'locations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      output_item_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'items',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      output_lot_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'lots',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      output_quantity: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      to_location_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'locations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      subcontractor_location_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'locations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      created_by: {
        type: Sequelize.STRING,
        allowNull: false
      },
      completed_by: {
        type: Sequelize.STRING,
        allowNull: true
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('transformations');
  }
};
