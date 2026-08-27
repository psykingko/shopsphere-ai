const orderService = require('../services/orderService');
const { canAccessOrder } = require('../policies/resourcePolicy');

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function getOrders(req, res, next) {
    try {
        let page = parseInt(req.query.page, 10) || 1;
        let limit = parseInt(req.query.limit, 10) || 50;

        if (page < 1) page = 1;
        if (limit < 1) limit = 50;
        if (limit > 100) limit = 100;

        const filters = {
            status: req.query.status
        };

        // For internal staff, they can optionally filter by customer_id
        if (req.principal.principal_type === 'USER' && req.query.customer_id) {
            if (!UUID_REGEX.test(req.query.customer_id)) {
                return res.status(400).json({
                    error: {
                        code: 'VALIDATION_FAILED',
                        message: 'Invalid customer_id format.'
                    },
                    correlation_id: req.correlationId
                });
            }
            filters.customer_id = req.query.customer_id;
        }

        // The service and repository safely handle customer scope restriction
        const result = await orderService.getOrders(page, limit, req.principal, filters);

        return res.status(200).json({
            data: result.rows,
            total: result.total,
            page,
            limit,
            correlation_id: req.correlationId
        });
    } catch (error) {
        next(error);
    }
}

async function getOrder(req, res, next) {
    try {
        const orderId = req.params.id;

        // 1. HTTP Input Validation
        if (!UUID_REGEX.test(orderId)) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_FAILED',
                    message: 'Invalid order ID format.'
                },
                correlation_id: req.correlationId
            });
        }

        // 2. Resource Authorization
        // Authentication (401) and RBAC (403) have already been verified by middleware.
        // We now enforce Resource Ownership explicitly for the requested UUID.
        const authorized = await canAccessOrder(req.principal, orderId);
        if (!authorized) {
            return res.status(403).json({
                error: {
                    code: 'FORBIDDEN',
                    message: 'Insufficient permissions to access this order.'
                },
                correlation_id: req.correlationId
            });
        }

        // 3. Service Invocation
        const order = await orderService.getOrderById(orderId);

        if (!order) {
            return res.status(404).json({
                error: {
                    code: 'NOT_FOUND',
                    message: 'Order not found.'
                },
                correlation_id: req.correlationId
            });
        }

        // 4. Response Mapping
        return res.status(200).json({
            data: order,
            correlation_id: req.correlationId
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getOrders,
    getOrder
};
