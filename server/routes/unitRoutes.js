const express = require('express');
const router = express.Router();
const {
  getAllUnits,
  createUnit,
  deleteUnit
} = require('../controllers/unitController');
const { authenticateToken } = require('../middleware/auth');

// Public route to fetch units
router.get('/', getAllUnits);

// Protected routes to manage units
router.post('/', authenticateToken, createUnit);
router.delete('/:id', authenticateToken, deleteUnit);

module.exports = router;
