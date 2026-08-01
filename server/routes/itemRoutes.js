const express = require('express');
const router = express.Router();
const {
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  getStockMatrix,
  updateMinimumQuantity,
  getStockAlerts
} = require('../controllers/itemController');
const { authenticateToken } = require('../middleware/auth');

// Protect all item routes with authentication
router.use(authenticateToken);

router.get('/', getAllItems);
router.get('/stock-matrix', getStockMatrix);
router.get('/alerts', getStockAlerts);
router.get('/:id', getItemById);

router.post('/', createItem);
router.put('/:id', updateItem);
router.delete('/:id', deleteItem);
router.put('/:id/locations/:locationId/minimum-quantity', updateMinimumQuantity);

module.exports = router;