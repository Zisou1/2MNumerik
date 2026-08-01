'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Create units table
    await queryInterface.createTable('units', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      symbol: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // 2. Pre-populate default printing units
    const now = new Date();
    await queryInterface.bulkInsert('units', [
      { name: 'Unité / Pièce', symbol: 'unite', description: 'Unité standard par pièce', created_at: now, updated_at: now },
      { name: 'Palette', symbol: 'palette', description: 'Palette de papier brute', created_at: now, updated_at: now },
      { name: 'Rame (Ream)', symbol: 'rame', description: 'Rame de papier conditionnée', created_at: now, updated_at: now },
      { name: 'Feuille (Sheet)', symbol: 'feuille', description: 'Feuille de papier unitaire', created_at: now, updated_at: now },
      { name: 'Rouleau (Roll)', symbol: 'rouleau', description: 'Rouleau de vinyl ou grand format', created_at: now, updated_at: now },
      { name: 'Mètre carré (m²)', symbol: 'm2', description: 'Surface en mètres carrés', created_at: now, updated_at: now },
      { name: 'Mètre linéaire', symbol: 'metre', description: 'Longueur en mètres linéaires', created_at: now, updated_at: now },
      { name: 'Litre', symbol: 'litre', description: 'Volume de liquide / encre', created_at: now, updated_at: now },
      { name: 'Kilogramme (Kg)', symbol: 'kg', description: 'Poids en kilogrammes', created_at: now, updated_at: now },
      { name: 'Boîte (Box)', symbol: 'boite', description: 'Boîte ou carton de conditionnement', created_at: now, updated_at: now }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('units');
  }
};
