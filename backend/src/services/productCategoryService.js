const productCategoryRepository = require('../repositories/productCategoryRepository');

/**
 * Gets a paginated list of product categories.
 * 
 * @param {number} page - Page number (1-indexed)
 * @param {number} limit - Items per page
 * @returns {Promise<Object>}
 */
async function getCategories(page, limit) {
    const offset = (page - 1) * limit;
    const result = await productCategoryRepository.getCategories(offset, limit);
    return result;
}

/**
 * Gets a single category by ID.
 * 
 * @param {string} categoryId 
 * @returns {Promise<Object|null>}
 */
async function getCategoryById(categoryId) {
    return await productCategoryRepository.getCategoryById(categoryId);
}

module.exports = {
    getCategories,
    getCategoryById
};
