const orderRepository = require('../repositories/orderRepository');

/**
 * Gets a paginated list of orders, strictly scoped by the principal's authorization boundaries.
 * 
 * @param {number} page 
 * @param {number} limit 
 * @param {Object} principal 
 * @param {Object} filters 
 * @returns {Promise<Object>}
 */
async function getOrders(page, limit, principal, filters = {}) {
    const offset = (page - 1) * limit;
    // Authorization filter logic (customer vs internal) is handled securely in the repository to prevent leaking data out of the database.
    return await orderRepository.getOrders(offset, limit, principal, filters);
}

/**
 * Gets a single order by ID, along with its items, payment, and shipment information.
 * 
 * @param {string} orderId 
 * @returns {Promise<Object|null>}
 */
async function getOrderById(orderId) {
    return await orderRepository.getOrderById(orderId);
}

module.exports = {
    getOrders,
    getOrderById
};
