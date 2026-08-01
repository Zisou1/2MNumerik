const express = require('express');
const router = express.Router();
const transformationController = require('../controllers/transformationController');
const { authenticateToken } = require('../middleware/auth');

// Protect all transformation routes with authentication
router.use(authenticateToken);

router.get('/', transformationController.getAllTransformations);
router.get('/:id', transformationController.getTransformationById);
router.post('/', transformationController.createTransformation);
router.put('/:id', transformationController.updateTransformation);
router.patch('/:id/status', transformationController.transitionStatus);
router.delete('/:id', transformationController.deleteTransformation);

module.exports = router;
