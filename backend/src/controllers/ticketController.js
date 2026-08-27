const ticketService = require('../services/ticketService');
const crypto = require('crypto');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const VALID_STATUSES = ['OPEN', 'IN_PROGRESS', 'WAITING_ON_CUSTOMER', 'ESCALATED', 'RESOLVED', 'CLOSED'];

async function listTickets(req, res) {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        
        if (page < 1 || limit < 1) {
            return res.status(400).json({
                error: { code: 'VALIDATION_FAILED', message: 'Page and limit must be positive integers.' },
                correlation_id: req.correlationId
            });
        }

        const filters = {
            status: req.query.status,
            priority: req.query.priority,
            category: req.query.category,
            assignedUserId: req.query.assigned_user_id
        };

        if (filters.status && !VALID_STATUSES.includes(filters.status)) {
            return res.status(400).json({
                error: { code: 'VALIDATION_FAILED', message: 'Invalid status filter.' },
                correlation_id: req.correlationId
            });
        }
        if (filters.priority && !VALID_PRIORITIES.includes(filters.priority)) {
            return res.status(400).json({
                error: { code: 'VALIDATION_FAILED', message: 'Invalid priority filter.' },
                correlation_id: req.correlationId
            });
        }

        const result = await ticketService.getTickets(req.principal, filters, page, limit);

        res.status(200).json({
            data: result.data,
            total: result.total,
            page: result.page,
            limit: result.limit,
            correlation_id: req.correlationId
        });
    } catch (err) {
        console.error('List Tickets Error:', err);
        res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'An internal server error occurred.' },
            correlation_id: req.correlationId
        });
    }
}

async function getTicket(req, res) {
    try {
        const { id } = req.params;
        if (!UUID_REGEX.test(id)) {
            return res.status(400).json({
                error: { code: 'VALIDATION_FAILED', message: 'Invalid ticket ID format.' },
                correlation_id: req.correlationId
            });
        }

        const ticket = await ticketService.getTicketById(req.principal, id);

        res.status(200).json({
            data: ticket,
            correlation_id: req.correlationId
        });
    } catch (err) {
        if (err.code === 'FORBIDDEN') {
            return res.status(403).json({
                error: { code: 'FORBIDDEN', message: err.message },
                correlation_id: req.correlationId
            });
        }
        if (err.code === 'NOT_FOUND') {
            return res.status(404).json({
                error: { code: 'NOT_FOUND', message: err.message },
                correlation_id: req.correlationId
            });
        }
        console.error('Get Ticket Error:', err);
        res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'An internal server error occurred.' },
            correlation_id: req.correlationId
        });
    }
}

async function createTicket(req, res) {
    try {
        const idempotencyKey = req.headers['idempotency-key'];
        if (!idempotencyKey) {
            return res.status(400).json({
                error: { code: 'VALIDATION_FAILED', message: 'Idempotency-Key header is required.' },
                correlation_id: req.correlationId
            });
        }

        const { subject, category, priority, content, order_id, customer_id } = req.body;

        if (!subject || !category || !priority || !content) {
            return res.status(400).json({
                error: { code: 'VALIDATION_FAILED', message: 'Missing required fields (subject, category, priority, content).' },
                correlation_id: req.correlationId
            });
        }

        if (!VALID_PRIORITIES.includes(priority)) {
            return res.status(400).json({
                error: { code: 'VALIDATION_FAILED', message: 'Invalid priority value.' },
                correlation_id: req.correlationId
            });
        }

        if (order_id && !UUID_REGEX.test(order_id)) {
            return res.status(400).json({
                error: { code: 'VALIDATION_FAILED', message: 'Invalid order ID format.' },
                correlation_id: req.correlationId
            });
        }
        
        if (customer_id && !UUID_REGEX.test(customer_id)) {
            return res.status(400).json({
                error: { code: 'VALIDATION_FAILED', message: 'Invalid customer ID format.' },
                correlation_id: req.correlationId
            });
        }

        const ticket = await ticketService.createTicket(req.principal, idempotencyKey, {
            subject, category, priority, content, order_id, customer_id
        }, req.correlationId);

        res.status(201).json({
            data: ticket,
            correlation_id: req.correlationId
        });
    } catch (err) {
        if (err.code === 'IDEMPOTENCY_CONFLICT') {
            return res.status(409).json({
                error: { code: 'IDEMPOTENCY_CONFLICT', message: err.message },
                correlation_id: req.correlationId
            });
        }
        if (err.code === 'VALIDATION_FAILED') {
            return res.status(400).json({
                error: { code: 'VALIDATION_FAILED', message: err.message },
                correlation_id: req.correlationId
            });
        }
        if (err.code === 'NOT_FOUND') {
            return res.status(404).json({
                error: { code: 'NOT_FOUND', message: err.message },
                correlation_id: req.correlationId
            });
        }
        console.error('Create Ticket Error:', err);
        res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'An internal server error occurred.' },
            correlation_id: req.correlationId
        });
    }
}

module.exports = {
    listTickets,
    getTicket,
    createTicket
};
