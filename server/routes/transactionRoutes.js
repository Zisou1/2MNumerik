const express = require('express');
const router = express.Router();
const {
  getAllTransactions,
  getTransactionById,
  createTransaction,
  createBatchTransaction,
  updateTransaction,
  deleteTransaction,
  validateTransaction,
  cancelTransaction
} = require('../controllers/transactionController');
const { authenticateToken } = require('../middleware/auth');

// Protect all transaction routes with authentication
router.use(authenticateToken);

router.get('/', getAllTransactions);
router.get('/:id', getTransactionById);

router.post('/', createTransaction);
router.post('/batch', createBatchTransaction);
router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

// Special transaction operations
router.patch('/:id/validate', validateTransaction);
router.patch('/:id/cancel', cancelTransaction);

module.exports = router;