const express = require('express');
const router = express.Router();
const {
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  getStockMatrix
} = require('../controllers/itemController');
const { authenticateToken } = require('../middleware/auth');

// Public routes
router.get('/', getAllItems);
router.get('/stock-matrix', authenticateToken, getStockMatrix);
router.get('/:id', getItemById);

// Protected routes (require authentication)
router.post('/', authenticateToken, createItem);
router.put('/:id', authenticateToken, updateItem);
router.delete('/:id', authenticateToken, deleteItem);

module.exports = router;