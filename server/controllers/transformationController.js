const { Transformation, Item, Lot, LotLocation, Location, Transaction, sequelize } = require('../models');
const { Op } = require('sequelize');

// Helper to generate next reference number (e.g., TF-2026-00001)
const getNextReferenceNumber = async () => {
  const currentYear = new Date().getFullYear();
  const count = await Transformation.count({
    where: {
      reference_number: {
        [Op.like]: `TF-${currentYear}-%`
      }
    }
  });
  const nextNum = (count + 1).toString().padStart(5, '0');
  return `TF-${currentYear}-${nextNum}`;
};

// Get all transformations (paginated, filtered)
const getAllTransformations = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = 'created_at',
      sortOrder = 'DESC',
      search = '',
      status = '',
      type = ''
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const whereClause = {};

    if (search) {
      whereClause[Op.or] = [
        { reference_number: { [Op.like]: `%${search}%` } },
        { created_by: { [Op.like]: `%${search}%` } }
      ];
    }

    if (status) {
      whereClause.status = status;
    }

    if (type) {
      whereClause.type = type;
    }

    const { count, rows } = await Transformation.findAndCountAll({
      where: whereClause,
      include: [
        { model: Item, as: 'inputItem', attributes: ['id', 'name'] },
        { model: Lot, as: 'inputLot', attributes: ['id', 'lot_number'] },
        { model: Location, as: 'fromLocation', attributes: ['id', 'name', 'type'] },
        { model: Item, as: 'outputItem', attributes: ['id', 'name'] },
        { model: Lot, as: 'outputLot', attributes: ['id', 'lot_number'] },
        { model: Location, as: 'toLocation', attributes: ['id', 'name', 'type'] },
        { model: Location, as: 'subcontractorLocation', attributes: ['id', 'name', 'type'] }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      transformations: rows,
      totalCount: count,
      totalPages: Math.ceil(count / parseInt(limit)),
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error('Error fetching transformations:', error);
    res.status(500).json({ error: 'Failed to fetch transformations' });
  }
};

// Get single transformation by ID
const getTransformationById = async (req, res) => {
  try {
    const { id } = req.params;
    const transformation = await Transformation.findByPk(id, {
      include: [
        { model: Item, as: 'inputItem' },
        { model: Lot, as: 'inputLot' },
        { model: Location, as: 'fromLocation' },
        { model: Item, as: 'outputItem' },
        { model: Lot, as: 'outputLot' },
        { model: Location, as: 'toLocation' },
        { model: Location, as: 'subcontractorLocation' }
      ]
    });

    if (!transformation) {
      return res.status(404).json({ error: 'Transformation not found' });
    }

    res.json(transformation);
  } catch (error) {
    console.error('Error fetching transformation:', error);
    res.status(500).json({ error: 'Failed to fetch transformation' });
  }
};

// Create a draft transformation order
const createTransformation = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      type = 'internal',
      input_item_id,
      input_lot_id,
      input_quantity,
      from_location_id,
      output_item_id,
      output_quantity,
      to_location_id,
      subcontractor_location_id,
      created_by
    } = req.body;

    // Basic Validations
    if (!input_item_id || !input_lot_id || !from_location_id || !output_item_id || !to_location_id) {
      await t.rollback();
      return res.status(400).json({ error: 'All item and location IDs are required' });
    }

    if (!input_quantity || input_quantity <= 0 || !output_quantity || output_quantity <= 0) {
      await t.rollback();
      return res.status(400).json({ error: 'Input and output quantities must be greater than 0' });
    }

    if (!created_by) {
      await t.rollback();
      return res.status(400).json({ error: 'Created by user is required' });
    }

    if (type === 'subcontracted' && !subcontractor_location_id) {
      await t.rollback();
      return res.status(400).json({ error: 'Subcontractor location is required for subcontracted transformations' });
    }

    // Check available stock of input lot at the source location
    const inputLotLocation = await LotLocation.findOne({
      where: { lot_id: input_lot_id, location_id: from_location_id },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!inputLotLocation) {
      await t.rollback();
      return res.status(400).json({ error: 'Selected input Lot is not mapped at the source location' });
    }

    const availableStock = inputLotLocation.quantity - inputLotLocation.reserved_quantity;
    if (availableStock < input_quantity) {
      await t.rollback();
      return res.status(400).json({
        type: 'INSUFFICIENT_STOCK',
        error: `Stock insuffisant à la source. Disponible: ${availableStock}, Demandé: ${input_quantity}`
      });
    }

    // Reserve input quantity
    await inputLotLocation.update({
      reserved_quantity: inputLotLocation.reserved_quantity + input_quantity
    }, { transaction: t });

    // Generate reference number
    const reference_number = await getNextReferenceNumber();

    // Create record
    const transformation = await Transformation.create({
      reference_number,
      status: 'draft',
      type,
      input_item_id,
      input_lot_id,
      input_quantity,
      from_location_id,
      output_item_id,
      output_quantity,
      to_location_id,
      subcontractor_location_id: type === 'subcontracted' ? subcontractor_location_id : null,
      created_by
    }, { transaction: t });

    await t.commit();

    const created = await Transformation.findByPk(transformation.id, {
      include: [
        { model: Item, as: 'inputItem' },
        { model: Lot, as: 'inputLot' },
        { model: Location, as: 'fromLocation' },
        { model: Item, as: 'outputItem' },
        { model: Location, as: 'toLocation' }
      ]
    });

    res.status(201).json(created);
  } catch (error) {
    await t.rollback();
    console.error('Error creating transformation:', error);
    res.status(500).json({ error: 'Failed to create transformation', details: error.message });
  }
};

// Update a draft transformation order
const updateTransformation = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const {
      type = 'internal',
      input_item_id,
      input_lot_id,
      input_quantity,
      from_location_id,
      output_item_id,
      output_quantity,
      to_location_id,
      subcontractor_location_id,
      created_by
    } = req.body;

    const transformation = await Transformation.findByPk(id, { transaction: t });
    if (!transformation) {
      await t.rollback();
      return res.status(404).json({ error: 'Transformation not found' });
    }

    if (transformation.status !== 'draft') {
      await t.rollback();
      return res.status(400).json({ error: 'Only draft transformations can be updated' });
    }

    // Release old reservation first
    const oldLotLoc = await LotLocation.findOne({
      where: { lot_id: transformation.input_lot_id, location_id: transformation.from_location_id },
      transaction: t,
      lock: t.LOCK.UPDATE
    });
    if (oldLotLoc) {
      await oldLotLoc.update({
        reserved_quantity: Math.max(0, oldLotLoc.reserved_quantity - transformation.input_quantity)
      }, { transaction: t });
    }

    // Validations
    if (!input_item_id || !input_lot_id || !from_location_id || !output_item_id || !to_location_id) {
      await t.rollback();
      return res.status(400).json({ error: 'All item and location IDs are required' });
    }

    if (!input_quantity || input_quantity <= 0 || !output_quantity || output_quantity <= 0) {
      await t.rollback();
      return res.status(400).json({ error: 'Input and output quantities must be greater than 0' });
    }

    // Check available stock on new setup
    const newLotLoc = await LotLocation.findOne({
      where: { lot_id: input_lot_id, location_id: from_location_id },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!newLotLoc) {
      await t.rollback();
      return res.status(400).json({ error: 'Selected input Lot is not mapped at the source location' });
    }

    const availableStock = newLotLoc.quantity - newLotLoc.reserved_quantity;
    if (availableStock < input_quantity) {
      await t.rollback();
      return res.status(400).json({
        type: 'INSUFFICIENT_STOCK',
        error: `Stock insuffisant à la source. Disponible: ${availableStock}, Demandé: ${input_quantity}`
      });
    }

    // Lock new reservation
    await newLotLoc.update({
      reserved_quantity: newLotLoc.reserved_quantity + input_quantity
    }, { transaction: t });

    // Update transformation
    await transformation.update({
      type,
      input_item_id,
      input_lot_id,
      input_quantity,
      from_location_id,
      output_item_id,
      output_quantity,
      to_location_id,
      subcontractor_location_id: type === 'subcontracted' ? subcontractor_location_id : null,
      created_by
    }, { transaction: t });

    await t.commit();

    const updated = await Transformation.findByPk(id, {
      include: [
        { model: Item, as: 'inputItem' },
        { model: Lot, as: 'inputLot' },
        { model: Location, as: 'fromLocation' },
        { model: Item, as: 'outputItem' },
        { model: Location, as: 'toLocation' },
        { model: Location, as: 'subcontractorLocation' }
      ]
    });

    res.json(updated);
  } catch (error) {
    await t.rollback();
    console.error('Error updating transformation:', error);
    res.status(500).json({ error: 'Failed to update transformation', details: error.message });
  }
};

// Transition status
const transitionStatus = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { status, completed_by } = req.body;

    const transformation = await Transformation.findByPk(id, { transaction: t });
    if (!transformation) {
      await t.rollback();
      return res.status(404).json({ error: 'Transformation not found' });
    }

    const currentStatus = transformation.status;

    if (currentStatus === 'completed' || currentStatus === 'cancelled') {
      await t.rollback();
      return res.status(400).json({ error: `Cannot change status of a ${currentStatus} transformation` });
    }

    if (status === currentStatus) {
      await t.rollback();
      return res.status(400).json({ error: `Transformation is already in status ${status}` });
    }

    if (status === 'in_progress') {
      if (currentStatus !== 'draft') {
        await t.rollback();
        return res.status(400).json({ error: 'Can only transition to in_progress from draft' });
      }

      if (transformation.type === 'subcontracted') {
        if (!transformation.subcontractor_location_id) {
          await t.rollback();
          return res.status(400).json({ error: 'Subcontractor location is required for subcontracted transformations' });
        }

        // Generate physical TRANSFER transaction to ship stock to subcontractor
        await Transaction.create({
          item_id: transformation.input_item_id,
          lot_id: transformation.input_lot_id,
          from_location: transformation.from_location_id,
          to_location: transformation.subcontractor_location_id,
          quantity: transformation.input_quantity,
          type: 'TRANSFER',
          status: 'validated',
          created_by: transformation.created_by,
          validated_by: transformation.created_by,
          validated_at: new Date()
        }, { transaction: t });

        // Decrement physical & reservation at starting location
        const fromLotLoc = await LotLocation.findOne({
          where: { lot_id: transformation.input_lot_id, location_id: transformation.from_location_id },
          transaction: t,
          lock: t.LOCK.UPDATE
        });
        if (fromLotLoc) {
          await fromLotLoc.update({
            reserved_quantity: Math.max(0, fromLotLoc.reserved_quantity - transformation.input_quantity),
            quantity: Math.max(0, fromLotLoc.quantity - transformation.input_quantity)
          }, { transaction: t });
        }

        // Add physical stock & reservation at subcontractor location
        const subLotLoc = await LotLocation.findOne({
          where: { lot_id: transformation.input_lot_id, location_id: transformation.subcontractor_location_id },
          transaction: t,
          lock: t.LOCK.UPDATE
        });

        if (subLotLoc) {
          await subLotLoc.update({
            quantity: subLotLoc.quantity + transformation.input_quantity,
            reserved_quantity: subLotLoc.reserved_quantity + transformation.input_quantity
          }, { transaction: t });
        } else {
          await LotLocation.create({
            lot_id: transformation.input_lot_id,
            location_id: transformation.subcontractor_location_id,
            quantity: transformation.input_quantity,
            reserved_quantity: transformation.input_quantity,
            minimum_quantity: 0
          }, { transaction: t });
        }
      }
      
      await transformation.update({ status: 'in_progress' }, { transaction: t });

    } else if (status === 'completed') {
      if (currentStatus !== 'in_progress' && currentStatus !== 'draft') {
        await t.rollback();
        return res.status(400).json({ error: 'Can only transition to completed from draft or in_progress' });
      }

      if (!completed_by) {
        await t.rollback();
        return res.status(400).json({ error: 'Completed by (user) is required' });
      }

      // Determine current location of the raw stock
      const inputLocationId = transformation.type === 'subcontracted' 
        ? transformation.subcontractor_location_id 
        : transformation.from_location_id;

      // Find current input stock record
      const inputLotLoc = await LotLocation.findOne({
        where: { lot_id: transformation.input_lot_id, location_id: inputLocationId },
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (!inputLotLoc || inputLotLoc.quantity < transformation.input_quantity) {
        await t.rollback();
        return res.status(400).json({ error: 'Input lot not found or insufficient stock at transformation location' });
      }

      // Release reservation & consume physically
      await inputLotLoc.update({
        reserved_quantity: Math.max(0, inputLotLoc.reserved_quantity - transformation.input_quantity),
        quantity: Math.max(0, inputLotLoc.quantity - transformation.input_quantity)
      }, { transaction: t });

      // Create OUT transaction for consumption
      await Transaction.create({
        item_id: transformation.input_item_id,
        lot_id: transformation.input_lot_id,
        from_location: inputLocationId,
        quantity: transformation.input_quantity,
        type: 'OUT',
        status: 'validated',
        created_by: transformation.created_by,
        validated_by: completed_by,
        validated_at: new Date()
      }, { transaction: t });

      // Mark lot depleted if empty everywhere
      if (inputLotLoc.quantity === 0) {
        const otherLocations = await LotLocation.findAll({
          where: { 
            lot_id: transformation.input_lot_id,
            location_id: { [Op.ne]: inputLocationId }
          },
          transaction: t
        });
        const totalRemaining = otherLocations.reduce((sum, ll) => sum + ll.quantity, 0);
        if (totalRemaining === 0) {
          const lot = await Lot.findByPk(transformation.input_lot_id, { transaction: t });
          if (lot) {
            await lot.update({ status: 'depleted' }, { transaction: t });
          }
        }
      }

      // Generate finished output Lot
      const outputLotNumber = `LOT-TF-${Date.now().toString().slice(-6)}`;
      const outputLot = await Lot.create({
        lot_number: outputLotNumber,
        item_id: transformation.output_item_id,
        received_date: new Date(),
        initial_quantity: transformation.output_quantity,
        status: 'active'
      }, { transaction: t });

      // Add physical stock for output lot
      const outputLotLoc = await LotLocation.findOne({
        where: { lot_id: outputLot.id, location_id: transformation.to_location_id },
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (outputLotLoc) {
        await outputLotLoc.update({
          quantity: outputLotLoc.quantity + transformation.output_quantity
        }, { transaction: t });
      } else {
        await LotLocation.create({
          lot_id: outputLot.id,
          location_id: transformation.to_location_id,
          quantity: transformation.output_quantity,
          minimum_quantity: 0
        }, { transaction: t });
      }

      // Create IN transaction for production
      await Transaction.create({
        item_id: transformation.output_item_id,
        lot_id: outputLot.id,
        to_location: transformation.to_location_id,
        quantity: transformation.output_quantity,
        type: 'IN',
        status: 'validated',
        created_by: transformation.created_by,
        validated_by: completed_by,
        validated_at: new Date()
      }, { transaction: t });

      // Complete transformation record
      await transformation.update({
        status: 'completed',
        output_lot_id: outputLot.id,
        completed_by,
        completed_at: new Date()
      }, { transaction: t });

    } else if (status === 'cancelled') {
      const inputLocationId = (currentStatus === 'in_progress' && transformation.type === 'subcontracted')
        ? transformation.subcontractor_location_id
        : transformation.from_location_id;

      const inputLotLoc = await LotLocation.findOne({
        where: { lot_id: transformation.input_lot_id, location_id: inputLocationId },
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (inputLotLoc) {
        await inputLotLoc.update({
          reserved_quantity: Math.max(0, inputLotLoc.reserved_quantity - transformation.input_quantity)
        }, { transaction: t });
      }

      await transformation.update({ status: 'cancelled' }, { transaction: t });
    }

    await t.commit();

    const updated = await Transformation.findByPk(id, {
      include: [
        { model: Item, as: 'inputItem' },
        { model: Lot, as: 'inputLot' },
        { model: Location, as: 'fromLocation' },
        { model: Item, as: 'outputItem' },
        { model: Lot, as: 'outputLot' },
        { model: Location, as: 'toLocation' },
        { model: Location, as: 'subcontractorLocation' }
      ]
    });

    res.json(updated);
  } catch (error) {
    await t.rollback();
    console.error('Error transitioning transformation status:', error);
    res.status(500).json({ error: 'Failed to update transformation status', details: error.message });
  }
};

// Delete a draft transformation order
const deleteTransformation = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;

    const transformation = await Transformation.findByPk(id, { transaction: t });
    if (!transformation) {
      await t.rollback();
      return res.status(404).json({ error: 'Transformation not found' });
    }

    if (transformation.status !== 'draft') {
      await t.rollback();
      return res.status(400).json({ error: 'Only draft transformations can be deleted' });
    }

    // Release reservation
    const lotLoc = await LotLocation.findOne({
      where: { lot_id: transformation.input_lot_id, location_id: transformation.from_location_id },
      transaction: t,
      lock: t.LOCK.UPDATE
    });
    if (lotLoc) {
      await lotLoc.update({
        reserved_quantity: Math.max(0, lotLoc.reserved_quantity - transformation.input_quantity)
      }, { transaction: t });
    }

    await transformation.destroy({ transaction: t });
    await t.commit();

    res.json({ message: 'Transformation deleted successfully' });
  } catch (error) {
    await t.rollback();
    console.error('Error deleting transformation:', error);
    res.status(500).json({ error: 'Failed to delete transformation', details: error.message });
  }
};

module.exports = {
  getAllTransformations,
  getTransformationById,
  createTransformation,
  updateTransformation,
  transitionStatus,
  deleteTransformation
};
