const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const { checkConnection, authenticateToken } = require('../middleware/auth');

// All user routes require authentication
router.use(checkConnection);
router.use(authenticateToken);

// User routes
router.get('/', UserController.getAllUsers);
router.get('/:id', UserController.getUserById);
router.put('/profile', UserController.updateProfile);
router.delete('/account', UserController.deleteAccount);

module.exports = router;
