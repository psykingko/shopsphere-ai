const productService = require('../services/productService');

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function getProducts(req, res, next) {
    try {
        let page = parseInt(req.query.page, 10) || 1;
        let limit = parseInt(req.query.limit, 10) || 50;
        const categoryId = req.query.category_id;

        if (page < 1) page = 1;
        if (limit < 1) limit = 50;
        if (limit > 100) limit = 100;

        if (categoryId && !UUID_REGEX.test(categoryId)) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_FAILED',
                    message: 'Invalid category_id format.'
                },
                correlation_id: req.correlationId
            });
        }

        const result = await productService.getProducts(page, limit, categoryId || null);

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

async function getProduct(req, res, next) {
    try {
        const productId = req.params.id;

        if (!UUID_REGEX.test(productId)) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_FAILED',
                    message: 'Invalid product ID format.'
                },
                correlation_id: req.correlationId
            });
        }

        const product = await productService.getProductById(productId);

        if (!product) {
            return res.status(404).json({
                error: {
                    code: 'NOT_FOUND',
                    message: 'Product not found or inactive.'
                },
                correlation_id: req.correlationId
            });
        }

        return res.status(200).json({
            data: product,
            correlation_id: req.correlationId
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getProducts,
    getProduct
};
