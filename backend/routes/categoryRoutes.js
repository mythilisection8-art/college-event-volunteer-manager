const express = require('express');
const { getCategories, createCategory } = require('../controllers/categoryController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/', getCategories);
router.post('/', authenticate, authorize('admin'), createCategory);

module.exports = router;
