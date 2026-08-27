const express = require('express');
const productController = require('../controllers/productController');
const { requireAuthentication } = require('../middleware/authentication');

const router = express.Router();

// Globally readable catalog domain, only authentication boundary applies.
router.use(requireAuthentication);

router.get('/', productController.getProducts);
router.get('/:id', productController.getProduct);

module.exports = router;
