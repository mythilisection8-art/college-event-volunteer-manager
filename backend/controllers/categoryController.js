const { pool } = require('../config/db');

// @desc    Get all categories with event counts
// @route   GET /api/categories
// @access  Public
const getCategories = async (req, res, next) => {
  try {
    const [categories] = await pool.query(`
      SELECT 
        c.id, 
        c.name, 
        c.description, 
        c.icon,
        COUNT(e.id) AS event_count
      FROM categories c
      LEFT JOIN events e ON c.id = e.category_id AND e.status = 'published'
      GROUP BY c.id
      ORDER BY c.name ASC
    `);

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a category (Admin only)
// @route   POST /api/categories
// @access  Private (Admin)
const createCategory = async (req, res, next) => {
  try {
    const { name, description, icon } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required.'
      });
    }

    const [result] = await pool.query(
      'INSERT INTO categories (name, description, icon) VALUES (?, ?, ?)',
      [name.trim(), description || null, icon || 'calendar']
    );

    res.status(201).json({
      success: true,
      message: 'Category created successfully!',
      data: {
        id: result.insertId,
        name,
        description,
        icon
      }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: 'Category already exists.'
      });
    }
    next(error);
  }
};

module.exports = {
  getCategories,
  createCategory
};
