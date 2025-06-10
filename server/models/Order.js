const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Order = sequelize.define('Order', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    commercial_en_charge: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Nom du commercial responsable du projet'
    },
    infographe_en_charge: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Nom du designer ou infographe responsable'
    },
    numero_pms: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: 'Code de référence interne'
    },
    client: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Nom du client'
    },
    date_limite_livraison_estimee: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date et heure de livraison prévue (planning)'
    },
    date_limite_livraison_attendue: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date et heure de livraison attendue (client)'
    },
    etape: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Stade du projet (pré-presse, impression, etc.)'
    },
    option_finition: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Finitions spécifiques (coins arrondis, pelliculage, etc.)'
    },
    atelier_concerne: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Atelier qui traite la commande (petit format, grand format, sous-traitance)'
    },
    statut: {
      type: DataTypes.ENUM('en_attente', 'en_cours', 'termine', 'livre', 'annule'),
      allowNull: false,
      defaultValue: 'en_attente',
      comment: 'État actuel'
    },
    commentaires: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Informations supplémentaires pertinentes'
    },
    estimated_time: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Temps estimé total en heures pour cette commande'
    }
  }, {
    tableName: 'orders',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  });

  // Define associations
  Order.associate = function(models) {
    // Order has many products through order_products
    Order.belongsToMany(models.Product, {
      through: models.OrderProduct,
      foreignKey: 'order_id',
      otherKey: 'product_id',
      as: 'products'
    });
    
    // Order has many order_products
    Order.hasMany(models.OrderProduct, {
      foreignKey: 'order_id',
      as: 'orderProducts'
    });
  };

  return Order;
};
