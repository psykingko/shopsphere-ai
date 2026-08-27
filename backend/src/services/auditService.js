const auditRepository = require('../repositories/auditRepository');
const crypto = require('crypto');

const SENSITIVE_KEYS = [
    'password', 'password_hash', 'jwt', 'cookie', 
    'authorization', 'x-internal-service-token', 'token', 
    'card', 'pan', 'cvv', 'secret', 'secret_key'
];

/**
 * Deep sanitization function to remove sensitive keys from input payloads.
 */
function sanitizePayload(payload) {
    if (!payload || typeof payload !== 'object') {
        return payload;
    }

    if (Array.isArray(payload)) {
        return payload.map(item => sanitizePayload(item));
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(payload)) {
        if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
            sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizePayload(value);
        } else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}

/**
 * Constructs and persists an audit event using trusted server-side context.
 * 
 * @param {Object} params - Audit parameters.
 * @param {Object} params.principal - The trusted principal derived from req.principal.
 * @param {string} params.action - The business action string (e.g., 'TICKET_CREATED').
 * @param {string} params.entityType - The type of business entity affected (e.g., 'support_ticket').
 * @param {string} params.entityId - The UUID of the business entity.
 * @param {string} params.requestId - The correlation/request ID.
 * @param {Object} params.input - The raw business input to sanitize and persist.
 * @param {string} params.resultSummary - A safe text summary of the outcome.
 * @param {string} [params.approvalRequestId] - Optional UUID of the parent approval request.
 * @param {Object} client - The shared PostgreSQL client for the current transaction.
 */
async function recordAuditEvent({ principal, action, entityType, entityId, requestId, input, resultSummary, approvalRequestId }, client) {
    // 1. Derive actor identity purely from the trusted principal
    let actorType = 'SYSTEM';
    let actorId = null;

    if (principal) {
        if (['CUSTOMER', 'USER'].includes(principal.principal_type)) {
            actorType = 'USER';
            actorId = principal.principal_id;
        } else if (principal.principal_type === 'AI') {
            actorType = 'AI';
            actorId = principal.principal_id;
        }
    }

    // 2. Sanitize input payload
    const sanitizedInput = sanitizePayload(input);

    // 3. Construct event
    const auditEvent = {
        id: crypto.randomUUID(),
        request_id: requestId,
        actor_type: actorType,
        actor_id: actorId,
        action: action,
        entity_type: entityType,
        entity_id: entityId,
        sanitized_input: sanitizedInput,
        result_summary: resultSummary,
        timestamp: new Date().toISOString(),
        approval_request_id: approvalRequestId || null
    };

    // 4. Delegate to repository using the provided transaction client
    await auditRepository.recordAuditEvent(auditEvent, client);
}

module.exports = {
    recordAuditEvent,
    sanitizePayload
};
