const { pool } = require('../config/database');

/**
 * Retrieves a paginated list of orders, filtered by authorization scope and optional filters.
 * 
 * @param {number} offset 
 * @param {number} limit 
 * @param {Object} principal - The authenticated principal (determines ownership rules)
 * @param {Object} filters - Optional filters (status, customer_id)
 * @returns {Promise<{ rows: Array, total: number }>}
 */
async function getOrders(offset, limit, principal, filters = {}) {
    let countQuery = `SELECT COUNT(*) as total FROM orders WHERE 1=1`;
    let query = `
        SELECT 
            id, 
            business_id, 
            customer_id, 
            total_amount, 
            status, 
            created_at
        FROM orders
        WHERE 1=1
    `;
    
    const queryParams = [];
    let paramIndex = 1;

    const addFilter = (condition, value) => {
        countQuery += ` AND ${condition}`;
        query += ` AND ${condition}`;
        queryParams.push(value);
        paramIndex++;
    };

    // 1. Mandatory Authorization Filtering
    if (principal.principal_type === 'CUSTOMER') {
        // Customers can ONLY see their own orders. Client-supplied customer_id is ignored.
        addFilter(`customer_id = $${paramIndex}`, principal.principal_id);
    } else if (principal.principal_type === 'USER' && filters.customer_id) {
        // Internal staff can optionally filter by a specific customer
        addFilter(`customer_id = $${paramIndex}`, filters.customer_id);
    }

    // 2. Optional Status Filtering
    if (filters.status) {
        addFilter(`status = $${paramIndex}`, filters.status);
    }

    // Deterministic Ordering
    query += ` ORDER BY created_at DESC, id DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    
    // Execute total count
    const countRes = await pool.query(countQuery, queryParams);
    const total = parseInt(countRes.rows[0].total, 10);

    // Add pagination params for the main query
    const mainQueryParams = [...queryParams, limit, offset];
    const res = await pool.query(query, mainQueryParams);

    return {
        rows: res.rows,
        total
    };
}

/**
 * Retrieves a single order by ID, including its line items, payment, and shipment.
 * 
 * @param {string} orderId 
 * @returns {Promise<Object|null>}
 */
async function getOrderById(orderId) {
    const orderQuery = `
        SELECT 
            id, 
            business_id, 
            customer_id, 
            total_amount, 
            status, 
            created_at
        FROM orders
        WHERE id = $1
    `;
    const orderRes = await pool.query(orderQuery, [orderId]);
    
    if (orderRes.rowCount === 0) {
        return null;
    }
    
    const order = orderRes.rows[0];

    // Fetch order items with product details via JOIN
    const itemsQuery = `
        SELECT 
            oi.id, 
            oi.product_id, 
            oi.quantity, 
            oi.unit_price,
            p.sku as product_sku,
            p.name as product_name
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = $1
        ORDER BY oi.id ASC
    `;
    const itemsRes = await pool.query(itemsQuery, [orderId]);
    order.items = itemsRes.rows;

    // Fetch safe payment information
    const paymentQuery = `
        SELECT 
            id, 
            amount, 
            status, 
            gateway_reference
        FROM payments
        WHERE order_id = $1
        LIMIT 1
    `;
    const paymentRes = await pool.query(paymentQuery, [orderId]);
    order.payment = paymentRes.rows[0] || null;

    // Fetch safe shipment information
    const shipmentQuery = `
        SELECT 
            id, 
            carrier, 
            tracking_number, 
            status, 
            estimated_delivery
        FROM shipments
        WHERE order_id = $1
        LIMIT 1
    `;
    const shipmentRes = await pool.query(shipmentQuery, [orderId]);
    order.shipment = shipmentRes.rows[0] || null;

    return order;
}

module.exports = {
    getOrders,
    getOrderById
};
