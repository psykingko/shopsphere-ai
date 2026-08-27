const { pool } = require('../config/database');

/**
 * Retrieves a list of active products with pagination and optional category filtering.
 * 
 * @param {number} offset - Number of rows to skip
 * @param {number} limit - Maximum number of rows to return
 * @param {string|null} categoryId - Optional UUID to filter by category
 * @returns {Promise<{ rows: Array, total: number }>}
 */
async function getProducts(offset, limit, categoryId = null) {
    let countQuery = `SELECT COUNT(*) as total FROM products WHERE active = true`;
    let query = `
        SELECT 
            id, 
            sku, 
            name, 
            description, 
            price, 
            stock_quantity, 
            category_id, 
            active
        FROM products
        WHERE active = true
    `;
    
    const countParams = [];
    const queryParams = [];

    if (categoryId) {
        countQuery += ` AND category_id = $1`;
        countParams.push(categoryId);

        query += ` AND category_id = $1`;
        queryParams.push(categoryId);
    }

    query += ` ORDER BY name ASC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);

    const countRes = await pool.query(countQuery, countParams);
    const total = parseInt(countRes.rows[0].total, 10);

    const res = await pool.query(query, queryParams);

    return {
        rows: res.rows,
        total
    };
}

/**
 * Retrieves a single active product by ID.
 * 
 * @param {string} productId - UUID of the product
 * @returns {Promise<Object|null>}
 */
async function getProductById(productId) {
    const query = `
        SELECT 
            id, 
            sku, 
            name, 
            description, 
            price, 
            stock_quantity, 
            category_id, 
            active
        FROM products
        WHERE id = $1 AND active = true
    `;
    const res = await pool.query(query, [productId]);
    return res.rows[0] || null;
}

module.exports = {
    getProducts,
    getProductById
};
