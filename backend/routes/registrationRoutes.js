const express = require('express');
const {
  registerForEvent,
  getMyRegistrations,
  cancelRegistration,
  getEventRegistrations,
  updateRegistrationStatus,
  updateAttendance,
  getVolunteerPass,
  verifyVolunteerPass,
  checkInVolunteer,
  publicVerifyVolunteerPass
} = require('../controllers/registrationController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();

// Public Read-Only Verification Route (No authentication required)
router.get('/public-verify', publicVerifyVolunteerPass);
router.get('/public-verify/:idOrCode', publicVerifyVolunteerPass);

// Specific authenticated routes
router.get('/my', authenticate, authorize('student'), getMyRegistrations);
router.get('/pass/:registrationId', authenticate, getVolunteerPass);

// Organizer & Admin Routes (View, Verify, Approve, Attendance & Check-In)
router.post('/verify-pass', authenticate, authorize('organizer', 'admin'), verifyVolunteerPass);
router.post('/check-in', authenticate, authorize('organizer', 'admin'), checkInVolunteer);
router.get('/event/:eventId', authenticate, authorize('organizer', 'admin'), getEventRegistrations);
router.patch('/:id/status', authenticate, authorize('organizer', 'admin'), updateRegistrationStatus);
router.patch('/:id/attendance', authenticate, authorize('organizer', 'admin'), updateAttendance);

// Student Volunteer Routes by Event ID
router.get('/:eventId/pass', authenticate, getVolunteerPass);
router.post('/:eventId', authenticate, authorize('student'), registerForEvent);
router.delete('/:id/cancel', authenticate, authorize('student'), cancelRegistration);

module.exports = router;

