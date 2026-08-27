const { pool } = require('../config/database');

/**
 * Checks if the given principal has authorization to access the specific order.
 * CUSTOMER principals can only access their own orders.
 * Internal staff bypass customer ownership rules but remain subject to their RBAC.
 */
async function canAccessOrder(principal, orderId) {
    if (principal.principal_type === 'CUSTOMER') {
        const query = 'SELECT 1 FROM orders WHERE id = $1 AND customer_id = $2';
        const res = await pool.query(query, [orderId, principal.principal_id]);
        return res.rowCount > 0;
    }
    
    // Internal staff (USER) are assumed authorized if their RBAC allowed them to reach this point.
    // Further internal scopes can be added here if defined in the future.
    if (principal.principal_type === 'USER') {
        return true;
    }

    return false;
}

/**
 * Checks if the given principal has authorization to access the specific task.
 * For SUPPORT_AGENT, we explicitly check if they are actively assigned to the task.
 * Operations and Managers have broader scope.
 */
async function canAccessTask(principal, taskId) {
    if (principal.principal_type !== 'USER') {
        return false;
    }

    // SUPPORT_AGENTs can only access tasks assigned to them actively
    if (principal.role === 'SUPPORT_AGENT') {
        const query = `
            SELECT 1 FROM task_assignments 
            WHERE task_id = $1 AND user_id = $2 AND active_flag = true
        `;
        const res = await pool.query(query, [taskId, principal.principal_id]);
        return res.rowCount > 0;
    }

    // OPERATIONS, SUPPORT_MANAGER, ADMIN can access all tasks (if RBAC permits)
    return ['OPERATIONS', 'SUPPORT_MANAGER', 'ADMIN'].includes(principal.role);
}

/**
 * Checks if the given principal has authorization to access the specific customer profile.
 * CUSTOMER principals can only access their own profile.
 * Internal staff bypass customer ownership rules but remain subject to their RBAC.
 */
async function canAccessCustomer(principal, customerId) {
    if (principal.principal_type === 'CUSTOMER') {
        return principal.principal_id === customerId;
    }
    
    // Internal staff (USER) are assumed authorized if their RBAC allowed them to reach this point.
    if (principal.principal_type === 'USER') {
        return true;
    }

    return false;
}

/**
 * Checks if the given principal has authorization to access the specific shipment.
 * CUSTOMER principals can only access shipments for their own orders.
 * Internal staff bypass customer ownership rules but remain subject to their RBAC.
 */
async function canAccessShipment(principal, shipmentId) {
    if (principal.principal_type === 'CUSTOMER') {
        const query = `
            SELECT 1 FROM shipments s
            JOIN orders o ON s.order_id = o.id
            WHERE s.id = $1 AND o.customer_id = $2
        `;
        const res = await pool.query(query, [shipmentId, principal.principal_id]);
        return res.rowCount > 0;
    }
    
    // Internal staff (USER) are assumed authorized if their RBAC allowed them to reach this point.
    if (principal.principal_type === 'USER') {
        return true;
    }

    return false;
}

/**
 * Checks if the given principal has authorization to access the specific support ticket.
 * CUSTOMER principals can only access their own tickets.
 * Internal staff bypass customer ownership rules but remain subject to their RBAC.
 */
async function canAccessTicket(principal, ticketId) {
    if (principal.principal_type === 'CUSTOMER') {
        const query = 'SELECT 1 FROM support_tickets WHERE id = $1 AND customer_id = $2';
        const res = await pool.query(query, [ticketId, principal.principal_id]);
        return res.rowCount > 0;
    }
    
    // Internal staff (USER) are assumed authorized if their RBAC allowed them to reach this point.
    if (principal.principal_type === 'USER') {
        return true;
    }

    return false;
}

module.exports = {
    canAccessOrder,
    canAccessTask,
    canAccessCustomer,
    canAccessShipment,
    canAccessTicket
};
