const { pool } = require('../config/database');

/**
 * Validates if an ApprovalRequest is currently eligible for an action (e.g. approve/reject).
 * This is deterministic business logic, distinct from RBAC (can you approve?) 
 * and Resource Authorization (do you own this?).
 */
async function canActOnApproval(approvalId) {
    const query = 'SELECT status, expiration_timestamp FROM approval_requests WHERE id = $1';
    const res = await pool.query(query, [approvalId]);
    
    if (res.rowCount === 0) {
        return { valid: false, reason: 'NOT_FOUND' };
    }

    const approval = res.rows[0];

    if (approval.status !== 'PENDING') {
        return { valid: false, reason: 'INVALID_STATE', message: `Approval is in ${approval.status} state, must be PENDING.` };
    }

    if (new Date(approval.expiration_timestamp) < new Date()) {
        return { valid: false, reason: 'EXPIRED', message: 'Approval request has expired.' };
    }

    return { valid: true };
}

module.exports = {
    canActOnApproval
};
