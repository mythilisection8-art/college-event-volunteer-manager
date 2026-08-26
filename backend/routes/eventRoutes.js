const express = require('express');
const { body } = require('express-validator');
const {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getOrganizerEvents
} = require('../controllers/eventController');
const { getPersonalizedRecommendations } = require('../controllers/recommendationController');
const { authenticate, optionalAuthenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { validate } = require('../middleware/validateMiddleware');

const router = express.Router();

const eventValidation = [
  body('title').trim().notEmpty().withMessage('Event title is required'),
  body('description').trim().notEmpty().withMessage('Event description is required'),
  body('event_date').isDate().withMessage('Valid event date is required (YYYY-MM-DD)'),
  body('start_time').notEmpty().withMessage('Start time is required'),
  body('end_time').notEmpty().withMessage('End time is required'),
  body('venue').trim().notEmpty().withMessage('Event venue is required'),
  body('registration_deadline').notEmpty().withMessage('Registration deadline is required'),
  body('max_attendees').optional().isInt({ min: 1 }).withMessage('Maximum attendees capacity must be at least 1'),
  body('max_volunteers').optional().isInt({ min: 1 }).withMessage('Maximum volunteers must be at least 1'),
  validate
];

// Public / Authenticated Browsing Routes
router.get('/', optionalAuthenticate, getEvents);
router.get('/recommendations', authenticate, getPersonalizedRecommendations);
router.get('/organizer/my-events', authenticate, authorize('organizer', 'admin'), getOrganizerEvents);
router.get('/:id', optionalAuthenticate, getEventById);

// Admin-ONLY Protected Event CRUD Routes (Organizers receive 403 Forbidden)
router.post('/', authenticate, authorize('admin'), eventValidation, createEvent);
router.put('/:id', authenticate, authorize('admin'), updateEvent);
router.delete('/:id', authenticate, authorize('admin'), deleteEvent);

module.exports = router;
