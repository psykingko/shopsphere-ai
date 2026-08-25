const customerService = require('../services/customerService');
const { canAccessCustomer } = require('../policies/resourcePolicy');

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function getCustomer(req, res, next) {
    try {
        const customerId = req.params.id;

        // 1. Validate Input (UUID)
        if (!UUID_REGEX.test(customerId)) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_FAILED',
                    message: 'Invalid customer ID format.'
                },
                correlation_id: req.correlationId
            });
        }

        // 2. Resource Authorization
        // Note: Authentication (401) and RBAC (403) are already handled by middleware before reaching here.
        const authorized = await canAccessCustomer(req.principal, customerId);
        if (!authorized) {
            return res.status(403).json({
                error: {
                    code: 'FORBIDDEN',
                    message: 'Insufficient permissions to access this customer.'
                },
                correlation_id: req.correlationId
            });
        }

        // 3. Service Invocation
        const profile = await customerService.getCustomerProfile(customerId);

        // 4. Handle Not Found (Soft deleted or physically missing)
        if (!profile) {
            return res.status(404).json({
                error: {
                    code: 'NOT_FOUND',
                    message: 'Customer not found.'
                },
                correlation_id: req.correlationId
            });
        }

        // 5. Success Response
        return res.status(200).json({
            data: profile,
            correlation_id: req.correlationId
        });

    } catch (error) {
        // Delegate unexpected errors to centralized error handling
        next(error);
    }
}

module.exports = {
    getCustomer
};
