const productRepository = require('../repositories/productRepository');

/**
 * Gets a paginated list of products, optionally filtered by category.
 * 
 * @param {number} page - Page number (1-indexed)
 * @param {number} limit - Items per page
 * @param {string|null} categoryId - Optional category UUID filter
 * @returns {Promise<Object>}
 */
async function getProducts(page, limit, categoryId = null) {
    const offset = (page - 1) * limit;
    const result = await productRepository.getProducts(offset, limit, categoryId);
    return result;
}

/**
 * Gets a single product by ID.
 * 
 * @param {string} productId 
 * @returns {Promise<Object|null>}
 */
async function getProductById(productId) {
    return await productRepository.getProductById(productId);
}

module.exports = {
    getProducts,
    getProductById
};
