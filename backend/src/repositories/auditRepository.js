const { pool } = require('../config/database');

/**
 * Persists an audit event using the provided PostgreSQL client.
 * 
 * @param {Object} event - The audit event to persist.
 * @param {Object} [client] - The PostgreSQL client for transactional integrity. If not provided, falls back to the connection pool.
 */
async function recordAuditEvent(event, client = pool) {
    const query = `
        INSERT INTO audit_events (
            id, request_id, actor_type, actor_id, action, 
            entity_type, entity_id, sanitized_input, result_summary, 
            timestamp, approval_request_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `;

    const params = [
        event.id,
        event.request_id || null,
        event.actor_type,
        event.actor_id || null,
        event.action,
        event.entity_type || null,
        event.entity_id || null,
        event.sanitized_input || null,
        event.result_summary || null,
        event.timestamp || new Date().toISOString(),
        event.approval_request_id || null
    ];

    await client.query(query, params);
}

module.exports = {
    recordAuditEvent
};
