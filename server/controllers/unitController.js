const { Unit, Item } = require('../models');

// Get all units
const getAllUnits = async (req, res) => {
  try {
    const units = await Unit.findAll({
      order: [['name', 'ASC']]
    });
    res.json(units);
  } catch (error) {
    console.error('Error fetching units:', error);
    res.status(500).json({ error: 'Failed to fetch units' });
  }
};

// Create a new custom unit
const createUnit = async (req, res) => {
  try {
    const { name, symbol, description } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Unit name is required' });
    }

    if (!symbol || symbol.trim().length === 0) {
      return res.status(400).json({ error: 'Unit symbol is required' });
    }

    const sanitizedSymbol = symbol.trim().toLowerCase().replace(/\s+/g, '_');
    const sanitizedName = name.trim();

    // Check if symbol or name already exists
    const existing = await Unit.findOne({
      where: {
        [require('sequelize').Op.or]: [
          { symbol: sanitizedSymbol },
          { name: sanitizedName }
        ]
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'A unit with this name or symbol already exists' });
    }

    const unit = await Unit.create({
      name: sanitizedName,
      symbol: sanitizedSymbol,
      description: description?.trim() || null
    });

    res.status(201).json(unit);
  } catch (error) {
    console.error('Error creating unit:', error);
    res.status(500).json({ error: 'Failed to create unit', details: error.message });
  }
};

// Delete a unit
const deleteUnit = async (req, res) => {
  try {
    const { id } = req.params;

    const unit = await Unit.findByPk(id);
    if (!unit) {
      return res.status(404).json({ error: 'Unit not found' });
    }

    // Check if unit is used by any items
    const count = await Item.count({
      where: {
        [require('sequelize').Op.or]: [
          { unit_id: unit.id },
          { unit: unit.symbol }
        ]
      }
    });

    if (count > 0) {
      return res.status(400).json({
        error: `Cannot delete unit "${unit.name}" because it is currently assigned to ${count} article(s).`
      });
    }

    await unit.destroy();
    res.json({ message: 'Unit deleted successfully' });
  } catch (error) {
    console.error('Error deleting unit:', error);
    res.status(500).json({ error: 'Failed to delete unit' });
  }
};

module.exports = {
  getAllUnits,
  createUnit,
  deleteUnit
};
