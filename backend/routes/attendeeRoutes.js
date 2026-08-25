const express = require('express');
const {
  registerAsAttendee,
  cancelAttendeeRegistration,
  getMyAttendingEvents,
  getEventAttendees
} = require('../controllers/attendeeController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();

// Student Attendee Routes
router.post('/:eventId', authenticate, authorize('student'), registerAsAttendee);
router.delete('/:eventId/cancel', authenticate, authorize('student'), cancelAttendeeRegistration);
router.get('/my', authenticate, authorize('student'), getMyAttendingEvents);

// Organizer & Admin Routes (View event attendees)
router.get('/event/:eventId', authenticate, authorize('organizer', 'admin'), getEventAttendees);

module.exports = router;
