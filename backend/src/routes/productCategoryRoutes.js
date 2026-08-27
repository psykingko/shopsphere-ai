const express = require('express');
const productCategoryController = require('../controllers/productCategoryController');
const { requireAuthentication } = require('../middleware/authentication');

const router = express.Router();

// Globally readable catalog domain, only authentication boundary applies.
router.use(requireAuthentication);

router.get('/', productCategoryController.getCategories);
router.get('/:id', productCategoryController.getCategory);

module.exports = router;
