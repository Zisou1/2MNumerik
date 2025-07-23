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

      // Build where clause for filtering (order-level fields only)
      const whereClause = {};
      const includeClause = [];
      
      // Order-level filters
      if (commercial) whereClause.commercial_en_charge = { [Op.like]: `%${commercial}%` };
      
      // Build product-level filters
      const productWhere = {};
      if (atelier) productWhere.atelier_concerne = atelier;
      if (infographe) productWhere.infograph_en_charge = { [Op.like]: `%${infographe}%` };
      if (etape) productWhere.etape = etape;
      
      // Status filtering should be at product level since we're showing product rows
      if (statut) productWhere.statut = statut;
      
      // Role-based filtering - now applied at product level
      const userRole = req.user.role;
      if (userRole === 'atelier') {
        // Atelier can only see products with etape 'impression' or 'finition' or 'découpe'
        productWhere.etape = { [Op.in]: ['impression', 'finition', 'découpe'] };
      } else if (userRole === 'infograph') {
        // Infograph can see products assigned to them or unassigned products
        if (!infographe) {
          // If no specific infograph filter, show only products assigned to current user
          productWhere[Op.or] = [
            { infograph_en_charge: req.user.username },
            { infograph_en_charge: null }
          ];
        }
        // Infograph can see products with etape: conception, pré-presse
        const allowedEtapes = ['conception', 'pré-presse'];
        if (etape && allowedEtapes.includes(etape)) {
          productWhere.etape = etape;
        } else if (!etape) {
          productWhere.etape = { [Op.in]: allowedEtapes };
        }
      }
      
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

      let queryOptions;

      if (sortBy === 'date_limite_livraison_estimee') {
        // Special handling for sorting by product delivery dates
        // First, get order IDs sorted by earliest delivery date
        const orderedIds = await Order.findAll({
          attributes: ['id'],
          include: [
            {
              model: OrderProduct,
              as: 'orderProducts',
              attributes: [],
              where: Object.keys(productWhere).length > 0 ? productWhere : undefined,
              required: Object.keys(productWhere).length > 0
            }
          ],
          where: whereClause,
          group: ['Order.id'],
          order: [
            [Sequelize.fn('MIN', Sequelize.col('orderProducts.date_limite_livraison_estimee')), 'ASC'],
            ['createdAt', 'DESC']
          ],
          subQuery: false,
          raw: true
        });

        const orderIds = orderedIds.map(o => o.id);
        
        // If no orders match the criteria, return empty result
        if (orderIds.length === 0) {
          return res.json({
            message: 'Commandes récupérées avec succès',
            orders: [],
            pagination: {
              currentPage: parseInt(page),
              totalPages: 0,
              totalOrders: 0,
              hasNextPage: false,
              hasPrevPage: page > 1
            }
          });
        }
        
        // Now get the full data with proper includes
        queryOptions = {
          where: {
            ...whereClause,
            id: { [Op.in]: orderIds }
          },
          include: [
            {
              model: OrderProduct,
              as: 'orderProducts',
              where: Object.keys(productWhere).length > 0 ? productWhere : undefined,
              required: false, // Left join to get all products for each order
              include: [
                {
                  model: Product,
                  as: 'product',
                  attributes: ['id', 'name', 'estimated_creation_time']
                }
              ]
            },
            {
              model: Client,
              as: 'clientInfo',
              attributes: ['id', 'nom', 'code_client', 'email', 'telephone', 'adresse', 'type_client']
            }
          ],
          // Preserve the custom order from the first query
          order: [
            [Sequelize.literal(`FIELD(Order.id, ${orderIds.join(',')})`)]
          ],
          limit: parseInt(limit),
          offset: parseInt(offset)
        };
      } else {
        // Standard query for other sorts
        queryOptions = {
          where: whereClause,
          order: [[sortBy, sortOrder]],
          limit: parseInt(limit),
          offset: parseInt(offset),
          include: [
            {
              model: OrderProduct,
              as: 'orderProducts',
              where: Object.keys(productWhere).length > 0 ? productWhere : undefined,
              required: Object.keys(productWhere).length > 0,
              include: [
                {
                  model: Product,
                  as: 'product',
                  attributes: ['id', 'name', 'estimated_creation_time']
                }
              ]
            },
            {
              model: Client,
              as: 'clientInfo',
              attributes: ['id', 'nom', 'code_client', 'email', 'telephone', 'adresse', 'type_client']
            }
          ]
        };
      }

      // Get count and rows separately for better control
      let totalCount;
      let rows;

      if (sortBy === 'date_limite_livraison_estimee') {
        // Special handling for sorting by product delivery dates
        // First, get order IDs sorted by earliest delivery date
        const orderedIds = await Order.findAll({
          attributes: ['id'],
          include: [
            {
              model: OrderProduct,
              as: 'orderProducts',
              attributes: [],
              where: Object.keys(productWhere).length > 0 ? productWhere : undefined,
              required: Object.keys(productWhere).length > 0
            }
          ],
          where: whereClause,
          group: ['Order.id'],
          order: [
            [Sequelize.fn('MIN', Sequelize.col('orderProducts.date_limite_livraison_estimee')), 'ASC'],
            ['createdAt', 'DESC']
          ],
          subQuery: false,
          raw: true
        })
        
        // Then get full orders with details
        queryOptions.where = {
          ...queryOptions.where,
          id: { [Op.in]: orderedIds.map(o => o.id) }
        }
      }

      // Execute the main query
      const result = await Order.findAndCountAll(queryOptions)
      totalCount = result.count
      rows = result.rows

      res.json({
        message: 'Commandes récupérées avec succès',
        orders: rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / limit),
          totalOrders: totalCount,
          hasNextPage: page * limit < totalCount,
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
      
      // Build where clause with role-based filtering
      const whereClause = { id };
      const userRole = req.user.role;
      
      if (userRole === 'atelier') {
        // Atelier can only see orders with etape 'impression' or 'decoupe'
        whereClause.etape = { [Op.in]: ['impression', 'decoupe'] };
      } else if (userRole === 'infograph') {
        // Infograph can see orders with etape: conception, pre-press, impression, decoupe (but NOT null values)
        whereClause.etape = { [Op.in]: ['conception', 'pre-press', 'impression', 'decoupe'] };
      }
      // Commercial (or any other role) can see everything - no additional filtering
      
      const order = await Order.findOne({
        where: whereClause,
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
            attributes: ['id', 'nom', 'code_client', 'email', 'telephone', 'adresse', 'type_client']
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
        numero_affaire,
        numero_dm,
        client,
        client_id, // Add client_id support
        products, // Array of {productId, quantity, unitPrice?, numero_pms, infograph_en_charge, etc.}
        date_limite_livraison_attendue,
        statut = 'en_attente'
      } = req.body;

      // Validate required fields - updated for new structure
      if (!commercial_en_charge || (!client && !client_id) || !products || !Array.isArray(products) || products.length === 0) {
        await transaction.rollback();
        return res.status(400).json({ 
          message: 'Les champs commercial, client et produits sont requis' 
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

      // Create the order - updated for new structure
      const order = await Order.create({
        commercial_en_charge,
        numero_affaire,
        numero_dm,
        client: client || null, // Keep for backward compatibility
        client_id: client_id || null, // New client reference
        date_limite_livraison_attendue: date_limite_livraison_attendue ? new Date(date_limite_livraison_attendue) : null,
        statut
      }, { transaction });

      // Create order-product relationships with product-specific fields
      const orderProducts = products.map(product => ({
        order_id: order.id,
        product_id: product.productId,
        quantity: product.quantity,
        unit_price: product.unitPrice || null,
        finitions: product.finitions || null,
        // Product-specific fields
        numero_pms: product.numero_pms || null,
        infograph_en_charge: product.infograph_en_charge || null,
        etape: product.etape || null,
        statut: product.statut || 'en_attente',
        estimated_work_time_minutes: product.estimated_work_time_minutes || null,
        date_limite_livraison_estimee: product.date_limite_livraison_estimee ? new Date(product.date_limite_livraison_estimee) : null,
        atelier_concerne: product.atelier_concerne || null,
        commentaires: product.commentaires || null,
        bat: product.bat || null,
        express: product.express || null
      }));

      await OrderProduct.bulkCreate(orderProducts, { transaction });

      await transaction.commit();

      // Fetch the complete order with products
      const completeOrder = await Order.findByPk(order.id, {
        include: [
          {
            model: OrderProduct,
            as: 'orderProducts',
            include: [
              {
                model: Product,
                as: 'product',
                attributes: ['id', 'name', 'estimated_creation_time']
              }
            ]
          },
          {
            model: Client,
            as: 'clientInfo',
            attributes: ['id', 'nom', 'code_client', 'email', 'telephone', 'adresse', 'type_client']
          }
        ]
      });

      // Emit real-time event for order creation
      const io = req.app.get('io');
      if (io) {
        io.emit('orderCreated', completeOrder);
      }

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
        numero_affaire,
        numero_dm,
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

      // Role-based access control - check if user can access this order
      const userRole = req.user.role;
      if (userRole === 'atelier') {
        // Atelier can only update orders with etape 'impression' or 'decoupe'
        if (!['impression', 'decoupe'].includes(order.etape)) {
          await transaction.rollback();
          return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à modifier cette commande' });
        }
      } else if (userRole === 'infograph') {
        // Infograph can see orders with etape: conception, pre-press, impression, decoupe
        const allowedEtapes = ['conception', 'pre-press', 'impression', 'decoupe'];
        if (!allowedEtapes.includes(order.etape)) {
          await transaction.rollback();
          return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à modifier cette commande' });
        }
      }
      // Commercial (or any other role) can update everything - no additional filtering

      // Business logic for etape transitions based on user role
      if (etape !== undefined && etape !== order.etape) {
        if (userRole === 'commercial') {
          // Commercial can change etape from undefined to 'conception'
          if (order.etape === null && etape === 'conception') {
            // Allowed transition
          } else if (['conception', 'pre-press', 'impression', 'decoupe', 'impression-decoupe'].includes(etape)) {
            // Commercial can set any etape
          } else {
            await transaction.rollback();
            return res.status(400).json({ message: 'Étape non valide' });
          }
        } else if (userRole === 'infograph') {
          // Infograph can transition: conception -> pre-press -> impression
          if ((order.etape === 'conception' && etape === 'pre-press') ||
              (order.etape === 'pre-press' && etape === 'impression') ||
              (order.etape === 'impression' && etape === 'decoupe')) {
            // Allowed transitions
          } else {
            await transaction.rollback();
            return res.status(400).json({ message: 'Transition d\'étape non autorisée pour votre rôle' });
          }
        } else if (userRole === 'atelier') {
          // Atelier can only work on 'impression' and 'decoupe' orders but cannot change etape
          await transaction.rollback();
          return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à changer l\'étape de cette commande' });
        }
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
          finitions: product.finitions || null,
          // Product-specific fields
          numero_pms: product.numero_pms || null,
          infograph_en_charge: product.infograph_en_charge || null,
          etape: product.etape || null,
          statut: product.statut || 'en_attente',
          estimated_work_time_minutes: product.estimated_work_time_minutes || null,
          date_limite_livraison_estimee: product.date_limite_livraison_estimee ? new Date(product.date_limite_livraison_estimee) : null,
          atelier_concerne: product.atelier_concerne || null,
          commentaires: product.commentaires || null,
          bat: product.bat || null,
          express: product.express || null
        }));

        await OrderProduct.bulkCreate(orderProducts, { transaction });
      }

      // Update other fields
      await order.update({
        commercial_en_charge: commercial_en_charge || order.commercial_en_charge,
        infographe_en_charge: infographe_en_charge !== undefined ? infographe_en_charge : order.infographe_en_charge,
        numero_pms: numero_pms || order.numero_pms,
        numero_affaire: numero_affaire !== undefined ? numero_affaire : order.numero_affaire,
        numero_dm: numero_dm !== undefined ? numero_dm : order.numero_dm,
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
            model: OrderProduct,
            as: 'orderProducts',
            include: [
              {
                model: Product,
                as: 'product',
                attributes: ['id', 'name', 'estimated_creation_time']
              }
            ]
          },
          {
            model: Client,
            as: 'clientInfo',
            attributes: ['id', 'nom', 'code_client', 'email', 'telephone', 'adresse', 'type_client']
          }
        ]
      });

      // Emit real-time event for order update
      const io = req.app.get('io');
      if (io) {
        io.emit('orderUpdated', updatedOrder);
      }

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

      // Build where clause with role-based filtering
      const whereClause = { id };
      const userRole = req.user.role;
      
      if (userRole === 'atelier') {
        // Atelier can only see orders with etape 'impression' or 'decoupe'
        whereClause.etape = { [Op.in]: ['impression', 'decoupe'] };
      } else if (userRole === 'infograph') {
        // Infograph can see orders with etape: conception, pre-press, impression, decoupe (but NOT null values)
        whereClause.etape = { [Op.in]: ['conception', 'pre-press', 'impression', 'decoupe'] };
      }
      // Commercial (or any other role) can see everything - no additional filtering

      const order = await Order.findOne({ where: whereClause });
      if (!order) {
        return res.status(404).json({ message: 'Commande non trouvée' });
      }

      // Additional business rule: Only allow deletion for certain roles
      if (userRole === 'atelier') {
        return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à supprimer des commandes' });
      } else if (userRole === 'infograph') {
        return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à supprimer des commandes' });
      }
      // Only commercial and admin can delete orders

      // OrderProduct records will be automatically deleted due to CASCADE
      await order.destroy();

      // Emit real-time event for order deletion
      const io = req.app.get('io');
      if (io) {
        io.emit('orderDeleted', { id: parseInt(id) });
      }

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
      // Build product-level where clause for consistency with dashboard filtering
      const productWhere = {
        statut: { [Op.notIn]: ['annule', 'livre'] }
      };

      // Apply role-based filtering at product level
      const userRole = req.user.role;
      if (userRole === 'atelier') {
        // Atelier can only see products with etape 'impression' or 'finition' or 'découpe'
        productWhere.etape = { [Op.in]: ['impression', 'finition', 'découpe'] };
      } else if (userRole === 'infograph') {
        // Infograph can see products assigned to them or unassigned products
        if (!req.query.infographe) {
          // If no specific infograph filter, show only products assigned to current user
          productWhere[Op.or] = [
            { infograph_en_charge: req.user.username },
            { infograph_en_charge: null }
          ];
        }
        // Infograph can see products with etape: conception, pré-presse
        const allowedEtapes = ['conception', 'pré-presse'];
        productWhere.etape = { [Op.in]: allowedEtapes };
      }

      // Query OrderProduct table to get stats at product level
      const stats = await OrderProduct.findAll({
        attributes: [
          'statut',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
        ],
        where: productWhere,
        group: ['statut']
      });

      // Format the stats
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

      const totalProducts = Object.values(formattedStats).reduce((sum, count) => sum + count, 0);

      res.json({
        message: 'Statistiques récupérées avec succès',
        stats: {
          ...formattedStats,
          total: totalProducts
        }
      });
    } catch (error) {
      console.error('Get order stats error:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }

  // Update individual order product
  static async updateOrderProduct(req, res) {
    const transaction = await Order.sequelize.transaction();
    
    try {
      const { orderId, productId } = req.params;
      const {
        quantity,
        numero_pms,
        infograph_en_charge,
        date_limite_livraison_estimee,
        etape,
        atelier_concerne,
        statut,
        estimated_work_time_minutes,
        bat,
        express,
        commentaires
      } = req.body;

      // Find the order product
      const orderProduct = await OrderProduct.findOne({
        where: {
          order_id: orderId,
          product_id: productId
        },
        transaction
      });

      if (!orderProduct) {
        await transaction.rollback();
        return res.status(404).json({ message: 'Produit non trouvé dans cette commande' });
      }

      // Check permissions
      const userRole = req.user.role;
      if (userRole === 'infograph') {
        // Infograph can only update products assigned to them or unassigned
        if (orderProduct.infograph_en_charge && 
            orderProduct.infograph_en_charge !== req.user.username) {
          await transaction.rollback();
          return res.status(403).json({ message: 'Accès refusé: ce produit est assigné à un autre infographe' });
        }
      }

      // Update the order product
      await orderProduct.update({
        quantity,
        numero_pms,
        infograph_en_charge,
        date_limite_livraison_estimee,
        etape,
        atelier_concerne,
        statut,
        estimated_work_time_minutes,
        bat,
        express,
        commentaires
      }, { transaction });

      // Update overall order status if product status changed
      if (statut) {
        const order = await Order.findByPk(orderId, { transaction });
        if (order) {
          await order.updateStatusFromProducts();
        }
      }

      await transaction.commit();

      // Return updated order product with product info
      const updatedOrderProduct = await OrderProduct.findOne({
        where: {
          order_id: orderId,
          product_id: productId
        },
        include: [
          {
            model: Product,
            as: 'product',
            attributes: ['id', 'name', 'estimated_creation_time']
          }
        ]
      });

      // Emit real-time event for order product update
      const io = req.app.get('io');
      if (io) {
        // Fetch the complete order with all products for real-time update
        const completeOrder = await Order.findByPk(orderId, {
          include: [
            {
              model: OrderProduct,
              as: 'orderProducts',
              include: [
                {
                  model: Product,
                  as: 'product',
                  attributes: ['id', 'name', 'estimated_creation_time']
                }
              ]
            },
            {
              model: Client,
              as: 'clientInfo',
              attributes: ['id', 'nom', 'code_client', 'email', 'telephone', 'adresse', 'type_client']
            }
          ]
        });
        
        io.emit('orderUpdated', completeOrder);
      }

      res.json({
        message: 'Produit mis à jour avec succès',
        orderProduct: updatedOrderProduct
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Update order product error:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }
}

module.exports = OrderController;
