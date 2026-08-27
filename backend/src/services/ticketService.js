const crypto = require('crypto');
const ticketRepository = require('../repositories/ticketRepository');
const resourcePolicy = require('../policies/resourcePolicy');
const { pool } = require('../config/database'); // We only need pool to check order ownership if it's missing from resourcePolicy

/**
 * Validates whether the given order belongs to the customer.
 */
async function validateOrderOwnership(orderId, customerId) {
    const res = await pool.query('SELECT 1 FROM orders WHERE id = $1 AND customer_id = $2', [orderId, customerId]);
    return res.rowCount > 0;
}

/**
 * Get a list of tickets for a given principal.
 */
async function getTickets(principal, filters = {}, page = 1, limit = 10) {
    // If the principal is a CUSTOMER, force the customerId filter
    if (principal.principal_type === 'CUSTOMER') {
        filters.customerId = principal.principal_id;
    }

    return await ticketRepository.getTickets(filters, page, limit);
}

/**
 * Get a specific ticket by ID, checking authorization.
 */
async function getTicketById(principal, ticketId) {
    // Note: Controller will already check RBAC (ticket.read).
    // Here we enforce resource authorization.
    const isAuthorized = await resourcePolicy.canAccessTicket(principal, ticketId);
    if (!isAuthorized) {
        throw { code: 'FORBIDDEN', message: 'You do not have permission to access this ticket.' };
    }

    const ticket = await ticketRepository.getTicketById(ticketId);
    if (!ticket) {
        throw { code: 'NOT_FOUND', message: 'Ticket not found.' };
    }

    return ticket;
}

const { withTransaction } = require('../config/transaction');
const auditService = require('./auditService');

/**
 * Create a new ticket with idempotency and transactionally record an audit event.
 */
async function createTicket(principal, idempotencyKey, payload, correlationId) {
    let customerId;

    if (principal.principal_type === 'CUSTOMER') {
        customerId = principal.principal_id;
    } else {
        // Internal staff creating a ticket on behalf of a customer must specify the customer.
        if (!payload.customer_id) {
            throw { code: 'VALIDATION_FAILED', message: 'customer_id is required when staff creates a ticket.' };
        }
        customerId = payload.customer_id;
        
        // Verify customer exists
        const custRes = await pool.query('SELECT 1 FROM customers WHERE id = $1', [customerId]);
        if (custRes.rowCount === 0) {
            throw { code: 'NOT_FOUND', message: 'Specified customer does not exist.' };
        }
    }

    if (payload.order_id) {
        const orderExists = await validateOrderOwnership(payload.order_id, customerId);
        if (!orderExists) {
            throw { code: 'VALIDATION_FAILED', message: 'Order does not exist or does not belong to the customer.' };
        }
    }

    const ticketId = crypto.randomUUID();
    const initialMessageId = crypto.randomUUID();

    const ticketData = {
        id: ticketId,
        customer_id: customerId,
        order_id: payload.order_id || null,
        subject: payload.subject,
        category: payload.category,
        priority: payload.priority
    };

    const initialMessageData = {
        id: initialMessageId,
        content: payload.content
    };

    // Execute business mutation and audit record inside a single shared transaction
    return await withTransaction(async (client) => {
        const { result, isReplay } = await ticketRepository.createTicketWithIdempotency(
            idempotencyKey, 
            payload, 
            ticketData, 
            initialMessageData, 
            client
        );

        if (!isReplay) {
            // Fresh creation, record audit event
            await auditService.recordAuditEvent({
                principal: principal,
                action: 'TICKET_CREATED',
                entityType: 'support_ticket',
                entityId: ticketData.id,
                requestId: correlationId,
                input: payload,
                resultSummary: 'Ticket created successfully.'
            }, client);
        }

        return result;
    });
}

module.exports = {
    getTickets,
    getTicketById,
    createTicket
};
