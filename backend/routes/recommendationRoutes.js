const express = require('express');
const { getPersonalizedRecommendations } = require('../controllers/recommendationController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/recommendations - Personalized AI recommendations for authenticated student
router.get('/', authenticate, getPersonalizedRecommendations);

module.exports = router;
