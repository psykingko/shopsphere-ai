const shipmentService = require('../services/shipmentService');
const { canAccessShipment } = require('../policies/resourcePolicy');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function getShipment(req, res, next) {
    try {
        const shipmentId = req.params.id;

        // 1. Validate UUID format
        if (!UUID_REGEX.test(shipmentId)) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_FAILED',
                    message: 'Invalid shipment ID format.'
                },
                correlation_id: req.correlationId
            });
        }

        // 2. Resource Authorization
        // req.principal is available via requireAuthentication middleware
        const authorized = await canAccessShipment(req.principal, shipmentId);
        if (!authorized) {
            return res.status(403).json({
                error: {
                    code: 'FORBIDDEN',
                    message: 'Insufficient permissions to access this shipment.'
                },
                correlation_id: req.correlationId
            });
        }

        // 3. Service Call
        const shipment = await shipmentService.getShipmentById(shipmentId);

        if (!shipment) {
            return res.status(404).json({
                error: {
                    code: 'NOT_FOUND',
                    message: 'Shipment not found.'
                },
                correlation_id: req.correlationId
            });
        }

        // 4. Response Mapping
        return res.status(200).json({
            data: shipment,
            correlation_id: req.correlationId
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getShipment
};
