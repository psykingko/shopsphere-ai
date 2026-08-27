const { pool } = require('../config/database');

/**
 * Retrieves a single safe shipment by its ID.
 * 
 * @param {string} shipmentId 
 * @returns {Promise<Object|null>}
 */
async function getShipmentById(shipmentId) {
    const query = `
        SELECT 
            id, 
            order_id, 
            carrier, 
            tracking_number, 
            status, 
            estimated_delivery
        FROM shipments
        WHERE id = $1
    `;
    const res = await pool.query(query, [shipmentId]);
    return res.rows[0] || null;
}

module.exports = {
    getShipmentById
};
