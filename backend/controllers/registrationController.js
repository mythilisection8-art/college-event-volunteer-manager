const { pool } = require('../config/db');

// @desc    Register for an event as a volunteer (Student only)
// @route   POST /api/registrations/:eventId
// @access  Private (Student)
const registerForEvent = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    const { skills_notes } = req.body;

    // 1. Fetch event details
    const [events] = await pool.query('SELECT * FROM events WHERE id = ?', [eventId]);
    if (events.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.'
      });
    }

    const event = events[0];

    // 2. Validate event status
    if (event.status !== 'published' && event.status !== 'ongoing') {
      return res.status(400).json({
        success: false,
        message: `Registration is not allowed for events in '${event.status}' status.`
      });
    }

    // 3. Validate registration deadline
    const deadline = new Date(event.registration_deadline);
    const now = new Date();
    if (deadline < now) {
      return res.status(400).json({
        success: false,
        message: `Registration deadline for this event was on ${deadline.toLocaleString()}. Registration is now closed.`
      });
    }

    // 4. Validate capacity
    const [approvedRows] = await pool.query(
      "SELECT COUNT(*) AS approved_count FROM registrations WHERE event_id = ? AND status = 'approved'",
      [eventId]
    );
    const approvedCount = approvedRows[0].approved_count;
    if (approvedCount >= event.max_volunteers) {
      return res.status(400).json({
        success: false,
        message: 'Volunteer capacity for this event has reached the maximum limit.'
      });
    }

    // 5. Check duplicate registration
    const [existingRegs] = await pool.query(
      'SELECT id, status FROM registrations WHERE event_id = ? AND user_id = ?',
      [eventId, userId]
    );

    if (existingRegs.length > 0) {
      const existing = existingRegs[0];
      if (existing.status === 'cancelled') {
        // If previously cancelled, re-activate as pending
        await pool.query(
          `UPDATE registrations 
           SET status = 'pending', skills_notes = ?, attendance_status = 'not_marked', remarks = NULL, registered_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [skills_notes || null, existing.id]
        );

        return res.json({
          success: true,
          message: 'Your registration application has been resubmitted successfully!',
          registrationId: existing.id
        });
      } else {
        return res.status(400).json({
          success: false,
          message: `You have already registered for this event (Status: ${existing.status.toUpperCase()}).`
        });
      }
    }

    // 6. Insert new registration record
    const [result] = await pool.query(
      `INSERT INTO registrations (event_id, user_id, status, attendance_status, skills_notes)
       VALUES (?, ?, 'pending', 'not_marked', ?)`,
      [eventId, userId, skills_notes || null]
    );

    res.status(201).json({
      success: true,
      message: 'Registration submitted successfully! Please wait for the organizer to review your application.',
      registrationId: result.insertId
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current student's registered events
// @route   GET /api/registrations/my
// @access  Private (Student)
const getMyRegistrations = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    let whereClause = 'WHERE r.user_id = ?';
    let queryParams = [userId];

    if (status && status !== 'all') {
      whereClause += ' AND r.status = ?';
      queryParams.push(status);
    }

    const query = `
      SELECT 
        r.id AS registration_id,
        r.status AS registration_status,
        r.attendance_status,
        r.skills_notes,
        r.remarks AS organizer_remarks,
        r.registered_at,
        r.updated_at AS status_updated_at,
        e.id AS event_id,
        e.title AS event_title,
        e.description AS event_description,
        e.event_date,
        e.start_time,
        e.end_time,
        e.venue,
        e.status AS event_status,
        e.banner_image,
        c.name AS category_name,
        u.name AS organizer_name,
        u.email AS organizer_email,
        u.phone AS organizer_phone
      FROM registrations r
      JOIN events e ON r.event_id = e.id
      LEFT JOIN categories c ON e.category_id = c.id
      LEFT JOIN users u ON e.organizer_id = u.id
      ${whereClause}
      ORDER BY r.registered_at DESC
    `;

    const [registrations] = await pool.query(query, queryParams);

    res.json({
      success: true,
      data: registrations
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel a volunteer registration (Student)
// @route   DELETE /api/registrations/:id/cancel
// @access  Private (Student)
const cancelRegistration = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [regs] = await pool.query(
      'SELECT id, status, event_id FROM registrations WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (regs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Registration record not found.'
      });
    }

    const reg = regs[0];

    if (reg.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Registration is already cancelled.'
      });
    }

    // Update status to cancelled
    await pool.query(
      "UPDATE registrations SET status = 'cancelled' WHERE id = ?",
      [id]
    );

    res.json({
      success: true,
      message: 'Registration cancelled successfully.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all registrations for a specific event (Organizer, Admin)
// @route   GET /api/registrations/event/:eventId
// @access  Private (Organizer of that event, Admin)
const getEventRegistrations = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    // Check permissions
    const [events] = await pool.query('SELECT organizer_id, title, max_volunteers FROM events WHERE id = ?', [eventId]);
    if (events.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.'
      });
    }

    const event = events[0];
    if (req.user.role !== 'admin' && event.organizer_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not assigned to organize this event.'
      });
    }

    const query = `
      SELECT 
        r.id AS registration_id,
        r.status AS registration_status,
        r.attendance_status,
        r.skills_notes,
        r.remarks AS organizer_remarks,
        r.registered_at,
        r.updated_at,
        u.id AS user_id,
        u.name AS student_name,
        u.email AS student_email,
        u.phone AS student_phone,
        u.department AS student_department,
        u.roll_number AS student_roll_number,
        u.avatar AS student_avatar
      FROM registrations r
      JOIN users u ON r.user_id = u.id
      WHERE r.event_id = ?
      ORDER BY 
        CASE 
          WHEN r.status = 'pending' THEN 1
          WHEN r.status = 'approved' THEN 2
          WHEN r.status = 'rejected' THEN 3
          ELSE 4
        END,
        r.registered_at ASC
    `;

    const [volunteers] = await pool.query(query, [eventId]);

    // Stats
    const totalApplicants = volunteers.length;
    const approvedCount = volunteers.filter(v => v.registration_status === 'approved').length;
    const pendingCount = volunteers.filter(v => v.registration_status === 'pending').length;
    const rejectedCount = volunteers.filter(v => v.registration_status === 'rejected').length;

    res.json({
      success: true,
      event: {
        id: parseInt(eventId, 10),
        title: event.title,
        max_volunteers: event.max_volunteers,
        approved_count: approvedCount,
        pending_count: pendingCount,
        rejected_count: rejectedCount,
        total_applicants: totalApplicants
      },
      data: volunteers
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update volunteer registration status (Approve / Reject)
// @route   PATCH /api/registrations/:id/status
// @access  Private (Organizer, Admin)
const updateRegistrationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be pending, approved, or rejected.'
      });
    }

    // Find registration and event
    const [regs] = await pool.query(
      `SELECT r.id, r.event_id, r.user_id, r.status AS current_status, e.organizer_id, e.max_volunteers, e.title AS event_title
       FROM registrations r
       JOIN events e ON r.event_id = e.id
       WHERE r.id = ?`,
      [id]
    );

    if (regs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found.'
      });
    }

    const reg = regs[0];

    // Authorization
    if (req.user.role !== 'admin' && reg.organizer_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not assigned to organize this event.'
      });
    }

    // If approving, verify that max capacity is not exceeded
    if (status === 'approved' && reg.current_status !== 'approved') {
      const [countRows] = await pool.query(
        "SELECT COUNT(*) AS approved_count FROM registrations WHERE event_id = ? AND status = 'approved'",
        [reg.event_id]
      );
      const approvedCount = countRows[0].approved_count;

      if (approvedCount >= reg.max_volunteers) {
        return res.status(400).json({
          success: false,
          message: `Cannot approve applicant: maximum capacity of ${reg.max_volunteers} volunteers has already been reached.`
        });
      }
    }

    await pool.query(
      'UPDATE registrations SET status = ?, remarks = COALESCE(?, remarks) WHERE id = ?',
      [status, remarks || null, id]
    );

    res.json({
      success: true,
      message: `Volunteer registration status successfully updated to "${status.toUpperCase()}".`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update volunteer attendance & participation status
// @route   PATCH /api/registrations/:id/attendance
// @access  Private (Organizer, Admin)
const updateAttendance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { attendance_status, remarks } = req.body;

    const validStatuses = ['not_marked', 'present', 'absent', 'completed'];
    if (!validStatuses.includes(attendance_status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid attendance status. Must be one of: ${validStatuses.join(', ')}.`
      });
    }

    const [regs] = await pool.query(
      `SELECT r.id, r.status, e.organizer_id
       FROM registrations r
       JOIN events e ON r.event_id = e.id
       WHERE r.id = ?`,
      [id]
    );

    if (regs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found.'
      });
    }

    const reg = regs[0];

    if (req.user.role !== 'admin' && reg.organizer_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not assigned to organize this event.'
      });
    }

    await pool.query(
      'UPDATE registrations SET attendance_status = ?, remarks = COALESCE(?, remarks) WHERE id = ?',
      [attendance_status, remarks || null, id]
    );

    res.json({
      success: true,
      message: `Volunteer attendance updated to "${attendance_status.toUpperCase()}".`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Volunteer QR Registration Pass (Student ownership strictly enforced)
// @route   GET /api/registrations/:eventId/pass OR GET /api/registrations/pass/:registrationId
// @access  Private (Authenticated student, organizer of event, or admin)
const getVolunteerPass = async (req, res, next) => {
  try {
    const { eventId, registrationId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    let query = `
      SELECT 
        r.id AS registration_id,
        r.event_id,
        r.user_id,
        r.status AS registration_status,
        r.attendance_status,
        r.skills_notes,
        r.remarks AS organizer_remarks,
        r.registered_at,
        r.updated_at,
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
      FROM registrations r
      JOIN events e ON r.event_id = e.id
      JOIN users u ON r.user_id = u.id
      LEFT JOIN categories c ON e.category_id = c.id
      LEFT JOIN users org ON e.organizer_id = org.id
    `;

    let params = [];

    if (registrationId) {
      query += ` WHERE r.id = ?`;
      params.push(registrationId);
    } else if (eventId) {
      query += ` WHERE r.event_id = ? AND r.user_id = ?`;
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
        message: 'Volunteer application pass not found.'
      });
    }

    const pass = rows[0];

    // SECURITY CHECK:
    // If student: must be the owner of the application (pass.user_id === req.user.id)
    // If organizer: must be the assigned organizer of the event (pass.organizer_id === req.user.id)
    // If admin: allowed
    if (userRole === 'student' && pass.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You cannot view another student’s volunteer pass.'
      });
    }

    if (userRole === 'organizer' && pass.organizer_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not the assigned organizer for this event.'
      });
    }

    const isApproved = pass.registration_status === 'approved';
    const passCode = `REG-VOL-${new Date(pass.event_date).getFullYear()}-${String(pass.registration_id).padStart(5, '0')}`;

    // Payload for dynamic QR code encoding (only active when approved)
    const qrPayload = JSON.stringify({
      type: 'CAMPUS_EVENT_VOLUNTEER_PASS',
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
      attendance_status: pass.attendance_status,
      assigned_role_remarks: pass.organizer_remarks || 'Volunteer Duty Team',
      issued_at: pass.registered_at
    });

    res.json({
      success: true,
      data: {
        registration_id: pass.registration_id,
        pass_code: passCode,
        pass_type: 'volunteer',
        qr_payload: isApproved ? qrPayload : null,
        registration_status: pass.registration_status,
        attendance_status: pass.attendance_status,
        organizer_remarks: pass.organizer_remarks,
        skills_notes: pass.skills_notes,
        is_active: isApproved,
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

module.exports = {
  registerForEvent,
  getMyRegistrations,
  cancelRegistration,
  getEventRegistrations,
  updateRegistrationStatus,
  updateAttendance,
  getVolunteerPass
};

