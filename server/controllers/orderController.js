const { Order, Product, OrderProduct, Client } = require('../models');
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
        timeFilter,
        page = 1, 
        limit = 10,
        sortBy = 'date_limite_livraison_estimee',
        sortOrder = 'ASC'
      } = req.query;

      const offset = (page - 1) * limit;

      // Build where clause for filtering
      const whereClause = {};
      const includeClause = [];
      
      if (statut) whereClause.statut = statut;
      if (commercial) whereClause.commercial_en_charge = { [Op.like]: `%${commercial}%` };
      if (atelier) whereClause.atelier_concerne = atelier;
      if (infographe) whereClause.infographe_en_charge = { [Op.like]: `%${infographe}%` };
      if (etape) whereClause.etape = etape;
      
      // Handle client filtering - search both legacy client field and new client relationship
      if (client) {
        whereClause[Op.or] = [
          { client: { [Op.like]: `%${client}%` } }, // Legacy client field
          { '$clientInfo.nom$': { [Op.like]: `%${client}%` } } // New client relationship
        ];
      }

      // Time-based filtering
      if (timeFilter) {
        const now = new Date();
        let dateCondition = {};
        
        switch (timeFilter) {
          case 'active':
            // Show only orders that are not finished (not 'termine', 'livre', or 'annule')
            whereClause.statut = { [Op.notIn]: ['termine', 'livre', 'annule'] };
            break;
          case 'last30days':
            const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
            dateCondition = {
              [Op.or]: [
                // Orders created in last 30 days
                { createdAt: { [Op.gte]: thirtyDaysAgo } },
                // Or active orders regardless of age
                { statut: { [Op.notIn]: ['termine', 'livre', 'annule'] } }
              ]
            };
            Object.assign(whereClause, dateCondition);
            break;
          case 'last90days':
            const ninetyDaysAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
            dateCondition = {
              [Op.or]: [
                // Orders created in last 90 days
                { createdAt: { [Op.gte]: ninetyDaysAgo } },
                // Or active orders regardless of age
                { statut: { [Op.notIn]: ['termine', 'livre', 'annule'] } }
              ]
            };
            Object.assign(whereClause, dateCondition);
            break;
          case 'all':
          default:
            // No additional filtering
            break;
        }
      }

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
          },
          {
            model: Client,
            as: 'clientInfo',
            attributes: ['id', 'nom', 'email', 'telephone', 'type_client']
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
          },
          {
            model: Client,
            as: 'clientInfo',
            attributes: ['id', 'nom', 'email', 'telephone', 'ville', 'type_client']
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
        client_id, // Add client_id support
        products, // Array of {productId, quantity, unitPrice?}
        date_limite_livraison_estimee,
        date_limite_livraison_attendue,
        etape,
        option_finition,
        atelier_concerne,
        statut = 'en_attente',
        commentaires,
        estimated_work_time_minutes,
        bat, // New BAT field
        express // New Express field
      } = req.body;

      // Validate required fields - now client_id is preferred over client
      if (!commercial_en_charge || !numero_pms || (!client && !client_id) || !products || !Array.isArray(products) || products.length === 0) {
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

        // Validate finitions if provided
        if (product.finitions && Array.isArray(product.finitions)) {
          for (const finition of product.finitions) {
            if (!finition.finition_id || typeof finition.finition_id !== 'number') {
              await transaction.rollback();
              return res.status(400).json({ 
                message: 'Chaque finition doit avoir un ID valide' 
              });
            }
          }
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
        client: client || null, // Keep for backward compatibility
        client_id: client_id || null, // New client reference
        date_limite_livraison_estimee: date_limite_livraison_estimee ? new Date(date_limite_livraison_estimee) : null,
        date_limite_livraison_attendue: date_limite_livraison_attendue ? new Date(date_limite_livraison_attendue) : null,
        etape,
        option_finition,
        atelier_concerne,
        statut,
        commentaires,
        estimated_work_time_minutes,
        bat, // New BAT field
        express // New Express field
      }, { transaction });

      // Create order-product relationships
      const orderProducts = products.map(product => ({
        order_id: order.id,
        product_id: product.productId,
        quantity: product.quantity,
        unit_price: product.unitPrice || null,
        finitions: product.finitions || null
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
          },
          {
            model: Client,
            as: 'clientInfo',
            attributes: ['id', 'nom', 'email', 'telephone', 'type_client']
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
        client_id, // Add client_id support
        products, // Array of {productId, quantity, unitPrice?} - optional for updates
        date_limite_livraison_estimee,
        date_limite_livraison_attendue,
        etape,
        option_finition,
        atelier_concerne,
        statut,
        commentaires,
        estimated_work_time_minutes,
        bat, // New BAT field
        express // New Express field
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

          // Validate finitions if provided
          if (product.finitions && Array.isArray(product.finitions)) {
            for (const finition of product.finitions) {
              if (!finition.finition_id || typeof finition.finition_id !== 'number') {
                await transaction.rollback();
                return res.status(400).json({ 
                  message: 'Chaque finition doit avoir un ID valide' 
                });
              }
            }
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
          unit_price: product.unitPrice || null,
          finitions: product.finitions || null
        }));

        await OrderProduct.bulkCreate(orderProducts, { transaction });
      }

      // Update other fields
      await order.update({
        commercial_en_charge: commercial_en_charge || order.commercial_en_charge,
        infographe_en_charge: infographe_en_charge !== undefined ? infographe_en_charge : order.infographe_en_charge,
        numero_pms: numero_pms || order.numero_pms,
        client: client !== undefined ? client : order.client,
        client_id: client_id !== undefined ? client_id : order.client_id,
        date_limite_livraison_estimee: date_limite_livraison_estimee ? new Date(date_limite_livraison_estimee) : order.date_limite_livraison_estimee,
        date_limite_livraison_attendue: date_limite_livraison_attendue ? new Date(date_limite_livraison_attendue) : order.date_limite_livraison_attendue,
        etape: etape !== undefined ? etape : order.etape,
        option_finition: option_finition !== undefined ? option_finition : order.option_finition,
        atelier_concerne: atelier_concerne !== undefined ? atelier_concerne : order.atelier_concerne,
        statut: statut || order.statut,
        commentaires: commentaires !== undefined ? commentaires : order.commentaires,
        estimated_work_time_minutes: estimated_work_time_minutes !== undefined ? estimated_work_time_minutes : order.estimated_work_time_minutes,
        bat: bat !== undefined ? bat : order.bat, // New BAT field
        express: express !== undefined ? express : order.express // New Express field
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
          },
          {
            model: Client,
            as: 'clientInfo',
            attributes: ['id', 'nom', 'email', 'telephone', 'type_client']
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
      // Only count orders that are shown in the dashboard (exclude cancelled and delivered)
      const stats = await Order.findAll({
        attributes: [
          'statut',
          [Order.sequelize.fn('COUNT', Order.sequelize.col('id')), 'count']
        ],
        where: {
          statut: { [Op.notIn]: ['annule', 'livre'] }
        },
        group: ['statut']
      });

      const formattedStats = {
        en_attente: 0,
        en_cours: 0,
        termine: 0,
        livre: 0, // Will always be 0 since we exclude it
        annule: 0 // Will always be 0 since we exclude it
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
