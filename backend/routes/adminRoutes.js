const express = require('express');
const { body } = require('express-validator');
const {
  getAdminStats,
  getAllUsers,
  createUser,
  updateUserStatus,
  updateUserRole,
  deleteUser,
  getAllRegistrationsAdmin
} = require('../controllers/adminController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { validate } = require('../middleware/validateMiddleware');

const router = express.Router();

// Admin guard for all routes in this file
router.use(authenticate, authorize('admin'));

const createUserValidation = [
  body('name').trim().notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['student', 'organizer', 'admin']).withMessage('Role must be student, organizer, or admin'),
  validate
];

router.get('/stats', getAdminStats);
router.get('/users', getAllUsers);
router.post('/users', createUserValidation, createUser);
router.patch('/users/:id/status', updateUserStatus);
router.patch('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);
router.get('/registrations', getAllRegistrationsAdmin);

module.exports = router;
