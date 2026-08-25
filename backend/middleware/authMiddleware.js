const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const authenticate = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No token provided.'
      });
    }

    const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_college_events_2026_change_in_production';
    const decoded = jwt.verify(token, secret);

    // Fetch user from DB to verify current state and status
    const [rows] = await pool.query(
      'SELECT id, name, email, role, department, roll_number, phone, status, avatar FROM users WHERE id = ?',
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User belonging to this token no longer exists.'
      });
    }

    const user = rows[0];

    if (user.status === 'blocked') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated/blocked by an administrator.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid authorization token.'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Authorization token has expired. Please log in again.'
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Server error during authentication: ' + error.message
    });
  }
};

const optionalAuthenticate = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return next();
    }

    const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_college_events_2026_change_in_production';
    const decoded = jwt.verify(token, secret);

    const [rows] = await pool.query(
      'SELECT id, name, email, role, department, roll_number, phone, status, avatar FROM users WHERE id = ?',
      [decoded.id]
    );

    if (rows.length > 0 && rows[0].status === 'active') {
      req.user = rows[0];
    }
    next();
  } catch (error) {
    // Non-blocking for optional auth
    next();
  }
};

module.exports = {
  authenticate,
  optionalAuthenticate
};
