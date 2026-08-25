/**
 * Role-Based Access Control (RBAC) Policy
 * 
 * Maps the frozen internal roles to their explicitly documented permissions.
 * CUSTOMER is intentionally excluded because it is a principal_type, not an RBAC role.
 */

const ROLE_PERMISSIONS = {
  ADMIN: ['*'], // Wilcard for all RBAC permissions; DOES NOT bypass business validation

  SUPPORT_MANAGER: [
    'customer.read',
    'customer.update',
    'order.read',
    'shipment.read',
    'ticket.read',
    'ticket.write',
    'task.read',
    'task.write',
    'payment.read',
    'approval.read',
    'approval.approve'
  ],

  SUPPORT_AGENT: [
    'customer.read',
    'customer.update',
    'order.read',
    'shipment.read',
    'ticket.read',
    'ticket.write',
    'task.read'
  ],

  OPERATIONS: [
    'task.read',
    'task.write',
    'order.read',
    'shipment.read',
    'ticket.read'
  ]
};

/**
 * Checks if a role has the required permission.
 * 
 * @param {string} role - The principal's role
 * @param {string} requiredPermission - The permission to check
 * @returns {boolean} True if the role has the permission or wildcard, false otherwise
 */
function hasPermission(role, requiredPermission) {
  if (!role || !ROLE_PERMISSIONS[role]) {
    return false;
  }
  
  const permissions = ROLE_PERMISSIONS[role];
  return permissions.includes('*') || permissions.includes(requiredPermission);
}

module.exports = {
  ROLE_PERMISSIONS,
  hasPermission
};
