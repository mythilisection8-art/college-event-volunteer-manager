const express = require('express');
const {
  registerForEvent,
  getMyRegistrations,
  cancelRegistration,
  getEventRegistrations,
  updateRegistrationStatus,
  updateAttendance
} = require('../controllers/registrationController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();

// Student Routes
router.post('/:eventId', authenticate, authorize('student'), registerForEvent);
router.get('/my', authenticate, authorize('student'), getMyRegistrations);
router.delete('/:id/cancel', authenticate, authorize('student'), cancelRegistration);

// Organizer & Admin Routes
router.get('/event/:eventId', authenticate, authorize('organizer', 'admin'), getEventRegistrations);
router.patch('/:id/status', authenticate, authorize('organizer', 'admin'), updateRegistrationStatus);
router.patch('/:id/attendance', authenticate, authorize('organizer', 'admin'), updateAttendance);

module.exports = router;
