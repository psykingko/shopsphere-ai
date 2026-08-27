const { pool } = require('../config/database');
const crypto = require('crypto');

/**
 * Retrieves a list of tickets with optional filtering and pagination.
 */
async function getTickets({ customerId, status, priority, category, assignedUserId }, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    let query = `SELECT * FROM support_tickets WHERE 1=1`;
    const params = [];
    let paramIndex = 1;

    if (customerId) {
        query += ` AND customer_id = $${paramIndex++}`;
        params.push(customerId);
    }
    if (status) {
        query += ` AND status = $${paramIndex++}`;
        params.push(status);
    }
    if (priority) {
        query += ` AND priority = $${paramIndex++}`;
        params.push(priority);
    }
    if (category) {
        query += ` AND category = $${paramIndex++}`;
        params.push(category);
    }
    if (assignedUserId) {
        query += ` AND assigned_user_id = $${paramIndex++}`;
        params.push(assignedUserId);
    }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
    const totalRes = await pool.query(countQuery, params);
    const total = parseInt(totalRes.rows[0].count, 10);

    // If there is no created_at column on support_tickets in the schema?
    // Wait, let me check the schema. support_tickets has NO created_at column!
    // Let me check schema.sql to see if support_tickets has created_at.
    // It says:
    // CREATE TABLE support_tickets (
    //     id UUID PRIMARY KEY,
    //     business_id VARCHAR UNIQUE NOT NULL,
    //     customer_id UUID NOT NULL REFERENCES customers(id),
    //     order_id UUID REFERENCES orders(id),
    //     assigned_user_id UUID REFERENCES users(id),
    //     subject VARCHAR NOT NULL,
    //     category VARCHAR NOT NULL,
    //     priority ticket_priority NOT NULL,
    //     status ticket_status NOT NULL
    // );
    // There is no created_at on support_tickets!
    // The prompt says: "Prefer: created_at DESC, id DESC if consistent with the existing project convention."
    // Wait, if it's not on the table, I should sort by id DESC?
    
    // Actually let me query `ticket_messages` or just use id DESC.
    // I will use id DESC since created_at is missing from support_tickets.
    
    query += ` ORDER BY id DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const res = await pool.query(query, params);
    
    return {
        data: res.rows,
        total,
        page,
        limit
    };
}

/**
 * Retrieves a ticket by its ID, along with its messages.
 */
async function getTicketById(ticketId) {
    const ticketRes = await pool.query(`SELECT * FROM support_tickets WHERE id = $1`, [ticketId]);
    if (ticketRes.rowCount === 0) return null;
    const ticket = ticketRes.rows[0];

    const messagesRes = await pool.query(
        `SELECT id, sender_type, content, created_at FROM ticket_messages WHERE ticket_id = $1 ORDER BY created_at ASC`,
        [ticketId]
    );
    ticket.messages = messagesRes.rows;
    return ticket;
}

/**
 * Creates a ticket. Can participate in an external transaction if client is provided.
 */
async function createTicketWithIdempotency(idempotencyKey, payload, ticketData, initialMessageData, externalClient = null) {
    const client = externalClient || await pool.connect();
    const ownsTransaction = !externalClient;

    try {
        if (ownsTransaction) await client.query('BEGIN');

        // 1. Check idempotency
        const idempotencyRes = await client.query(
            `SELECT * FROM idempotency_keys WHERE idempotency_key = $1 AND operation = $2`,
            [idempotencyKey, 'create_ticket']
        );

        const requestFingerprint = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');

        if (idempotencyRes.rowCount > 0) {
            const existingRecord = idempotencyRes.rows[0];
            if (existingRecord.request_fingerprint !== requestFingerprint) {
                if (ownsTransaction) await client.query('ROLLBACK');
                throw { code: 'IDEMPOTENCY_CONFLICT', message: 'Idempotency key already used with a different payload.' };
            }
            if (ownsTransaction) await client.query('ROLLBACK');
            return { result: existingRecord.response_body, isReplay: true };
        }

        // 2. Generate business ID and create ticket
        let businessId;
        let success = false;
        let attempts = 0;
        
        while (!success && attempts < 3) {
            businessId = `TKT-${crypto.randomInt(10000000, 99999999)}`;
            try {
                const insertTicketQuery = `
                    INSERT INTO support_tickets (id, business_id, customer_id, order_id, assigned_user_id, subject, category, priority, status)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    RETURNING *
                `;
                const ticketParams = [
                    ticketData.id,
                    businessId,
                    ticketData.customer_id,
                    ticketData.order_id || null,
                    null, // assigned_user_id
                    ticketData.subject,
                    ticketData.category,
                    ticketData.priority,
                    'OPEN'
                ];
                await client.query(insertTicketQuery, ticketParams);
                success = true;
            } catch (err) {
                // If unique constraint violation on business_id (23505), retry
                if (err.code === '23505' && err.constraint === 'support_tickets_business_id_key') {
                    attempts++;
                } else {
                    throw err;
                }
            }
        }

        if (!success) {
            throw new Error('Failed to generate a unique ticket business ID.');
        }

        // 3. Create initial message
        const insertMessageQuery = `
            INSERT INTO ticket_messages (id, ticket_id, sender_type, content, created_at)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, sender_type, content, created_at
        `;
        const messageParams = [
            initialMessageData.id,
            ticketData.id,
            'CUSTOMER',
            initialMessageData.content,
            new Date().toISOString()
        ];
        const msgRes = await client.query(insertMessageQuery, messageParams);

        const createdTicketRes = await client.query(`SELECT * FROM support_tickets WHERE id = $1`, [ticketData.id]);
        const createdTicket = createdTicketRes.rows[0];
        createdTicket.messages = msgRes.rows;

        // 4. Save idempotency record
        const responseBody = createdTicket;
        const insertIdempotencyQuery = `
            INSERT INTO idempotency_keys (id, idempotency_key, operation, request_fingerprint, response_status, response_body, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        await client.query(insertIdempotencyQuery, [
            crypto.randomUUID(),
            idempotencyKey,
            'create_ticket',
            requestFingerprint,
            201,
            responseBody,
            new Date().toISOString()
        ]);

        if (ownsTransaction) await client.query('COMMIT');
        return { result: responseBody, isReplay: false };
    } catch (err) {
        if (ownsTransaction) await client.query('ROLLBACK');
        throw err;
    } finally {
        if (ownsTransaction) client.release();
    }
}

module.exports = {
    getTickets,
    getTicketById,
    createTicketWithIdempotency
};
