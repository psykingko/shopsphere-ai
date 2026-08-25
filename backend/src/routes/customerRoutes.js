const express = require('express');
const customerController = require('../controllers/customerController');
const { requireAuthentication } = require('../middleware/authentication');
const { requirePermission } = require('../middleware/authorization');

const router = express.Router();

// Apply authentication middleware to all customer routes
router.use(requireAuthentication);

// GET /api/v1/customers/:id
// RBAC: Requires 'customer.read' permission
router.get(
    '/:id', 
    requirePermission('customer.read'), 
    customerController.getCustomer
);

module.exports = router;
