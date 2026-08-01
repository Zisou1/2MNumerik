const { Item, Lot, LotLocation, Location, ItemLocation, Unit, sequelize, Sequelize } = require('../models');
const { Op } = require('sequelize');

// Get all items
const getAllItems = async (req, res) => {
  try {
    const { page = 1, limit = 10, sortBy = 'name', sortOrder = 'ASC', search = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause for search
    const whereClause = {};
    if (search) {
      whereClause.name = {
        [Op.like]: `%${search}%`
      };
    }

    const { count, rows } = await Item.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Unit,
          as: 'unitInfo',
          attributes: ['id', 'name', 'symbol']
        },
        {
          model: Lot,
          as: 'lots',
          include: [
            {
              model: LotLocation,
              as: 'lotLocations',
              include: [
                {
                  model: Location,
                  as: 'location',
                  attributes: ['id', 'name', 'type']
                }
              ]
            }
          ]
        }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true,
      col: 'id'
    });

    res.json({
      items: rows,
      totalCount: count,
      totalPages: Math.ceil(count / parseInt(limit)),
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
};

// Get single item by ID
const getItemById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const item = await Item.findByPk(id, {
      include: [
        {
          model: Unit,
          as: 'unitInfo',
          attributes: ['id', 'name', 'symbol']
        },
        {
          model: Lot,
          as: 'lots',
          include: [
            {
              model: LotLocation,
              as: 'lotLocations',
              include: [
                {
                  model: Location,
                  as: 'location'
                }
              ]
            }
          ]
        },
        {
          model: ItemLocation,
          as: 'itemLocations'
        }
      ]
    });

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(item);
  } catch (error) {
    console.error('Error fetching item:', error);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
};

// Create new item
const createItem = async (req, res) => {
  try {
    const { name, description, unit, unit_id } = req.body;

    // Validation
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Item name is required' });
    }

    let resolvedUnitId = null;
    let resolvedUnitSymbol = 'unite';

    if (unit_id) {
      const foundUnit = await Unit.findByPk(unit_id);
      if (!foundUnit) {
        return res.status(400).json({ error: "L'unité sélectionnée n'existe pas" });
      }
      resolvedUnitId = foundUnit.id;
      resolvedUnitSymbol = foundUnit.symbol;
    } else if (unit) {
      const foundUnit = await Unit.findOne({ where: { symbol: unit.trim() } });
      if (foundUnit) {
        resolvedUnitId = foundUnit.id;
        resolvedUnitSymbol = foundUnit.symbol;
      } else {
        resolvedUnitSymbol = unit.trim();
      }
    } else {
      const defaultUnit = await Unit.findOne({ where: { symbol: 'unite' } });
      if (defaultUnit) {
        resolvedUnitId = defaultUnit.id;
        resolvedUnitSymbol = defaultUnit.symbol;
      }
    }

    const item = await Item.create({
      name: name.trim(),
      description: description?.trim() || null,
      unit: resolvedUnitSymbol,
      unit_id: resolvedUnitId
    });

    // Fetch the created item for response
    const createdItem = await Item.findByPk(item.id, {
      include: [
        {
          model: Unit,
          as: 'unitInfo',
          attributes: ['id', 'name', 'symbol']
        },
        {
          model: Lot,
          as: 'lots',
          include: [
            {
              model: LotLocation,
              as: 'lotLocations',
              include: [
                {
                  model: Location,
                  as: 'location'
                }
              ]
            }
          ]
        }
      ]
    });

    res.status(201).json(createdItem);
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
};

// Update item
const updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, unit, unit_id } = req.body;

    const item = await Item.findByPk(id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const updatePayload = {
      name: name?.trim() || item.name,
      description: description !== undefined ? (description?.trim() || null) : item.description
    };

    if (unit_id !== undefined) {
      if (unit_id) {
        const foundUnit = await Unit.findByPk(unit_id);
        if (!foundUnit) {
          return res.status(400).json({ error: "L'unité sélectionnée n'existe pas" });
        }
        updatePayload.unit_id = foundUnit.id;
        updatePayload.unit = foundUnit.symbol;
      }
    } else if (unit !== undefined) {
      const foundUnit = await Unit.findOne({ where: { symbol: unit.trim() } });
      if (foundUnit) {
        updatePayload.unit_id = foundUnit.id;
        updatePayload.unit = foundUnit.symbol;
      } else {
        updatePayload.unit = unit.trim();
      }
    }

    await item.update(updatePayload);

    // Fetch the updated item for response
    const updatedItem = await Item.findByPk(item.id, {
      include: [
        {
          model: Unit,
          as: 'unitInfo',
          attributes: ['id', 'name', 'symbol']
        },
        {
          model: Lot,
          as: 'lots',
          include: [
            {
              model: LotLocation,
              as: 'lotLocations',
              include: [
                {
                  model: Location,
                  as: 'location'
                }
              ]
            }
          ]
        }
      ]
    });

    res.json(updatedItem);
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
};

// Get stock matrix (paginated items with aggregated location quantities)
const getStockMatrix = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      sortBy = 'name', 
      sortOrder = 'ASC', 
      search = '' 
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause for search
    const whereClause = {};
    if (search) {
      whereClause.name = {
        [Op.like]: `%${search}%`
      };
    }

    // 1. Fetch paginated items
    const { count, rows: items } = await Item.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder.toUpperCase()]],
      attributes: ['id', 'name', 'description', 'unit', 'unit_id'],
      include: [
        {
          model: Unit,
          as: 'unitInfo',
          attributes: ['id', 'name', 'symbol']
        }
      ]
    });

    const itemIds = items.map(item => item.id);

    // 2. Fetch all locations (for column headers)
    const allLocations = await Location.findAll({
      order: [['name', 'ASC']],
      attributes: ['id', 'name', 'type']
    });

    // 3. Compute global KPI stats
    const totalItems = await Item.count();
    const totalLocations = allLocations.length;
    
    // Out of Stock = Items with configured minimum_quantity > 0, but available <= 0 or missing
    const outOfStockQuery = `
      SELECT COUNT(*) as count
      FROM item_locations il
      LEFT JOIN (
        SELECT lot.item_id, ll.location_id, SUM(ll.quantity - ll.reserved_quantity) as available
        FROM lot_locations ll
        INNER JOIN lots lot ON ll.lot_id = lot.id
        GROUP BY lot.item_id, ll.location_id
      ) as stock ON stock.item_id = il.item_id AND stock.location_id = il.location_id
      WHERE il.minimum_quantity > 0 AND (stock.available IS NULL OR stock.available <= 0)
    `;
    const outOfStockResult = await sequelize.query(outOfStockQuery, { type: Sequelize.QueryTypes.SELECT });
    const outOfStockCount = parseInt(outOfStockResult[0].count) || 0;

    // Low stock = Items with configured minimum_quantity > 0, and 0 < available <= minimum_quantity
    const lowStockQuery = `
      SELECT COUNT(*) as count
      FROM item_locations il
      INNER JOIN (
        SELECT lot.item_id, ll.location_id, SUM(ll.quantity - ll.reserved_quantity) as available
        FROM lot_locations ll
        INNER JOIN lots lot ON ll.lot_id = lot.id
        GROUP BY lot.item_id, ll.location_id
      ) as stock ON stock.item_id = il.item_id AND stock.location_id = il.location_id
      WHERE il.minimum_quantity > 0 AND stock.available > 0 AND stock.available <= il.minimum_quantity
    `;
    const lowStockResult = await sequelize.query(lowStockQuery, { type: Sequelize.QueryTypes.SELECT });
    const lowStockCount = parseInt(lowStockResult[0].count) || 0;

    // Total quantity = sum of all lot_location quantities
    const totalQuantityResult = await LotLocation.sum('quantity');
    const totalQuantity = parseFloat(totalQuantityResult) || 0;

    const summary = {
      totalItems,
      totalLocations,
      outOfStockCount,
      lowStockCount,
      totalQuantity
    };

    if (itemIds.length === 0) {
      return res.json({
        items: [],
        locations: allLocations,
        totalCount: count,
        totalPages: Math.ceil(count / parseInt(limit)),
        currentPage: parseInt(page),
        summary
      });
    }

    // 4. Fetch aggregated stock quantities for the paginated items per location
    const physicalStockQuery = `
      SELECT 
        lot.item_id AS item_id,
        ll.location_id AS location_id,
        SUM(ll.quantity) AS quantity,
        SUM(ll.reserved_quantity) AS reserved_quantity
      FROM lot_locations ll
      INNER JOIN lots lot ON ll.lot_id = lot.id
      WHERE lot.item_id IN (:itemIds)
      GROUP BY lot.item_id, ll.location_id
    `;
    const physicalStock = await sequelize.query(physicalStockQuery, {
      replacements: { itemIds },
      type: Sequelize.QueryTypes.SELECT
    });

    // 5. Fetch configured thresholds
    const thresholdsQuery = `
      SELECT item_id, location_id, minimum_quantity
      FROM item_locations
      WHERE item_id IN (:itemIds) AND minimum_quantity > 0
    `;
    const configuredThresholds = await sequelize.query(thresholdsQuery, {
      replacements: { itemIds },
      type: Sequelize.QueryTypes.SELECT
    });

    // Map query results to structured objects
    const itemMap = new Map();
    items.forEach(item => {
      itemMap.set(item.id, {
        id: item.id,
        name: item.name,
        description: item.description,
        unit: item.unit,
        locations: {}
      });
    });

    // Map physical stock
    physicalStock.forEach(row => {
      const itemObj = itemMap.get(row.item_id);
      if (itemObj) {
        const qty = parseFloat(row.quantity) || 0;
        const reservedQty = parseFloat(row.reserved_quantity) || 0;
        itemObj.locations[row.location_id] = {
          quantity: qty,
          reserved_quantity: reservedQty,
          available_quantity: qty - reservedQty,
          minimum_quantity: 0,
          isLowStock: false
        };
      }
    });

    // Merge thresholds and compute low stock status
    configuredThresholds.forEach(row => {
      const itemObj = itemMap.get(row.item_id);
      if (itemObj) {
        if (!itemObj.locations[row.location_id]) {
          itemObj.locations[row.location_id] = { 
            quantity: 0, 
            reserved_quantity: 0, 
            available_quantity: 0 
          };
        }
        const locData = itemObj.locations[row.location_id];
        locData.minimum_quantity = parseFloat(row.minimum_quantity) || 0;
        locData.isLowStock = locData.available_quantity > 0 && locData.minimum_quantity > 0 && locData.available_quantity <= locData.minimum_quantity;
      }
    });

    res.json({
      items: Array.from(itemMap.values()),
      locations: allLocations,
      totalCount: count,
      totalPages: Math.ceil(count / parseInt(limit)),
      currentPage: parseInt(page),
      summary
    });
  } catch (error) {
    console.error('Error fetching stock matrix:', error);
    res.status(500).json({ error: 'Failed to fetch stock matrix' });
  }
};

// Delete item
const deleteItem = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await Item.findByPk(id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // 1. Check if the item has active physical stock in lot_locations
    const stockResult = await LotLocation.sum('quantity', {
      include: [
        {
          model: Lot,
          as: 'lot',
          where: { item_id: id }
        }
      ]
    });

    const totalStock = parseFloat(stockResult) || 0;

    if (totalStock > 0) {
      return res.status(400).json({ 
        error: `Impossible de supprimer l'article "${item.name}" car il possède du stock actif (${totalStock} unité(s) en stock). Videz ou ajustez le stock au préalable.` 
      });
    }

    // 2. Check if the item has associated lots (even depleted) or transactions
    const [lotCount, txCount] = await Promise.all([
      Lot.count({ where: { item_id: id } }),
      Transaction.count({ where: { item_id: id } })
    ]);

    if (lotCount > 0 || txCount > 0) {
      return res.status(400).json({ 
        error: `Impossible de supprimer l'article "${item.name}" car il est rattaché à l'historique des lots (${lotCount}) ou des transactions (${txCount}).` 
      });
    }

    await item.destroy();
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item', details: error.message });
  }
};

// Update Minimum Quantity
const updateMinimumQuantity = async (req, res) => {
  try {
    const { id: item_id, locationId: location_id } = req.params;
    const { minimum_quantity } = req.body;
    
    if (minimum_quantity === undefined || minimum_quantity < 0) {
      return res.status(400).json({ error: 'Valid minimum quantity is required' });
    }

    const [itemLocation, created] = await ItemLocation.findOrCreate({
      where: { item_id, location_id },
      defaults: { minimum_quantity }
    });

    if (!created) {
      await itemLocation.update({ minimum_quantity });
    }

    res.json({ message: 'Minimum quantity updated successfully', minimum_quantity: itemLocation.minimum_quantity });
  } catch (error) {
    console.error('Error updating minimum quantity:', error);
    res.status(500).json({ error: 'Failed to update minimum quantity' });
  }
};

// Get stock alerts (Low Stock & Out of Stock)
const getStockAlerts = async (req, res) => {
  try {
    const alertsQuery = `
      SELECT 
        il.item_id,
        i.name as item_name,
        il.location_id,
        loc.name as location_name,
        il.minimum_quantity,
        COALESCE(SUM(ll.quantity - ll.reserved_quantity), 0) as available_quantity
      FROM item_locations il
      INNER JOIN items i ON i.id = il.item_id
      INNER JOIN locations loc ON loc.id = il.location_id
      LEFT JOIN lots lot ON lot.item_id = il.item_id
      LEFT JOIN lot_locations ll ON ll.lot_id = lot.id AND ll.location_id = il.location_id
      WHERE il.minimum_quantity > 0
      GROUP BY il.item_id, il.location_id
      HAVING available_quantity <= il.minimum_quantity
      ORDER BY available_quantity ASC
    `;
    const alerts = await sequelize.query(alertsQuery, { type: Sequelize.QueryTypes.SELECT });
    
    const formattedAlerts = alerts.map(row => {
      const availableQty = parseFloat(row.available_quantity);
      const minQty = parseFloat(row.minimum_quantity);
      return {
        item_id: row.item_id,
        item_name: row.item_name,
        location_id: row.location_id,
        location_name: row.location_name,
        minimum_quantity: minQty,
        available_quantity: availableQty,
        status: availableQty <= 0 ? 'rupture' : 'faible'
      };
    });

    res.json(formattedAlerts);
  } catch (error) {
    console.error('Error fetching stock alerts:', error);
    res.status(500).json({ error: 'Failed to fetch stock alerts' });
  }
};

module.exports = {
  getAllItems,
  getStockAlerts,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  getStockMatrix,
  updateMinimumQuantity
};