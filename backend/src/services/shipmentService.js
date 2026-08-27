const shipmentRepository = require('../repositories/shipmentRepository');

/**
 * Retrieves a shipment by its ID.
 * 
 * @param {string} shipmentId 
 * @returns {Promise<Object|null>}
 */
async function getShipmentById(shipmentId) {
    return await shipmentRepository.getShipmentById(shipmentId);
}

module.exports = {
    getShipmentById
};
