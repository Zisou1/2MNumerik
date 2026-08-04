const express = require('express');
const router = express.Router();
const AuditController = require('../controllers/auditController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// Only admins should see the audit logs
router.get('/', authenticateToken, authorizeRole(['admin']), AuditController.getLogs);

module.exports = router;
