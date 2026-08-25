const { pool } = require('../config/database');

/**
 * Retrieves a customer profile by ID, returning only public/contract-approved fields.
 * Excludes soft-deleted records.
 * @param {string} customerId - UUID of the customer
 * @returns {Promise<Object|null>} The customer object or null if not found/deleted
 */
async function getCustomerById(customerId) {
    const query = `
        SELECT 
            id, 
            first_name, 
            last_name, 
            email, 
            phone
        FROM customers
        WHERE id = $1 AND deleted_at IS NULL
    `;
    const res = await pool.query(query, [customerId]);
    return res.rows[0] || null;
}

/**
 * Retrieves addresses associated with a customer.
 * Excludes soft-deleted records.
 * @param {string} customerId - UUID of the customer
 * @returns {Promise<Array>} List of address objects
 */
async function getCustomerAddresses(customerId) {
    const query = `
        SELECT 
            id, 
            street, 
            city, 
            zip, 
            country
        FROM customer_addresses
        WHERE customer_id = $1 AND deleted_at IS NULL
    `;
    const res = await pool.query(query, [customerId]);
    return res.rows;
}

module.exports = {
    getCustomerById,
    getCustomerAddresses
};
