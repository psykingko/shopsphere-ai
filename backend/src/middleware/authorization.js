const { hasPermission } = require('../policies/rbacPolicy');

/**
 * Express middleware to enforce RBAC permissions.
 * Expects `req.principal` to have been populated by the authentication middleware.
 * 
 * @param {string} requiredPermission - The permission required to access the route.
 */
function requirePermission(requiredPermission) {
  return (req, res, next) => {
    // 1. Missing principal -> 401
    if (!req.principal) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication required'
      });
    }

    // `req.principal` is the sole source of truth for authorization.
    // Client-provided roles in body/query/headers are explicitly ignored.
    const { role, principal_type } = req.principal;

    // 2. RBAC evaluation -> 403
    if (principal_type === 'USER') {
      if (!hasPermission(role, requiredPermission)) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions'
          }
        });
      }
    } else if (principal_type === 'CUSTOMER') {
      // CUSTOMER principals inherently have access to self-serve domains.
      // Their exact access is securely bounded by Resource Authorization (ownership checks) later.
      const allowedCustomerPermissions = [
        'customer.read', 
        'customer.update', 
        'order.read', 
        'shipment.read', 
        'payment.read', 
        'ticket.read', 
        'ticket.write'
      ];
      if (!allowedCustomerPermissions.includes(requiredPermission)) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions'
          }
        });
      }
    } else {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Unknown principal type'
        }
      });
    }

    // 3. Permission granted; continue to resource authorization or controller logic
    next();
  };
}

module.exports = {
  requirePermission
};
