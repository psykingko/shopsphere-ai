const express = require('express');
const orderController = require('../controllers/orderController');
const { requireAuthentication } = require('../middleware/authentication');
const { requirePermission } = require('../middleware/authorization');

const router = express.Router();

router.use(requireAuthentication);

// Orders require order.read permission (or CUSTOMER principal which has it inherently mapped)
router.get('/', requirePermission('order.read'), orderController.getOrders);
router.get('/:id', requirePermission('order.read'), orderController.getOrder);

module.exports = router;
