const { Order, Product, OrderProduct } = require('../models');
const { Op, Sequelize } = require('sequelize');

class OrderController {
  // Get all orders with optional filtering
  static async getAllOrders(req, res) {
    try {
      const { 
        statut, 
        commercial, 
        client, 
        atelier,
        infographe,
        etape,
        page = 1, 
        limit = 10,
        sortBy = 'date_limite_livraison_estimee',
        sortOrder = 'ASC'
      } = req.query;

      const offset = (page - 1) * limit;

      // Build where clause for filtering
      const whereClause = {};
      if (statut) whereClause.statut = statut;
      if (commercial) whereClause.commercial_en_charge = { [Op.like]: `%${commercial}%` };
      if (client) whereClause.client = { [Op.like]: `%${client}%` };
      if (atelier) whereClause.atelier_concerne = atelier;
      if (infographe) whereClause.infographe_en_charge = { [Op.like]: `%${infographe}%` };
      if (etape) whereClause.etape = etape;

      // Create a custom order that puts orders with delivery dates first (closest first),
      // then orders without delivery dates, sorted by creation date
      const orderClause = sortBy === 'date_limite_livraison_estimee' 
        ? [
            [Sequelize.fn('ISNULL', Sequelize.col('date_limite_livraison_estimee')), 'ASC'], // NULL values last
            [sortBy, 'ASC'],                 // Orders with dates first, ascending
            ['createdAt', 'DESC']            // Then by creation date for orders without delivery dates
          ]
        : [[sortBy, sortOrder]];

      const { count, rows } = await Order.findAndCountAll({
        where: whereClause,
        order: orderClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        include: [
          {
            model: Product,
            as: 'products',
            through: {
              as: 'orderProduct',
              attributes: ['quantity', 'unit_price']
            }
          }
        ]
      });

      res.json({
        message: 'Commandes récupérées avec succès',
        orders: rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalOrders: count,
          hasNextPage: page * limit < count,
          hasPrevPage: page > 1
        }
      });
    } catch (error) {
      console.error('Get orders error:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }

  // Get order by ID
  static async getOrderById(req, res) {
    try {
      const { id } = req.params;
      
      const order = await Order.findByPk(id, {
        include: [
          {
            model: Product,
            as: 'products',
            through: {
              as: 'orderProduct',
              attributes: ['quantity', 'unit_price']
            }
          }
        ]
      });
      if (!order) {
        return res.status(404).json({ message: 'Commande non trouvée' });
      }

      res.json({
        message: 'Commande trouvée',
        order: order
      });
    } catch (error) {
      console.error('Get order error:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }

  // Create new order
  static async createOrder(req, res) {
    const transaction = await Order.sequelize.transaction();
    
    try {
      const {
        commercial_en_charge,
        infographe_en_charge,
        numero_pms,
        client,
        products, // Array of {productId, quantity, unitPrice?}
        date_limite_livraison_estimee,
        date_limite_livraison_attendue,
        etape,
        option_finition,
        atelier_concerne,
        statut = 'en_attente',
        commentaires
      } = req.body;

      // Validate required fields
      if (!commercial_en_charge || !numero_pms || !client || !products || !Array.isArray(products) || products.length === 0) {
        await transaction.rollback();
        return res.status(400).json({ 
          message: 'Les champs commercial, numéro PMS, client et produits sont requis' 
        });
      }

      // Validate products array
      for (const product of products) {
        if (!product.productId || !product.quantity || product.quantity <= 0) {
          await transaction.rollback();
          return res.status(400).json({ 
            message: 'Chaque produit doit avoir un ID valide et une quantité supérieure à 0' 
          });
        }
      }

      // Check if all products exist
      const productIds = products.map(p => p.productId);
      const existingProducts = await Product.findAll({
        where: { id: productIds },
        transaction
      });

      if (existingProducts.length !== productIds.length) {
        await transaction.rollback();
        return res.status(400).json({ 
          message: 'Un ou plusieurs produits spécifiés n\'existent pas' 
        });
      }

      // Create the order
      const order = await Order.create({
        commercial_en_charge,
        infographe_en_charge,
        numero_pms,
        client,
        date_limite_livraison_estimee: date_limite_livraison_estimee ? new Date(date_limite_livraison_estimee) : null,
        date_limite_livraison_attendue: date_limite_livraison_attendue ? new Date(date_limite_livraison_attendue) : null,
        etape,
        option_finition,
        atelier_concerne,
        statut,
        commentaires
      }, { transaction });

      // Create order-product relationships
      const orderProducts = products.map(product => ({
        order_id: order.id,
        product_id: product.productId,
        quantity: product.quantity,
        unit_price: product.unitPrice || null
      }));

      await OrderProduct.bulkCreate(orderProducts, { transaction });

      await transaction.commit();

      // Fetch the complete order with products
      const completeOrder = await Order.findByPk(order.id, {
        include: [
          {
            model: Product,
            as: 'products',
            through: {
              as: 'orderProduct',
              attributes: ['quantity', 'unit_price']
            }
          }
        ]
      });

      res.status(201).json({
        message: 'Commande créée avec succès',
        order: completeOrder
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Create order error:', error);
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({ message: 'Ce numéro PMS existe déjà' });
      }
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }

  // Update order
  static async updateOrder(req, res) {
    const transaction = await Order.sequelize.transaction();
    
    try {
      const { id } = req.params;
      const {
        commercial_en_charge,
        infographe_en_charge,
        numero_pms,
        client,
        products, // Array of {productId, quantity, unitPrice?} - optional for updates
        date_limite_livraison_estimee,
        date_limite_livraison_attendue,
        etape,
        option_finition,
        atelier_concerne,
        statut,
        commentaires
      } = req.body;

      const order = await Order.findByPk(id, { transaction });

      if (!order) {
        await transaction.rollback();
        return res.status(404).json({ message: 'Commande non trouvée' });
      }

      // If products are being updated
      if (products && Array.isArray(products)) {
        // Validate products array
        for (const product of products) {
          if (!product.productId || !product.quantity || product.quantity <= 0) {
            await transaction.rollback();
            return res.status(400).json({ 
              message: 'Chaque produit doit avoir un ID valide et une quantité supérieure à 0' 
            });
          }
        }

        // Check if all products exist
        const productIds = products.map(p => p.productId);
        const existingProducts = await Product.findAll({
          where: { id: productIds },
          transaction
        });

        if (existingProducts.length !== productIds.length) {
          await transaction.rollback();
          return res.status(400).json({ 
            message: 'Un ou plusieurs produits spécifiés n\'existent pas' 
          });
        }

        // Remove existing order-product relationships
        await OrderProduct.destroy({
          where: { order_id: id },
          transaction
        });

        // Create new order-product relationships
        const orderProducts = products.map(product => ({
          order_id: id,
          product_id: product.productId,
          quantity: product.quantity,
          unit_price: product.unitPrice || null
        }));

        await OrderProduct.bulkCreate(orderProducts, { transaction });
      }

      // Update other fields
      await order.update({
        commercial_en_charge: commercial_en_charge || order.commercial_en_charge,
        infographe_en_charge: infographe_en_charge !== undefined ? infographe_en_charge : order.infographe_en_charge,
        numero_pms: numero_pms || order.numero_pms,
        client: client || order.client,
        date_limite_livraison_estimee: date_limite_livraison_estimee ? new Date(date_limite_livraison_estimee) : order.date_limite_livraison_estimee,
        date_limite_livraison_attendue: date_limite_livraison_attendue ? new Date(date_limite_livraison_attendue) : order.date_limite_livraison_attendue,
        etape: etape !== undefined ? etape : order.etape,
        option_finition: option_finition !== undefined ? option_finition : order.option_finition,
        atelier_concerne: atelier_concerne !== undefined ? atelier_concerne : order.atelier_concerne,
        statut: statut || order.statut,
        commentaires: commentaires !== undefined ? commentaires : order.commentaires
      }, { transaction });

      await transaction.commit();

      // Fetch the updated order with products
      const updatedOrder = await Order.findByPk(id, {
        include: [
          {
            model: Product,
            as: 'products',
            through: {
              as: 'orderProduct',
              attributes: ['quantity', 'unit_price']
            }
          }
        ]
      });

      res.json({
        message: 'Commande mise à jour avec succès',
        order: updatedOrder
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Update order error:', error);
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({ message: 'Ce numéro PMS existe déjà' });
      }
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }

  // Delete order
  static async deleteOrder(req, res) {
    try {
      const { id } = req.params;

      const order = await Order.findByPk(id);
      if (!order) {
        return res.status(404).json({ message: 'Commande non trouvée' });
      }

      // OrderProduct records will be automatically deleted due to CASCADE
      await order.destroy();

      res.json({
        message: 'Commande supprimée avec succès'
      });
    } catch (error) {
      console.error('Delete order error:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }

  // Get order statistics
  static async getOrderStats(req, res) {
    try {
      const stats = await Order.findAll({
        attributes: [
          'statut',
          [Order.sequelize.fn('COUNT', Order.sequelize.col('id')), 'count']
        ],
        group: ['statut']
      });

      const formattedStats = {
        en_attente: 0,
        en_cours: 0,
        termine: 0,
        livre: 0,
        annule: 0
      };

      stats.forEach(stat => {
        formattedStats[stat.statut] = parseInt(stat.dataValues.count);
      });

      const totalOrders = Object.values(formattedStats).reduce((sum, count) => sum + count, 0);

      res.json({
        message: 'Statistiques récupérées avec succès',
        stats: {
          ...formattedStats,
          total: totalOrders
        }
      });
    } catch (error) {
      console.error('Get order stats error:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }
}

module.exports = OrderController;
