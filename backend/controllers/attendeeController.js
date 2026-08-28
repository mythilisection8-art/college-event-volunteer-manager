const { pool } = require('../config/db');

// @desc    Register as Attendee for an event (Student only - concurrency safe)
// @route   POST /api/attendees/:eventId
// @access  Private (Student)
const registerAsAttendee = async (req, res, next) => {
  const { eventId } = req.params;
  const userId = req.user.id;

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Lock and fetch event details for concurrency safety
    const [events] = await connection.query(
      'SELECT id, title, max_attendees, registration_deadline, status FROM events WHERE id = ? FOR UPDATE',
      [eventId]
    );

    if (events.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Event not found.'
      });
    }

    const event = events[0];

    // 2. Validate event status
    if (event.status !== 'published' && event.status !== 'ongoing') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Registration is not open for events in '${event.status}' status.`
      });
    }

    // 3. Validate registration deadline
    const deadline = new Date(event.registration_deadline);
    const now = new Date();
    if (deadline < now) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Registration deadline for this event was on ${deadline.toLocaleString()}. Registration is now closed.`
      });
    }

    // 4. Check if student has an existing attendee record (Lock record)
    const [existing] = await connection.query(
      'SELECT id, status FROM attendee_registrations WHERE event_id = ? AND user_id = ? FOR UPDATE',
      [eventId, userId]
    );

    if (existing.length > 0 && existing[0].status === 'registered') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'You are already registered as an attendee for this event.'
      });
    }

    // 5. Lock and count active registered attendees to strictly enforce capacity
    const [countRows] = await connection.query(
      "SELECT COUNT(*) AS active_attendees FROM attendee_registrations WHERE event_id = ? AND status = 'registered' FOR UPDATE",
      [eventId]
    );

    const activeAttendees = parseInt(countRows[0].active_attendees || 0, 10);
    const maxAttendees = parseInt(event.max_attendees || 100, 10);

    if (activeAttendees >= maxAttendees) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Event Full. All available attendee seats have been reserved.'
      });
    }

    // 6. Insert new registration or reactivate cancelled one
    if (existing.length > 0 && existing[0].status === 'cancelled') {
      await connection.query(
        "UPDATE attendee_registrations SET status = 'registered', registered_at = CURRENT_TIMESTAMP WHERE id = ?",
        [existing[0].id]
      );
    } else {
      await connection.query(
        "INSERT INTO attendee_registrations (event_id, user_id, status) VALUES (?, ?, 'registered')",
        [eventId, userId]
      );
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: `You have successfully registered as an attendee for "${event.title}"!`
    });
  } catch (error) {
    if (connection) await connection.rollback();
    next(error);
  } finally {
    if (connection) connection.release();
  }
};

// @desc    Cancel attendee registration (Student only)
// @route   DELETE /api/attendees/:eventId/cancel
// @access  Private (Student)
const cancelAttendeeRegistration = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    const [existing] = await pool.query(
      "SELECT id, status FROM attendee_registrations WHERE event_id = ? AND user_id = ? AND status = 'registered'",
      [eventId, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active attendee registration found for this event.'
      });
    }

    await pool.query(
      "UPDATE attendee_registrations SET status = 'cancelled' WHERE id = ?",
      [existing[0].id]
    );

    res.json({
      success: true,
      message: 'Your attendee registration has been cancelled and your seat has been released.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all events current student is registered to attend
// @route   GET /api/attendees/my
// @access  Private (Student)
const getMyAttendingEvents = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const query = `
      SELECT 
        ar.id AS attendee_registration_id,
        ar.status AS registration_status,
        ar.attendance_status,
        ar.checked_in_at,
        ar.registered_at,
        e.id AS event_id,
        e.title AS event_title,
        e.description AS event_description,
        e.event_date,
        e.start_time,
        e.end_time,
        e.venue,
        e.status AS event_status,
        e.banner_image,
        e.max_attendees,
        c.name AS category_name,
        u.name AS organizer_name,
        u.email AS organizer_email
      FROM attendee_registrations ar
      JOIN events e ON ar.event_id = e.id
      LEFT JOIN categories c ON e.category_id = c.id
      LEFT JOIN users u ON e.organizer_id = u.id
      WHERE ar.user_id = ? AND ar.status = 'registered'
      ORDER BY e.event_date ASC
    `;

    const [attendingEvents] = await pool.query(query, [userId]);

    res.json({
      success: true,
      data: attendingEvents
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all registered attendees for a specific event (Organizer of that event, Admin)
// @route   GET /api/attendees/event/:eventId
// @access  Private (Organizer of assigned event, Admin)
const getEventAttendees = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    // Check event ownership
    const [events] = await pool.query(
      'SELECT id, title, organizer_id, max_attendees FROM events WHERE id = ?',
      [eventId]
    );

    if (events.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.'
      });
    }

    const event = events[0];

    // Strictly enforce that Organizers can ONLY access events assigned to them
    if (req.user.role !== 'admin' && event.organizer_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not assigned to organize this event.'
      });
    }

    const query = `
      SELECT 
        ar.id AS registration_id,
        ar.status,
        ar.attendance_status,
        ar.checked_in_at,
        ar.registered_at,
        u.id AS user_id,
        u.name AS student_name,
        u.email AS student_email,
        u.department AS student_department,
        u.roll_number AS student_roll_number,
        u.phone AS student_phone
      FROM attendee_registrations ar
      JOIN users u ON ar.user_id = u.id
      WHERE ar.event_id = ? AND ar.status = 'registered'
      ORDER BY ar.registered_at ASC
    `;

    const [attendees] = await pool.query(query, [eventId]);

    res.json({
      success: true,
      event: {
        id: event.id,
        title: event.title,
        max_attendees: event.max_attendees,
        registered_attendees_count: attendees.length,
        seats_remaining: Math.max(0, event.max_attendees - attendees.length)
      },
      data: attendees
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Attendee QR Registration Pass (Student ownership strictly enforced)
// @route   GET /api/attendees/:eventId/pass OR GET /api/attendees/pass/:registrationId
// @access  Private (Authenticated student, organizer of event, or admin)
const getAttendeePass = async (req, res, next) => {
  try {
    const { eventId, registrationId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    let query = `
      SELECT 
        ar.id AS registration_id,
        ar.event_id,
        ar.user_id,
        ar.status AS registration_status,
        ar.attendance_status,
        ar.checked_in_at,
        ar.registered_at,
        ar.updated_at,
        u.id AS student_id,
        u.name AS student_name,
        u.email AS student_email,
        u.roll_number AS student_roll_number,
        u.department AS student_department,
        u.phone AS student_phone,
        e.id AS event_id,
        e.title AS event_title,
        e.description AS event_description,
        e.event_date,
        e.start_time,
        e.end_time,
        e.venue,
        e.status AS event_status,
        e.banner_image,
        e.organizer_id,
        c.name AS category_name,
        org.name AS organizer_name,
        org.email AS organizer_email
      FROM attendee_registrations ar
      JOIN events e ON ar.event_id = e.id
      JOIN users u ON ar.user_id = u.id
      LEFT JOIN categories c ON e.category_id = c.id
      LEFT JOIN users org ON e.organizer_id = org.id
    `;

    let params = [];

    if (registrationId) {
      query += ` WHERE ar.id = ?`;
      params.push(registrationId);
    } else if (eventId) {
      query += ` WHERE ar.event_id = ? AND ar.user_id = ?`;
      params.push(eventId, userId);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Event ID or Registration ID is required.'
      });
    }

    const [rows] = await pool.query(query, params);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Attendee registration pass not found.'
      });
    }

    const pass = rows[0];

    // SECURITY CHECK:
    // If student: must be the owner of the registration (pass.user_id === req.user.id)
    // If organizer: must be the assigned organizer of the event (pass.organizer_id === req.user.id)
    // If admin: allowed
    if (userRole === 'student' && pass.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You cannot view another student’s registration pass.'
      });
    }

    if (userRole === 'organizer' && pass.organizer_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not the assigned organizer for this event.'
      });
    }

    // Format unique registration identifier
    const passCode = `REG-ATT-${new Date(pass.event_date).getFullYear()}-${String(pass.registration_id).padStart(5, '0')}`;
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const verifyUrl = `${clientUrl}/verify-pass?type=attendee&id=${pass.registration_id}&code=${passCode}`;

    // Payload for dynamic QR code encoding (no passwords or secrets)
    const qrPayload = JSON.stringify({
      type: 'CAMPUS_EVENT_ATTENDEE_PASS',
      pass_code: passCode,
      registration_id: pass.registration_id,
      event_id: pass.event_id,
      event_title: pass.event_title,
      student_id: pass.student_id,
      student_name: pass.student_name,
      student_roll: pass.student_roll_number || 'N/A',
      student_department: pass.student_department || 'N/A',
      event_date: pass.event_date,
      start_time: pass.start_time,
      venue: pass.venue,
      status: pass.registration_status,
      attendance_status: pass.attendance_status || 'not_marked',
      verify_url: verifyUrl,
      issued_at: pass.registered_at
    });

    res.json({
      success: true,
      data: {
        registration_id: pass.registration_id,
        pass_code: passCode,
        pass_type: 'attendee',
        qr_payload: qrPayload,
        verify_url: verifyUrl,
        registration_status: pass.registration_status,
        attendance_status: pass.attendance_status || 'not_marked',
        checked_in_at: pass.checked_in_at,
        is_active: pass.registration_status === 'registered',
        registered_at: pass.registered_at,
        student: {
          id: pass.student_id,
          name: pass.student_name,
          email: pass.student_email,
          roll_number: pass.student_roll_number,
          department: pass.student_department,
          phone: pass.student_phone
        },
        event: {
          id: pass.event_id,
          title: pass.event_title,
          description: pass.event_description,
          event_date: pass.event_date,
          start_time: pass.start_time,
          end_time: pass.end_time,
          venue: pass.venue,
          status: pass.event_status,
          category_name: pass.category_name,
          banner_image: pass.banner_image,
          organizer_name: pass.organizer_name,
          organizer_email: pass.organizer_email
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Attendee QR Pass (Organizer of that event or Admin only)
// @route   POST /api/attendees/verify-pass
// @access  Private (Organizer of assigned event, Admin)
const verifyAttendeePass = async (req, res, next) => {
  try {
    const { code, registration_id, qr_data } = req.body;
    let targetRegistrationId = registration_id ? parseInt(registration_id, 10) : null;
    let targetPassCode = code;

    // If raw scanned qr_data provided, parse it
    if (qr_data) {
      if (typeof qr_data === 'string') {
        try {
          const parsed = JSON.parse(qr_data);
          if (parsed.registration_id) targetRegistrationId = parseInt(parsed.registration_id, 10);
          if (parsed.pass_code) targetPassCode = parsed.pass_code;
        } catch (e) {
          const match = qr_data.match(/REG-ATT-\d{4}-(\d+)/i);
          if (match) {
            targetRegistrationId = parseInt(match[1], 10);
            targetPassCode = match[0];
          } else {
            try {
              const url = new URL(qr_data);
              const idParam = url.searchParams.get('id');
              const codeParam = url.searchParams.get('code');
              if (idParam) targetRegistrationId = parseInt(idParam, 10);
              if (codeParam) targetPassCode = codeParam;
            } catch (_) {}
          }
        }
      }
    } else if (code && !targetRegistrationId) {
      const match = String(code).match(/REG-ATT-\d{4}-(\d+)/i);
      if (match) {
        targetRegistrationId = parseInt(match[1], 10);
      } else if (!isNaN(Number(code))) {
        targetRegistrationId = parseInt(code, 10);
      }
    }

    if (!targetRegistrationId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pass code or registration identifier.'
      });
    }

    const query = `
      SELECT 
        ar.id AS registration_id,
        ar.event_id,
        ar.user_id,
        ar.status AS registration_status,
        ar.attendance_status,
        ar.checked_in_at,
        ar.registered_at,
        ar.updated_at,
        u.id AS student_id,
        u.name AS student_name,
        u.email AS student_email,
        u.roll_number AS student_roll_number,
        u.department AS student_department,
        u.phone AS student_phone,
        e.id AS event_id,
        e.title AS event_title,
        e.description AS event_description,
        e.event_date,
        e.start_time,
        e.end_time,
        e.venue,
        e.status AS event_status,
        e.banner_image,
        e.organizer_id,
        c.name AS category_name,
        org.name AS organizer_name,
        org.email AS organizer_email
      FROM attendee_registrations ar
      JOIN events e ON ar.event_id = e.id
      JOIN users u ON ar.user_id = u.id
      LEFT JOIN categories c ON e.category_id = c.id
      LEFT JOIN users org ON e.organizer_id = org.id
      WHERE ar.id = ?
    `;

    const [rows] = await pool.query(query, [targetRegistrationId]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Attendee registration record not found in system.'
      });
    }

    const reg = rows[0];

    // Authorization: Admin or Assigned Organizer
    if (req.user.role !== 'admin' && reg.organizer_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not authorized to verify passes for this event.'
      });
    }

    // Status check: cancelled registrations cannot be checked in
    if (reg.registration_status === 'cancelled') {
      return res.status(400).json({
        success: false,
        is_valid: false,
        message: 'This attendee reservation has been CANCELLED and is no longer valid.',
        data: {
          registration_id: reg.registration_id,
          pass_code: `REG-ATT-${new Date(reg.event_date).getFullYear()}-${String(reg.registration_id).padStart(5, '0')}`,
          pass_type: 'attendee',
          registration_status: reg.registration_status,
          attendance_status: reg.attendance_status || 'not_marked',
          student: {
            id: reg.student_id,
            name: reg.student_name,
            department: reg.student_department,
            roll_number: reg.student_roll_number
          },
          event: {
            id: reg.event_id,
            title: reg.event_title,
            event_date: reg.event_date,
            venue: reg.venue
          }
        }
      });
    }

    const passCode = `REG-ATT-${new Date(reg.event_date).getFullYear()}-${String(reg.registration_id).padStart(5, '0')}`;

    res.json({
      success: true,
      is_valid: true,
      pass_type: 'attendee',
      data: {
        registration_id: reg.registration_id,
        pass_code: passCode,
        pass_type: 'attendee',
        registration_status: reg.registration_status,
        attendance_status: reg.attendance_status || 'not_marked',
        checked_in_at: reg.checked_in_at,
        is_already_checked_in: reg.attendance_status === 'present',
        registered_at: reg.registered_at,
        student: {
          id: reg.student_id,
          name: reg.student_name,
          email: reg.student_email,
          roll_number: reg.student_roll_number,
          department: reg.student_department,
          phone: reg.student_phone
        },
        event: {
          id: reg.event_id,
          title: reg.event_title,
          description: reg.event_description,
          event_date: reg.event_date,
          start_time: reg.start_time,
          end_time: reg.end_time,
          venue: reg.venue,
          status: reg.event_status,
          category_name: reg.category_name,
          banner_image: reg.banner_image,
          organizer_name: reg.organizer_name,
          organizer_email: reg.organizer_email
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check-In Attendee & Mark Present (Organizer of that event or Admin only)
// @route   POST /api/attendees/check-in OR PATCH /api/attendees/:id/attendance
// @access  Private (Organizer of assigned event, Admin)
const checkInAttendee = async (req, res, next) => {
  try {
    const registrationId = req.params?.id || req.body?.registration_id;
    const attendanceStatus = req.body?.attendance_status || 'present';

    if (!registrationId) {
      return res.status(400).json({
        success: false,
        message: 'Registration ID is required for check-in.'
      });
    }

    const [rows] = await pool.query(
      `SELECT ar.id, ar.status, ar.attendance_status, ar.checked_in_at, e.organizer_id, e.title AS event_title, u.name AS student_name
       FROM attendee_registrations ar
       JOIN events e ON ar.event_id = e.id
       JOIN users u ON ar.user_id = u.id
       WHERE ar.id = ?`,
      [registrationId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Attendee registration record not found.'
      });
    }

    const reg = rows[0];

    // Authorization: Admin or Assigned Organizer
    if (req.user.role !== 'admin' && reg.organizer_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not assigned to organize this event.'
      });
    }

    // Status check: cancelled registrations cannot be checked in
    if (reg.status !== 'registered') {
      return res.status(400).json({
        success: false,
        message: `Cannot check in attendee with status "${reg.status}". Registration is not active.`
      });
    }

    const isAlreadyPresent = reg.attendance_status === 'present';

    await pool.query(
      `UPDATE attendee_registrations 
       SET attendance_status = ?, checked_in_at = COALESCE(checked_in_at, CURRENT_TIMESTAMP) 
       WHERE id = ?`,
      [attendanceStatus, registrationId]
    );

    const [updatedRows] = await pool.query(
      `SELECT ar.id, ar.status, ar.attendance_status, ar.checked_in_at, e.title AS event_title, u.name AS student_name
       FROM attendee_registrations ar
       JOIN events e ON ar.event_id = e.id
       JOIN users u ON ar.user_id = u.id
       WHERE ar.id = ?`,
      [registrationId]
    );
    const updated = updatedRows[0] || reg;

    res.json({
      success: true,
      message: isAlreadyPresent && attendanceStatus === 'present'
        ? `Attendee ${updated.student_name} is already checked in.`
        : `Attendee ${updated.student_name} successfully checked in for "${updated.event_title}"!`,
      data: {
        registration_id: updated.id,
        attendance_status: updated.attendance_status,
        checked_in_at: updated.checked_in_at,
        student_name: updated.student_name,
        was_already_checked_in: isAlreadyPresent
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Public Read-Only Verification for Attendee Pass (No sensitive student data exposed)
// @route   GET /api/attendees/public-verify
// @access  Public (No Auth required)
const publicVerifyAttendeePass = async (req, res, next) => {
  try {
    const { code, id } = req.query;
    let targetRegistrationId = id ? parseInt(id, 10) : null;

    if (!targetRegistrationId && code) {
      const match = String(code).match(/REG-ATT-\d{4}-(\d+)/i);
      if (match) {
        targetRegistrationId = parseInt(match[1], 10);
      } else if (!isNaN(Number(code))) {
        targetRegistrationId = parseInt(code, 10);
      }
    }

    if (!targetRegistrationId) {
      return res.status(400).json({
        success: false,
        message: 'Pass code or registration identifier is required.'
      });
    }

    const query = `
      SELECT 
        ar.id AS registration_id,
        ar.status AS registration_status,
        ar.attendance_status,
        ar.checked_in_at,
        ar.registered_at,
        u.name AS student_name,
        e.title AS event_title,
        e.event_date,
        e.start_time,
        e.end_time,
        e.venue,
        c.name AS category_name
      FROM attendee_registrations ar
      JOIN events e ON ar.event_id = e.id
      JOIN users u ON ar.user_id = u.id
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE ar.id = ?
    `;

    const [rows] = await pool.query(query, [targetRegistrationId]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        is_valid: false,
        message: 'Pass not found or invalid.'
      });
    }

    const reg = rows[0];
    const passCode = `REG-ATT-${new Date(reg.event_date).getFullYear()}-${String(reg.registration_id).padStart(5, '0')}`;
    const isValid = reg.registration_status === 'registered';

    res.json({
      success: true,
      is_valid: isValid,
      data: {
        pass_type: 'Attendee Entry Pass',
        pass_code: passCode,
        is_valid: isValid,
        registration_status: reg.registration_status,
        attendance_status: reg.attendance_status || 'not_marked',
        checked_in_at: reg.checked_in_at,
        event_title: reg.event_title,
        event_date: reg.event_date,
        start_time: reg.start_time,
        end_time: reg.end_time,
        venue: reg.venue,
        category_name: reg.category_name,
        student_name: reg.student_name,
        registered_at: reg.registered_at,
        verified_at: new Date()
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerAsAttendee,
  cancelAttendeeRegistration,
  getMyAttendingEvents,
  getEventAttendees,
  getAttendeePass,
  verifyAttendeePass,
  checkInAttendee,
  publicVerifyAttendeePass
};
