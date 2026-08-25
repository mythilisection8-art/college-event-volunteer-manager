const { pool } = require('../config/db');

// @desc    Get all events with filters, search, pagination, and student-specific registration status
// @route   GET /api/events
// @access  Public (Optional auth for user-specific registration context)
const getEvents = async (req, res, next) => {
  try {
    const {
      search,
      category_id,
      status,
      upcoming,
      organizer_id,
      page = 1,
      limit = 9
    } = req.query;

    const userId = req.user ? req.user.id : null;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 9;
    const offset = (pageNum - 1) * limitNum;

    let whereClauses = [];
    let queryParams = [];

    // Filter by search query (title, description, venue)
    if (search && search.trim() !== '') {
      whereClauses.push('(e.title LIKE ? OR e.description LIKE ? OR e.venue LIKE ?)');
      const searchTerm = `%${search.trim()}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    // Filter by category
    if (category_id && category_id !== 'all') {
      whereClauses.push('e.category_id = ?');
      queryParams.push(parseInt(category_id, 10));
    }

    // Filter by status (default is 'published' for public browsing unless specified)
    if (status && status !== 'all') {
      whereClauses.push('e.status = ?');
      queryParams.push(status);
    } else if (!status && !req.query.all_statuses) {
      whereClauses.push("e.status IN ('published', 'ongoing')");
    }

    // Filter by upcoming
    if (upcoming === 'true') {
      whereClauses.push('e.event_date >= CURDATE()');
    }

    // Filter by organizer
    if (organizer_id) {
      whereClauses.push('e.organizer_id = ?');
      queryParams.push(parseInt(organizer_id, 10));
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Count total matching
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM events e ${whereSql}`,
      queryParams
    );
    const totalEvents = countResult[0].total;

    // Fetch paginated events
    const query = `
      SELECT 
        e.*,
        c.name AS category_name,
        c.icon AS category_icon,
        u.name AS organizer_name,
        u.email AS organizer_email,
        u.department AS organizer_department,
        (SELECT COUNT(*) FROM attendee_registrations ar WHERE ar.event_id = e.id AND ar.status = 'registered') AS registered_attendees_count,
        (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'approved') AS approved_volunteers_count,
        (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status != 'cancelled') AS total_volunteer_applications_count
        ${
          userId
            ? `, (SELECT ar.status FROM attendee_registrations ar WHERE ar.event_id = e.id AND ar.user_id = ${mysqlEscape(userId)} LIMIT 1) AS user_attendee_status,
               (SELECT r.status FROM registrations r WHERE r.event_id = e.id AND r.user_id = ${mysqlEscape(userId)} LIMIT 1) AS user_volunteer_status`
            : ', NULL AS user_attendee_status, NULL AS user_volunteer_status'
        }
      FROM events e
      LEFT JOIN categories c ON e.category_id = c.id
      LEFT JOIN users u ON e.organizer_id = u.id
      ${whereSql}
      ORDER BY e.event_date ASC, e.start_time ASC
      LIMIT ? OFFSET ?
    `;

    const [events] = await pool.query(query, [...queryParams, limitNum, offset]);

    // Enhance events with attendee and volunteer capacities
    const enhancedEvents = events.map((evt) => {
      const maxAttendees = parseInt(evt.max_attendees || 100, 10);
      const registeredAttendees = parseInt(evt.registered_attendees_count || 0, 10);
      const attendeeSpotsRemaining = Math.max(0, maxAttendees - registeredAttendees);
      const isAttendeeFull = attendeeSpotsRemaining <= 0;

      const maxVolunteers = parseInt(evt.max_volunteers || 10, 10);
      const approvedVolunteers = parseInt(evt.approved_volunteers_count || 0, 10);
      const volunteerSpotsRemaining = Math.max(0, maxVolunteers - approvedVolunteers);
      const isVolunteerFull = volunteerSpotsRemaining <= 0;

      const isDeadlinePassed = new Date(evt.registration_deadline) < new Date();

      return {
        ...evt,
        max_attendees: maxAttendees,
        registered_attendees_count: registeredAttendees,
        attendee_spots_remaining: attendeeSpotsRemaining,
        is_attendee_full: isAttendeeFull,

        max_volunteers: maxVolunteers,
        approved_volunteers_count: approvedVolunteers,
        volunteer_spots_remaining: volunteerSpotsRemaining,
        is_volunteer_full: isVolunteerFull,

        is_deadline_passed: isDeadlinePassed,

        // Student-specific context
        is_user_registered_attendee: evt.user_attendee_status === 'registered',
        user_attendee_status: evt.user_attendee_status || null,
        user_volunteer_status: evt.user_volunteer_status || null,
      };
    });

    res.json({
      success: true,
      data: enhancedEvents,
      pagination: {
        total: totalEvents,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalEvents / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Helper to escape number safely
function mysqlEscape(val) {
  return parseInt(val, 10) || 0;
}

// @desc    Get single event by ID with student-specific attendee & volunteer statuses
// @route   GET /api/events/:id
// @access  Public (Optional auth for user registration status)
const getEventById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user ? req.user.id : null;

    const [events] = await pool.query(
      `SELECT 
        e.*,
        c.name AS category_name,
        c.icon AS category_icon,
        u.name AS organizer_name,
        u.email AS organizer_email,
        u.phone AS organizer_phone,
        u.department AS organizer_department,
        (SELECT COUNT(*) FROM attendee_registrations ar WHERE ar.event_id = e.id AND ar.status = 'registered') AS registered_attendees_count,
        (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'approved') AS approved_volunteers_count,
        (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'pending') AS pending_volunteers_count,
        (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status != 'cancelled') AS total_volunteer_applications_count
      FROM events e
      LEFT JOIN categories c ON e.category_id = c.id
      LEFT JOIN users u ON e.organizer_id = u.id
      WHERE e.id = ?`,
      [id]
    );

    if (events.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.'
      });
    }

    const event = events[0];

    // Attendee capacity
    const maxAttendees = parseInt(event.max_attendees || 100, 10);
    const registeredAttendees = parseInt(event.registered_attendees_count || 0, 10);
    const attendeeSpotsRemaining = Math.max(0, maxAttendees - registeredAttendees);
    const isAttendeeFull = attendeeSpotsRemaining <= 0;

    // Volunteer capacity
    const maxVolunteers = parseInt(event.max_volunteers || 10, 10);
    const approvedVolunteers = parseInt(event.approved_volunteers_count || 0, 10);
    const volunteerSpotsRemaining = Math.max(0, maxVolunteers - approvedVolunteers);
    const isVolunteerFull = volunteerSpotsRemaining <= 0;

    const isDeadlinePassed = new Date(event.registration_deadline) < new Date();

    // Fetch student-specific statuses independently
    let userAttendeeRegistration = null;
    let userVolunteerRegistration = null;

    if (userId) {
      // 1. Check attendee status for this specific student
      const [attendeeRows] = await pool.query(
        'SELECT * FROM attendee_registrations WHERE event_id = ? AND user_id = ?',
        [id, userId]
      );
      if (attendeeRows.length > 0) {
        userAttendeeRegistration = attendeeRows[0];
      }

      // 2. Check volunteer application for this specific student
      const [volunteerRows] = await pool.query(
        'SELECT * FROM registrations WHERE event_id = ? AND user_id = ?',
        [id, userId]
      );
      if (volunteerRows.length > 0) {
        userVolunteerRegistration = volunteerRows[0];
      }
    }

    res.json({
      success: true,
      data: {
        ...event,
        max_attendees: maxAttendees,
        registered_attendees_count: registeredAttendees,
        attendee_spots_remaining: attendeeSpotsRemaining,
        is_attendee_full: isAttendeeFull,

        max_volunteers: maxVolunteers,
        approved_volunteers_count: approvedVolunteers,
        pending_volunteers_count: parseInt(event.pending_volunteers_count || 0, 10),
        volunteer_spots_remaining: volunteerSpotsRemaining,
        is_volunteer_full: isVolunteerFull,

        is_deadline_passed: isDeadlinePassed,

        // Student-Specific Independent Statuses
        user_attendee_status: userAttendeeRegistration ? userAttendeeRegistration.status : null,
        is_user_registered_attendee: userAttendeeRegistration?.status === 'registered',
        user_attendee_registration: userAttendeeRegistration,

        user_volunteer_status: userVolunteerRegistration ? userVolunteerRegistration.status : null,
        user_volunteer_registration: userVolunteerRegistration
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new event (ADMIN ONLY)
// @route   POST /api/events
// @access  Private (Admin)
const createEvent = async (req, res, next) => {
  try {
    const {
      title,
      description,
      category_id,
      organizer_id,
      event_date,
      start_time,
      end_time,
      venue,
      max_attendees,
      max_volunteers,
      registration_deadline,
      banner_image,
      requirements,
      status = 'published'
    } = req.body;

    if (!title || !description || !event_date || !start_time || !end_time || !venue || !registration_deadline || !organizer_id) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required event details including assigned organizer.'
      });
    }

    // Verify organizer exists and has organizer role
    const [organizers] = await pool.query(
      "SELECT id, name FROM users WHERE id = ? AND role = 'organizer' AND status = 'active'",
      [organizer_id]
    );

    if (organizers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or inactive organizer selected.'
      });
    }

    const [result] = await pool.query(
      `INSERT INTO events (
        title, description, category_id, organizer_id, event_date,
        start_time, end_time, venue, max_attendees, max_volunteers, registration_deadline,
        banner_image, requirements, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        description,
        category_id || null,
        organizer_id,
        event_date,
        start_time,
        end_time,
        venue,
        max_attendees || 100,
        max_volunteers || 10,
        registration_deadline,
        banner_image || null,
        requirements || null,
        status
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Event created successfully!',
      eventId: result.insertId
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update an event (ADMIN ONLY)
// @route   PUT /api/events/:id
// @access  Private (Admin)
const updateEvent = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if event exists
    const [existing] = await pool.query('SELECT id, title FROM events WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.'
      });
    }

    const {
      title,
      description,
      category_id,
      organizer_id,
      event_date,
      start_time,
      end_time,
      venue,
      max_attendees,
      max_volunteers,
      registration_deadline,
      banner_image,
      requirements,
      status
    } = req.body;

    await pool.query(
      `UPDATE events SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        category_id = COALESCE(?, category_id),
        organizer_id = COALESCE(?, organizer_id),
        event_date = COALESCE(?, event_date),
        start_time = COALESCE(?, start_time),
        end_time = COALESCE(?, end_time),
        venue = COALESCE(?, venue),
        max_attendees = COALESCE(?, max_attendees),
        max_volunteers = COALESCE(?, max_volunteers),
        registration_deadline = COALESCE(?, registration_deadline),
        banner_image = COALESCE(?, banner_image),
        requirements = COALESCE(?, requirements),
        status = COALESCE(?, status)
      WHERE id = ?`,
      [
        title,
        description,
        category_id,
        organizer_id,
        event_date,
        start_time,
        end_time,
        venue,
        max_attendees,
        max_volunteers,
        registration_deadline,
        banner_image,
        requirements,
        status,
        id
      ]
    );

    res.json({
      success: true,
      message: 'Event updated successfully!'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete an event (ADMIN ONLY)
// @route   DELETE /api/events/:id
// @access  Private (Admin)
const deleteEvent = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query('SELECT id, title FROM events WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.'
      });
    }

    await pool.query('DELETE FROM events WHERE id = ?', [id]);

    res.json({
      success: true,
      message: `Event "${existing[0].title}" deleted successfully.`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get organizer's assigned events with statistics
// @route   GET /api/events/organizer/my-events
// @access  Private (Organizer, Admin)
const getOrganizerEvents = async (req, res, next) => {
  try {
    const organizerId = req.user.id;

    let whereClause = 'WHERE e.organizer_id = ?';
    let queryParams = [organizerId];

    if (req.user.role === 'admin') {
      whereClause = '';
      queryParams = [];
    }

    const [events] = await pool.query(
      `SELECT 
        e.*,
        c.name AS category_name,
        (SELECT COUNT(*) FROM attendee_registrations ar WHERE ar.event_id = e.id AND ar.status = 'registered') AS registered_attendees_count,
        (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'approved') AS approved_count,
        (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'pending') AS pending_count,
        (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'rejected') AS rejected_count,
        (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status != 'cancelled') AS total_volunteer_applications
      FROM events e
      LEFT JOIN categories c ON e.category_id = c.id
      ${whereClause}
      ORDER BY e.event_date ASC`,
      queryParams
    );

    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getOrganizerEvents
};
