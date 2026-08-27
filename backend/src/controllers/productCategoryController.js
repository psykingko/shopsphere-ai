const productCategoryService = require('../services/productCategoryService');

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function getCategories(req, res, next) {
    try {
        let page = parseInt(req.query.page, 10) || 1;
        let limit = parseInt(req.query.limit, 10) || 50;

        if (page < 1) page = 1;
        if (limit < 1) limit = 50;
        if (limit > 100) limit = 100;

        const result = await productCategoryService.getCategories(page, limit);

        return res.status(200).json({
            data: result.rows,
            total: result.total,
            page,
            limit,
            correlation_id: req.correlationId
        });
    } catch (error) {
        next(error);
    }
}

async function getCategory(req, res, next) {
    try {
        const categoryId = req.params.id;

        if (!UUID_REGEX.test(categoryId)) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_FAILED',
                    message: 'Invalid category ID format.'
                },
                correlation_id: req.correlationId
            });
        }

        const category = await productCategoryService.getCategoryById(categoryId);

        if (!category) {
            return res.status(404).json({
                error: {
                    code: 'NOT_FOUND',
                    message: 'Category not found or inactive.'
                },
                correlation_id: req.correlationId
            });
        }

        return res.status(200).json({
            data: category,
            correlation_id: req.correlationId
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getCategories,
    getCategory
};
