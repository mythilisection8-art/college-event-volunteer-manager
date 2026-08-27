const express = require('express');
const {
  registerAsAttendee,
  cancelAttendeeRegistration,
  getMyAttendingEvents,
  getEventAttendees,
  getAttendeePass,
  verifyAttendeePass,
  checkInAttendee,
  publicVerifyAttendeePass
} = require('../controllers/attendeeController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();

// Public Read-Only Verification Route (No authentication required)
router.get('/public-verify', publicVerifyAttendeePass);
router.get('/public-verify/:idOrCode', publicVerifyAttendeePass);

// Specific authenticated routes
router.get('/my', authenticate, authorize('student'), getMyAttendingEvents);
router.get('/pass/:registrationId', authenticate, getAttendeePass);

// Organizer & Admin Routes (View, Verify & Check-In event attendees)
router.post('/verify-pass', authenticate, authorize('organizer', 'admin'), verifyAttendeePass);
router.post('/check-in', authenticate, authorize('organizer', 'admin'), checkInAttendee);
router.patch('/:id/attendance', authenticate, authorize('organizer', 'admin'), checkInAttendee);
router.get('/event/:eventId', authenticate, authorize('organizer', 'admin'), getEventAttendees);

// Student Attendee Routes by Event ID
router.get('/:eventId/pass', authenticate, getAttendeePass);
router.post('/:eventId', authenticate, authorize('student'), registerAsAttendee);
router.delete('/:eventId/cancel', authenticate, authorize('student'), cancelAttendeeRegistration);

module.exports = router;

