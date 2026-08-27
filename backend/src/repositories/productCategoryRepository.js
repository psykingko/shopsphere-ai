const { pool } = require('../config/database');

/**
 * Retrieves a list of active product categories with pagination.
 * 
 * @param {number} offset - Number of rows to skip
 * @param {number} limit - Maximum number of rows to return
 * @returns {Promise<{ rows: Array, total: number }>}
 */
async function getCategories(offset, limit) {
    // We get total count of active categories
    const countQuery = `SELECT COUNT(*) as total FROM product_categories WHERE active = true`;
    const countRes = await pool.query(countQuery);
    const total = parseInt(countRes.rows[0].total, 10);

    const query = `
        SELECT 
            id, 
            name, 
            description,
            active
        FROM product_categories
        WHERE active = true
        ORDER BY name ASC
        LIMIT $1 OFFSET $2
    `;
    const res = await pool.query(query, [limit, offset]);

    return {
        rows: res.rows,
        total
    };
}

/**
 * Retrieves a single active product category by ID.
 * 
 * @param {string} categoryId - UUID of the category
 * @returns {Promise<Object|null>}
 */
async function getCategoryById(categoryId) {
    const query = `
        SELECT 
            id, 
            name, 
            description,
            active
        FROM product_categories
        WHERE id = $1 AND active = true
    `;
    const res = await pool.query(query, [categoryId]);
    return res.rows[0] || null;
}

module.exports = {
    getCategories,
    getCategoryById
};
