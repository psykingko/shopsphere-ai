const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { requireAuthentication } = require('../middleware/authentication');
const { requirePermission } = require('../middleware/authorization');

router.use(requireAuthentication);

router.get('/', requirePermission('ticket.read'), ticketController.listTickets);
router.get('/:id', requirePermission('ticket.read'), ticketController.getTicket);
router.post('/', requirePermission('ticket.write'), ticketController.createTicket);

module.exports = router;
