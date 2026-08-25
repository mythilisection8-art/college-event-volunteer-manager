const express = require('express');
const {
  registerAsAttendee,
  cancelAttendeeRegistration,
  getMyAttendingEvents,
  getEventAttendees,
  getAttendeePass
} = require('../controllers/attendeeController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();

// Specific routes
router.get('/my', authenticate, authorize('student'), getMyAttendingEvents);
router.get('/pass/:registrationId', authenticate, getAttendeePass);

// Organizer & Admin Routes (View event attendees)
router.get('/event/:eventId', authenticate, authorize('organizer', 'admin'), getEventAttendees);

// Student Attendee Routes by Event ID
router.get('/:eventId/pass', authenticate, getAttendeePass);
router.post('/:eventId', authenticate, authorize('student'), registerAsAttendee);
router.delete('/:eventId/cancel', authenticate, authorize('student'), cancelAttendeeRegistration);

module.exports = router;

