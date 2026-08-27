const express = require('express');
const shipmentController = require('../controllers/shipmentController');
const { requireAuthentication } = require('../middleware/authentication');
const { requirePermission } = require('../middleware/authorization');

const router = express.Router();

router.use(requireAuthentication);

router.get('/:id', requirePermission('shipment.read'), shipmentController.getShipment);

module.exports = router;
